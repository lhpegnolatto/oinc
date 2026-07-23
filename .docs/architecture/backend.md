# Architecture — Backend (`apps/api`)

Part of [.docs/architecture/](overview.md) — see [overview.md](overview.md) for the monorepo shape and shared tooling this builds on.

| Concern | Choice |
|---|---|
| Runtime / HTTP framework | Bun + Hono |
| ORM | Drizzle ORM |
| Database | PostgreSQL (Docker Compose for local dev) |
| Validation | Zod (request/response schemas, shared with Hono via `@hono/zod-validator`) |
| Auth | Better Auth — Google OAuth only |
| Architecture | Modular, Clean Architecture-influenced, CQRS |

Building or reviewing anything in `apps/api` should use the [`backend-patterns`](../../.claude/skills/backend-patterns/SKILL.md) skill — it covers error-handling shape, N+1 prevention, caching, rate limiting, RBAC, and structured logging. Its examples are framework-agnostic (Express/Next.js flavored), so translate them into this repo's actual shape rather than copying literally: its "repository" and "service" pattern maps onto this repo's `repositories/` + `commands/`/`queries/` split (not a combined service layer), and its error/response shapes should conform to whatever contract is defined in `shared/errors` here, not be reinvented per module.

## Why Hono

Hono was chosen as the HTTP layer because it's Bun-native (no Node compatibility shims needed), has first-class TypeScript inference for params/context, and both Zod validation (`@hono/zod-validator`) and Better Auth ship official Hono integrations — so the framework doesn't fight the rest of the stack. `app.route()` lets each module mount its own sub-router, which maps directly onto the modular folder structure below.

## Folder structure

```
apps/api/src/
├── app/
│   ├── app.ts              # creates the Hono app, wires global middleware, mounts module routers, exports AppType
│   └── routes.ts           # aggregates each module's router via app.route('/x', moduleRouter)
├── modules/
│   └── <module-name>/
│       ├── controllers/     # Hono route handlers — parse/validate input, call a command/query, shape the response
│       ├── commands/        # write use cases (CQRS "C") — one class/function per state-changing use case
│       ├── queries/          # read use cases (CQRS "Q") — one per read use case, can bypass the domain model for performance
│       ├── repositories/     # Drizzle-backed persistence, one repository per aggregate/table cluster
│       ├── domain/            # entities/value objects/domain errors, framework-agnostic
│       └── schemas/            # Zod schemas for this module's request/response DTOs
└── shared/
    ├── db/                  # Drizzle client, schema barrel, drizzle-kit config
    ├── auth/                 # Better Auth instance + Hono middleware (session + requireAuth)
    ├── errors/                # base error classes, error → HTTP response mapping (the {error:{...}} contract)
    └── middleware/             # cross-cutting Hono middleware (logging, request id, error handler)
```

**CQRS boundary**: controllers never talk to repositories directly — they call exactly one command or query. Commands validate invariants and go through the domain layer before writing; queries are optimized for reads and are allowed to shape data directly from the repository (including bypassing the domain model, e.g. returning a projection tailored to one screen) since they don't need to protect write-side invariants.

**Module independence**: a module should not import another module's `repositories/`, `commands/`, or `domain/` directly. Cross-module composition happens either through the controller layer (orchestrating multiple modules' commands/queries) or through a small, explicit shared contract in `shared/` — never by reaching into another module's internals. This is what keeps "modularization" real instead of aspirational as the number of modules grows.

## Hono wiring

```ts
// shared/auth/index.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: false },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
});
```

```ts
// app/app.ts
import { Hono } from "hono";
import { auth } from "../shared/auth";
import { registerRoutes } from "./routes";

type Env = {
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
};

export const app = new Hono<Env>();

// Runs on every request: attaches user/session if present, but does not block.
app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);
  await next();
});

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

registerRoutes(app);

// Exported for apps/web's Hono RPC client — see "Web ↔ API type safety" in frontend.md.
export type AppType = typeof app;
```

