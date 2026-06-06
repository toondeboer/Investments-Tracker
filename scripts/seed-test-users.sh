#!/usr/bin/env bash
#
# Seed repeatable test users (admin / paid / regular) for local testing.
#
# Creates three Cognito users with permanent passwords in the given pool, adds
# the admin to the `admin` group, and marks the paid user `plan=paid` in
# DynamoDB Local — so every access path (unlimited / paid limit / free limit +
# upgrade CTA) has a ready account.
#
# Cognito calls use your ambient AWS credentials (point this at a DEV pool, not
# prod — see the README). The plan write goes to DynamoDB Local.
#
# Usage:
#   POOL_ID=us-east-1_xxxx ./scripts/seed-test-users.sh
#   POOL_ID=us-east-1_xxxx PASSWORD='Custom1!' ./scripts/seed-test-users.sh
set -euo pipefail

: "${POOL_ID:?Set POOL_ID to your (dev) Cognito user pool id}"
PASSWORD="${PASSWORD:-Passw0rd!}"
REGION="${AWS_REGION:-us-east-1}"
DDB_ENDPOINT="${DDB_ENDPOINT:-http://localhost:8000}"

ADMIN_USER="admin@test"
PAID_USER="paid@test"
REGULAR_USER="regular@test"

create_user() {
  local username="$1"
  # Idempotent: ignore "already exists".
  aws cognito-idp admin-create-user --region "$REGION" \
    --user-pool-id "$POOL_ID" --username "$username" \
    --message-action SUPPRESS >/dev/null 2>&1 || true
  aws cognito-idp admin-set-user-password --region "$REGION" \
    --user-pool-id "$POOL_ID" --username "$username" \
    --password "$PASSWORD" --permanent
  echo "  ✓ $username"
}

user_sub() {
  aws cognito-idp admin-get-user --region "$REGION" \
    --user-pool-id "$POOL_ID" --username "$1" \
    --query 'UserAttributes[?Name==`sub`].Value' --output text
}

echo "Seeding test users in pool $POOL_ID (region $REGION)…"
create_user "$ADMIN_USER"
create_user "$PAID_USER"
create_user "$REGULAR_USER"

# Admin group (create if missing) + membership.
aws cognito-idp create-group --region "$REGION" \
  --user-pool-id "$POOL_ID" --group-name admin >/dev/null 2>&1 || true
aws cognito-idp admin-add-user-to-group --region "$REGION" \
  --user-pool-id "$POOL_ID" --group-name admin --username "$ADMIN_USER"
echo "  ✓ $ADMIN_USER added to 'admin' group"

# Mark the paid user paid in DynamoDB Local (dummy creds; local endpoint).
PAID_SUB="$(user_sub "$PAID_USER")"
AWS_ACCESS_KEY_ID=local AWS_SECRET_ACCESS_KEY=local \
aws dynamodb update-item --endpoint-url "$DDB_ENDPOINT" --region "$REGION" \
  --table-name sailor --key "{\"userId\":{\"S\":\"$PAID_SUB\"}}" \
  --update-expression "SET #p = :p" \
  --expression-attribute-names '{"#p":"plan"}' \
  --expression-attribute-values '{":p":{"S":"paid"}}'
echo "  ✓ $PAID_USER set to plan=paid (sub $PAID_SUB)"

cat <<SUMMARY

Done. Sign in with password: $PASSWORD
  admin   → $ADMIN_USER    (unlimited; "Admin" badge; no upgrade button)
  paid    → $PAID_USER     (paid limit; "Captain Plus" badge; no upgrade button)
  regular → $REGULAR_USER  (free limit; upgrade CTA at the cap)

Note: the paid flag lives in DynamoDB Local, so re-run this after resetting the table.
SUMMARY
