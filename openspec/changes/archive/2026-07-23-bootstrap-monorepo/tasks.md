## 1. Root tooling

- [x] 1.1 Create root `package.json` with `"workspaces": ["apps/*", "packages/*"]`,
      pinned `packageManager` (exact Bun version), and root scripts (`build`,
      `dev`, `lint`, `format`, `test`, `check-types`) delegating to `turbo run ...`
- [x] 1.2 Add `turbo.json` defining the `build`/`dev`/`test`/`lint`/`check-types`
      pipeline (`build` depends on `^build`, `dev` uncached/persistent)
- [x] 1.3 Add root `biome.json` (`"root": true`) with shared formatter/linter
      config; confirm no ESLint/Prettier config exists anywhere in the repo
- [x] 1.4 Add root `.gitignore` (node_modules, `.turbo`, `dist`/`.next` build
      output, `.env*` except `.env.example`)
- [x] 1.5 Add root `docker-compose.yml` with a Postgres service exposing a dev
      database and a second `oinc_test` database (or an init script that creates
      both) for the transaction-rollback test isolation approach

## 2. packages/env

- [x] 2.1 Scaffold `packages/env` workspace package (`package.json`, `tsconfig.json`)
- [x] 2.2 Implement `dbEnv` schema (`@t3-oss/env-core`, `DATABASE_URL`,
      `emptyStringAsUndefined: true`) exported for apps to extend
- [x] 2.3 Add a package-level `biome.json` if any override is needed
      (`"extends": "//"`), otherwise rely on root config

## 3. apps/api skeleton

- [x] 3.1 Scaffold `apps/api` workspace package (`package.json` with `hono`,
      `drizzle-orm`, `drizzle-kit`; `tsconfig.json`)
- [x] 3.2 Add `apps/api/src/env.ts` extending `@oinc/env`'s `dbEnv`
- [x] 3.3 Add `shared/db/` — Drizzle client (`shared/db/client.ts`), empty schema
      barrel (`shared/db/schema/index.ts`), `drizzle.config.ts` pointing at it
- [x] 3.4 Add `shared/errors/` — `ApiError` base class and a couple of concrete
      subclasses (e.g. `NotFoundError`) shaping the `{ error: { code, message,
      details } }` contract
- [x] 3.5 Add `shared/middleware/` — request id, request logging, and the global
      `errorHandler` (`ErrorHandler` wired via `app.onError`)
- [x] 3.6 Add `app/app.ts` — creates the Hono app, applies global middleware,
      wires `app.onError(errorHandler)`, exports `AppType`
- [x] 3.7 Add `app/routes.ts` — `registerRoutes(app)` stub (no modules to mount
      yet, but the aggregation point exists for the next change)
- [x] 3.8 Add `apps/api` scripts: `dev` (bun run with watch), `build`, `lint`,
      `test`, `check-types`
- [x] 3.9 Write a smoke test: the Hono app responds to a request without crashing
      (`app.request(...)` in-process, per `testing.md`'s in-process pattern)
- [x] 3.10 Write a smoke test: the Drizzle client can open a connection and run a
      trivial query against the local `docker-compose` Postgres

## 4. apps/web skeleton

- [x] 4.1 Scaffold `apps/web` as a Next.js App Router app (`src/` directory),
      workspace `package.json`, `tsconfig.json`
- [x] 4.2 Add `apps/web/src/env.ts` using `@t3-oss/env-nextjs` (no client vars yet
      beyond what's needed to reach the API, e.g. `NEXT_PUBLIC_API_URL`)
- [x] 4.3 Initialize Tailwind CSS and shadcn/ui (`nova` preset, `base` primitives,
      `neutral` base color, `cssVariables: true`) via the shadcn skill; commit
      generated `components.json` and `src/app/globals.css` — see design.md for
      why this deviates from the doc's original `new-york` flag
- [x] 4.4 Add `apps/api` as a `workspace:*` type-only devDependency of `apps/web`
      purely to import `AppType`
- [x] 4.5 Add root `app/layout.tsx` wiring a TanStack Query client provider
- [x] 4.6 Add `app/(public)/layout.tsx` (public shell, no session required) — do
      **not** add `app/(private)/` in this change (see design.md)
- [x] 4.7 Add a minimal `app/(public)/` route (e.g. a placeholder landing page) so
      the route group and root layout are exercised by a real request
- [x] 4.8 Add `src/lib/api-client.ts` (or equivalent) wrapping `hc<AppType>(...)`
      configured from `env.NEXT_PUBLIC_API_URL`
- [x] 4.9 Add `apps/web` scripts: `dev`, `build`, `lint`, `test`, `check-types`
- [x] 4.10 Write a smoke test: the root layout / public route renders without a
      server or client error

## 5. Verification

- [x] 5.1 Run `bun install` from a clean checkout and confirm all workspaces
      resolve in one pass
- [x] 5.2 Run `docker compose up -d` and confirm both the dev and test Postgres
      databases are reachable
- [x] 5.3 Run `bun run lint && bun test && bun run build` from the repo root and
      confirm all three succeed
- [x] 5.4 Manually confirm `apps/api` boots (`bun run dev` in `apps/api`) and
      responds to a request
- [x] 5.5 Manually confirm `apps/web` boots (`bun run dev` in `apps/web`), renders
      its root/public route, and that shadcn/ui styling is applied
