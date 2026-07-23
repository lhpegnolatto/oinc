# Architecture — Frontend (`apps/web`)

Part of [.docs/architecture/](overview.md) — see [overview.md](overview.md) for the monorepo shape and shared tooling this builds on.

| Concern | Choice |
|---|---|
| Framework | Next.js (App Router, `src/` directory) |
| Styling | Tailwind CSS |
| Components | shadcn/ui — `nova` preset, base-ui primitives |
| Schema/validation | Zod |
| Forms | React Hook Form (+ `@hookform/resolvers/zod`) |
| Server state | TanStack Query |
| Env | `@fynn/env` (`@t3-oss/env-nextjs`) |

## Routing vs. logic split

The `app/` directory is used **only** for what Next.js actually needs from it: route segments, layouts, loading/error boundaries, and navigation. It is not where feature logic lives.

All real logic — data fetching hooks, mutations, components specific to a feature, client-side validation schemas, view state — lives in `src/modules/<module-name>/`. A route file in `app/` is expected to be thin: it imports and renders something from the matching module.

```
apps/web/src/
├── app/                        # routing only
│   ├── layout.tsx
│   ├── (public)/
│   │   ├── layout.tsx           # public shell (marketing/login), no session required
│   │   └── login/
│   │       └── page.tsx
│   └── (private)/
│       ├── layout.tsx           # asserts a session exists, redirects to (public)/login otherwise
│       └── projects/
│           └── page.tsx        # imports from modules/projects
├── modules/
│   └── projects/
│       ├── components/
│       ├── hooks/               # useProjectsQuery, useCreateProjectMutation, ...
│       ├── schemas/              # zod schemas for this module's forms/data
│       └── api.ts                # Hono RPC client calls wrapped as TanStack Query fetchers
└── env.ts
```

This mirrors the same intent as the API's modularization (see [backend.md](backend.md)): a module owns a vertical slice of the product, and the framework-mandated folder (`app/`, like `modules/<name>/controllers` on the API side) stays a thin adapter into it.

## Public vs. private routes

Route access is split at the `app/` root using Next.js route groups, mirroring the API's own public/private split (see `requireAuth` in [backend.md](backend.md)) so "is this behind auth" is answered the same way — a boundary you can point at — on both sides:

- **`app/(public)/`** — routes reachable without a session: marketing pages, `/login`.
- **`app/(private)/`** — routes that require a session. `app/(private)/layout.tsx` reads the session (via a server-side Better Auth session check) and redirects to `(public)/login` if there isn't one, so no individual page under `(private)/` has to remember to guard itself.

Route groups don't affect the URL (`(public)` and `(private)` don't appear in the path), so moving a route between the two is a folder move, not a routing change.

## Web ↔ API type safety (Hono RPC)

`apps/web` does not hand-write `fetch` calls or duplicate the API's Zod schemas. `apps/api` exports its Hono app's type, and `apps/web` consumes it through Hono's RPC client (`hc`) for full request/response type inference with zero codegen:

```ts
// apps/api/src/app/app.ts
// ...app built as shown in backend.md
export type AppType = typeof app;
```

`apps/web` adds `apps/api` as a `workspace:*` devDependency purely to import this type — it's erased at build time, so there's no runtime coupling between the two apps, only a compile-time contract:

```ts
// apps/web/src/modules/projects/api.ts
import { hc } from "hono/client";
import type { AppType } from "@fynn/api";

const client = hc<AppType>(env.NEXT_PUBLIC_API_URL);

export async function fetchProjects() {
  const res = await client.projects.$get();
  if (!res.ok) throw await res.json(); // shaped by shared/errors, see backend.md
  return res.json();
}
```

`modules/<name>/hooks/` then wraps calls like this one in `useQuery`/`useMutation`. This is why `schemas/` inside a web module is for **view-only** schemas (e.g. form-only fields that never hit the API) — anything that mirrors an API input/output is already typed end-to-end via `AppType` and doesn't need a hand-maintained Zod duplicate.

## Component conventions

- **Named exports only** — no default exports for components. This keeps refactors/renames explicit and avoids the ambiguity of default-export naming at import sites.
- **kebab-case file names** — e.g. `project-card.tsx`, `use-project-query.ts`, matching shadcn/ui's own file naming so generated components don't stand out from hand-written ones.
- Pages and components follow shadcn/ui's design conventions (composition over configuration, `cn()` for conditional classes, variants via `class-variance-authority` where shadcn generates them that way) — the [shadcn skill](../../.claude/skills/shadcn/SKILL.md) installed in this repo should be used to add/scaffold components rather than hand-rolling primitives that already exist in the registry.

> **Design-system constraint:** all page and component design in `apps/web` MUST follow shadcn/ui patterns — compose from `components/ui` primitives (or the underlying base-ui/Radix primitives shadcn wraps) instead of hand-rolling equivalents, and match the existing `new-york`-style visual language (spacing, radius, variant conventions) so hand-written UI is indistinguishable from generated UI. Any work that adds, modifies, or scaffolds a component or page MUST go through the [shadcn skill](../../.claude/skills/shadcn/SKILL.md) rather than writing markup from scratch or pulling in another component library.

## shadcn/ui configuration

The shadcn CLI replaced the old `style: "new-york"` / `--base-color` flags with a
named-preset system (`nova`, `vega`, `maia`, `lyra`, `mira`, `luma`) plus a `--base`
flag selecting the primitive library (`radix`, `base`, `aria`). Fynn uses the `nova`
preset with `base` (base-ui) primitives — `nova`'s default base color already
resolves to `neutral`, matching the original decision below. Scaffold/reinitialize
with `npx shadcn@latest init --template next --base base --preset nova`.

```json
// apps/web/components.json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "base-nova",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```
