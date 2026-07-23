## MODIFIED Requirements

### Requirement: shadcn/ui initialized
`apps/web` SHALL have shadcn/ui initialized with the `base-nova` preset (base-ui
primitives), `neutral` base color, and CSS variables enabled, matching
`.docs/architecture/frontend.md`'s component conventions.

#### Scenario: components.json reflects the chosen configuration
- **WHEN** `apps/web/components.json` is inspected
- **THEN** it declares `"style": "base-nova"`, `"tailwind.baseColor": "neutral"`,
  and `"tailwind.cssVariables": true`

## ADDED Requirements

### Requirement: Private routes share a persistent app shell
`app/(private)/*` routes SHALL render inside a shared, persistent app shell (a
sidebar plus header) provided by `app/(private)/layout.tsx`, rather than each
private page owning its own full-page layout markup.

#### Scenario: Dashboard renders inside the shared shell
- **WHEN** a signed-in user requests `/dashboard`
- **THEN** the page content renders inside the shared sidebar/header shell, and the
  page itself does not define its own top-level page wrapper

#### Scenario: Shell reflects the signed-in user
- **WHEN** the shared app shell renders for a signed-in user
- **THEN** it displays that user's identity (name/email/avatar) sourced from the
  session already resolved server-side by `app/(private)/layout.tsx`, without an
  additional client-side session fetch
