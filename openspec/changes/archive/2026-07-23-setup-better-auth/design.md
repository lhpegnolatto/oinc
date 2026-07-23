## Context

Neither app has any auth today: `apps/api`'s `registerRoutes` is a no-op and
`apps/web`'s `(private)` route group doesn't exist yet. `apps/web` and `apps/api` are
genuinely separate deployables — the browser calls `apps/api` directly via Hono RPC
(`hc<AppType>`), there is no Next.js rewrite/proxy in front of it — so every session
cookie set by Better Auth is a **cross-origin** cookie from the browser's point of view,
in dev (`localhost:3000` → `localhost:3001`) and in production alike. That fact drives
most of the decisions below; a same-origin setup (Next API routes, or a proxy) would not
need most of this.

Fynn is multi-tenant: any Google account can sign up and gets fully isolated data. The
product doc's "no multi-user/shared-account features" non-goal means no sharing *between*
accounts (no households/permissions) — it does not mean only one account may ever exist.

## Goals / Non-Goals

**Goals:**
- Google OAuth sign-in/sign-out working end-to-end, session cookie readable by both apps.
- `apps/api` routes are private-by-default-safe: public unless explicitly guarded, guarded
  explicitly via `requireAuth`, matching the existing documented pattern in `backend.md`.
- `apps/web`'s `(private)` routes redirect to `(public)/login` fast when signed out, and
  correctly when a session is stale/revoked.
- Every new user gets seeded with static default data via a new `modules/users` module,
  without `shared/auth` reaching into other domain modules' internals.
- `.docs/product/overview.md` and `.docs/architecture/backend.md` no longer read as if the
  four listed product domains are the only modules the codebase will ever have.

**Non-Goals:**
- No guided onboarding flow (user picks their own wallet name/currency/etc.) — the seed
  data is static and hard-coded for this change. Real onboarding is a future change that
  replaces `SeedNewUserDefaultsCommand`'s body, not its trigger point.
- No additional user profile fields beyond Better Auth's built-in `user` table
  (name/email/image) — e.g. no currency preference yet.
- No account linking UI, no additional social providers, no email/password (explicitly
  disabled per `backend.md`).
- No mobile/native client considerations — session is cookie-based, not token-based.
- Does not pin down the production domain topology (see Open Questions) — only the dev
  cross-origin cookie behavior is fully specified here.

## Decisions

### 1. Better Auth instance lives in `apps/api` only; `apps/web` gets a client, not a second instance

`shared/auth/index.ts` in `apps/api` owns the single Better Auth instance (Drizzle
adapter, Google provider, `emailAndPassword: false`), exactly as sketched in `backend.md`.
`apps/web` never constructs its own `betterAuth()` — it only ever talks to the one in
`apps/api`, either through `better-auth/react`'s `createAuthClient` (client components)
or by forwarding cookies to `apps/api`'s session endpoint (server components). Running a
second instance in `apps/web` would mean two processes independently deciding what a
valid session is against the same DB — one source of truth is simpler and is what Better
Auth's own split-frontend/backend guidance assumes.

### 2. Cross-origin cookies: `trustedOrigins` + CORS `credentials: true` + explicit cookie attributes

Because the browser calls `apps/api` directly, three things have to agree or the cookie
silently never arrives:
- `auth.trustedOrigins` on the Better Auth instance includes `apps/web`'s origin(s).
- Hono CORS middleware on `/api/auth/*` (and any `requireAuth`-guarded route) sets
  `credentials: true` with an explicit origin (never `"*"`, which is incompatible with
  credentialed requests per the Fetch spec).
- Cookie attributes: dev uses `sameSite: "none"` + `secure: true` (works from
  `localhost:3000` to `localhost:3001` — Chrome treats `localhost` as a trustworthy
  origin even over plain HTTP, so this doesn't require local TLS). Production's exact
  attributes depend on the domain topology — see Open Questions.

**Alternative considered:** proxy `apps/api` behind `apps/web` (Next.js rewrites), making
every request same-origin and sidestepping cross-origin cookies entirely. Rejected here
because `frontend.md` already commits to the browser calling `apps/api` directly via Hono
RPC — introducing a proxy would be a bigger architectural deviation than this change's
scope, not a small auth detail. Worth revisiting only if the cross-origin cookie
configuration turns out to be fragile in practice.

### 3. Two-tier session check on `apps/web`'s private routes

`middleware.ts` runs Better Auth's `getSessionCookie()` helper — a cheap check that a
signed session cookie is present, no network call — and redirects to `(public)/login`
immediately if it's missing. `app/(private)/layout.tsx` then does the authoritative check:
forwards the incoming request's `cookie` header to `apps/api`'s session endpoint and
redirects if the session turns out to be invalid/revoked despite the cookie being present.

This two-tier shape exists because the naive alternative — the layout doing the only
check, on every private request — pays a Next-server-to-`apps/api` network round trip
even when the user was never signed in at all, and `product/overview.md` treats speed as
a hard requirement rather than a later optimization. The middleware tier only rules out
the "definitely not signed in" case cheaply; it is never treated as authorization by
itself.

### 4. `modules/users` is a new `apps/api` module, not more `shared/auth` code

Split "authentication mechanics" (owned entirely by Better Auth's request lifecycle —
`shared/auth`, no hand-written CQRS) from "what happens in the product when a user is
created" (real domain logic — `modules/users`, with its own `commands/` and use-case
tests per `testing.md`).

