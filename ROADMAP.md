# Roadmap

The next chapter for sailor: a mobile-first UI/UX pass, then native iOS and Android apps
via **Capacitor**, then a full Angular modernization. Each phase lands as its own PR
series, and nothing below is implemented until its phase starts.

Task status: ✅ done · 🚧 in progress · ⬜ not started

Ground rules for every phase:

- The ~$5/month AWS cost ceiling holds. No new AWS services or always-on infrastructure
  without checking live pricing first.
- App Store / Play Store developer accounts already exist (fees are sunk cost) — store
  distribution adds **$0** in new recurring cost.
- `libs/shared/util` (the financial core, including `computePortfolioState()`) is
  framework-agnostic and stays untouched by all UI/platform work. The golden-master suite
  (`golden-portfolio.spec.ts`) is the regression tripwire for anything that touches the
  state layer.

## Why this order

**Phase 1 (UI/UX) → Phase 2 (Capacitor) → Phase 3 (modernization).**

- **UI/UX before Capacitor:** Apple rejects thin web wrappers (App Review Guideline 4.2,
  "minimum functionality"). A mobile-polished UI is a prerequisite for a credible store
  submission — and every improvement ships to the live web app immediately, with zero new
  toolchain risk.
- **Modernization last:** it's user-invisible, Angular 21 fully supports the current
  NgModule setup (there is no forcing function), and Capacitor wraps the built bundle —
  it's indifferent to Angular internals. Deferring it keeps the store-release path short
  and avoids running a store-stabilization period and an every-file refactor at the same
  time, which would double the regression surface.

---

## Phase 1 — Mobile-first UI/UX pass (web, ships continuously)

Goal: sailor feels like it was designed for a phone, not shrunk to fit one.

- [x] ✅ **Bottom tab bar navigation.** Replace the mobile hamburger-sidenav in
      `page-wrapper` with a bottom tab bar on small screens — the three authed routes
      (dashboard, portfolios, settings) fit the pattern exactly. Keep the sidenav at
      ≥ `md`. Migrate the hand-rolled `MediaQueryList` handling to CDK
      `BreakpointObserver` (already a dependency).
- [x] ✅ **Skeleton loading states.** One reusable `skeleton` component in
      `libs/frontend/ui` (Tailwind `animate-pulse`), applied on initial load to the
      dashboard (insights banner, summary tiles, holdings/chart area), the portfolio
      list, and the portfolio detail pane; the insights banner's bespoke shimmer was
      unified onto it. The slim progress bars remain for background refetches, where
      content is already on screen.
- [x] ✅ **Touch-target audit.** Everything tappable ≥ 44×44 px on sub-`md` layouts via
      a shared `touch-target` SCSS mixin: chips, holding/table row actions,
      portfolio-list actions, captain button, back button, dialog fields, date-picker
      trigger and month nav. Desktop keeps the denser pointer-sized controls. One
      documented exception: calendar day cells are 40×40 (dense 7-column grid on a
      390px phone; the panel widens on mobile to get there).
- [ ] ⬜ **Responsive dialogs.** `DialogService` is the single creation point — add
      responsive sizing there so all dialogs (transaction, holding-edit, CSV-upload,
      confirm, portfolio-name) render full-screen or as bottom sheets below the mobile
      breakpoint.
- [ ] ⬜ **Transactions table on small screens.** Card-per-row layout below `md` (or
      sticky first column + horizontal scroll — decide with a quick prototype).
- [ ] ⬜ **Chart touch ergonomics.** ECharts tooltips `confine: true`, resize on
      orientation change, larger axis-pointer hit areas.
- [ ] ⬜ **Landing page + `/demo` polish.** The demo is the first thing App Review (and
      a recruiter) sees.

**Acceptance:** Lighthouse mobile pass on the key routes; manual checklist at 360×640 and
390×844.

---

## Phase 2 — Capacitor: iOS + Android store releases

Goal: real apps in both stores, wrapping the existing Angular bundle. AWS delta: **$0**
(same API Gateway, Lambdas, Cognito).

### Integration

- [ ] ⬜ **Plain Capacitor CLI, not `@nxext/capacitor`.** The community Nx plugin
      historically lags Nx major versions; Capacitor itself is just
      `capacitor.config.ts` + `npx cap sync` and composes trivially with
      `nx build frontend`. Wrap it in `nx run-commands` targets (`cap-sync`, `cap-ios`,
      `cap-android`) in `apps/frontend/project.json`. Native projects live at
      `apps/frontend/ios` and `apps/frontend/android`;
      `webDir: '../../dist/apps/frontend'`. (Phase 3's builder migration moves the
      output to `dist/apps/frontend/browser` — update `webDir` in that PR.)
- [ ] ⬜ **Environments.** The native shell cannot use the dev-server proxy paths —
      native builds always use absolute API Gateway URLs (the prod file replacement).
      Add an optional `capacitor-dev` configuration pointing at the dev machine's LAN IP
      with `server: { cleartext: true }` for live-reload device testing
      (`cap run -l --external`).

### Mobile-critical changes

- [ ] ⬜ **Auth token storage.** `auth.service.ts` hardcodes
      `Storage: window.sessionStorage` in four places (plus session clearing on logout).
      Replace with one injected platform-aware storage adapter.
      `amazon-cognito-identity-js` requires a *synchronous* Storage interface while
      Capacitor storage plugins are async — so the native adapter is a write-through
      in-memory cache hydrated from the plugin before auth init (awaited at app start),
      backed by Keychain/Keystore via a secure-storage plugin (**not** plain
      `@capacitor/preferences`, which is unencrypted — these are auth tokens for
      financial data). Web keeps sessionStorage: zero behavior change. Verify the prod
      Cognito app client has `ALLOW_REFRESH_TOKEN_AUTH` so persisted sessions survive
      app restarts. `JwtInterceptor` needs no change.