```ts
// shared/auth/require-auth.ts
import { createMiddleware } from "hono/factory";
import type { Env } from "../../app/app";

// Routes are public by default; apply this explicitly to guard a route/router.
export const requireAuth = createMiddleware<Env>(async (c, next) => {
  if (!c.get("user")) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Sign-in required", details: [] } }, 401);
  }
  await next();
});
```

```ts
// modules/projects/controllers/index.ts
import { Hono } from "hono";
import { requireAuth } from "../../../shared/auth/require-auth";

export const projectsRouter = new Hono()
  .use("*", requireAuth) // every route in this module requires a session
  .get("/", /* ...calls a query... */);
```

Authentication is **Google sign-on only** — `emailAndPassword` is explicitly disabled in the Better Auth config above rather than just left unused, so there's no dormant email/password path to secure or reason about later. Private vs. public is opt-in per router/route via `requireAuth`, not a global default — this mirrors `apps/web`'s `(private)`/`(public)` route groups (see [frontend.md](frontend.md)), so "does this need a session" is answered the same explicit way on both sides.

## Error contract (`shared/errors`)

`shared/errors` owns every domain error class, the mapping from a domain error to an HTTP status, and the response shape — controllers never hand-build an error JSON body themselves. The response contract (v1, expected to evolve as the application grows — update this section when it does):

```ts
type ErrorResponse = {
  error: {
    code: string;        // stable, machine-readable — e.g. "PROJECT_NOT_FOUND", "VALIDATION_ERROR"
    message: string;      // human-readable, safe to show to a user
    details: string[];    // optional extra context, e.g. per-field validation messages
  };
};
```

```ts
// shared/errors/api-error.ts
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details: string[] = [],
  ) {
    super(message);
  }
}

export class NotFoundError extends ApiError {
  constructor(code: string, message: string) {
    super(404, code, message);
  }
}
```

```ts
// shared/middleware/error-handler.ts
import type { ErrorHandler } from "hono";
import { ApiError } from "../errors/api-error";

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof ApiError) {
    return c.json({ error: { code: err.code, message: err.message, details: err.details } }, err.status);
  }
  // unexpected error: log it, never leak internals in the response
  console.error(err);
  return c.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong", details: [] } }, 500);
};
```

`app.onError(errorHandler)` in `app/app.ts` wires this in once, globally — a controller throws an `ApiError` subclass and the shape is guaranteed consistent, which is what lets `apps/web`'s Hono RPC client (`res.json()` on a non-`ok` response) rely on `error.code`/`error.message` existing without checking per-endpoint.

## Database — Drizzle + PostgreSQL

- **Local dev**: PostgreSQL runs via `docker-compose.yml` at the repo root (or `apps/api/`), so `bun run dev` in `apps/api` has a real Postgres instance to talk to without a hosted dependency.
- **Migrations**: `drizzle-kit` generates SQL migrations from the schema in `shared/db/schema/`; use `drizzle-kit generate` + a run-migrations step in CI/deploy rather than `drizzle-kit push` once there's a shared/staging database — `push` is fine for solo local iteration but doesn't produce a reviewable migration file and has known limitations with index expressions.
- **Indexes are a first-class part of schema design, not an afterthought.** Every foreign key column and every column used in a `WHERE`/`ORDER BY`/unique-constraint in a query/repository should have a matching index defined in the same schema file. Example — case-insensitive unique email:

```ts
import { pgTable, serial, text, uniqueIndex } from "drizzle-orm/pg-core";
import { sql, type SQL, type AnyPgColumn } from "drizzle-orm";

function lower(col: AnyPgColumn): SQL {
  return sql`lower(${col})`;
}

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
  },
  (table) => [uniqueIndex("users_email_lower_idx").on(lower(table.email))],
);
```

```ts
// shared/db/drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/shared/db/schema",
  out: "./drizzle",
});
```

Indexes on raw SQL expressions (like `lower(email)` above) **must** be given an explicit name — Drizzle can't auto-generate one for an expression, and `push` won't pick up changes to an expression index without dropping and recreating it manually.
