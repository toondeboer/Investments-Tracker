"""Unit tests for the Captain Lambda's request handling.

Run from the services/ directory:  pytest test_handler_captain.py

Auth and the OpenAI call are monkeypatched, so these run offline without a
Cognito token or an OpenAI key.
"""
import json

import handler_captain


def _event(method='POST', body=None, token='valid-token'):
    headers = {'origin': 'http://localhost:4200'}
    if token is not None:
        headers['Authorization'] = token
    return {
        'httpMethod': method,
        'headers': headers,
        'body': None if body is None else json.dumps(body),
    }


def _patch_ok(monkeypatch, capture=None):
    monkeypatch.setattr(handler_captain, 'verify_token', lambda token: {'sub': 'user-1'})
    # Quota is exercised by its own tests below; here we let every call through.
    monkeypatch.setattr(handler_captain, '_enforce_quota', lambda sub: None)

    def fake_call(messages):
        if capture is not None:
            capture.extend(messages)
        return 'Aye, your portfolio is up.'

    monkeypatch.setattr(handler_captain, '_call_openai', fake_call)


def test_options_preflight_skips_auth():
    resp = handler_captain.handler(_event(method='OPTIONS', token=None), None)
    assert resp['statusCode'] == 200


def test_missing_token_returns_401():
    resp = handler_captain.handler(_event(body={'summary': {}}, token=None), None)
    assert resp['statusCode'] == 401


def test_invalid_token_returns_401(monkeypatch):
    def boom(token):
        raise ValueError('bad token')

    monkeypatch.setattr(handler_captain, 'verify_token', boom)
    resp = handler_captain.handler(_event(body={'summary': {}}), None)
    assert resp['statusCode'] == 401


def test_invalid_json_body_returns_400(monkeypatch):
    _patch_ok(monkeypatch)
    event = _event()
    event['body'] = '{not json'
    resp = handler_captain.handler(event, None)
    assert resp['statusCode'] == 400


def test_missing_summary_returns_400(monkeypatch):
    _patch_ok(monkeypatch)
    resp = handler_captain.handler(_event(body={'mode': 'chat', 'messages': []}), None)
    assert resp['statusCode'] == 400


def test_bad_mode_returns_400(monkeypatch):
    _patch_ok(monkeypatch)
    resp = handler_captain.handler(_event(body={'mode': 'wat', 'summary': {}}), None)
    assert resp['statusCode'] == 400


def test_chat_requires_a_message(monkeypatch):
    _patch_ok(monkeypatch)
    resp = handler_captain.handler(_event(body={'mode': 'chat', 'summary': {}, 'messages': []}), None)
    assert resp['statusCode'] == 400


def test_too_many_messages_returns_400(monkeypatch):
    _patch_ok(monkeypatch)
    messages = [{'role': 'user', 'content': 'hi'}] * (handler_captain._MAX_MESSAGES + 1)
    resp = handler_captain.handler(
        _event(body={'mode': 'chat', 'summary': {}, 'messages': messages}), None
    )
    assert resp['statusCode'] == 400


def test_oversized_content_returns_400(monkeypatch):
    _patch_ok(monkeypatch)
    messages = [{'role': 'user', 'content': 'x' * (handler_captain._MAX_CONTENT_CHARS + 1)}]
    resp = handler_captain.handler(
        _event(body={'mode': 'chat', 'summary': {}, 'messages': messages}), None
    )
    assert resp['statusCode'] == 400


def test_oversized_summary_returns_400(monkeypatch):
    _patch_ok(monkeypatch)
    big = {'blob': 'x' * (handler_captain._MAX_SUMMARY_CHARS + 1)}
    resp = handler_captain.handler(
        _event(body={'mode': 'chat', 'summary': big, 'messages': [{'role': 'user', 'content': 'hi'}]}),
        None,
    )
    assert resp['statusCode'] == 400


def test_chat_happy_path_returns_reply(monkeypatch):
    captured = []
    _patch_ok(monkeypatch, capture=captured)
    resp = handler_captain.handler(
        _event(body={
            'mode': 'chat',
            'summary': {'portfolioValue': 1000},
            'messages': [{'role': 'user', 'content': 'How did I do?'}],
        }),
        None,
    )
    assert resp['statusCode'] == 200
    assert json.loads(resp['body'])['reply'] == 'Aye, your portfolio is up.'
    # System prompt + summary context precede the user's message.
    assert captured[0]['role'] == 'system'
    assert 'never give financial advice' in captured[0]['content']
    assert any('portfolioValue' in m['content'] for m in captured if m['role'] == 'system')
    assert captured[-1] == {'role': 'user', 'content': 'How did I do?'}


def test_insights_mode_synthesizes_instruction(monkeypatch):
    captured = []
    _patch_ok(monkeypatch, capture=captured)
    resp = handler_captain.handler(
        _event(body={'mode': 'insights', 'summary': {'portfolioValue': 1000}}),
        None,
    )
    assert resp['statusCode'] == 200
    # No user messages needed; the handler appends the Captain's-read instruction.
    assert captured[-1]['role'] == 'user'
    assert "Captain's read" in captured[-1]['content']


