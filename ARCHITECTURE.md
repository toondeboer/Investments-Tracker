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
  shared/util/         Framework-agnostic domain logic (pure, heavily unit-tested)
services/
  handler_dynamodb.py  DynamoDB Lambda — CRUD + Cognito JWT auth
  handler_yahoo.py     Yahoo Finance Lambda — fan-out price fetch
  shared/              Shared utilities (cors.py, auth.py)
  requirements.txt     Python dependencies for all Lambdas
  init_dynamodb.py     One-time local dev table setup
```

Module boundaries are enforced by `@nx/enforce-module-boundaries`. Dependencies flow one way:
`ui` / `state` / `yahoo` → `util`; `yahoo` → `state` (never the reverse — see "Prices" below).

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

`state` must not depend on `yahoo` (it would be a circular lib dependency), so prices are *pushed
into* `state` via an action rather than read across slices:

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

OIDC via Cognito (`angular-auth-oidc-client`). After login the **ID token** is attached to every
HTTP request by `JwtInterceptor`. The DynamoDB Lambda **verifies the token's signature** against
the Cognito JWKS (not just decodes it) and uses the `sub` claim as the DynamoDB partition key, so
a user can only read/write their own data.

## Backend

Two Python 3.13 Lambdas behind one API Gateway:

- **dynamodb** (`handler_dynamodb.py`) — CRUD over the `sailor` table (partition key =
  Cognito `sub`); verifies the Cognito ID token's signature via JWKS; CORS via an origin allowlist
  that reflects the request `Origin`.
- **yahoo** (`handler_yahoo.py`) — fans out to the Yahoo Finance API for the requested symbols
  (`ThreadPoolExecutor`, per-request timeout), returning per-symbol results.

`sam build` packages each handler with `services/requirements.txt` (PyJWT + cryptography);
`boto3` is provided by the Lambda Python runtime and not bundled.

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
