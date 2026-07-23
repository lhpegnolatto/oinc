# oinc

Turborepo monorepo (Bun runtime/package manager/test runner): `apps/web` (Next.js App
Router) + `apps/api` (Bun + Hono), plus `packages/*` shared packages (`@oinc/env`).

Full tech-stack decisions live in `.docs/architecture/`, split by concern — read
whichever is relevant before touching that area:
- [.docs/architecture/overview.md](.docs/architecture/overview.md) — monorepo shape, Turborepo/Biome/Bun, shared packages
- [.docs/architecture/frontend.md](.docs/architecture/frontend.md) — `apps/web`
- [.docs/architecture/backend.md](.docs/architecture/backend.md) — `apps/api`
- [.docs/architecture/testing.md](.docs/architecture/testing.md) — testing philosophy, both apps

Product vision, scope, and non-goals live in
[.docs/product/overview.md](.docs/product/overview.md) — read it before scoping
new features.

## Constraints that must never be silently violated

- `web`: business logic in `src/modules/<name>/`, `app/` is routing only, split into
  `(public)`/`(private)` route groups. `api`: modular + Clean Architecture + CQRS —
  modules never import another module's `repositories/`/`commands/`/`domain/` directly.
- oinc is simple/fast personal finance, not a full accounting system — a new frequent
  user action needs a keyboard shortcut and a low-friction screen interaction (e.g. a
  sheet, not a page nav); see `.docs/product/overview.md`.
- Auth is Better Auth, **Google sign-on only** — `emailAndPassword` stays disabled.
- Never read `process.env` directly — go through `@oinc/env`.
- API errors always go through `shared/errors`, shaped as `{ error: { code, message, details } }`.
- Every FK / filtered / sorted / unique column needs a matching Drizzle index.
- Tests (`bun test`) are written around real use cases, never for coverage padding.
- Biome is the only linter/formatter — no ESLint/Prettier config should exist.
- **No CI yet** (deliberate) — run `bun run lint && bun test && bun run build` locally before calling a change done.

## Workflow

This repo uses [OpenSpec](openspec/config.yaml) for spec-driven changes — proposals,
designs, and tasks live under `openspec/`. Use the `openspec-*` skills (propose,
explore, apply-change, sync-specs, archive-change) for that workflow rather than
editing specs/changes by hand.