def test_openai_failure_returns_502(monkeypatch):
    monkeypatch.setattr(handler_captain, 'verify_token', lambda token: {'sub': 'u'})
    monkeypatch.setattr(handler_captain, '_enforce_quota', lambda sub: None)

    def boom(messages):
        raise RuntimeError('api down')

    monkeypatch.setattr(handler_captain, '_call_openai', boom)
    resp = handler_captain.handler(
        _event(body={'mode': 'insights', 'summary': {'v': 1}}), None
    )
    assert resp['statusCode'] == 502


# --- Quotas & admin bypass -------------------------------------------------

def _chat_body():
    return {
        'mode': 'chat',
        'summary': {'portfolioValue': 1000},
        'messages': [{'role': 'user', 'content': 'How did I do?'}],
    }


def test_admin_bypasses_quota(monkeypatch):
    """An 'admin'-group member is served without touching the quota machinery."""
    monkeypatch.setattr(
        handler_captain, 'verify_token',
        lambda token: {'sub': 'admin-1', 'cognito:groups': ['admin']},
    )
    monkeypatch.setattr(handler_captain, '_call_openai', lambda m: 'Aye.')
    monkeypatch.setattr(handler_captain, 'get_table', lambda: object())

    def fail_if_called(sub):
        raise AssertionError('quota must not be enforced for admins')

    monkeypatch.setattr(handler_captain, '_enforce_quota', fail_if_called)
    resp = handler_captain.handler(_event(body=_chat_body()), None)
    assert resp['statusCode'] == 200
    assert json.loads(resp['body'])['usage']['plan'] == 'admin'


def test_per_user_cap_returns_429(monkeypatch):
    monkeypatch.setattr(handler_captain, 'verify_token', lambda token: {'sub': 'u1'})
    monkeypatch.setattr(handler_captain, '_call_openai', lambda m: 'Aye.')
    monkeypatch.setattr(handler_captain, 'get_table', lambda: object())
    monkeypatch.setattr(handler_captain, '_user_plan', lambda table, sub: 'free')
    # Per-user counter is already at its cap -> ConditionExpression fails -> None.
    monkeypatch.setattr(handler_captain, 'try_increment', lambda table, key, limit: None)

    resp = handler_captain.handler(_event(body=_chat_body()), None)
    assert resp['statusCode'] == 429
    assert json.loads(resp['body'])['scope'] == 'user'


def test_global_cap_returns_429_and_refunds_user(monkeypatch):
    monkeypatch.setattr(handler_captain, 'verify_token', lambda token: {'sub': 'u1'})
    monkeypatch.setattr(handler_captain, '_call_openai', lambda m: 'Aye.')
    monkeypatch.setattr(handler_captain, 'get_table', lambda: object())
    monkeypatch.setattr(handler_captain, '_user_plan', lambda table, sub: 'free')
    monkeypatch.setattr(handler_captain, '_GLOBAL_MONTHLY_LIMIT', 100)

    def fake_inc(table, key, limit):
        return None if key.startswith('usage#global') else 1

    refunded = []
    monkeypatch.setattr(handler_captain, 'try_increment', fake_inc)
    monkeypatch.setattr(handler_captain, 'decrement', lambda table, key: refunded.append(key))

    resp = handler_captain.handler(_event(body=_chat_body()), None)
    assert resp['statusCode'] == 429
    assert json.loads(resp['body'])['scope'] == 'global'
    # The user's reserved call is refunded so the rejected request isn't charged.
    assert refunded == ['usage#u1#' + handler_captain.current_month()]


def test_paid_plan_uses_higher_limit(monkeypatch):
    captured = {}

    monkeypatch.setattr(handler_captain, 'verify_token', lambda token: {'sub': 'u1'})
    monkeypatch.setattr(handler_captain, '_call_openai', lambda m: 'Aye.')
    monkeypatch.setattr(handler_captain, 'get_table', lambda: object())
    monkeypatch.setattr(handler_captain, '_user_plan', lambda table, sub: 'paid')

    def fake_inc(table, key, limit):
        captured[key] = limit
        return 1

    monkeypatch.setattr(handler_captain, 'try_increment', fake_inc)
    resp = handler_captain.handler(_event(body=_chat_body()), None)
    assert resp['statusCode'] == 200
    user_key = 'usage#u1#' + handler_captain.current_month()
    assert captured[user_key] == handler_captain._PAID_MONTHLY_LIMIT


def test_happy_path_reports_usage(monkeypatch):
    monkeypatch.setattr(handler_captain, 'verify_token', lambda token: {'sub': 'u1'})
    monkeypatch.setattr(handler_captain, '_call_openai', lambda m: 'Aye.')
    monkeypatch.setattr(handler_captain, 'get_table', lambda: object())
    monkeypatch.setattr(handler_captain, '_user_plan', lambda table, sub: 'free')
    # First call of the month -> count 1 -> remaining = free limit - 1.
    monkeypatch.setattr(handler_captain, 'try_increment', lambda table, key, limit: 1)

    resp = handler_captain.handler(_event(body=_chat_body()), None)
    assert resp['statusCode'] == 200
    usage = json.loads(resp['body'])['usage']
    assert usage['plan'] == 'free'
    assert usage['limit'] == handler_captain._FREE_MONTHLY_LIMIT
    assert usage['used'] == 1
    assert usage['remaining'] == handler_captain._FREE_MONTHLY_LIMIT - 1