`shared/auth`'s `databaseHooks.user.create.after` hook makes exactly one outward call:
`modules/users/commands/seed-new-user-defaults.ts`. That command is the only thing
allowed to orchestrate into other modules' commands (e.g. a future `modules/wallets`'
create-wallet command) to write static seed data — it plays the same composition-root
role `backend.md` already grants the controller layer when orchestrating multiple
modules' commands for an HTTP request, just triggered by a domain event
(`user.create.after`) instead. `shared/auth` itself imports nothing from
`wallets`/`transactions`/etc., only from `modules/users` — the module-independence rule
stays intact because the composition point is `modules/users`, not `shared/auth`.

**Revised during implementation**: at the point this change was implemented, no domain
module (`modules/wallets` or otherwise) existed anywhere in the codebase yet — this is
the first `apps/api` module. There was nothing concrete for the seed command to be
"informed by," and scaffolding a real `modules/wallets` (domain model, repository,
create-wallet command) to seed into would have been meaningfully more scope than this
change's proposal describes. Confirmed with the user: `seed-new-user-defaults.ts` is a
documented no-op for this change — it logs a structured message (including the new
`userId`) and a `TODO` pointing at wiring real seeding once a domain module exists to
seed into. The hook wiring itself (`databaseHooks.user.create.after` → exactly one call
into `modules/users`) is real and tested; only the *body* of the seed command is
deferred. A future change that adds the first real domain module (e.g. `modules/wallets`)
should replace this command's body, not its trigger point or its module boundary.

**Alternative considered:** call the seed command chain directly from the
`databaseHooks.user.create.after` hook in `shared/auth`, skipping `modules/users`
entirely. Rejected — that's `shared/` reaching into `modules/wallets`' internals, which is
exactly what `backend.md`'s module-independence rule forbids, and it leaves the future
onboarding flow with no home to grow into other than retrofitting this same exception.

### 5. Auth schema is generated, not hand-written, but indexes are still checked by hand

Run `npx @better-auth/cli generate --adapter drizzle --dialect postgresql` to produce
`user`/`session`/`account`/`verification` table definitions, then `drizzle-kit generate`
to turn that into a reviewable migration — consistent with `backend.md`'s existing
generate-then-migrate convention. Because the generated schema is machine output, not
hand-authored, it is not assumed to already satisfy the repo's "every FK / filtered /
unique column needs an index" rule — this gets checked explicitly (`session.userId`,
`account.userId`, `session.token`, etc.) and any missing index is added by hand into the
generated file before the migration is generated, the same way `lower(email)` needed an
explicit name in the existing example.

## Risks / Trade-offs

- **[Risk] Cross-origin cookie config is finicky and easy to silently misconfigure**
  (wrong `sameSite`, missing `trustedOrigins` entry, CORS `*` instead of an explicit
  origin) → **Mitigation**: cover it with an integration-style test that actually
  exercises a cross-origin request in `bun test` rather than only unit-testing the
  Better Auth config object, and document the exact dev cookie attributes in this file
  so they're not re-derived by trial and error later.
- **[Risk] Optimistic middleware check (`getSessionCookie()`) can drift from the
  authoritative check** — e.g. someone adds a private route relying only on the
  middleware redirect and forgets the layout still needs to be the real guard →
  **Mitigation**: `(private)/layout.tsx` is the only place that renders private content;
  the middleware only ever redirects, it never authorizes rendering by itself.
- **[Risk] `modules/users`' seed command silently grows into a dumping ground** for
  unrelated "stuff that happens on signup" over time → **Mitigation**: keep this change's
  command narrowly named (`SeedNewUserDefaultsCommand`) and scoped to the static seed
  described in the proposal; the future onboarding change should introduce its own
  command(s) rather than keep extending this one indefinitely.
- **[Trade-off] Static seed data is hard-coded** rather than configurable — acceptable
  because the proposal explicitly scopes this change to "seed every user with the same
  static data," with real onboarding as a deliberate follow-up, not an oversight.

## Migration Plan

1. Add `better-auth` to `apps/api` and `apps/web`; add `GOOGLE_CLIENT_ID`,
   `GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_SECRET` to `apps/api`'s env schema, and whatever
   `apps/web` needs for the auth client's `baseURL`, via `@fynn/env` — never read
   `process.env` directly.
2. Generate the Better Auth Drizzle schema, hand-check/add indexes, run `drizzle-kit
   generate` + apply against the local Postgres (docker-compose).
3. Wire `shared/auth` (instance, cookie/CORS config, `requireAuth` middleware) and mount
   `/api/auth/*` + the session-attach middleware in `app/app.ts`.
4. Add `modules/users` (`commands/seed-new-user-defaults.ts` + use-case test), wire the
   `databaseHooks.user.create.after` hook to call it.
5. Add `apps/web`'s `(public)/login`, `src/lib/auth-client.ts`, `middleware.ts`, and give
   `(private)/layout.tsx` its real session check.
6. Update `.docs/product/overview.md` and `.docs/architecture/backend.md` wording per the
   proposal.
7. No production data/users exist yet, so there is no rollback concern beyond reverting
   the change — this is additive to an empty schema.

## Open Questions

- **Production domain topology is not decided.** If `apps/web` and `apps/api` end up on
  subdomains of one root domain (e.g. `app.fynn.com` / `api.fynn.com`), Better Auth's
  `crossSubDomainCookies` is the right mechanism. If they end up on genuinely unrelated
  domains, cookie sharing does not work the same way and this design would need
  revisiting (likely a proxy, or a token-based scheme) — flagging so it isn't silently
  assumed one way. Needs an answer before production cookie attributes can be finalized;
  dev behavior (decision 2) does not depend on this.
- ~~**Exact contents of the static seed data**~~ **Resolved during implementation**: no
  domain module existed to inform this decision, so seeding was deferred rather than
  invented — see Decision 4's "Revised during implementation" note. The exact contents
  of real seed data is now this open question's replacement: it's deferred to whichever
  future change adds the first real domain module.
