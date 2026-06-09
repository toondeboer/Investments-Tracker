# sailor

[![CI](https://github.com/toondeboer/sailor/actions/workflows/ci.yml/badge.svg)](https://github.com/toondeboer/sailor/actions/workflows/ci.yml)
![Angular](https://img.shields.io/badge/Angular-21-DD0031?logo=angular&logoColor=white)
![NgRx](https://img.shields.io/badge/NgRx-21-BA2BD2?logo=reactivex&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.13-3776AB?logo=python&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-Lambda%20%2B%20DynamoDB-FF9900?logo=amazonaws&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)

Multi-portfolio investment tracker with per-currency holdings, dividend tracking, and
time-series P&L charts. Live at **[sailor.toondeboer.com](https://sailor.toondeboer.com)**.

An [Nx](https://nx.dev) monorepo: **Angular 21 + NgRx** frontend and **Python AWS Lambda +
DynamoDB** backend, authenticated with Cognito. See [ARCHITECTURE.md](ARCHITECTURE.md) for
the full project layout and data flow.

---

## ⚡ Prerequisites

| Tool        | Version     | Install                              |
| ----------- | ----------- | ------------------------------------ |
| Node.js     | 22+         | `brew install node`                  |
| Yarn        | 1.x classic | `npm i -g yarn`                      |
| Python      | 3.13        | `brew install python@3.13`           |
| Docker      | any         | [docker.com](https://www.docker.com) |
| AWS SAM CLI | any         | `brew install aws-sam-cli`           |

---

## 🛠 Local development

Three processes run together. Use a separate terminal for each.

### 1 — Install dependencies

```bash
yarn install                                    # frontend + Nx toolchain

python3.13 -m venv .venv                       # one-time Python venv
source .venv/bin/activate
pip install -r services/requirements-dev.txt
```

Activate the venv in every new terminal before running backend commands:

```bash
source .venv/bin/activate
```

### 2 — Database (DynamoDB Local)

```bash
docker-compose up
```

First run only — create the table:

```bash
python services/init_dynamodb.py
```

### 3 — Backend APIs (AWS SAM)

First copy the secrets template (one-time): `cp env.json.example env.json` and paste your keys
(at least `OPENAI_API_KEY`). `env.json` is gitignored.

```bash
./scripts/start-backend.sh
```

This runs `sam build` then `sam local start-api` with dummy AWS credentials and `--env-vars
env.json`, serving the Lambdas on `http://localhost:3000`. Re-run it after any Lambda change
(it rebuilds each time).

> **Why the script (and the dummy creds + env.json):** the dummy credentials let the Lambdas talk
> to DynamoDB Local without an AWS session, and `--env-vars env.json` injects `OPENAI_API_KEY` so
> the `captain` Lambda reads the key directly. Without it the key resolver falls through to SSM,
> which the dummy credentials reject (`UnrecognizedClientException`) → a 502 from `/captain`.
>
> - **Secret resolution:** `OPENAI_API_KEY` (env var) first, then the SSM SecureString. The same
>   applies to the Stripe keys (`STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`) — add them to
>   `env.json` to exercise billing locally.
> - **Production** — keys live in SSM SecureStrings (free; no idle cost), created once, e.g.
>   `aws ssm put-parameter --name /sailor/openai-api-key --type SecureString --value sk-...`

> **Tip:** prefer real credentials instead? Run `aws sso login` and `sam local start-api
--env-vars env.json` directly — then the SSM fallback works too.

### 4 — Frontend

```bash
nx serve frontend
```

Open `http://localhost:4200`. The dev server proxies `/microservice`, `/yahoo_finance` and
`/captain` to the SAM APIs on `:3000`.

---

## 🔧 Useful commands

| Command                          | Purpose                    |
| -------------------------------- | -------------------------- |
| `nx serve frontend`              | Dev server with hot reload |
| `nx run-many -t test`            | Run all unit tests         |
| `nx test util`                   | Test a single project      |
| `nx lint <project>`              | Lint a project             |
| `nx build frontend`              | Production build           |
| `nx affected -t lint test build` | What CI runs on a PR       |
| `sam build`                      | Package Python Lambdas     |

---

## 🧮 Financial logic

All calculations live in `libs/shared/util/src/lib/` and run entirely in the browser.
The reducer stores only raw inputs; every derived figure is computed in memoized NgRx selectors.

### Portfolio value

Current market value of a position, expressed in the user's base currency:

```
V(t) = shares(t) × price(t) × FX_market(t)
```

Missing prices (weekends, holidays) are **forward-filled** from the last known value.
FX rates use the **per-date spot rate** so today's value tracks today's currency moves.

---

### Unrealized P&L (Profit & Loss)

```
P&L(t) = V(t) − cost_basis − commission
```

`cost_basis` and `commission` use **spot-at-purchase** FX rates (locked at the rate on each
transaction's own date), so the cost side is never distorted by subsequent FX moves.

---

### Cost basis and gross invested

```
cost_basis   = Σ ( buy_qty_i × price_i × FX_spot_at_purchase_i )
gross_invested = Σ ( buy_value_i )     ← never reduced by sells
```

`gross_invested` is the denominator for all percentage returns. Using gross (rather than net)
prevents the denominator from collapsing to zero when a position is fully exited, keeping the
return percentage meaningful throughout the position's life.

---

### Total return

```
absolute  = V(t) − net_invested + cumulative_dividends
percentage = absolute / gross_invested × 100
```

Dividends are counted as return; commission is not.

---

### Average share price

```
avg_share_price = net_invested / shares_held(t)
```

Computed only when `shares_held ≠ 0`.

---

### Modified Dietz return (per calendar year)

Instead of the iterative XIRR, sailor uses the closed-form Modified Dietz method, which is
robust on partial years and when positions open and close within the same period:

```
gain        = EMV − BMV − net_flows
avg_capital = BMV + Σ ( w_i × flow_i )
w_i         = ( year_end − flow_date_i ) / ( year_end − year_start )

R_year      = gain / avg_capital
```

| Symbol    | Meaning                                                       |
| --------- | ------------------------------------------------------------- |
| EMV       | Ending market value (year-end or today for the current year)  |
| BMV       | Beginning market value (prior year-end; 0 for the first year) |
| net_flows | Cash into the portfolio (buys +, sells −, dividends −)        |
| w_i       | Time-weight: fraction of the year the cash was invested       |

When `avg_capital ≤ 0` (position opened and closed in the same year) the return is recorded
as 0 rather than dividing by zero.

---

### Rolling period returns (1 D / 1 W / 1 M)

Computed from a dedicated 30-day daily window regardless of the chart's granularity
(so the chips remain accurate even when the main chart is in weekly or monthly mode):

```
R_absolute(n days)   = profit[today] − profit[today − n]
R_percentage(n days) = R_absolute / gross_invested × 100
```

---

### Dividend calculations

**Per-share dividend value**

```
D_value = dividend_per_share(ex_date) × shares_held(ex_date)
```

Share count is snapshotted at the most recent date on or before the ex-date.

**Trailing twelve months (TTM) per quarter**

```
TTM[i] = Σ D[j]   for j = max(0, i−3) … i
```

A rolling four-quarter sum, so TTM[i] represents the income generated in the twelve months
ending at quarter i.

---

### FX conversion

Two separate conversion schemes are applied depending on what is being converted:

| What                              | Rate used                               | Why                                        |
| --------------------------------- | --------------------------------------- | ------------------------------------------ |
| Cost basis, commission, dividends | Spot rate on the transaction's own date | Locks the historical cost in base currency |
| Current market value              | Spot rate on each chart date            | Reflects live currency exposure            |

FX rates are forward-filled across gaps and backward-filled before the start of history.
`GBp` (pence) is automatically scaled by `× 0.01` to convert to GBP before any further
conversion.

---

### Multi-stock aggregation

When a stock's market is closed on a given day (weekend, holiday, or any other gap in the
price feed), `getPortfolioValues` carries the last known price forward to that date instead
of producing a `NaN` placeholder. This means every stock's value and profit series is always
continuous before it is summed across stocks:

```
portfolio_profit[t] = Σ stock_profit_i[t]
stock_profit_i[t]   = price_last_known_i[t] × shares_i[t] − invested_i[t] − commission_i[t]
```

Forward-filling is applied at the source (inside `getPortfolioValues`) so it covers the
leading edge of a date range too — previously a range starting on a weekend could produce
a leading `NaN` that could not be back-filled and caused the portfolio to show zero on that
day.

---

## 💳 Captain limits & subscription

Every "Ask the Captain" call costs OpenAI tokens, so the `captain` Lambda enforces two
layers of quota before it spends (atomic, race-free DynamoDB counters that self-expire via
TTL):

- **Per-user monthly quota** — fairness. Free users get `FREE_MONTHLY_LIMIT` calls/month;
  paid users get `PAID_MONTHLY_LIMIT`. Hitting it returns `429` and the chat panel shows an
  **Upgrade** call-to-action.
- **Global monthly ceiling** — the hard spend cap: once the whole user base makes
  `GLOBAL_MONTHLY_LIMIT` calls in a month, all captain calls stop until the next month
  (`0` disables it). Derive it from live pricing — `floor(monthly_budget / cost_per_call)`. At
  GPT-5.4-mini rates a worst-case call is ≈ $0.0105, so `450` keeps a $5/mo budget safe (~$4.73).
- **Admin bypass** — members of the Cognito `admin` group are unlimited.

Upgrades go through **Stripe Checkout** (run in _test mode_ until you're ready for real
charges). The `billing` Lambda's webhook is the **only** writer of a user's `plan` — the
client is never trusted to grant itself paid access.

### One-time prod setup (out-of-band — not managed by the stack)

```bash
# 1. Counters self-clean via TTL on the 'expiresAt' attribute (free).
aws dynamodb update-time-to-live --table-name sailor \
  --time-to-live-specification "Enabled=true, AttributeName=expiresAt"

# 2. Admin (free, unlimited) access — create the group, add yourself.
aws cognito-idp create-group --user-pool-id us-east-1_liCB4LgDE --group-name admin
aws cognito-idp admin-add-user-to-group --user-pool-id us-east-1_liCB4LgDE \
  --group-name admin --username <your-email>

# 3. Stripe secrets in SSM SecureStrings (free; no idle cost).
aws ssm put-parameter --name /sailor/stripe-secret-key     --type SecureString --value sk_test_...
aws ssm put-parameter --name /sailor/stripe-webhook-secret --type SecureString --value whsec_...

# 4. Backstop the OpenAI spend itself. AWS Budgets only sees AWS costs, NOT the
#    OpenAI bill (a separate vendor invoice), so the real out-of-band cap behind
#    the in-app global ceiling is OpenAI's own hard usage limit:
#    OpenAI Dashboard → Settings → Limits → set a monthly hard cap (e.g. $5) + alert.

# 5. (Optional) Catch AWS-side surprises — Lambda/API Gateway/DynamoDB — with an
#    AWS Budget (Cost → Budgets) at a low $/mo with an email alert. This does not
#    cover OpenAI; see step 4 for that.
```

Deploy with the price ID and ceiling, e.g.
`sam deploy --parameter-overrides StripePriceId=price_... GlobalMonthlyLimit=450`, then copy
the `BillingEndpoint` output into `environment.prod.ts → billingLambdaUrl` and configure the
`StripeWebhookEndpoint` output as the webhook destination in the Stripe Dashboard.

### Local dev

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

### Test users

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

## 🏗 Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the complete project layout, data flow, and
infrastructure decisions.
