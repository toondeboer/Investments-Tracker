# Operations

Runbooks for deploying and administering sailor. Design rationale lives in
[ARCHITECTURE.md](../ARCHITECTURE.md); day-to-day dev setup in [README.md](../README.md).

## Deploy

`buildspec.yml` (AWS CodeBuild) builds the frontend, bundles the Lambdas with `sam build`,
and runs `sam deploy --config-env prod`. To deploy manually with parameter overrides:

```bash
sam deploy --config-env prod \
  --parameter-overrides StripePriceId=price_... GlobalMonthlyLimit=450
```

After a deploy that changes billing outputs:

- Copy the `BillingEndpoint` output into `environment.prod.ts → billingLambdaUrl`.
- Configure the `StripeWebhookEndpoint` output as the webhook destination in the
  Stripe Dashboard.

## Secrets (SSM)

Production keys live in SSM SecureStrings (free; no idle cost), created once, out of band:

```bash
aws ssm put-parameter --name /sailor/openai-api-key     --type SecureString --value sk-...
aws ssm put-parameter --name /sailor/stripe-secret-key     --type SecureString --value sk_test_...
aws ssm put-parameter --name /sailor/stripe-webhook-secret --type SecureString --value whsec_...
```

Secret resolution order in the Lambdas: env var (`OPENAI_API_KEY`, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`) first, then the SSM SecureString. Local dev supplies the env vars
via `env.json` (see README); `sam local` with dummy AWS credentials cannot reach SSM, which
is why the env-var path exists.

> Prefer real credentials locally? Run `aws sso login` and `sam local start-api --env-vars
> env.json` directly — then the SSM fallback works too.

## Captain quotas & spend caps

One-time prod setup (out-of-band — not managed by the stack):

```bash
# 1. Counters self-clean via TTL on the 'expiresAt' attribute (free).
aws dynamodb update-time-to-live --table-name sailor \
  --time-to-live-specification "Enabled=true, AttributeName=expiresAt"

# 2. Admin (free, unlimited) access — create the group, add yourself.
aws cognito-idp create-group --user-pool-id us-east-1_liCB4LgDE --group-name admin
aws cognito-idp admin-add-user-to-group --user-pool-id us-east-1_liCB4LgDE \
  --group-name admin --username <your-email>

# 3. Backstop the OpenAI spend itself. AWS Budgets only sees AWS costs, NOT the
#    OpenAI bill (a separate vendor invoice), so the real out-of-band cap behind
#    the in-app global ceiling is OpenAI's own hard usage limit:
#    OpenAI Dashboard → Settings → Limits → set a monthly hard cap (e.g. $5) + alert.

# 4. (Optional) Catch AWS-side surprises — Lambda/API Gateway/DynamoDB — with an
#    AWS Budget (Cost → Budgets) at a low $/mo with an email alert. This does not
#    cover OpenAI; see step 3 for that.
```

`GLOBAL_MONTHLY_LIMIT` is deployed via `samconfig.toml` (currently `450`). Re-derive it
from live pricing whenever the model or budget changes — see "Ask the Captain" in
[ARCHITECTURE.md](../ARCHITECTURE.md) for the formula.

## Stripe local dev

The `samconfig.toml` price/secrets only apply to the **deployed** stack — `sam local` reads
billing config from `env.json` instead (see `env.json.example`). Add your **test-mode** values:
`STRIPE_SECRET_KEY` (`sk_test_…`), `STRIPE_PRICE_ID` (a **test-mode** price — IDs are
mode-specific), and `BILLING_SUCCESS_URL`/`BILLING_CANCEL_URL` pointed at `http://localhost:4200`
so checkout returns to your local app. Without `STRIPE_PRICE_ID` the checkout endpoint returns
`{"message":"Billing is not configured"}`.

To let a completed checkout flip the user's plan locally, forward webhooks with the Stripe CLI
and paste **its** signing secret into `env.json` as `STRIPE_WEBHOOK_SECRET` (it differs from the
Dashboard endpoint's secret):

```bash
stripe listen --forward-to http://localhost:3000/billing/webhook
```

Restart `./scripts/start-backend.sh` after editing `env.json` (it's read at startup). Leave
`GLOBAL_MONTHLY_LIMIT` at `0` locally to disable the global ceiling.

## Test users (dev Cognito pool)

Dev uses its **own Cognito pool** (free; keeps test accounts and the `admin` group off prod),
configured in `environment.ts` (frontend) and `env.json` (`COGNITO_USER_POOL_ID` /
`COGNITO_CLIENT_ID`, for the local Lambdas). One-time pool creation — the web app logs in via
**SRP**, so `ALLOW_USER_SRP_AUTH` is required:

```bash
aws cognito-idp create-user-pool --pool-name sailor-dev --query 'UserPool.Id' --output text
aws cognito-idp create-user-pool-client --user-pool-id <DEV_POOL> --client-name sailor-dev-web \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_SRP_AUTH ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --query 'UserPoolClient.ClientId' --output text
```

Seed all three roles (creates the users with permanent passwords, adds the admin to the group,
and flags the paid user in DynamoDB Local):

```bash
POOL_ID=<DEV_POOL> ./scripts/seed-test-users.sh
```

| Username       | Password    | What it tests                                                        |
| -------------- | ----------- | -------------------------------------------------------------------- |
| `admin@test`   | `Passw0rd!` | Admin — unlimited; "Admin" badge; no upgrade button                  |
| `paid@test`    | `Passw0rd!` | Paid — `PAID_MONTHLY_LIMIT`; "Captain Plus" badge; no upgrade button |
| `regular@test` | `Passw0rd!` | Free — `FREE_MONTHLY_LIMIT`; upgrade CTA when the cap is hit         |

> Override the password with `PASSWORD=… POOL_ID=… ./scripts/seed-test-users.sh`. Re-run after
> resetting the local table — the paid flag lives in DynamoDB Local.
