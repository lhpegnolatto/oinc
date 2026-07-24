## Why

The product is being rebranded from the placeholder name "oinc" to "oinc" (favicon/title
in `apps/web`'s root layout are already updated by hand). Renaming touches package names,
imports, docs, and infra config across both apps, so it's worth doing as one deliberate
pass rather than piecemeal. It also surfaces a good moment to fix a stale spec/doc
mistake found while scoping this change — `.docs/architecture/frontend.md` and
`openspec/specs/web-skeleton/spec.md` both still assert shadcn's `new-york` style, but
`apps/web/components.json` already runs the newer `base-nova` preset (base-ui
primitives) — and to replace the current bare-bones sign-in/dashboard pages with real
shadcn block patterns (`login-03`, `dashboard-01`) so the app has a proper, reusable
private-route shell (sidebar + header) instead of two one-off pages, ahead of more
private routes being added as the product grows.

## What Changes

- Rename `oinc` → `oinc` across package names (root `package.json`, `@oinc/web`,
  `@oinc/api`, `@oinc/env` → `@oinc/*`), all workspace imports of those package names,
  and prose in `.docs/`, `openspec/config.yaml`, and current `openspec/specs/*.md`.
  Archived `openspec/changes/archive/**` are left untouched as a historical record.
- Rename `docker-compose.yml`'s Postgres user/password/db (`oinc`/`oinc_dev` →
  `oinc`/`oinc_dev`); the existing local volume is dropped and recreated rather than
  migrated in place.
- Correct `.docs/architecture/frontend.md` and `openspec/specs/web-skeleton/spec.md` to
  say shadcn's `base-nova` preset instead of the stale `new-york` reference — matches
  what `apps/web/components.json` already declares.
- Rebuild `(public)/sign-in` using the shadcn `login-03` block as a pattern: drop the
  email/password fields, separator, submit button, and sign-up line (Google is the only
  sign-in method); keep an Apple button present but disabled; wire the Google button to
  the existing `authClient.signIn.social({ provider: "google", ... })` call; drop the
  block's ToS/Privacy footer (no such pages exist); replace the block's placeholder
  wordmark with oinc branding.
- Introduce a persistent private-route app shell: hand-lift `dashboard-01`'s
  `app-sidebar`/`site-header`/`nav-*` components into `apps/web/src/components/`
  (icons swapped from `@tabler/icons-react` to the project's existing `lucide-react`,
  nav seeded with a single "Dashboard" item), and mount it in
  `app/(private)/layout.tsx` so every current and future private route renders inside
  it. `dashboard-01`'s demo content (`section-cards`, `chart-area-interactive`,
  `data-table`) and their dependencies are not installed — nothing on the dashboard
  today uses them.
- **BREAKING** (internal only, no external consumers): workspace package names change
  from `@oinc/*` to `@oinc/*`; any local `.env` or tooling referencing the old Postgres
  db/user names must be updated.

## Capabilities

### New Capabilities
(none — this change restructures and renames existing skeleton capabilities rather
than introducing new product behavior)

### Modified Capabilities
- `env-config`: requirement text names the package `@oinc/env` explicitly; update to
  `@oinc/env` to match the rename (no behavior change, just the identifier the
  requirement asserts).
- `api-skeleton`: the Postgres-connectivity requirement names `@oinc/env` as the source
  of `DATABASE_URL`; update to `@oinc/env`.
- `web-skeleton`: the shadcn/ui-initialized requirement currently asserts the `new-york`
  style; correct it to `base-nova` (matching `components.json`, which is already on the
  newer preset). Also adds a new requirement that `(private)/*` routes render inside a
  shared, persistent app shell (sidebar + header) rather than each private page owning
  its own full-page layout.

## Impact

- **Code**: root `package.json`; `apps/web/package.json`, `apps/api/package.json`,
  `packages/env/package.json`; every import of `@oinc/env`; `apps/web/src/app/(public)/sign-in/page.tsx`;
  `apps/web/src/app/(private)/layout.tsx`; `apps/web/src/app/(private)/dashboard/page.tsx`;
  new files under `apps/web/src/components/` (sidebar/header/nav shell).
- **Dependencies**: adds `lucide-react` icon usage in the lifted sidebar components (no
  new package — already a dependency); does not add `@dnd-kit/*`, `@tanstack/react-table`,
  `@tabler/icons-react`, or a chart library.
- **Infra**: `docker-compose.yml` Postgres credentials/db name and its local volume.
- **Docs/specs**: `.docs/architecture/*.md`, `.docs/product/overview.md`,
  `openspec/config.yaml`, `openspec/specs/{env-config,api-skeleton,web-skeleton}/spec.md`.
- **Out of scope**: archived openspec changes, the local repo directory name, and any
  git remote (none is configured).
