# Architecture — Overview

This directory is the source of truth for oinc's architecture and technology choices. It exists so that every OpenSpec change — proposal, design, and implementation — makes decisions that are consistent with what's written here, instead of re-deriving (or drifting from) the stack change by change.

It's split by concern so a change only needs to load what's relevant instead of one large document:

- **overview.md** (this file) — monorepo shape, Turborepo/Biome/Bun tooling, shared packages (`@oinc/env`).
- **[frontend.md](frontend.md)** — `apps/web` (Next.js, routing, components, Hono RPC client).
- **[backend.md](backend.md)** — `apps/api` (Hono, modules, CQRS, error contract, Drizzle/Postgres).
- **[testing.md](testing.md)** — testing philosophy and conventions, applies to both apps.

If a change needs to deviate from any of these, the deviation must be called out explicitly in that change's `design.md`, and the relevant doc should be updated afterward. See [Keeping this documentation authoritative](#keeping-this-documentation-authoritative) at the bottom.

## Overview

oinc is a **Turborepo monorepo** managed with **Bun**, containing two apps and a set of shared packages:

```
oinc/
├── apps/
│   ├── web/            # Next.js frontend
│   └── api/             # Hono backend API
├── packages/
│   ├── env/              # @oinc/env — shared t3-env schemas (client + server)
│   └── ...               # future shared packages (ui, config, etc.) follow the same pattern
├── turbo.json
└── package.json
```

Both apps are TypeScript-first, share environment-variable validation through `@oinc/env`, and are built/tested/linted through Turborepo pipelines so that `turbo run build|test|lint` fans out correctly across the graph and caches per-package outputs.

---

## Monorepo tooling

### Turborepo

Turborepo orchestrates tasks (`build`, `dev`, `test`, `lint`, `check-types`) across `apps/*` and `packages/*`, using the dependency graph declared in each package's `package.json` to run things in the right order and cache/replay outputs that haven't changed.

- Root `turbo.json` defines the pipeline (`build` depends on `^build`, `dev` is not cached/persistent, etc.).
- Each app/package declares its own scripts; Turborepo just orchestrates them — it does not replace `bun`, `next`, or `drizzle-kit` commands, it wraps them.
- Remote caching can be enabled later (Vercel Remote Cache or self-hosted) once CI is in place — worth revisiting once the repo has enough build time to justify it.
- **CI is deliberately deferred for now** — no pipeline runs `turbo run lint test build` on a PR yet. This is a conscious gap, not an oversight: until CI exists, run `bun run lint && bun test && bun run build` locally before considering a change done. Add CI before this becomes a multi-contributor repo, since none of the conventions in `openspec/config.yaml` (use-case tests, indexes on new columns) are actually enforced until something checks them automatically.

```json
// package.json (root)
{
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "packageManager": "bun@<pinned-version>",
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "format": "biome format --write .",
    "test": "turbo run test",
    "check-types": "turbo run check-types"
  },
  "devDependencies": {
    "turbo": "^2.x",
    "@biomejs/biome": "^2.x"
  }
}
```

### Biome

Biome is the single linter + formatter for the entire repo — `apps/web`, `apps/api`, and every package in `packages/*` — replacing the usual ESLint + Prettier pair with one fast, Rust-based tool and one config format.

- One **root config** (`biome.json`) holds the shared rules (indent style, quote style, import organization, recommended lint rules). It's marked `"root": true`.
- Any app/package that needs to deviate (e.g. `apps/web` enabling JSX-specific lint rules) adds its own `biome.json` with `"extends": "//"`, which means "inherit the root config, then layer these overrides" — it does not need to repeat `"root": false` explicitly since `extends: "//"` implies it.
- Turborepo's `lint` task just runs `biome check` (or `biome ci` once CI exists) per package; there's no separate ESLint config, `.eslintrc`, or Prettier config anywhere in the repo — if one shows up, it's a leftover to delete, not an intentional override.

```json
// biome.json (root)
{
  "$schema": "https://biomejs.dev/schemas/2.2.0/schema.json",
  "root": true,
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "formatter": { "enabled": true, "indentStyle": "space" },
  "linter": { "enabled": true, "rules": { "recommended": true } }
}
```

