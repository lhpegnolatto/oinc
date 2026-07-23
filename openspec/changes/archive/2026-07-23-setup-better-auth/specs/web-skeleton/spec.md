## MODIFIED Requirements

### Requirement: app/ is routing-only
`apps/web/src/app` SHALL contain only route segments, layouts, and
loading/error boundaries. Feature logic (data fetching, mutations, view state,
feature-specific components) SHALL live under `apps/web/src/modules/<name>/`.
Both `(public)/` and `(private)/` route groups MAY exist once a change introduces
a private route group — this requirement no longer asserts `(private)/`'s absence.

#### Scenario: Both route groups exist once private routes are introduced
- **WHEN** `apps/web/src/app` is inspected after a `(private)/` route group has
  been introduced
- **THEN** both `(public)/` and `(private)/` route groups exist, and no
  feature-specific data-fetching or mutation logic lives directly under `app/`
