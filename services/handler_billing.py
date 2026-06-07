"""Billing Lambda — Stripe Checkout + webhook for the Captain subscription.

Two endpoints behind /billing/{proxy+}:

  * POST /billing/checkout  — Cognito-authed. Starts a Stripe Checkout Session
    (mode=subscription) and returns its URL for the browser to redirect to.
  * POST /billing/webhook   — NOT Cognito-authed (Stripe calls it). Verifies the
    Stripe signature, then writes the resulting plan onto the user's record.
  * GET  /billing/portal    — Cognito-authed. Returns a Stripe Billing Portal URL
    so the user can manage/cancel their subscription.

The webhook is the ONLY writer of `plan` — the client is never trusted to set it.
`stripe` is imported lazily so the handler stays importable/unit-testable without
the package installed.
"""
import json
import os

from shared.auth import verify_token
from shared.cors import build_headers
from shared.db import get_table
from shared.secrets import get_stripe_secret_key, get_stripe_webhook_secret

_PRICE_ID = os.environ.get('STRIPE_PRICE_ID', '')
_SUCCESS_URL = os.environ.get('BILLING_SUCCESS_URL', 'http://localhost:4200/?upgraded=1')
_CANCEL_URL = os.environ.get('BILLING_CANCEL_URL', 'http://localhost:4200/')

# Stripe subscription statuses that grant the paid plan.
_ACTIVE_STATUSES = {'active', 'trialing'}


def _json(status: int, payload: dict, headers: dict) -> dict:
    return {'statusCode': status, 'body': json.dumps(payload), 'headers': headers}


def _stripe():
    import stripe

    stripe.api_key = get_stripe_secret_key()
    return stripe


def _authed_sub(event):
    """Return (sub, email) from a verified Cognito ID token, or raise."""
    token = (event.get('headers') or {}).get('Authorization') or \
            (event.get('headers') or {}).get('authorization')
    if not token:
        raise PermissionError('Missing token')
    decoded = verify_token(token)
    return decoded['sub'], decoded.get('email')


def _set_plan(sub: str, plan: str, **fields) -> None:
    """Write the plan (and optional Stripe metadata) onto the user's record."""
    table = get_table()
    names = {'#plan': 'plan'}
    values = {':plan': plan}
    sets = ['#plan = :plan']
    for i, (key, val) in enumerate(fields.items()):
        if val is None:
            continue
        names[f'#f{i}'] = key
        values[f':v{i}'] = val
        sets.append(f'#f{i} = :v{i}')
    table.update_item(
        Key={'userId': sub},
        UpdateExpression='SET ' + ', '.join(sets),
        ExpressionAttributeNames=names,
        ExpressionAttributeValues=values,
    )


def _checkout(event, headers):
    try:
        sub, email = _authed_sub(event)
    except Exception as exc:
        return _json(401, {'message': f'Unauthorized: {exc}'}, headers)

    if not _PRICE_ID:
        return _json(500, {'message': 'Billing is not configured'}, headers)

    stripe = _stripe()
    # Reuse the stored customer if we have one (set by a prior webhook).
    customer_id = get_table().get_item(Key={'userId': sub}).get('Item', {}).get('stripeCustomerId')
    session = stripe.checkout.Session.create(
        mode='subscription',
        line_items=[{'price': _PRICE_ID, 'quantity': 1}],
        success_url=_SUCCESS_URL,
        cancel_url=_CANCEL_URL,
        client_reference_id=sub,
        # Stamp the sub onto the subscription so later subscription.* webhooks
        # can resolve the user without a reverse lookup / GSI.
        subscription_data={'metadata': {'sub': sub}},
        **({'customer': customer_id} if customer_id else {'customer_email': email}),
    )
    return _json(200, {'url': session.url}, headers)


def _portal(event, headers):
    try:
        sub, _ = _authed_sub(event)
    except Exception as exc:
        return _json(401, {'message': f'Unauthorized: {exc}'}, headers)

    customer_id = get_table().get_item(Key={'userId': sub}).get('Item', {}).get('stripeCustomerId')
    if not customer_id:
        return _json(400, {'message': 'No subscription to manage'}, headers)

    stripe = _stripe()
    session = stripe.billing_portal.Session.create(
        customer=customer_id, return_url=_CANCEL_URL
    )
    return _json(200, {'url': session.url}, headers)


def _webhook(event, headers):
    stripe = _stripe()
    sig = (event.get('headers') or {}).get('Stripe-Signature') or \
          (event.get('headers') or {}).get('stripe-signature')
    payload = event.get('body') or ''
    try:
        stripe_event = stripe.Webhook.construct_event(
            payload, sig, get_stripe_webhook_secret()
        )
    except Exception as exc:
        # Bad/forged signature — never trust the payload.
        print(f'Stripe webhook signature verification failed: {exc}')
        return _json(400, {'message': 'Invalid signature'}, headers)

    etype = stripe_event['type']
    obj = stripe_event['data']['object']

    if etype == 'checkout.session.completed':
        sub = obj.get('client_reference_id')
        if sub:
            _set_plan(
                sub, 'paid',
                stripeCustomerId=obj.get('customer'),
                subscriptionStatus='active',
            )
    elif etype in ('customer.subscription.updated', 'customer.subscription.created'):
        sub = (obj.get('metadata') or {}).get('sub')
        if sub:
            active = obj.get('status') in _ACTIVE_STATUSES
            _set_plan(
                sub, 'paid' if active else 'free',
                stripeCustomerId=obj.get('customer'),
                subscriptionStatus=obj.get('status'),
                currentPeriodEnd=obj.get('current_period_end'),
            )
    elif etype == 'customer.subscription.deleted':
        sub = (obj.get('metadata') or {}).get('sub')
        if sub:
            _set_plan(sub, 'free', subscriptionStatus='canceled')

    # Always 200 for handled-or-ignored events so Stripe stops retrying.
    return _json(200, {'received': True}, headers)


def handler(event, context):
    headers = build_headers(event)

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'body': '', 'headers': headers}

    route = (event.get('pathParameters') or {}).get('proxy') or ''
    route = route.strip('/')

    if route == 'checkout':
        return _checkout(event, headers)
    if route == 'portal':
        return _portal(event, headers)
    if route == 'webhook':
        return _webhook(event, headers)

    return _json(404, {'message': f'Unknown billing route: {route}'}, headers)