```json
// apps/web/biome.json — package-level override
{
  "extends": "//",
  "linter": { "rules": { "correctness": { "useExhaustiveDependencies": "warn" } } }
}
```

### Bun

Bun is the runtime, package manager, and test runner for the whole repo — one tool instead of node + npm/pnpm + jest/vitest.

- **Workspaces**: declared via `"workspaces": ["apps/*", "packages/*"]` in the root `package.json`; `bun install` at the root resolves and links every workspace package in one pass.
- **Per-package installs**: add a dependency to the package that actually uses it (e.g. `cd apps/api && bun add hono`), not to the root, so the dependency graph in each `package.json` stays accurate for Turborepo.
- **Test runner (`bun test`)**: Jest-compatible API (`test`, `describe`, `expect`, `beforeAll`, etc. are globally available, no imports needed, though importing from `bun:test` explicitly is also supported and keeps intent obvious in larger files). Both `apps/web` and `apps/api` run their tests with `bun test` — no separate Jest/Vitest config to maintain.

See [testing.md](testing.md) for the testing philosophy (use-case-driven, not coverage-driven) and how it shapes OpenSpec `tasks.md` for every change.

---

## Shared packages

### `packages/env` — unified environment variables (`@t3-oss/env-core` / `@t3-oss/env-nextjs`)

A single shared package validates every environment variable used anywhere in the monorepo, so `apps/web` and `apps/api` never redeclare or silently disagree on what a variable means or how it's validated.

- **Server-only variables** (`DATABASE_URL`, `GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_SECRET`, ...) throw at build/runtime if ever accessed from client code — this is enforced by t3-env itself, not just convention.
- **Client-exposed variables** must carry the `NEXT_PUBLIC_` prefix (via `clientPrefix`) in `apps/web`, matching Next.js's own public-env convention, so there's no ambiguity about what ends up in the browser bundle.
- Each app can either import a shared base schema and `extend` it with its own app-specific variables, or the package can export one schema per concern (e.g. `authEnv`, `dbEnv`) that apps compose via `extends`. Prefer the latter as the number of variables grows — it keeps `apps/api`'s env file from having to know about web-only variables and vice versa.

```ts
// packages/env/src/server.ts — shared server schema
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const dbEnv = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
```

```ts
// apps/api/src/env.ts
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import { dbEnv } from "@oinc/env/server";

export const env = createEnv({
  server: {
    BETTER_AUTH_SECRET: z.string().min(32),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
  },
  extends: [dbEnv],
  runtimeEnv: process.env,
});
```

```ts
// apps/web/src/env.ts — Next.js variant validates client vars too
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {},
  client: {
    NEXT_PUBLIC_API_URL: z.string().url(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  emptyStringAsUndefined: true,
});
```

Set `emptyStringAsUndefined: true` everywhere — otherwise an empty string in a `.env` file (e.g. `DOMAIN=`) silently bypasses `.default()` and Zod validation, a well-known t3-env footgun.

---

## Keeping this documentation authoritative

This directory (`.docs/architecture/`) is *decisions*; OpenSpec `changes/` and `specs/` are *what those decisions are applied to*. Two things keep them from drifting apart:

1. **`openspec/config.yaml` → `context`**. OpenSpec injects this field into the model's context for every proposal/design/task it generates. It should hold a condensed pointer back to these files plus the handful of constraints that must never be silently violated (Google-only auth, modular boundaries, CQRS split, use-case-driven testing). Keep the full detail here — `config.yaml`'s `context` should summarize and link, not duplicate, so there's exactly one place to update when a decision changes.
2. **`openspec/config.yaml` → `rules.tasks`**. This is where "every change's tasks must include the use cases being tested" becomes a checked convention rather than a hope.

When a change needs to deviate from something decided here (a different HTTP framework for one endpoint, an exception to the module-boundary rule, etc.), that deviation belongs in the change's own `design.md` with a rationale — and if it turns out to be the new direction rather than a one-off, the relevant doc in this directory should be updated in the same change, not left to drift silently.
