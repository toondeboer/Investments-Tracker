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

    def boom(messages):
        raise RuntimeError('api down')

    monkeypatch.setattr(handler_captain, '_call_openai', boom)
    resp = handler_captain.handler(
        _event(body={'mode': 'insights', 'summary': {'v': 1}}), None
    )
    assert resp['statusCode'] == 502
