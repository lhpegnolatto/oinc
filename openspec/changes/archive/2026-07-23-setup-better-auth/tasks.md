## 1. Dependencies & env

- [x] 1.1 Add `better-auth` to `apps/api` and `apps/web` package.json (`bun add` in each,
      not the root).
- [x] 1.2 Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_SECRET` to
      `apps/api/src/env.ts`'s `server` schema (via `@oinc/env`, not raw `process.env`).
- [x] 1.3 Add whatever `apps/web` needs for the Better Auth client's `baseURL` (e.g. reuse
      `NEXT_PUBLIC_API_URL`, already present in `apps/web/src/env.ts`) — add a new
      `NEXT_PUBLIC_*` var only if `NEXT_PUBLIC_API_URL` isn't the right value to point at.
- [x] 1.4 Update `apps/api/.env.example` and `apps/web/.env.example` with the new
      variables (placeholder values, not real secrets).

## 2. Auth schema (Postgres via Drizzle)

- [x] 2.1 Run `npx @better-auth/cli generate --adapter drizzle --dialect postgresql`
      pointed at the (not-yet-existing) `shared/auth` config to produce
      `user`/`session`/`account`/`verification` table definitions into
      `apps/api/src/shared/db/schema/`.
- [x] 2.2 Review the generated schema against `backend.md`'s indexing rule; add explicit
      indexes for any FK/lookup/unique column not already indexed (expect at least
      `session.userId`, `account.userId`, `session.token`, `user` email uniqueness).
- [x] 2.3 Run `drizzle-kit generate` to produce the migration file, then apply it against
      the local `docker-compose` Postgres.
- [x] 2.4 Confirm `apps/api/src/shared/db/schema/index.ts` re-exports the new tables
      alongside existing (currently empty) schema exports.

## 3. `apps/api` — auth mechanics (`shared/auth`)

- [x] 3.1 Create `apps/api/src/shared/auth/index.ts`: `betterAuth()` instance with the
      Drizzle adapter (`provider: "pg"`), Google social provider, `emailAndPassword:
      { enabled: false }`, `trustedOrigins` including `apps/web`'s dev/prod origin(s).
- [x] 3.2 Configure cookie attributes for the cross-origin case (dev: `sameSite: "none"`,
      `secure: true`) per design.md decision 2; leave a clearly marked spot for the
      production attribute decision (see design.md Open Questions).
- [x] 3.3 Add CORS middleware in `apps/api/src/app/app.ts` for `/api/auth/*` and any
      `requireAuth`-guarded routes: `credentials: true`, explicit origin allowlist
      (never `"*"`).
- [x] 3.4 Mount the handler: `app.on(["POST", "GET"], "/api/auth/*", (c) =>
      auth.handler(c.req.raw))`.
- [x] 3.5 Add the global session-attach middleware (sets `user`/`session` on Hono
      context via `auth.api.getSession()`, never blocks).
- [x] 3.6 Add `apps/api/src/shared/auth/require-auth.ts` — the explicit opt-in guard
      middleware, returning the shared `401` error shape via `shared/errors` when no
      session is present.
- [x] 3.7 Update the `Env`/`Variables` type in `apps/api/src/app/app.ts` to include
      `user`/`session`.
- [x] 3.8 Test: a request to a route without `requireAuth` succeeds with `user`/`session`
      set to `null` when unauthenticated (use-case: "public route ignores missing
      session").
- [x] 3.9 Test: a request to a `requireAuth`-guarded route without a session returns the
      shared `401` error shape (use-case: "guarded route rejects unauthenticated
      request").
- [x] 3.10 Test: a request made with a valid session cookie resolves `user`/`session`
      correctly on both a public and a guarded route (use-case: "authenticated request
      is recognized").

## 4. `apps/api` — new `modules/users` (seeding on user creation)

- [x] 4.1 **Revised during implementation**: `modules/wallets` (or any other domain
      module) doesn't exist anywhere in the codebase yet, so there's nothing concrete
      to be "informed by" as originally assumed. Decision (confirmed with the user):
      defer real seeding — `seedNewUserDefaults` is a documented no-op (structured
      log + TODO) until a future change adds a real domain module to seed into. See
      design.md's updated Decision 4 and Open Questions.
- [x] 4.2 Scaffold `apps/api/src/modules/users/` following the standard module shape
      (`commands/`, and only the pieces actually needed — no empty `controllers/`,
      `queries/`, etc. if this module has no HTTP-facing routes yet).
- [x] 4.3 Implement `modules/users/commands/seed-new-user-defaults.ts` — deferred
      no-op per 4.1 (logs and a TODO), not orchestrating into any domain module yet
      since none exist to orchestrate into.
- [x] 4.4 Wire `shared/auth`'s `databaseHooks.user.create.after` hook to call
      `seedNewUserDefaults` with the newly created user's id — this is the only
      import `shared/auth` takes from outside itself.
- [x] 4.5 Test: a first-time sign-in invokes `seedNewUserDefaults` for that user
      (use-case: "new user is seeded on first sign-in" — scoped to "the hook fires
      and logs" rather than "static default data exists," since there's no real data
      to seed yet per 4.1).
- [x] 4.6 Test: a repeat sign-in by an existing user does not invoke
      `seedNewUserDefaults` again (use-case: "existing user sign-in does not reseed").

## 5. `apps/web` — consuming auth

- [x] 5.1 Create `apps/web/src/lib/auth-client.ts` using `better-auth/react`'s
      `createAuthClient`, `baseURL` pointed at `apps/api`'s origin.
- [x] 5.2 Create `apps/web/src/app/(public)/login/page.tsx` with a "Sign in with Google"
      action (`authClient.signIn.social({ provider: "google" })`), built with shadcn/ui
      components per `frontend.md`'s design-system constraint (use the shadcn skill).
- [x] 5.3 Create `apps/web/src/proxy.ts` (Next.js 16 deprecated the `middleware.ts`
      file convention in favor of `proxy.ts` — same mechanism, renamed export):
      optimistic check via Better Auth's `getSessionCookie()`, redirecting to
      `(public)/login` when no signed cookie is present.
- [x] 5.4 Create `apps/web/src/app/(private)/layout.tsx`: authoritative check — forwards
      the incoming request's cookies to `apps/api`'s session endpoint, redirects to
      `(public)/login` if the session is invalid/absent.
- [x] 5.5 Add a sign-out action (e.g. in a private layout's nav) calling
      `authClient.signOut()` and redirecting to `(public)/login`.
- [x] 5.6 Test: an unauthenticated request to a route under `(private)/` redirects to
      `(public)/login` (use-case: "signed-out user is redirected before rendering").
- [x] 5.7 Test: sign-out invalidates the session such that a subsequent `(private)/`
      request redirects (use-case: "sign-out clears the session").

## 6. Docs

- [x] 6.1 Reword `.docs/product/overview.md`'s "Core domains" section so the four listed
      domains read as examples of current product pillars, not an exhaustive/closed set.
- [x] 6.2 Reword `.docs/architecture/backend.md`'s domain-module examples the same way,
      and reconcile its `shared/auth`/Hono-wiring example code with whatever this change
      actually implements (cookie config, `trustedOrigins`, CORS) so the doc doesn't
      show a stale variant next to the real one.

## 7. Verification

- [x] 7.1 Run `bun run lint && bun test && bun run build` from the repo root and confirm
      everything passes (no CI exists yet — this is the manual gate per `CLAUDE.md`).
- [x] 7.2 **Partially completed, needs a human with real Google OAuth credentials**:
      verified everything short of the actual Google handshake by running both dev
      servers — `(public)/login` renders the sign-in button; `/api/auth/sign-in/social`
      correctly builds a Google authorize URL (redirect_uri, PKCE, state); an
      unauthenticated request to `/dashboard` redirects to `/login` (307). The real
      Google OAuth round trip (needs a registered Google Cloud OAuth client — the repo
      only has placeholder `dev-placeholder-client-id`/secret values in `.env`) and the
      "seeded default data exists" check (currently a no-op per section 4) still need a
      human to walk through in a browser once real Google credentials are configured.