def _no_openai(monkeypatch):
    """Assert OpenAI is never called when the quota store is unreachable."""
    def boom(messages):
        raise AssertionError('OpenAI must not be called when the quota store is down')

    monkeypatch.setattr(handler_captain, '_call_openai', boom)


def test_per_user_check_fails_closed_on_db_error(monkeypatch):
    """A DynamoDB error on the per-user counter fails CLOSED (503, no spend)."""
    monkeypatch.setattr(handler_captain, 'verify_token', lambda token: {'sub': 'u1'})
    monkeypatch.setattr(handler_captain, 'get_table', lambda: object())
    monkeypatch.setattr(handler_captain, '_user_plan', lambda table, sub: 'free')
    _no_openai(monkeypatch)

    def boom(table, key, limit):
        raise RuntimeError('dynamo unreachable')

    monkeypatch.setattr(handler_captain, 'try_increment', boom)
    resp = handler_captain.handler(_event(body=_chat_body()), None)
    assert resp['statusCode'] == 503


def test_global_check_fails_closed_on_db_error(monkeypatch):
    """A DynamoDB error on the global counter fails CLOSED and refunds the user."""
    monkeypatch.setattr(handler_captain, 'verify_token', lambda token: {'sub': 'u1'})
    monkeypatch.setattr(handler_captain, 'get_table', lambda: object())
    monkeypatch.setattr(handler_captain, '_user_plan', lambda table, sub: 'free')
    monkeypatch.setattr(handler_captain, '_GLOBAL_MONTHLY_LIMIT', 100)
    _no_openai(monkeypatch)

    def fake_inc(table, key, limit):
        if key.startswith('usage#global'):
            raise RuntimeError('dynamo unreachable')
        return 1

    refunded = []
    monkeypatch.setattr(handler_captain, 'try_increment', fake_inc)
    monkeypatch.setattr(handler_captain, 'decrement', lambda table, key: refunded.append(key))
    resp = handler_captain.handler(_event(body=_chat_body()), None)
    assert resp['statusCode'] == 503
    # The reserved per-user call is refunded so the rejected request isn't charged.
    assert refunded == ['usage#u1#' + handler_captain.current_month()]


class _UsageTable:
    """Minimal table stub for _status: get_item returns plan + counter rows."""

    def __init__(self, plan=None, used=0):
        self._plan = plan
        self._used = used

    def get_item(self, Key):
        key = Key['userId']
        if key.startswith('usage#'):
            return {'Item': {'count': self._used}} if self._used else {}
        return {'Item': {'plan': self._plan}} if self._plan else {}


def test_status_mode_free(monkeypatch):
    monkeypatch.setattr(handler_captain, 'verify_token', lambda token: {'sub': 'u1'})
    monkeypatch.setattr(handler_captain, 'get_table', lambda: _UsageTable(plan='free', used=4))
    resp = handler_captain.handler(_event(body={'mode': 'status'}), None)
    assert resp['statusCode'] == 200
    usage = json.loads(resp['body'])
    assert usage['plan'] == 'free'
    assert usage['used'] == 4
    assert usage['limit'] == handler_captain._FREE_MONTHLY_LIMIT
    assert usage['remaining'] == handler_captain._FREE_MONTHLY_LIMIT - 4


def test_status_mode_paid(monkeypatch):
    monkeypatch.setattr(handler_captain, 'verify_token', lambda token: {'sub': 'u1'})
    monkeypatch.setattr(handler_captain, 'get_table', lambda: _UsageTable(plan='paid', used=10))
    resp = handler_captain.handler(_event(body={'mode': 'status'}), None)
    usage = json.loads(resp['body'])
    assert usage['plan'] == 'paid'
    assert usage['limit'] == handler_captain._PAID_MONTHLY_LIMIT


def test_status_mode_admin_is_unlimited(monkeypatch):
    monkeypatch.setattr(
        handler_captain, 'verify_token',
        lambda token: {'sub': 'a1', 'cognito:groups': ['admin']},
    )
    monkeypatch.setattr(handler_captain, 'get_table', lambda: _UsageTable(used=3))
    resp = handler_captain.handler(_event(body={'mode': 'status'}), None)
    usage = json.loads(resp['body'])
    assert usage['plan'] == 'admin'
    assert usage['limit'] is None
    assert usage['remaining'] is None
    assert usage['used'] == 3


def test_status_mode_needs_no_summary(monkeypatch):
    """status must not require the summary/messages that chat does."""
    monkeypatch.setattr(handler_captain, 'verify_token', lambda token: {'sub': 'u1'})
    monkeypatch.setattr(handler_captain, 'get_table', lambda: _UsageTable(plan='free'))
    resp = handler_captain.handler(_event(body={'mode': 'status'}), None)
    assert resp['statusCode'] == 200
