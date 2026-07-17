# CLAUDE.md

1. Read README.md (setup, financial formulas) and ARCHITECTURE.md (design) before making
   changes. Operational runbooks live in docs/OPERATIONS.md; planned work in ROADMAP.md —
   do not implement roadmap phases unless asked.

## Critical invariants

- AppComponent must remain non-standalone (scheduled to be lifted in the modernization
  phase — see ROADMAP.md; until that migration lands, do not convert it).
- state must never import yahoo.
- Portfolio calculations belong in computePortfolioState(), not reducers.
- The product name is always written **sailor** — all lowercase, including at the start of a sentence or heading.
- AWS costs must stay ≈ $5/month — no new AWS services or always-on infrastructure without
  checking pricing first.

## Testing

- New business logic must have unit tests.
- Follow existing testing patterns.

## Validation

Run before completion:

nx run-many -t lint test build --all

## Frontend styling

- **No @angular/material**: Do not add `@angular/material` imports. `@angular/cdk` is
  allowed for overlay, portal, and focus-trap primitives.
- **Tailwind-first**: All new component styles use Tailwind utility classes. The
  canonical source of truth for colours, radii, shadows, and typography is
  `apps/frontend/tailwind.config.js`.
- **No hardcoded values**: Never write hex colours, rgba literals, or pixel sizes
  directly in component SCSS. Use token names (`text-gold`, `bg-bg-surface`,
  `shadow-card`, `font-serif`) or SCSS tokens via `@use 'tokens' as *`.
- **SCSS component files**: May use `@use 'tokens' as *` for values not expressible
  in Tailwind (e.g. `rgba($color-gold, 0.07)` patterns). Mixins in `_mixins.scss`
  remain available.
- **Icons**: Use `lucide-angular`. Register new icons in
  `libs/frontend/ui/src/lib/icons.ts` and use `<lucide-icon name="..." [size]="20">`
  in templates. Do not use `<mat-icon>` or the Material Icons font.
- **Dialogs**: Use `DialogService` from `libs/frontend/ui/src/lib/dialog/dialog.service.ts`.
  Do not use `MatDialog`.
- **Toasts**: Use `ToastService` from `libs/frontend/state/src/lib/toast.service.ts`.
  Do not use `MatSnackBar`.

## Workflow

- Create a branch for changes.
- Commit changes and open a PR.
- Include a manual test checklist in the PR.
- Update documentation only when implementation changes make it inaccurate.
- If a financial formula in `libs/shared/util/src/lib/` is added, changed, or removed, update the corresponding section in `README.md`.
