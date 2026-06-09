# Architecture

An [Nx](https://nx.dev) monorepo: an **Angular 21 + NgRx 21** frontend and a **Python AWS Lambda +
DynamoDB** backend (managed with AWS SAM), authenticated with **Cognito (OIDC)**. It tracks a
stock/dividend portfolio, imports DEGIRO CSV exports, and pulls prices from Yahoo Finance.

See [README.md](README.md) for setup and run instructions.

## Projects

```
apps/
  frontend/            Angular shell: routing, OIDC auth, the JWT HTTP interceptor, app module
libs/
  frontend/ui/         Presentational components (dashboard, charts, tables, landing page)
  frontend/state/      NgRx "state" slice — portfolio transactions
  frontend/yahoo/      NgRx "yahoo" slice — price tickers
  frontend/captain/    NgRx "captain" slice — "Ask the Captain" GenAI insights
  shared/util/         Framework-agnostic domain logic (pure, heavily unit-tested)
services/
  handler_dynamodb.py  DynamoDB Lambda — CRUD + Cognito JWT auth
  handler_yahoo.py     Yahoo Finance Lambda — fan-out price fetch
  handler_captain.py   Captain Lambda — OpenAI chat/insights + auth + usage quotas
  handler_billing.py   Billing Lambda — Stripe Checkout + webhook (subscription)
  shared/              Shared utilities (cors.py, auth.py, secrets.py, db.py)
  requirements.txt     Python dependencies for all Lambdas
  init_dynamodb.py     One-time local dev table setup
```

Module boundaries are enforced by `@nx/enforce-module-boundaries`. Dependencies flow one way:
`ui` / `state` / `yahoo` / `captain` → `util`; `yahoo` / `captain` → `state` (never the
reverse — see "Prices" below). `captain` never imports `yahoo`.

## Data flow

The **reducer stores only raw inputs**; everything derived is computed on demand in **memoized
selectors**. This keeps the reducer pure/cheap and the math testable in isolation.

```
component ──dispatch(getData)──▶ getData$ effect ──▶ StateService.getData()
                                                        │  HTTP GET (zod-validated)
                                                        ▼
                          getDataSuccess({ transactionsDbo }) ──▶ reducer: store raw transactionsDbo
                                                        │
                          selectPortfolio (memoized) = computePortfolioState(transactionsDbo, tickers)
                                                        │  derives stocks, dates, summary, chart data
                                                        ▼
                          selectState ──(async pipe)──▶ components render
```

- **`computePortfolioState(transactionsDbo, tickers)`** ([libs/shared/util/src/lib/portfolio.ts])
  is the single pure function that turns the raw inputs into the full view-model. It runs in two
  stages: transaction-derived data (amounts, dividends, invested totals), then price-derived data
  (portfolio value, profit, returns, yield) once tickers are present.
- **`selectState`** ([state.selectors.ts]) composes the memoized `selectPortfolio` with
  `loading`/`error`, returning the shape components consume (`transactions`, `stocks`, `dates`,
  `summary`, `currencies`, `loading`, `error`).

### Prices (the cross-slice bit)

`state` must not depend on `yahoo` (it would be a circular lib dependency), so prices are _pushed
into_ `state` via an action rather than read across slices:

```
getDataSuccess ──▶ yahoo getTicker$ effect ──▶ YahooService.getTickers() (zod-validated)
                                                   │
                                 setChartData({ tickers }) ──▶ state reducer: store raw tickers
                                                   │
                                 selectPortfolio recomputes WITH prices
```

Save/delete/import don't refetch prices — `selectPortfolio` recomputes from the changed
transactions using the tickers already in the store.

### Loading, errors, caching

- The reducer tracks `loading`/`error` across the request → success/failure triad; a `showError$`
  effect surfaces failures as a toast (via `ToastService`), and `page-wrapper` shows a progress bar.
- `getData` is cached for 30s (`lastFetched`); a repeat within the window serves `getDataCached`
  (no re-fetch).
- HTTP calls have timeouts + `retryWithBackoff()` (retries transient errors only); the Yahoo
  Lambda has a per-request socket timeout.

## Auth

Cognito User Pool auth (`amazon-cognito-identity-js`). After login the **ID token** is attached to
every HTTP request by `JwtInterceptor`. Each Lambda **verifies the token's signature** against the
Cognito JWKS (not just decodes it) and uses the `sub` claim as the DynamoDB partition key, so a
user can only read/write their own data.

### Authentication + "has the user paid?" flow

The same token proves _who_ the user is (`sub`), whether they're an **admin** (`cognito:groups`),
and — combined with their DynamoDB record — whether they're on a **paid** plan. Identity lives in
Cognito; entitlement (`plan`) lives in DynamoDB and is written **only** by the Stripe webhook.

```
            ┌─────────┐   sign in    ┌──────────────────┐
            │ Browser │ ───────────▶ │ Cognito User Pool │
            │ (Angular)│ ◀─────────── │  (issues JWTs)    │
            └────┬─────┘   ID token   └──────────────────┘
                 │  ID token in sessionStorage; JwtInterceptor adds
                 │  "Authorization: <id-token>" to every request
                 ▼
          ┌──────────────┐
          │ API Gateway  │
          └──────┬───────┘
                 ▼
        ┌─────────────────────────────────────────────────────────┐
        │ Lambda (captain / dynamodb / billing)                    │
        │ 1. verify_token(): fetch JWKS (cached) → check signature, │
        │    audience (client id), issuer, expiry, token_use=id     │
        │    → extract  sub  and  cognito:groups                    │
        │                                                           │
        │ 2. entitlement (captain quota path):                      │
        │      'admin' in cognito:groups ? ──▶ bypass (unlimited)   │
        │      else GetItem userId=sub → read `plan`                │
        │            plan == 'paid' ? PAID_LIMIT : FREE_LIMIT       │
        │      atomic ADD on usage#<sub>#<month> guarded by         │
        │            ConditionExpression count < limit              │
        │            pass → call OpenAI · fail → 429                │
        └─────────────────────────────────────────────────────────┘

  How `plan` becomes 'paid' (the only writer is the webhook):

    Browser ─Upgrade─▶ POST /billing/checkout (authed; client_reference_id=sub)
            ◀─ Stripe Checkout URL ─ Lambda
    Browser ─pay (test card)─▶ Stripe-hosted Checkout
    Stripe  ─POST /billing/webhook (signed)─▶ Lambda
            verify signature → SET plan='paid' on userId=sub
```

### Dev vs prod wiring

Identity verification and the entitlement logic are **identical** in both; only the backing
services differ:

| Concern                     | Development (`sam local`)                                         | Production (deployed)                   |
| --------------------------- | ----------------------------------------------------------------- | --------------------------------------- |
| Cognito pool                | dedicated `sailor-dev` pool (isolates test users + `admin` group) | prod pool                               |
| JWKS verification           | same (live fetch from Cognito)                                    | same                                    |
| DynamoDB (`plan`, counters) | DynamoDB Local (Docker)                                           | `sailor` table                          |
| Stripe secret/webhook       | from `env.json`                                                   | from SSM SecureStrings                  |
| Stripe mode                 | **test**                                                          | test (until live keys are set)          |
| Webhook delivery            | `stripe listen` relay → `localhost:3000`                          | Stripe Dashboard endpoint → API Gateway |
| `GLOBAL_MONTHLY_LIMIT`      | `0` (disabled)                                                    | derived from budget (e.g. 450)          |

> **Note — isolated dev pool.** Dev uses its own `sailor-dev` Cognito pool, so test users and the
> `admin` group never touch prod. `environment.ts` (frontend) and the local Lambdas' `env.json`
> both point at it; `environment.prod.ts` keeps the prod pool. DynamoDB and Stripe are isolated too
> (local table; test mode). See the README's "Test users" section for the pool/seed setup.

## Backend

Three Python 3.13 Lambdas behind one API Gateway:

- **dynamodb** (`handler_dynamodb.py`) — CRUD over the `sailor` table (partition key =
  Cognito `sub`); verifies the Cognito ID token's signature via JWKS; CORS via an origin allowlist
  that reflects the request `Origin`.
- **yahoo** (`handler_yahoo.py`) — fans out to the Yahoo Finance API for the requested symbols
  (`ThreadPoolExecutor`, per-request timeout), returning per-symbol results.
- **captain** (`handler_captain.py`) — verifies the Cognito ID token, enforces usage quotas,
  then calls the OpenAI Chat Completions API. The OpenAI key is read from an SSM Parameter
  Store SecureString (cached module-level, like the JWKS cache), with an `OPENAI_API_KEY`
  env-var fallback for local dev. See "Ask the Captain (GenAI)" below.
- **billing** (`handler_billing.py`) — Stripe Checkout (`/billing/checkout`), webhook
  (`/billing/webhook`) and portal (`/billing/portal`) behind one `{proxy+}` route. The webhook
  verifies the Stripe signature and is the **only** writer of a user's `plan`; the client can
  never grant itself paid access.

`shared/db.py` centralises the DynamoDB table handle (dev-vs-prod endpoint selection) and the
atomic monthly-counter primitives used for quotas — race-free via a DynamoDB
`ConditionExpression`, with a TTL attribute so old counters self-delete (free). Usage counters
live in the same `sailor` table under reserved `usage#...` partition keys, so no new table or
schema change is needed.

`sam build` packages each handler with `services/requirements.txt` (PyJWT + cryptography +
openai); `boto3` is provided by the Lambda Python runtime and not bundled.

## Ask the Captain (GenAI)

A sailing-themed assistant ("the Captain") that **explains** the user's portfolio in plain
language — a chat panel plus an auto-generated, daily-cached "Captain's read" on the dashboard.

- **Deterministic first, LLM second.** The client computes a compact summary
  (`buildCaptainSummary`) and the biggest movers (`detectMovers`) from the existing `selectState`
  view-model, then sends only that JSON — not raw time-series — to the Lambda. The model narrates;
  it never computes. This keeps tokens (and cost) low and the numbers reproducible.
- **No financial advice.** The Lambda's system prompt scopes answers to the provided summary and
  refuses any advice/forecast/recommendation with a varied, funny sailing-themed deflection. A
  persistent disclaimer reinforces this in the UI.
- **Cost control.** Requests go through an authenticated Lambda (key server-side), use the cheapest
  small model with a tight `max_tokens`, and the dashboard insight is cached per day + portfolio in
  `localStorage`, so a reload or same-day revisit triggers no new call. On top of that, two quota
  layers bound spend: a **per-user monthly limit** (free vs paid, raised via a Stripe subscription)
  and a **global monthly ceiling** that hard-stops all calls once reached — the real "never spend
  more than I earn" guarantee. Cognito `admin`-group members bypass both. See "Captain limits &
  subscription" in the README.
- **Demo mode.** The public `/demo` page is unauthenticated, so it never calls the Lambda — the chat
  and insight render canned, offline responses from `captain.demo.ts` (the same advice-refusal
  behaviour, mirrored client-side).

```
component ─build summary (selectState)→ captain effect ─POST /captain→ handler_captain.py → OpenAI
                                              │  demo? → canned reply, no network
                                  loadInsights cache (localStorage, per day + portfolio)
```

## Infrastructure & CI

- **IaC:** `template.yaml` (SAM) defines the Lambdas, API Gateway and env vars; `samconfig.toml`
  holds per-stage deploy params. The `sailor` table is referenced, not managed by the
  stack (so a deploy can't replace user data).
- **Deploy:** `buildspec.yml` builds the frontend, bundles the Lambdas, and runs
  `sam deploy --config-env prod`.
- **CI:** `.github/workflows/ci.yml` runs `nx affected -t lint test build` on every PR and on
  pushes to `main`. The financial core in `shared/util` is the most heavily tested area.

[libs/shared/util/src/lib/portfolio.ts]: libs/shared/util/src/lib/portfolio.ts
[state.selectors.ts]: libs/frontend/state/src/lib/+state/state.selectors.ts
