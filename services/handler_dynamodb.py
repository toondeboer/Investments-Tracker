import json

from boto3.dynamodb.conditions import Key

from shared.auth import verify_token
from shared.cors import build_headers
from shared.db import get_table

_CURRENT_SCHEMA_VERSION = 2

_EMPTY_V2 = {
    'schemaVersion': 2,
    'settings': {'baseCurrency': 'EUR'},
    'portfolios': [
        {'id': 'default', 'name': 'Default', 'transactions': {'stock': [], 'dividend': [], 'commission': []}}
    ],
}


def _migrate_v1_to_v2(item):
    """Wrap a v1 flat-transactions item into the v2 multi-portfolio shape."""
    try:
        legacy_transactions = json.loads(item.get('transactions', '{}'))
    except (json.JSONDecodeError, TypeError):
        legacy_transactions = {'stock': [], 'dividend': [], 'commission': []}
    return {
        'schemaVersion': 2,
        'settings': {'baseCurrency': 'EUR'},
        'portfolios': [
            {'id': 'default', 'name': 'Default', 'transactions': legacy_transactions}
        ],
    }


def handler(event, context):
    headers = build_headers(event)

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'body': '', 'headers': headers}

    # Auth — verify the Cognito ID token before touching any data.
    token = (event.get('headers') or {}).get('Authorization') or \
            (event.get('headers') or {}).get('authorization')
    if not token:
        return {
            'statusCode': 401,
            'body': json.dumps({'message': 'Unauthorized: Missing token'}),
            'headers': headers,
        }

    try:
        decoded = verify_token(token)
        user_id = decoded['sub']
    except Exception as exc:
        return {
            'statusCode': 401,
            'body': json.dumps({'message': f'Unauthorized: {exc}'}),
            'headers': headers,
        }

    table = get_table()
    method = event.get('httpMethod')

    try:
        if method == 'GET':
            resp = table.query(KeyConditionExpression=Key('userId').eq(user_id))
            items = resp.get('Items', [])
            if not items:
                body = json.dumps(_EMPTY_V2)
            else:
                item = items[0]
                schema_version = int(item.get('schemaVersion', 0))
                if schema_version < 2:
                    # Migrate: wrap legacy flat transactions in a default portfolio.
                    body = json.dumps(_migrate_v1_to_v2(item))
                else:
                    # v2 data is stored under the 'data' key.
                    body = item.get('data', json.dumps(_EMPTY_V2))

        elif method == 'PUT':
            try:
                payload = json.loads(event.get('body', '{}'))
            except (json.JSONDecodeError, TypeError):
                return {
                    'statusCode': 400,
                    'body': json.dumps({'message': 'Invalid JSON body'}),
                    'headers': headers,
                }

            if payload.get('schemaVersion') != 2:
                return {
                    'statusCode': 400,
                    'body': json.dumps({'message': 'Unsupported schema version. Expected schemaVersion: 2.'}),
                    'headers': headers,
                }

            body_str = json.dumps(payload)
            resp = table.update_item(
                Key={'userId': user_id},
                UpdateExpression='SET #data = :d, schemaVersion = :v',
                ExpressionAttributeNames={'#data': 'data'},
                ExpressionAttributeValues={
                    ':d': body_str,
                    ':v': _CURRENT_SCHEMA_VERSION,
                },
                ReturnValues='ALL_NEW',
            )
            body = resp['Attributes']['data']

        else:
            raise ValueError(f'Unsupported method: {method}')

    except Exception as exc:
        return {'statusCode': 400, 'body': str(exc), 'headers': headers}

    return {'statusCode': 200, 'body': body, 'headers': headers}
