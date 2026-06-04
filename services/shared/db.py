"""Shared DynamoDB access for the Lambdas.

Centralises the table handle (so dev/prod endpoint selection lives in one place)
and the atomic monthly-counter primitives used for OpenAI usage quotas. Keeping
this here means handler_dynamodb, handler_captain and handler_billing all share
one code path instead of each re-deriving the resource.
"""
import os
import time
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError

# The table name is fixed in prod ('sailor') but overridable for tests/local.
_TABLE_NAME = os.environ.get('TABLE_NAME', 'sailor')

# How long a monthly counter item lives before DynamoDB TTL reaps it. A little
# over two months so the current and previous buckets always survive (handy for
# debugging) while nothing accumulates long-term. TTL deletion is free.
_COUNTER_TTL_DAYS = 70


def get_table():
    """Return the DynamoDB Table handle.

    In dev (``ENVIRONMENT=dev``) it points at DynamoDB Local over Docker;
    otherwise it uses the Lambda's IAM role against real DynamoDB. Lifted
    verbatim from handler_dynamodb so every handler resolves the table the
    same way.
    """
    env = os.environ.get('ENVIRONMENT', 'dev')
    if env == 'dev':
        dynamodb = boto3.resource(
            'dynamodb',
            endpoint_url='http://host.docker.internal:8000',
            region_name='us-east-1',
            aws_access_key_id='fake',
            aws_secret_access_key='fake',
        )
    else:
        dynamodb = boto3.resource('dynamodb')
    return dynamodb.Table(_TABLE_NAME)


def current_month() -> str:
    """UTC year-month bucket (e.g. '2026-06'), used in counter partition keys."""
    return datetime.now(timezone.utc).strftime('%Y-%m')


def _ttl_epoch() -> int:
    return int(time.time()) + _COUNTER_TTL_DAYS * 24 * 60 * 60


def try_increment(table, key: str, limit: int):
    """Atomically increment the monthly counter at ``key``, capped at ``limit``.

    Returns the new count when the increment succeeds (the call is within
    quota), or ``None`` when the cap was already reached. Race-free: the cap is
    enforced by a DynamoDB ``ConditionExpression``, so concurrent invocations
    can never overshoot ``limit`` — no read-modify-write window.
    """
    try:
        resp = table.update_item(
            Key={'userId': key},
            UpdateExpression=(
                'ADD #c :one SET expiresAt = if_not_exists(expiresAt, :ttl)'
            ),
            ConditionExpression='attribute_not_exists(#c) OR #c < :limit',
            ExpressionAttributeNames={'#c': 'count'},
            ExpressionAttributeValues={
                ':one': 1,
                ':limit': limit,
                ':ttl': _ttl_epoch(),
            },
            ReturnValues='UPDATED_NEW',
        )
        return int(resp['Attributes']['count'])
    except ClientError as exc:
        if exc.response['Error']['Code'] == 'ConditionalCheckFailedException':
            return None
        raise


def decrement(table, key: str) -> None:
    """Best-effort refund of one unit from the counter at ``key``.

    Used when a later check rejects a call we had already counted. Never raises:
    a failed refund must not surface as a user-facing error.
    """
    try:
        table.update_item(
            Key={'userId': key},
            UpdateExpression='ADD #c :neg',
            ExpressionAttributeNames={'#c': 'count'},
            ExpressionAttributeValues={':neg': -1},
        )
    except Exception as exc:  # noqa: BLE001 - refund is strictly best-effort
        print(f'counter refund failed for {key}: {exc}')
