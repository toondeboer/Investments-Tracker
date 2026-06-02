import json
import time
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor

from shared.cors import build_headers

# Statuses worth a single retry: rate limiting and transient server errors.
_RETRYABLE_STATUSES = {429, 500, 502, 503, 504}
_RETRY_DELAY_SECONDS = 0.5

_REQUEST_HEADERS = {
    'Accept': '*/*',
    'User-Agent': (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/120.0.0.0 Safari/537.36'
    ),
}


def _fetch_symbol(args: tuple) -> dict:
    symbol, start, end = args
    url = (
        f'https://query1.finance.yahoo.com/v8/finance/chart/{symbol}'
        f'?interval=1d&period1={start}&period2={end}&events=div'
    )

    last_error = None
    # One initial attempt plus one retry for transient failures.
    for attempt in range(2):
        req = urllib.request.Request(url, headers=_REQUEST_HEADERS)
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                payload = json.loads(resp.read())
            # Yahoo reports an invalid/unknown symbol in the body (HTTP 200 with
            # chart.error set) rather than via the status code. Surface it as an
            # error so the frontend can tell the user which symbol failed.
            chart = payload.get('chart') if isinstance(payload, dict) else None
            if isinstance(chart, dict) and chart.get('error'):
                return {'symbol': symbol, 'error': str(chart['error'])}
            return {'symbol': symbol, 'data': payload}
        except urllib.error.HTTPError as exc:
            last_error = str(exc)
            if exc.code in _RETRYABLE_STATUSES and attempt == 0:
                time.sleep(_RETRY_DELAY_SECONDS)
                continue
            return {'symbol': symbol, 'error': last_error}
        except Exception as exc:
            last_error = str(exc)
            if attempt == 0:
                time.sleep(_RETRY_DELAY_SECONDS)
                continue
            return {'symbol': symbol, 'error': last_error}

    return {'symbol': symbol, 'error': last_error or 'unknown error'}


def handler(event, context):
    headers = build_headers(event)

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'body': '', 'headers': headers}

    try:
        body = json.loads(event.get('body') or '{}')
        symbols: list = body.get('symbols', [])
        start = body.get('start')
        end = body.get('end')
    except Exception:
        return {
            'statusCode': 400,
            'body': json.dumps({'message': 'Invalid JSON body'}),
            'headers': headers,
        }

    if not isinstance(symbols, list) or not symbols:
        return {
            'statusCode': 400,
            'body': json.dumps({'message': 'Request must include a non-empty "symbols" array'}),
            'headers': headers,
        }

    with ThreadPoolExecutor(max_workers=10) as executor:
        results = list(executor.map(_fetch_symbol, [(s, start, end) for s in symbols]))

    return {
        'statusCode': 200,
        'body': json.dumps(results),
        'headers': headers,
    }
