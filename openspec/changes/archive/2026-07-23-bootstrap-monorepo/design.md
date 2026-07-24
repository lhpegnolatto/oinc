## Context

The repo currently has zero code — only `.docs/architecture/` (decisions) and
`.docs/product/` (intent), plus OpenSpec scaffolding. This is the first change, so
there is no existing `apps/`, `packages/`, root tooling, or `openspec/specs/` to
build against. Everything here is new construction against already-decided
architecture, not a redesign — the job is translating `overview.md`, `frontend.md`,
`backend.md`, and `testing.md` into a running skeleton, and making the handful of
placeholder decisions those docs left open.

## Goals / Non-Goals

**Goals:**
- `bun install && bun run build && bun run lint && bun test` succeed from a clean
  checkout.
- `apps/api` boots as a Hono app, connects to Postgres through Drizzle, and exports
  `AppType`.
- `apps/web` boots as a Next.js App Router app, consumes `AppType` through Hono's
  `hc` client, and has shadcn/ui initialized and usable.
- The module/CQRS/routing-only folder conventions from `backend.md`/`frontend.md`
  exist as real, empty-but-correct directories so the first domain change has
  somewhere to put code without re-deriving structure.
- Local Postgres (dev + test databases) is reachable via one `docker-compose up`.

**Non-Goals:**
- No Better Auth/Google wiring, no `requireAuth` middleware, no session handling —
  a separate future change owns auth end-to-end.
- No `apps/web/src/app/(private)/` route group — see Decisions below.
- No domain modules (wallets, transactions, credit cards, investments) — this
  change proves the skeleton boots, not that a feature works.
- No CI pipeline — `.docs/architecture/overview.md` already treats this as a
  deliberate, separately-revisited gap.

## Decisions

**`app/(private)/` is not created in this change, not stubbed.**
`frontend.md` describes `(private)/layout.tsx` as asserting a session via Better
Auth and redirecting to `(public)/login` otherwise. Since auth doesn't exist yet,
there's no real check to write. Alternatives considered:
- *Stub layout that always passes through* — rejected: it's a fake guard that looks
  like protection but isn't, and the project's own conventions (CLAUDE.md) warn
  against half-finished implementations for a case that can't happen yet.
- *Stub layout that always redirects* — rejected: blocks all private routes
  pre-auth for no benefit, since no private routes exist yet either.
- **Chosen: omit the folder entirely.** The auth change adds `(private)/` together
  with the real session check in the same commit that makes it meaningful.

**`shared/auth` is not created in this change.**
Follows from the same reasoning — `backend.md`'s Hono wiring example attaches
`user`/`session` to context via Better Auth on every request; without Better Auth
configured, that middleware would either be dead code or need a fake session
shape. The auth change owns `shared/auth`, `requireAuth`, and the `Env` type's
`Variables` shape in one place.

**`docker-compose.yml` lives at the repo root, not `apps/api/`.**
`backend.md` leaves this open ("repo root (or `apps/api/`)"). Root is chosen
because `packages/env` and any future service (e.g. a worker) may also need the
same Postgres instance, and a root compose file is discoverable without knowing
which app "owns" infra first.

**Test database is a second database in the same Postgres container, e.g.
`oinc_test`**, per `testing.md`'s transaction-rollback isolation model — not a
second container. One `docker-compose up` is enough for both dev and test.

**shadcn/ui `baseColor: "neutral"`**, resolving the placeholder in `frontend.md`'s
example `components.json`. Confirmed with the user; no strong product reason to
prefer `zinc`/`slate` yet, and `neutral` was already the doc's own placeholder
value.

**shadcn/ui `nova` preset, `base` (base-ui) primitives.** Discovered mid-implementation
that the installed shadcn CLI no longer accepts `frontend.md`'s original
`style: "new-york"` flag — that two-style system was replaced by six named presets
(`nova`, `vega`, `maia`, `lyra`, `mira`, `luma`) plus a separate `--base` flag
(`radix`/`base`/`aria`) for the primitive library. Presented the options to the
user; confirmed `nova` (the CLI's own `--defaults` preset) paired with `base`
(matching `frontend.md`'s pre-existing "base-ui primitives" line). `nova`'s default
base color already resolves to `neutral`, so the color decision above still holds.
`frontend.md` updated in place rather than left stale.

**Smoke tests, not use-case tests, for this change.**
`testing.md` requires tests to map to real use cases/flows. There are no use cases
yet — the only things worth asserting are "the Hono app responds to a request" and
"the Next.js app renders its root layout" (plus, if feasible, "the app can open a
connection to Postgres"). Framing these explicitly as smoke tests (not use-case
tests) avoids the anti-pattern `testing.md` warns about — tests that exist to pad
coverage rather than verify a real flow — while still proving `bun test` runs in
both apps.

**`packages/env` ships one schema (`dbEnv`, covering `DATABASE_URL`) rather than
per-concern schemas (`authEnv`, etc.) yet.** `overview.md` recommends splitting by
concern "as the number of variables grows" — with only one variable needed today,
a single schema is simpler and the split happens naturally when the auth change
adds `authEnv`.

## Risks / Trade-offs

- **Skeleton-only means the architecture is unvalidated by a real feature** →
  Mitigated by keeping this change strictly infra (no domain modules to get wrong)
  and by the next change (auth) being the first real test of the module/CQRS
  wiring end-to-end.
- **Root `docker-compose.yml` couples `apps/api` to root-level infra decisions** →
  Acceptable trade-off; revisit if `apps/api` ever needs to be deployed/built
  independently of the rest of the monorepo.
- **Omitting `(private)/` means there's no visual proof the route-group pattern
  works until the auth change** → Accepted; `(public)/` still proves the route
  group mechanism (folder → URL behavior) works, just not the session-guard half.
- **Pinning exact versions (Turborepo, Biome, Next.js, Hono, Drizzle, Better Auth's
  eventual version) now means an early upgrade cycle** → Acceptable; `overview.md`
  and `backend.md` only specify major versions (`^2.x` etc.), so tasks.md should
  pin latest stable at implementation time rather than this design guessing exact
  patch versions that will be stale by the time it's built.

## Migration Plan

Not applicable — this is new construction, not a migration of existing behavior.
Implementation order (root tooling → `packages/env` → `apps/api` → `apps/web`) is
enforced by `tasks.md`, since `apps/web`'s Hono RPC client has a structural
dependency on `apps/api`'s exported `AppType`.

## Open Questions

- None blocking implementation. The one open item from `overview.md` — enabling
  Turborepo remote caching — is explicitly deferred there until CI exists, so it's
  out of scope here too.
