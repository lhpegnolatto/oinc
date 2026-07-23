## 1. Rename: fynn → oinc (packages, imports, docs)

- [x] 1.1 Rename `package.json` `name` fields: root `fynn` → `oinc`, `@fynn/web` →
  `@oinc/web`, `@fynn/api` → `@oinc/api`, `@fynn/env` → `@oinc/env`.
- [x] 1.2 Update every import/workspace-dependency reference to the renamed packages
  (`@fynn/env` in `apps/api/src/env.ts`, `@fynn/api` type import in
  `apps/web/src/lib/api-client.ts`, `devDependencies` entries in `apps/web/package.json`
  and `apps/api/package.json`).
- [x] 1.3 Rename `Fynn`/`fynn` prose in `.docs/architecture/{overview,frontend,backend,testing}.md`
  and `.docs/product/overview.md`.
- [x] 1.4 Rename `Fynn`/`fynn` prose in `openspec/config.yaml` and the Purpose sections
  of `openspec/specs/{monorepo-tooling,user-authentication,user-provisioning}/spec.md`
  (these have no requirement-level change, so no delta spec is needed for them — a
  direct prose edit). Leave `openspec/changes/archive/**` untouched.
- [x] 1.5 Run `bun run check-types` to catch any missed import site before moving on.

## 2. Infra rename (Postgres, local env)

- [x] 2.1 Update `docker-compose.yml`: `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB`
  from `fynn`/`fynn`/`fynn_dev` to `oinc`/`oinc`/`oinc_dev`.
- [x] 2.2 Update `docker/init-test-db.sql`'s `CREATE DATABASE fynn_test;` to
  `CREATE DATABASE oinc_test;`, and the matching reference in
  `.docs/architecture/testing.md`.
- [x] 2.3 Update `apps/api/.env.example`'s `DATABASE_URL` to the new
  `oinc`/`oinc`/`oinc_dev` credentials.
- [x] 2.4 `docker compose down -v` the local Postgres container, then `docker compose up -d`
  to reinitialize with the new credentials; update the local (gitignored)
  `apps/api/.env`'s `DATABASE_URL` to match.
- [x] 2.5 Replace the `Fynn`-named test fixture example in
  `.docs/architecture/testing.md`'s code sample with an `oinc`-neutral example.

## 3. Fix stale shadcn style reference (new-york → base-nova)

- [x] 3.1 Update `.docs/architecture/frontend.md`'s shadcn/ui configuration section to
  say `base-nova` instead of `new-york`, matching `apps/web/components.json` (already
  on `base-nova`). The corresponding `openspec/specs/web-skeleton/spec.md` correction
  is captured by this change's spec delta and lands automatically when the change is
  synced/archived — no separate manual edit needed there.

## 4. Sign-in page (login-03 pattern)

- [x] 4.1 Rebuild `apps/web/src/app/(public)/sign-in/page.tsx` using the shadcn
  `login-03` block as a pattern: card with Apple + Google buttons, no separator, no
  email/password fields, no submit button, no sign-up line, no ToS/Privacy footer.
- [x] 4.2 Keep the Apple button visually present but `disabled`; wire the Google button
  to the existing `authClient.signIn.social({ provider: "google", callbackURL: ... })`
  call.
- [x] 4.3 Replace the block's placeholder wordmark with oinc branding (reusing the
  favicon/branding already added to the root layout).
- [x] 4.4 Use case: **a signed-out user visiting `/sign-in` sees only a Google sign-in
  control, with no way to submit credentials.** Add a `bun test` (fetch the rendered
  `/sign-in` HTML) asserting no `type="password"` input is present and a Google
  sign-in control is.

## 5. Session data plumbing

- [x] 5.1 Extend `apps/web/src/lib/session.ts` with a function that returns the
  session's `user` (name/email/avatar) alongside the existing validity check, instead
  of only a boolean.
- [x] 5.2 Update `apps/web/src/app/(private)/layout.tsx` to use the extended function
  and pass the resolved `user` down as a prop into the sidebar/shell tree.
- [x] 5.3 Use case: **an invalid/absent session yields no user data** (mirrors the
  existing `hasValidSession` false-case coverage). Add a `bun test` for the extended
  `lib/session.ts` function covering the absent-cookie and stale-cookie cases.

## 6. Private app shell (dashboard-01 pattern, hand-lifted)

- [x] 6.1 Hand-lift `app-sidebar.tsx`, `site-header.tsx`, `nav-main.tsx`, `nav-user.tsx`
  from the `dashboard-01` registry block into `apps/web/src/components/`, adapted to
  this repo's conventions (named exports, kebab-case filenames, `components/ui`
  primitives already in the project). Do not install `section-cards`,
  `chart-area-interactive`, `data-table`, or their dependencies.
- [x] 6.2 Swap the lifted components' icons from `@tabler/icons-react` to
  `lucide-react` equivalents.
- [x] 6.3 Seed the sidebar nav with a single "Dashboard" item (the only private route
  that exists today).
- [x] 6.4 Wire `nav-user` to render the `user` prop threaded from
  `app/(private)/layout.tsx` (task 5.2) — no client-side session fetch inside
  `nav-user`.
- [x] 6.5 Mount the sidebar/header shell in `app/(private)/layout.tsx` so it wraps
  `{children}` for every private route.
- [x] 6.6 Update `apps/web/src/app/(private)/dashboard/page.tsx` to render as content
  inside the new shell (drop its own full-page wrapper and sign-out button, now owned
  by `nav-user`).
- [x] 6.7 Use case: **a signed-out request to `/dashboard` is still redirected before
  any shell content renders.** Verify the existing
  `apps/web/src/app/(private)/private-routes.test.ts` suite still passes unmodified
  against the new layout.
- [x] 6.8 Use case: **a signed-in user sees the shared shell with their own identity
  and can sign out from it.** Add a test seeding a valid Better Auth session directly
  into the test database (real DB row, no mocked auth, consistent with
  `.docs/architecture/testing.md`'s real-flow testing approach) and asserting a
  request to `/dashboard` with that session's cookie renders the seeded user's
  name/email and the "Dashboard" nav item.

## 7. Final verification

- [x] 7.1 Manually verify in a browser: sign in with a real Google account, confirm the
  sidebar/header shell renders with the signed-in user's identity, sign out from
  `nav-user`'s dropdown, and confirm it redirects back to `/sign-in`. Verified via a
  headless-browser screenshot pass against dev servers, with a real DB-seeded Better
  Auth session standing in for the Google OAuth round-trip (which needs a human with
  real Google credentials — not something this agent session can complete): `/sign-in`
  renders the login-03-derived card correctly, and `/dashboard` renders the sidebar
  shell with the seeded user's identity and a working `nav-user` dropdown showing
  "Log out". No console errors on either page. Actually completing the live Google
  sign-in/sign-out round-trip is left for the user to spot-check.
- [x] 7.2 Run `bun run lint && bun test && bun run build` from a clean state and
  confirm everything passes, per `CLAUDE.md`'s pre-done checklist. All three pass
  (17 tests across both apps, 0 lint errors — 1 pre-existing warning in vendor
  `components/ui/sidebar.tsx` unrelated to this change).
