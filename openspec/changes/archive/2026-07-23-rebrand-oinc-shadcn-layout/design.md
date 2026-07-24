## Context

`apps/web` currently has exactly two pages behind/around auth: a hand-rolled
`(public)/sign-in` (a single `Card` with one Google button) and a hand-rolled
`(private)/dashboard` (a bare `h1` + sign-out button, no shell). Both apps still carry
the placeholder name `oinc` in package names, imports, docs, and `docker-compose.yml`.
The user has already changed `apps/web`'s root layout title/favicon by hand, but
nothing else. `apps/web/components.json` already runs shadcn's `base-nova` preset
(base-ui primitives), while `.docs/architecture/frontend.md` and
`openspec/specs/web-skeleton/spec.md` still assert the older `new-york` style — a
leftover from before the preset migration that this change corrects.

This design was scoped through an `/opsx:explore` session that fetched the actual
`login-03` and `dashboard-01` registry blocks to inspect their real shape (rather than
assuming from memory), and resolved several either/or calls with the user directly
(see Decisions below).

## Goals / Non-Goals

**Goals:**
- Rename `oinc` → `oinc` everywhere the identifier is load-bearing (package names,
  imports, infra credentials, spec/doc prose) without touching historical record.
- Replace the two hand-rolled pages with shadcn-block-derived patterns, landing on a
  private-route shell (sidebar + header) that every current and future private route
  renders inside, instead of each page owning its own full-page layout.
- Correct the `new-york` → `base-nova` doc/spec mistake found during exploration.

**Non-Goals:**
- No new domain functionality (wallets/transactions/etc.) — this is rename + layout
  scaffolding only.
- No brand-name configurability (e.g. an env var for the app name). "oinc" is hardcoded
  as a literal string in the few places it appears (sidebar wordmark, sign-in page),
  consistent with how the root layout's `title` is already a hardcoded literal. This is
  a personal, single-tenant app — a configurable brand name is speculative complexity
  with no current consumer.
- No migration of production data — nothing has shipped yet, so "migration" here is
  local-dev-only (see Migration Plan).
- Not adopting `dashboard-01`'s demo content (`section-cards`, `chart-area-interactive`,
  `data-table`) or its dependencies (`@dnd-kit/*`, `@tanstack/react-table`,
  `@tabler/icons-react`) — nothing on the dashboard today has data that maps to them.

## Decisions

