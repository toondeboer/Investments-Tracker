#!/usr/bin/env bash
#
# Build and run the sailor Lambdas locally with AWS SAM.
#
# Uses dummy AWS credentials (so DynamoDB Local works and no real AWS call is
# made) and injects secrets from env.json — crucially OPENAI_API_KEY, so the
# Captain Lambda reads the key directly instead of falling through to SSM (which
# would fail under the dummy credentials).
#
# Prereqs (separate terminals): `docker-compose up` for DynamoDB Local, and a
# one-time `python services/init_dynamodb.py` to create the table.
#
# Usage:  ./scripts/start-backend.sh
set -euo pipefail

# Run from the repo root regardless of where the script is invoked from.
cd "$(dirname "$0")/.."

if [[ ! -f env.json ]]; then
  echo "error: env.json not found." >&2
  echo "  cp env.json.example env.json   # then paste your OpenAI (and Stripe) keys" >&2
  exit 1
fi

sam build

AWS_ACCESS_KEY_ID=local AWS_SECRET_ACCESS_KEY=local \
  sam local start-api --env-vars env.json
