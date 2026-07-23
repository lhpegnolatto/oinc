# web-skeleton

## Purpose

`apps/web` is Fynn's frontend: a Next.js App Router application that consumes
`apps/api` through a fully typed Hono RPC client, manages server state with
TanStack Query, and builds its UI on shadcn/ui. This capability covers the
skeleton — app bootstrapping, routing conventions, typed API access, and UI
foundation — before any feature modules exist.

## Requirements

### Requirement: Web boots as a Next.js App Router app
`apps/web` SHALL start a Next.js application using the App Router with a `src/`
directory, rendering a root layout successfully.

#### Scenario: Root layout renders
- **WHEN** `apps/web` is started in development mode and the root route is
  requested
- **THEN** the root layout renders without a server or client error

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

### Requirement: Type-safe API access via Hono RPC
`apps/web` SHALL consume `apps/api` exclusively through Hono's `hc` RPC client
typed against `apps/api`'s exported `AppType`, added as a `workspace:*`
type-only dependency — not hand-written `fetch` calls or duplicated Zod schemas
for data that mirrors an API input/output.

#### Scenario: RPC client is typed against AppType
- **WHEN** a module under `apps/web/src/modules/<name>/api.ts` calls the API
- **THEN** the call goes through an `hc<AppType>(...)` client instance, and the
  request/response shapes are inferred from `AppType` rather than manually typed

### Requirement: Server state via TanStack Query
`apps/web` SHALL have a TanStack Query provider configured at the app root, ready
for modules to wrap API calls in `useQuery`/`useMutation`.

#### Scenario: Query provider wraps the app
- **WHEN** the root layout is inspected
- **THEN** a TanStack Query client provider wraps the application tree

### Requirement: shadcn/ui initialized
`apps/web` SHALL have shadcn/ui initialized with the `new-york` style, `neutral`
base color, and CSS variables enabled, matching `.docs/architecture/frontend.md`'s
component conventions.

#### Scenario: components.json reflects the chosen configuration
- **WHEN** `apps/web/components.json` is inspected
- **THEN** it declares `"style": "new-york"`, `"tailwind.baseColor": "neutral"`,
  and `"tailwind.cssVariables": true`
