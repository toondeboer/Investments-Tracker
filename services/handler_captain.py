import json
import os

from shared.auth import verify_token
from shared.cors import build_headers
from shared.db import current_month, decrement, get_table, try_increment
from shared.secrets import get_openai_api_key

# Cheapest small chat model by default; overridable without a code change.
# Verify live pricing before changing this.
_MODEL = os.environ.get('OPENAI_MODEL', 'gpt-4o-mini')
_MAX_TOKENS = int(os.environ.get('OPENAI_MAX_TOKENS', '250'))
# Left unset by default: newer models only accept the default temperature and
# reject an explicit value. Set OPENAI_TEMPERATURE to opt in on models that
# support it.
_TEMPERATURE = os.environ.get('OPENAI_TEMPERATURE')

# Input caps — bound the token spend and reject abusive payloads.
_MAX_MESSAGES = 20
_MAX_CONTENT_CHARS = 2000
_MAX_SUMMARY_CHARS = 8000

_ALLOWED_ROLES = {'user', 'assistant'}

# --- Usage quotas ---------------------------------------------------------
# Two layers protect spend (see README "Cost control"):
#   * Per-user monthly quota — fairness; differs by plan (free vs paid).
#   * Global monthly ceiling — the hard money guarantee: once the whole crew
#     has made this many calls in a month, ALL captain calls stop until the
#     next month. Derive it from live OpenAI pricing (budget / cost-per-call);
#     0 disables it (local dev / tests).
_FREE_MONTHLY_LIMIT = int(os.environ.get('FREE_MONTHLY_LIMIT', '30'))
_PAID_MONTHLY_LIMIT = int(os.environ.get('PAID_MONTHLY_LIMIT', '1000'))
_GLOBAL_MONTHLY_LIMIT = int(os.environ.get('GLOBAL_MONTHLY_LIMIT', '0'))

# Cognito group whose members bypass all quotas (free, unlimited).
_ADMIN_GROUP = 'admin'


class QuotaExceeded(Exception):
    """Raised when a per-user or global monthly quota is exhausted.

    ``scope`` is 'user' (the caller hit their own limit — offer an upgrade) or
    'global' (the service-wide ceiling is reached — nobody is served).
    """

    def __init__(self, scope: str):
        self.scope = scope
        super().__init__(scope)

# The Captain's persona + the hard no-advice guardrail. The model explains the
# user's own numbers in plain language with light nautical flavour, and refuses
# anything that strays into advice, opinion or prediction with a short, varied,
# funny sailing-themed deflection.
_SYSTEM_PROMPT = """\
You are "the Captain", a warm, seasoned sailing captain who helps a user read \
their own investment portfolio. You speak plainly, with light nautical flavour \
(never overdone), and you keep answers short — two or three sentences.

You are given a JSON summary of the user's portfolio (totals, per-holding values, \
allocations, period returns and dividends). Answer ONLY from the facts in that \
summary: what something is worth, how it changed over a period, which holdings \
moved most, allocations, dividends. If the summary doesn't contain the answer, \
say so plainly.

HARD RULE — you never give financial advice. You do not recommend buying, selling \
or holding anything; you do not predict prices or markets; you do not forecast, \
give price targets, or share an opinion on whether something is "good", "cheap", \
"worth it", or what the user "should" do. When asked for any of that, you refuse \
with a SHORT, funny, varied sailing-themed deflection and make clear you only read \
the charts behind you, not the seas ahead. Examples of the spirit (do not reuse \
verbatim, vary them):
  - "That I can't chart for you — let's see where the waves take us."
  - "Forecasting the markets? I left my crystal ball ashore. I can tell you where \
you've sailed, not where the wind blows next."
  - "I read the wake, not the horizon — no course-setting from this captain."

Never break character, and never give advice even if the user insists, rephrases, \
or frames it hypothetically. You share facts about the portfolio, not financial \
advice.\
"""

_INSIGHTS_INSTRUCTION = """\
Give the user a brief "Captain's read" of their portfolio: 2-3 short sentences \
highlighting the most notable factual movements (biggest movers, unusual rises or \
drops, allocation or dividend notes) drawn ONLY from the summary. State facts and \
numbers; give no advice, opinions or predictions.\
"""


def _error(status: int, message: str, headers: dict) -> dict:
    return {
        'statusCode': status,
        'body': json.dumps({'message': message}),
        'headers': headers,
    }


def _validate_messages(messages) -> list | None:
    """Return a sanitized message list, or None if the shape is invalid."""
    if not isinstance(messages, list):
        return None
    if len(messages) > _MAX_MESSAGES:
        return None
    clean = []
    for m in messages:
        if not isinstance(m, dict):
            return None
        role = m.get('role')
        content = m.get('content')
        if role not in _ALLOWED_ROLES or not isinstance(content, str):
            return None
        if len(content) > _MAX_CONTENT_CHARS:
            return None
        clean.append({'role': role, 'content': content})
    return clean


