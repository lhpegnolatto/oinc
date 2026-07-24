## ADDED Requirements

### Requirement: API boots as a Hono app
`apps/api` SHALL start a Hono application that listens for HTTP requests under the
Bun runtime, with no Node.js compatibility shims required.

#### Scenario: App responds to a request
- **WHEN** `apps/api` is started and a request is made to any mounted route
- **THEN** the Hono app returns an HTTP response (not a runtime crash or unhandled
  rejection)

### Requirement: Typed contract exported for client consumption
`apps/api` SHALL export its Hono app's type (`AppType`) so other workspaces can
consume it for compile-time type inference, with no runtime coupling.

#### Scenario: AppType is importable from another workspace
- **WHEN** another workspace package imports `AppType` from `apps/api`
- **THEN** the import resolves to a type-only reference (erased at build time) and
  introduces no runtime dependency on `apps/api`'s code

### Requirement: Postgres connectivity via Drizzle
`apps/api` SHALL connect to PostgreSQL through a Drizzle client configured via
`drizzle-kit`, using `DATABASE_URL` from `@oinc/env`.

#### Scenario: App connects to local Postgres
- **WHEN** the local `docker-compose` Postgres service is running and `apps/api`
  starts with a valid `DATABASE_URL`
- **THEN** the Drizzle client can open a connection and execute a trivial query
  against it

### Requirement: Uniform error response contract
Every error returned by `apps/api` SHALL be shaped as
`{ error: { code, message, details } }` via a shared error handler, rather than a
controller hand-building a response body.

#### Scenario: Unexpected error does not leak internals
- **WHEN** an unhandled error occurs while processing a request
- **THEN** the response is a `500` shaped as `{ error: { code: "INTERNAL_ERROR",
  message: "...", details: [] } }`, and no internal error detail (stack trace,
  raw exception message) is included in the response body

### Requirement: Module folder conventions exist without domain modules
`apps/api/src` SHALL contain the `app/` and `shared/` folder structure described in
`.docs/architecture/backend.md` (`shared/db`, `shared/errors`, `shared/middleware`),
but SHALL NOT contain `shared/auth` or any `modules/<name>` domain module in this
change.

#### Scenario: No domain modules or auth exist yet
- **WHEN** `apps/api/src` is inspected
- **THEN** `shared/db`, `shared/errors`, and `shared/middleware` exist, while
  `shared/auth` and `modules/` are absent, reflecting that auth and domain
  features are out of scope for this change
