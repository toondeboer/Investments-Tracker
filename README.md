# sailor

[![CI](https://github.com/toondeboer/sailor/actions/workflows/ci.yml/badge.svg)](https://github.com/toondeboer/sailor/actions/workflows/ci.yml)
![Angular](https://img.shields.io/badge/Angular-21-DD0031?logo=angular&logoColor=white)
![NgRx](https://img.shields.io/badge/NgRx-21-BA2BD2?logo=reactivex&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.13-3776AB?logo=python&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-Lambda%20%2B%20DynamoDB-FF9900?logo=amazonaws&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v3-06B6D4?logo=tailwindcss&logoColor=white)

Multi-portfolio investment tracker with per-currency holdings, dividend tracking, and
time-series P&L charts. Live at **[sailor.toondeboer.com](https://sailor.toondeboer.com)**.

An [Nx](https://nx.dev) monorepo: **Angular 21 + NgRx** frontend and **Python AWS Lambda +
DynamoDB** backend, authenticated with Cognito. See [ARCHITECTURE.md](ARCHITECTURE.md) for
the full project layout and data flow.

---

## ⚡ Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 22+ | `brew install node` |
| Yarn | 1.x classic | `npm i -g yarn` |
| Python | 3.13 | `brew install python@3.13` |
| Docker | any | [docker.com](https://www.docker.com) |
| AWS SAM CLI | any | `brew install aws-sam-cli` |

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

```bash
sam build
AWS_ACCESS_KEY_ID=local AWS_SECRET_ACCESS_KEY=local sam local start-api
```

Serves Lambda functions on `http://localhost:3000`. Re-run `sam build` after any Lambda change.

> **Ask the Captain (OpenAI):** the `captain` Lambda needs an OpenAI API key. It is read from the
> `OPENAI_API_KEY` env var first, falling back to SSM — so:
>
> - **Local dev** — copy `env.json.example` to `env.json` (gitignored), paste your key, and pass it
>   to SAM: `sam local start-api --env-vars env.json`. (Or just `export OPENAI_API_KEY=sk-...` in the
>   shell instead.)
> - **Production** — the key lives in an SSM Parameter Store SecureString (free; no idle cost), created
>   once: `aws ssm put-parameter --name /sailor/openai-api-key --type SecureString --value sk-...`

> **Tip:** The dummy credentials prevent `sam local` from failing on an expired AWS SSO session.
> The Lambda talks to local DynamoDB with fake creds and never calls real AWS. Alternatively
> run `aws sso login` to use real credentials.

### 4 — Frontend

```bash
nx serve frontend
```

Open `http://localhost:4200`. The dev server proxies `/microservice`, `/yahoo_finance` and
`/captain` to the SAM APIs on `:3000`.

---

## 🔧 Useful commands

| Command | Purpose |
|---|---|
| `nx serve frontend` | Dev server with hot reload |
| `nx run-many -t test` | Run all unit tests |
| `nx test util` | Test a single project |
| `nx lint <project>` | Lint a project |
| `nx build frontend` | Production build |
| `nx affected -t lint test build` | What CI runs on a PR |
| `sam build` | Package Python Lambdas |

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

| Symbol | Meaning |
|---|---|
| EMV | Ending market value (year-end or today for the current year) |
| BMV | Beginning market value (prior year-end; 0 for the first year) |
| net_flows | Cash into the portfolio (buys +, sells −, dividends −) |
| w_i | Time-weight: fraction of the year the cash was invested |

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

| What | Rate used | Why |
|---|---|---|
| Cost basis, commission, dividends | Spot rate on the transaction's own date | Locks the historical cost in base currency |
| Current market value | Spot rate on each chart date | Reflects live currency exposure |

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

## 🏗 Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the complete project layout, data flow, and
infrastructure decisions.