**1. Rename scope: package identifiers + infra, not history or the local path.**
`@oinc/web`/`@oinc/api`/`@oinc/env` (and root `package.json`'s `name`) become
`@oinc/*`; every import site follows. `docker-compose.yml`'s Postgres
user/password/db (`oinc`/`oinc_dev` → `oinc`/`oinc_dev`) is renamed too. Archived
`openspec/changes/archive/**` are left saying "oinc" — they're a record of decisions
made under the old name, not living documentation. The local clone's directory name
(`/home/luiz/repos/oinc`) is left alone — there's no git remote configured for it to
drift from, so renaming it would only churn editor/terminal paths for no functional
gain.

**2. Local Postgres volume: drop and recreate, don't rename in place.**
Renaming the Postgres user/db that a running container already initialized doesn't
take effect by editing `docker-compose.yml` alone — Postgres only applies
`POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` on first init of an empty volume.
Alternative considered: `ALTER USER ... RENAME`, `ALTER DATABASE ... RENAME` against
the live container to preserve data. Rejected — the local volume only holds dev/seed
data (no product has shipped), so a clean `docker compose down -v && docker compose up`
is simpler and carries no real cost.

**3. `dashboard-01`: hand-lift the shell, skip the CLI add.**
Alternative considered: run `npx shadcn@latest add dashboard-01` as the user's
original phrasing literally named, then delete the demo sections afterward.
Rejected — that path pulls `@dnd-kit/*`, `@tanstack/react-table`,
`@tabler/icons-react`, and a chart primitive into `package.json` as real dependencies
even though every file using them gets deleted in the same change. Hand-lifting only
`app-sidebar.tsx`, `site-header.tsx`, `nav-main.tsx`, `nav-user.tsx` (adapted to this
repo's named-export/kebab-case conventions and `components/ui` primitives) gets the
same structural shell with zero throwaway dependencies. Trade-off accepted: these
files won't receive automatic updates via a future `shadcn add dashboard-01`
re-run — acceptable, since they're being substantially rewritten (real nav items,
lucide icons, real session data) rather than used as-is.

**4. Icon library: lucide-react, not @tabler/icons-react.**
`dashboard-01`'s components default to Tabler icons; `apps/web` already standardizes
on `lucide-react` (see `components.json`'s `iconLibrary` and existing usage). Icons in
the lifted `nav-*`/`app-sidebar` components are swapped to lucide equivalents so the
app doesn't carry two icon libraries for the same purpose.

**5. Nav content: seed with "Dashboard" only.**
`dashboard-01`'s default nav items (Lifecycle, Analytics, Team, Data Library, Word
Assistant, ...) are demo CRM copy with no equivalent route in this app. Only one
private route exists today (`/dashboard`), so the sidebar's nav list starts with just
that entry. Future changes that add real modules (transactions, wallets, cards,
investments — see `.docs/product/overview.md`) extend this list then, rather than
this change stubbing dead links now.

**6. `nav-user` gets session data via a server-passed prop, not a second client fetch.**
`app/(private)/layout.tsx` already resolves the session server-side (via
`lib/session.ts`) to decide whether to redirect. `lib/session.ts`'s `hasValidSession()`
today discards everything except a boolean. This change extends `lib/session.ts` with
a function that returns the session's `user` (name/email/avatar) alongside the
validity check, and the private layout passes that `user` down as a prop into the
sidebar tree for `nav-user` to render. Alternative considered (and what exploration
had initially floated): call Better Auth's client-side `authClient.useSession()`
inside `nav-user` itself. Rejected on reflection — the layout already makes this exact
network call server-side to authorize the route; fetching it again client-side would
be a redundant round-trip and would also flash an empty/loading state in the sidebar
on every private-route navigation, which a server-resolved prop avoids entirely.

**7. `login-03` adaptation.**
Keep the block's two-button row (Apple + Google) and card structure; remove the
`FieldSeparator`, email/password `Field`s, submit button, and "Don't have an account?"
line entirely — Better Auth is configured Google-only (`emailAndPassword: { enabled:
false }`), so rendering credential fields that can never succeed would be misleading,
not just unused. The Apple button stays visible but `disabled`, matching the ask to
keep it present as a placeholder without wiring it. The block's ToS/Privacy footer is
dropped rather than kept pointed at `#` — a link to a page that doesn't exist is worse
than no link.

**8. Doc/spec correction: `new-york` → `base-nova`.**
`.docs/architecture/frontend.md` and `openspec/specs/web-skeleton/spec.md` both assert
`new-york`; `components.json` has been on `base-nova` since before this change (an
earlier, unrelated update evidently migrated the config but not these two references).
Corrected in place as part of this change's doc/spec updates — no design alternative
here, it's a factual correction to match already-deployed reality.

## Risks / Trade-offs

- **[Risk]** A missed `@oinc/*` import site silently breaks the build or, worse, a
  runtime path that isn't covered by `check-types` (e.g. a dynamic import or string
  reference in a config file). → **Mitigation**: rename via repo-wide grep for
  `oinc`/`oinc`/`@oinc` (case-sensitive and case-insensitive passes) before touching
  logic, then gate on `bun run lint && bun test && bun run build` per `CLAUDE.md`'s
  existing pre-done checklist — a missed import fails `check-types`/`build` loudly.
- **[Risk]** Dropping the local Postgres volume loses whatever is currently seeded in
  local dev. → **Mitigation**: nothing has shipped yet and the data is dev-only;
  called out explicitly here and in tasks.md so it's a deliberate, visible step, not a
  silent side effect of an unrelated docker-compose edit.
- **[Trade-off]** Hand-lifting `dashboard-01`'s shell components means they're
  divorced from the shadcn registry's own copy going forward (no `shadcn diff`
  updates). Accepted per Decision 3 — the components are being substantially rewritten
  anyway (real nav, lucide icons, real session prop), so registry parity isn't
  meaningful here.
- **[Trade-off]** Extending `lib/session.ts` to return `user` data changes its return
  shape/signature, touching the one existing caller
  (`app/(private)/layout.tsx`) and its test coverage in
  `(private)/private-routes.test.ts` — a small, contained blast radius, verified by
  that existing test suite plus `bun test`.

## Migration Plan

Local-only; no CI, no deployed environment yet (per `CLAUDE.md`).

1. Rename packages/imports/docs/specs (mechanical). Verify with `bun run check-types`
   before moving on, since this step alone can be fully machine-verified.
2. Update `docker-compose.yml` credentials/db name; `docker compose down -v` the local
   Postgres, `docker compose up -d` fresh, update local `.env`'s `DATABASE_URL` to
   match the new user/db.
3. Correct the `new-york` → `base-nova` doc/spec references.
4. Rebuild `(public)/sign-in` per Decision 7.
5. Extend `lib/session.ts` per Decision 6; hand-lift and adapt the sidebar/header/nav
   components per Decisions 3–5; wire them into `app/(private)/layout.tsx`; update
   `(private)/dashboard/page.tsx` to render as content inside the new shell instead of
   its own full-page wrapper.
6. Full local verification: `bun run lint && bun test && bun run build`.

**Rollback**: standard `git revert` — nothing here is deployed, so there's no
production rollback path to design for. The dropped local Postgres volume is the only
non-trivially-reversible step, and it's local dev data only.

## Open Questions

None outstanding — the calls that needed a person (DB volume handling, archive scope,
local directory naming, `dashboard-01` install scope) were resolved with the user
during `/opsx:explore` and are captured as Decisions above.