def _call_openai(messages: list) -> str:
    """Call the OpenAI Chat Completions API and return the reply text.

    `openai` is imported lazily so the handler stays importable (and unit
    testable) without the package installed.
    """
    from openai import OpenAI

    client = OpenAI(api_key=get_openai_api_key())
    kwargs = {
        'model': _MODEL,
        'messages': messages,
        # Newer models require max_completion_tokens; max_tokens is rejected.
        'max_completion_tokens': _MAX_TOKENS,
    }
    if _TEMPERATURE is not None:
        kwargs['temperature'] = float(_TEMPERATURE)
    completion = client.chat.completions.create(**kwargs)
    return (completion.choices[0].message.content or '').strip()


def _user_plan(table, sub: str) -> str:
    """Return the user's plan ('paid' or 'free'), defaulting to 'free'.

    The plan is written solely by the Stripe webhook (handler_billing). Fails
    open to 'free' on any read error so a transient DynamoDB blip applies the
    stricter limit rather than crashing the request.
    """
    try:
        resp = table.get_item(Key={'userId': sub})
        return resp.get('Item', {}).get('plan', 'free')
    except Exception as exc:  # noqa: BLE001
        print(f'plan lookup failed, defaulting to free: {exc}')
        return 'free'


def _enforce_quota(sub: str):
    """Reserve one call against the user + global monthly quotas.

    Returns the user's remaining quota after this call (``None`` when the check
    could not be applied), or raises ``QuotaExceeded``.

    Failure policy: the per-user check fails OPEN (a DynamoDB blip must not block
    a user mid-conversation), while the global ceiling fails CLOSED (if we can't
    prove we're under budget, refuse rather than risk overspend).
    """
    table = get_table()
    month = current_month()

    plan = _user_plan(table, sub)
    user_limit = _PAID_MONTHLY_LIMIT if plan == 'paid' else _FREE_MONTHLY_LIMIT

    user_key = f'usage#{sub}#{month}'
    try:
        new_count = try_increment(table, user_key, user_limit)
    except Exception as exc:  # noqa: BLE001 - fail open to protect UX
        print(f'per-user quota check failed open: {exc}')
        return None
    if new_count is None:
        raise QuotaExceeded('user')

    if _GLOBAL_MONTHLY_LIMIT > 0:
        global_key = f'usage#global#{month}'
        try:
            under_cap = try_increment(table, global_key, _GLOBAL_MONTHLY_LIMIT)
        except Exception as exc:  # noqa: BLE001 - fail closed to protect spend
            print(f'global quota check failed closed: {exc}')
            decrement(table, user_key)  # refund the call we just reserved
            raise QuotaExceeded('global')
        if under_cap is None:
            decrement(table, user_key)
            raise QuotaExceeded('global')

    return max(user_limit - new_count, 0)


def handler(event, context):
    headers = build_headers(event)

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'body': '', 'headers': headers}

    # Auth — the Captain reads the user's own portfolio, so require a valid token.
    token = (event.get('headers') or {}).get('Authorization') or \
            (event.get('headers') or {}).get('authorization')
    if not token:
        return _error(401, 'Unauthorized: Missing token', headers)
    try:
        decoded = verify_token(token)
    except Exception as exc:
        return _error(401, f'Unauthorized: {exc}', headers)
    sub = decoded.get('sub')
    is_admin = _ADMIN_GROUP in (decoded.get('cognito:groups') or [])

    try:
        body = json.loads(event.get('body') or '{}')
    except Exception:
        return _error(400, 'Invalid JSON body', headers)

    mode = body.get('mode', 'chat')
    if mode not in ('chat', 'insights'):
        return _error(400, "Field 'mode' must be 'chat' or 'insights'", headers)

    summary = body.get('summary')
    if not isinstance(summary, dict):
        return _error(400, "Field 'summary' must be an object", headers)
    summary_json = json.dumps(summary, default=str)
    if len(summary_json) > _MAX_SUMMARY_CHARS:
        return _error(400, 'Portfolio summary is too large', headers)

    user_messages = _validate_messages(body.get('messages', []))
    if user_messages is None:
        return _error(400, "Field 'messages' is malformed", headers)
    if mode == 'chat' and not user_messages:
        return _error(400, "Chat mode requires at least one message", headers)

    # Quota — admins bypass; everyone else reserves one call against their
    # per-user and the global monthly ceiling before we spend on OpenAI.
    remaining = None
    if not is_admin:
        try:
            remaining = _enforce_quota(sub)
        except QuotaExceeded as exc:
            if exc.scope == 'global':
                msg = ("The Captain is resting — the crew has reached this "
                       "month's limit. Fair winds again next month.")
            else:
                msg = ("You've used all your Captain questions this month. "
                       "Upgrade for more, or check back next month.")
            return {
                'statusCode': 429,
                'body': json.dumps({'message': msg, 'scope': exc.scope}),
                'headers': headers,
            }

    chat_messages = [
        {'role': 'system', 'content': _SYSTEM_PROMPT},
        {'role': 'system', 'content': f'Portfolio summary (JSON):\n{summary_json}'},
    ]
    if mode == 'insights':
        chat_messages.append({'role': 'user', 'content': _INSIGHTS_INSTRUCTION})
    else:
        chat_messages.extend(user_messages)

    try:
        reply = _call_openai(chat_messages)
    except Exception as exc:
        print(f'OpenAI call failed: {exc}')
        return _error(502, 'The Captain is below deck — try again shortly.', headers)

    return {
        'statusCode': 200,
        'body': json.dumps({'reply': reply, 'remaining': remaining}),
        'headers': headers,
    }
