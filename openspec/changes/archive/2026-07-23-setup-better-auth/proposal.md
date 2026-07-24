## Why

oinc has no authentication today — `apps/api`'s router is a no-op and `apps/web` has no
public/private route split wired up. Every product domain (wallets, transactions, credit
cards, investments) needs a signed-in, isolated user before it can store anything
meaningful, so auth is the first real feature: nothing else can be built per-user until
identity exists end-to-end across both apps.

## What Changes

- Add a Better Auth instance in `apps/api` (`shared/auth`) using the Drizzle adapter,
  Google OAuth as the only social provider, `emailAndPassword` disabled.
- Generate and migrate the `user`/`session`/`account`/`verification` tables via Better
  Auth's CLI + `drizzle-kit`, adding any explicit indexes its output doesn't already cover
  (FK columns, lookup columns) per the repo's indexing rule.
- Mount `/api/auth/*` on the Hono app, add global session-attach middleware and an
  explicit `requireAuth` guard middleware for private routers.
- Configure cross-origin auth cookies (`trustedOrigins`, CORS with `credentials: true`,
  cookie `sameSite`/`secure` settings) so the session cookie actually survives a request
  from `apps/web`'s origin to `apps/api`'s origin, in both dev (`:3000` → `:3001`) and
  production.
- Add a new `apps/api` module, **`modules/users`**, owning what happens in the product
  when a user is created — for this change, a single `seedNewUserDefaults` command
  wired from `shared/auth`'s `databaseHooks.user.create.after` hook, which calls into
  this one module and never reaches into `wallets`/other domain modules directly.
  **Revised during implementation**: no domain module existed yet to seed real default
  data into (this is the first `apps/api` module), so the command's body is a
  documented no-op (log + `TODO`) for this change — see design.md Decision 4.
- Add `apps/web`'s auth-consuming side: `app/(public)/login`, a `src/lib/auth-client.ts`
  (Better Auth React client) for client-rendered sign-in/sign-out, Next `middleware.ts`
  doing an optimistic signed-cookie check, and `app/(private)/layout.tsx` doing the
  authoritative session check by forwarding cookies to `apps/api`.
- Update `.docs/product/overview.md`'s "Core domains" section and `.docs/architecture/backend.md`'s
  module examples to state explicitly that the listed domains are examples of the current
  product pillars, not an exhaustive/closed set — `modules/users` is a real module that
  isn't one of the four pillars.

## Capabilities

### New Capabilities

- `user-authentication`: Google OAuth sign-in/sign-out, session issuance and validation,
  cross-origin cookie transport between `apps/web` and `apps/api`, and the public/private
  route guarding on both apps (Hono `requireAuth`, Next optimistic middleware +
  authoritative layout check).
- `user-provisioning`: what happens in the product the moment a new user is created —
  for this change, seeding static default data via `modules/users`. Scoped narrowly on
  purpose; a future change replaces the static seed with a guided onboarding flow.

### Modified Capabilities

- `api-skeleton`: its "Module folder conventions exist without domain modules"
  requirement explicitly asserts `shared/auth` and `modules/` are absent "in this
  change" (the skeleton change) — this change adds both, so that requirement is
  superseded rather than merely filled in.
- `web-skeleton`: its "app/ is routing-only" requirement explicitly asserts
  `(private)/` does not exist yet — this change adds it, so that requirement is
  superseded as well.

## Impact

- `apps/api`: new `src/shared/auth/` (Better Auth instance, `requireAuth` middleware),
  new `src/modules/users/` module, `src/shared/db/schema/` gains generated auth tables,
  `src/app/app.ts` and `src/app/routes.ts` wire the handler/middleware in, new
  `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`BETTER_AUTH_SECRET` env vars via `@oinc/env`.
- `apps/web`: new `src/app/(public)/login/`, new `src/middleware.ts`, `src/app/(private)/layout.tsx`
  gains a real session check (currently absent), new `src/lib/auth-client.ts`, new
  `NEXT_PUBLIC_*`/server env vars as needed for the auth client's `baseURL`.
- Dependencies: `better-auth` added to `apps/api` and `apps/web`; `@better-auth/cli` +
  `drizzle-kit` used to generate/migrate the new auth schema.
- Docs: `.docs/product/overview.md` and `.docs/architecture/backend.md` get the
  non-exhaustive-domains wording fix described above.
- No frequent user action is introduced by this change (signing in/out is infrequent,
  not a repeated logging action), so the keyboard-shortcut/sheet requirement from
  "Fast is a feature" doesn't apply here.
