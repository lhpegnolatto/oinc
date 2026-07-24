## Why

oinc currently has architecture decisions written down (`.docs/architecture/`,
`.docs/product/`) but no code — no `apps/`, no `packages/`, no root tooling. Every
future change (auth, wallets, transactions, ...) needs a monorepo that actually
builds, lints, and boots before it can add a single line of domain logic. This change
turns the documented decisions into a running skeleton so that work can start.

## What Changes

- Add root Turborepo/Bun tooling: `package.json` (workspaces), `turbo.json`,
  root `biome.json`, `.gitignore`, pinned `packageManager`.
- Add `packages/env` (`@oinc/env`) with a shared server env schema
  (`@t3-oss/env-core`) covering `DATABASE_URL` for now; apps extend it rather than
  reading `process.env` directly.
- Add `apps/api` skeleton: Hono app that boots and exports `AppType`, `shared/db`
  (Drizzle client + `drizzle-kit` config against Postgres), `shared/errors`
  (`ApiError` hierarchy + the `{ error: { code, message, details } }` contract),
  `shared/middleware` (request id, logging, global error handler). No
  `shared/auth` and no `modules/` yet — those are out of scope here.
- Add `apps/web` skeleton: Next.js App Router app (`src/` dir) that boots, Tailwind +
  shadcn/ui initialized (`new-york` style, `neutral` base color), a TanStack Query
  provider, and a Hono RPC (`hc`) client wired against `apps/api`'s `AppType` via a
  `workspace:*` type-only dependency. Only `app/(public)/` is scaffolded — see
  Impact below for why `(private)/` is deliberately not created yet.
- Add a root `docker-compose.yml` providing Postgres for local dev plus a second
  database for tests, matching the transaction-rollback test isolation approach in
  `.docs/architecture/testing.md`.
- Add a minimal smoke test per app (e.g. "the Hono app responds", "the Next.js app
  renders its root layout") to prove `bun test` runs in both apps — not use-case
  tests, since there are no use cases yet.

## Capabilities

### New Capabilities
- `monorepo-tooling`: Turborepo/Bun workspace wiring, Biome as the single
  linter/formatter, and the scripts (`build`, `dev`, `lint`, `test`, `check-types`)
  that fan out across `apps/*` and `packages/*`.
- `env-config`: `@oinc/env` as the single source of validated environment variables,
  consumed by both apps instead of raw `process.env` access.
- `api-skeleton`: `apps/api` boots as a Hono app, connects to Postgres via Drizzle,
  and returns errors through the shared `{ error: { code, message, details } }`
  contract — with no domain modules or auth wired in yet.
- `web-skeleton`: `apps/web` boots as a Next.js App Router app with the
  routing-only `app/` convention, shadcn/ui initialized, and a type-safe Hono RPC
  client wired against `apps/api`.

### Modified Capabilities
- None — this is the first change in the repo, there are no existing specs to modify.

## Impact

- **New**: root `package.json`, `turbo.json`, `biome.json`, `.gitignore`,
  `docker-compose.yml`; `packages/env/*`; `apps/api/*` (excluding `shared/auth` and
  `modules/`); `apps/web/*` (excluding `app/(private)/`).
- **Explicitly deferred (separate future change)**: Better Auth + Google wiring,
  `requireAuth` middleware, `apps/web`'s `app/(private)/` route group and its
  session guard, and any domain module (e.g. wallets). `app/(private)/` is not
  created as an empty/stubbed folder — it starts existing when the auth change adds
  it for real, rather than shipping a fake guard now.
- **No frequent user-facing action** is introduced by this change (no UI features,
  no keyboard-shortcut/sheet requirement applies — this is infrastructure only).
- **Dependencies**: introduces Turborepo, Biome, Hono, Drizzle ORM, `@t3-oss/env-core`,
  Next.js, Tailwind, shadcn/ui, TanStack Query as new root/workspace dependencies.
