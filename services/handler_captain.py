import json
import os

from shared.auth import verify_token
from shared.cors import build_headers
from shared.secrets import get_openai_api_key

# Cheapest small chat model by default; overridable without a code change.
# Verify live pricing before changing this.
_MODEL = os.environ.get('OPENAI_MODEL', 'gpt-4o-mini')
_MAX_TOKENS = int(os.environ.get('OPENAI_MAX_TOKENS', '250'))
_TEMPERATURE = float(os.environ.get('OPENAI_TEMPERATURE', '0.7'))

# Input caps — bound the token spend and reject abusive payloads.
_MAX_MESSAGES = 20
_MAX_CONTENT_CHARS = 2000
_MAX_SUMMARY_CHARS = 8000

_ALLOWED_ROLES = {'user', 'assistant'}

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
    completion = client.chat.completions.create(
        model=_MODEL,
        messages=messages,
        max_tokens=_MAX_TOKENS,
        temperature=_TEMPERATURE,
    )
    return (completion.choices[0].message.content or '').strip()


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
        verify_token(token)
    except Exception as exc:
        return _error(401, f'Unauthorized: {exc}', headers)

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
        'body': json.dumps({'reply': reply}),
        'headers': headers,
    }