- [ ] ⬜ **CORS.** Add `capacitor://localhost` (iOS WKWebView origin) and
      `https://localhost` (Android) to `AllowedOrigins` in `samconfig.toml`'s prod
      overrides — `services/shared/cors.py` already reflects allowlisted origins, so no
      code change.
- [ ] ⬜ **Stripe vs. store policy (the honest flag).** Apple Guideline 3.1.1 (and
      Google Play's equivalent billing rule) forbid selling digital subscriptions
      through an external checkout inside the app, and restrict steering users to the
      website. Plan: hide the Upgrade CTA and all Stripe entry points when
      `Capacitor.getPlatform() !== 'web'`. A web-purchased Captain Plus subscription
      still works in the app — entitlement lives in DynamoDB and is written only by the
      Stripe webhook (the Spotify model). The quota-hit `429` copy in native builds must
      be neutral ("monthly limit reached"), not a link to the website. Native IAP / Play
      Billing goes to the icebox unless mobile conversion ever matters.
- [ ] ⬜ **Safe areas.** `viewport-fit=cover` in `index.html` (currently absent);
      Tailwind arbitrary values for insets (`pt-[env(safe-area-inset-top)]`,
      `pb-[env(safe-area-inset-bottom)]` on the header/bottom-nav);
      `@capacitor/status-bar` styled to match `#0A1628`.
- [ ] ⬜ **Icons & splash.** `@capacitor/assets` generation (needs a 1024×1024 source
      image) + `@capacitor/splash-screen`.

### Build & release

- [ ] ⬜ **CI/CD stays cheap.** Native builds run locally in Xcode / Android Studio;
      Xcode-managed signing + Play App Signing; GitHub Actions stays web-only (no paid
      macOS runner minutes). Manual release path: `nx build frontend && npx cap sync`,
      then archive and upload from the IDEs. Fastlane → icebox.
- [ ] ⬜ **Release checklist.**
  - [ ] Bundle IDs registered (iOS + Android)
  - [ ] Privacy policy URL (required — the app handles financial data)
  - [ ] App Store privacy nutrition labels + Play Data Safety form
  - [ ] App Review demo account (seeded prod user with sample data, or point reviewers
        at `/demo`)
  - [ ] Export compliance: exempt (standard HTTPS only)
  - [ ] TestFlight + Play internal track before public release
  - [ ] Native version numbers synced from `package.json`

---

## Phase 3 — Angular modernization

Goal: bring the codebase to Angular's current idioms. Each step is independently
shippable and gated by `nx run-many -t lint test build --all`.

- [ ] ⬜ **Builder migration.** `@angular-devkit/build-angular:browser` → `application`
      (esbuild) via the official migration. Update Capacitor's `webDir` to
      `dist/apps/frontend/browser` in the same PR.
- [ ] ⬜ **Standalone migration.** Official `ng generate @angular/core:standalone`
      passes, in dependency order: leaf components in `libs/frontend/ui` → dissolve
      `UiModule` → the feature modules become `provideState`/`provideEffects` provider
      functions → `AppComponent` + `bootstrapApplication` with `provideRouter` and
      `provideHttpClient(withInterceptors([jwtInterceptor]))` (the interceptor becomes
      functional). **This is the PR that lifts the "AppComponent must remain
      non-standalone" invariant — edit CLAUDE.md in the same PR.**
- [ ] ⬜ **Signals adoption.** `toSignal(store.select(...))` in components replacing
      async pipes; the official signal-input/output migrations; an `OnPush` sweep.
      Zoneless is a stretch goal — verify `ngx-echarts` behavior first.
- [ ] ⬜ **NgRx → SignalStore: evaluate, don't commit.** Honest assessment: the ~15
      near-identical CRUD effects in `state.effects.ts` would map cleanly to SignalStore
      methods with `rxMethod`, but two architectural pieces depend on the NgRx action
      bus, which SignalStore doesn't have: the cross-slice price push (`getDataSuccess`
      → yahoo effect → `setChartData` into the state reducer) and the Yahoo-CSV-import
      handshake (`importYahooCsvParsed` → `importYahooCsvReady`). Migrating means
      restructuring those to direct store-to-store calls (a yahoo store injecting the
      portfolio store — legal under the existing `yahoo → state` dependency direction)
      or the `@ngrx/signals` events plugin. **Verdict: feasible but highest-risk,
      lowest-payoff step in this phase — do it only if classic NgRx becomes real
      friction.** Selectors keep delegating to `computePortfolioState()` either way; the
      golden-master suite guards the numbers.

---

## Icebox

Deliberately not scheduled:

- **Native IAP / Play Billing** — only if in-app conversion ever matters; the web-purchase
  entitlement model covers mobile users.
- **Push notifications** (e.g. price alerts) — FCM is free, but the trigger side needs an
  AWS component; check pricing against the cost ceiling first.
- **PWA fallback** (manifest + service worker) — superseded by the Capacitor apps, but
  cheap to add if an installable web version is ever wanted.
- **Fastlane / mobile CI** — revisit if releases become frequent enough to hurt.
- **Zoneless Angular** — after Phase 3's signals work proves out.
