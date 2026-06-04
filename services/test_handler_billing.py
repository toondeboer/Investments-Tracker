"""Unit tests for the billing Lambda.

Run from the services/ directory:  pytest test_handler_billing.py

Stripe, auth and DynamoDB are monkeypatched so these run offline.
"""
import json
import types

import handler_billing


def _event(method='POST', proxy='checkout', body=None, token='valid-token', extra_headers=None):
    headers = {'origin': 'http://localhost:4200'}
    if token is not None:
        headers['Authorization'] = token
    if extra_headers:
        headers.update(extra_headers)
    return {
        'httpMethod': method,
        'headers': headers,
        'pathParameters': {'proxy': proxy},
        'body': body if isinstance(body, str) or body is None else json.dumps(body),
    }


class _Table:
    def __init__(self, item=None):
        self.item = item or {}
        self.updates = []

    def get_item(self, Key):
        return {'Item': self.item} if self.item else {}

    def update_item(self, **kwargs):
        self.updates.append(kwargs)


def test_options_preflight():
    resp = handler_billing.handler(_event(method='OPTIONS', token=None), None)
    assert resp['statusCode'] == 200


def test_unknown_route_404(monkeypatch):
    monkeypatch.setattr(handler_billing, 'verify_token', lambda t: {'sub': 'u1'})
    resp = handler_billing.handler(_event(proxy='nope'), None)
    assert resp['statusCode'] == 404


def test_checkout_requires_auth():
    resp = handler_billing.handler(_event(proxy='checkout', token=None), None)
    assert resp['statusCode'] == 401


def test_checkout_returns_session_url(monkeypatch):
    monkeypatch.setattr(handler_billing, 'verify_token', lambda t: {'sub': 'u1', 'email': 'a@b.c'})
    monkeypatch.setattr(handler_billing, 'get_table', lambda: _Table())
    monkeypatch.setattr(handler_billing, '_PRICE_ID', 'price_123')

    created = {}

    def fake_create(**kwargs):
        created.update(kwargs)
        return types.SimpleNamespace(url='https://checkout.stripe.com/abc')

    fake_stripe = types.SimpleNamespace(
        checkout=types.SimpleNamespace(
            Session=types.SimpleNamespace(create=fake_create)
        )
    )
    monkeypatch.setattr(handler_billing, '_stripe', lambda: fake_stripe)

    resp = handler_billing.handler(_event(proxy='checkout'), None)
    assert resp['statusCode'] == 200
    assert json.loads(resp['body'])['url'] == 'https://checkout.stripe.com/abc'
    # The sub is stamped on both the session and the subscription metadata.
    assert created['client_reference_id'] == 'u1'
    assert created['subscription_data']['metadata']['sub'] == 'u1'


def test_webhook_rejects_bad_signature(monkeypatch):
    def boom(payload, sig, secret):
        raise ValueError('bad sig')

    fake_stripe = types.SimpleNamespace(
        Webhook=types.SimpleNamespace(construct_event=boom)
    )
    monkeypatch.setattr(handler_billing, '_stripe', lambda: fake_stripe)
    monkeypatch.setattr(handler_billing, 'get_stripe_webhook_secret', lambda: 'whsec')

    resp = handler_billing.handler(
        _event(proxy='webhook', token=None, body='{}',
               extra_headers={'Stripe-Signature': 'forged'}),
        None,
    )
    assert resp['statusCode'] == 400


def test_webhook_checkout_completed_sets_paid(monkeypatch):
    table = _Table()
    monkeypatch.setattr(handler_billing, 'get_table', lambda: table)
    monkeypatch.setattr(handler_billing, 'get_stripe_webhook_secret', lambda: 'whsec')

    stripe_event = {
        'type': 'checkout.session.completed',
        'data': {'object': {'client_reference_id': 'u1', 'customer': 'cus_1'}},
    }
    fake_stripe = types.SimpleNamespace(
        Webhook=types.SimpleNamespace(construct_event=lambda *a: stripe_event)
    )
    monkeypatch.setattr(handler_billing, '_stripe', lambda: fake_stripe)

    resp = handler_billing.handler(
        _event(proxy='webhook', token=None, body='{}',
               extra_headers={'Stripe-Signature': 'sig'}),
        None,
    )
    assert resp['statusCode'] == 200
    assert len(table.updates) == 1
    vals = table.updates[0]['ExpressionAttributeValues']
    assert ':plan' in vals and vals[':plan'] == 'paid'


def test_webhook_subscription_deleted_sets_free(monkeypatch):
    table = _Table()
    monkeypatch.setattr(handler_billing, 'get_table', lambda: table)
    monkeypatch.setattr(handler_billing, 'get_stripe_webhook_secret', lambda: 'whsec')

    stripe_event = {
        'type': 'customer.subscription.deleted',
        'data': {'object': {'metadata': {'sub': 'u1'}, 'status': 'canceled'}},
    }
    fake_stripe = types.SimpleNamespace(
        Webhook=types.SimpleNamespace(construct_event=lambda *a: stripe_event)
    )
    monkeypatch.setattr(handler_billing, '_stripe', lambda: fake_stripe)

    resp = handler_billing.handler(
        _event(proxy='webhook', token=None, body='{}',
               extra_headers={'Stripe-Signature': 'sig'}),
        None,
    )
    assert resp['statusCode'] == 200
    assert table.updates[0]['ExpressionAttributeValues'][':plan'] == 'free'
