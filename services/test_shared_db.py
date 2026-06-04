"""Unit tests for the shared DynamoDB counter primitives.

Run from the services/ directory:  pytest test_shared_db.py

A fake table stands in for DynamoDB so these run offline.
"""
import pytest
from botocore.exceptions import ClientError

from shared import db


class _FakeTable:
    """Records update_item calls and can simulate a conditional-check failure."""

    def __init__(self, *, conditional_fail=False, count=5, error_code=None):
        self.conditional_fail = conditional_fail
        self.count = count
        self.error_code = error_code
        self.calls = []

    def update_item(self, **kwargs):
        self.calls.append(kwargs)
        if self.error_code:
            raise ClientError({'Error': {'Code': self.error_code}}, 'UpdateItem')
        if self.conditional_fail:
            raise ClientError(
                {'Error': {'Code': 'ConditionalCheckFailedException'}}, 'UpdateItem'
            )
        return {'Attributes': {'count': self.count}}


def test_try_increment_returns_new_count_when_under_cap():
    table = _FakeTable(count=7)
    assert db.try_increment(table, 'usage#u1#2026-06', 30) == 7
    # The cap is enforced via a ConditionExpression, not a read-modify-write.
    assert 'ConditionExpression' in table.calls[0]


def test_try_increment_returns_none_when_cap_reached():
    table = _FakeTable(conditional_fail=True)
    assert db.try_increment(table, 'usage#u1#2026-06', 30) is None


def test_try_increment_reraises_other_client_errors():
    table = _FakeTable(error_code='ProvisionedThroughputExceededException')
    with pytest.raises(ClientError):
        db.try_increment(table, 'usage#u1#2026-06', 30)


def test_decrement_never_raises():
    table = _FakeTable(error_code='ResourceNotFoundException')
    # Refund is best-effort; a failure must be swallowed.
    db.decrement(table, 'usage#u1#2026-06')


def test_current_month_format():
    assert len(db.current_month()) == 7
    assert db.current_month()[4] == '-'
