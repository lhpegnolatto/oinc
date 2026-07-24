# Architecture — Testing (both apps)

Part of [.docs/architecture/](overview.md) — see [overview.md](overview.md) for the monorepo shape and shared tooling this builds on.

- Runner: `bun test` in every app/package (Jest-compatible API — `bun:test` or the Jest-compatible globals).
- Scope: tests describe **use cases**, not implementation details or coverage targets. Examples of the right level:
  - `apps/api`: "an unauthenticated request to create a project is rejected with 401", "a user who signs in with Google for the first time gets a new account provisioned".
  - `apps/web`: "submitting the create-project form with a missing name shows a validation error and does not call the API".
- Anti-pattern to avoid: a test that only asserts a pure function returns the right value for inputs no real flow produces, just to raise a coverage number.

**Testing philosophy:** tests are written around **use cases / user flows**, not written to pad line coverage. A test should map to a thing a user or client of the API is actually trying to do ("a user signs in with Google and gets a session", "a request to create a resource without permission is rejected"), not to an isolated implementation detail that would break the moment the implementation is refactored. Coverage is a side effect of testing real flows, never the goal itself.

This has a direct consequence for OpenSpec: **every change's `tasks.md` must include the use cases/flows that change touches, and the tasks for implementing it must include writing tests for those specific flows.** A task list that says "implement X" without a corresponding "test that a user can do Y through X" task is incomplete. See [Keeping this documentation authoritative](overview.md#keeping-this-documentation-authoritative) for how this is enforced at the OpenSpec config level.

## Test database isolation (`apps/api`)

Use-case tests for commands/queries go through Drizzle to a **real Postgres**, not a mock — mocking the database is exactly the kind of test that passes while the real query is broken, which contradicts the "test real flows" rule above. The approach:

- The same `docker-compose` Postgres used for local dev gets a second database, e.g. `oinc_test` (same container, no extra infra). `DATABASE_URL` for `bun test` points at it.
- **Isolation is per-test transaction rollback, not truncation.** Each test begins a transaction before it runs and rolls it back after, so tests never see each other's data and can run concurrently without truncation races. This is faster than `TRUNCATE`-between-tests and doesn't require any cross-test ordering.
- This requires repositories to receive their Drizzle client/transaction rather than importing a module-level singleton — a repository constructor takes a `db` handle, and tests pass in the per-test transaction instead of the real pooled client. This is the same seam commands need anyway for atomic multi-repository writes (e.g. "create a project and its default settings row in one transaction"), so it's not test-only ceremony.

```ts
// shared/db/test-transaction.ts
import { db } from "./client";

export async function withTestTransaction<T>(run: (tx: typeof db) => Promise<T>): Promise<T> {
  let result!: T;
  await db.transaction(async (tx) => {
    result = await run(tx);
    throw new RollbackTestTransaction(); // force rollback, keep the DB clean
  }).catch((err) => {
    if (!(err instanceof RollbackTestTransaction)) throw err;
  });
  return result;
}

class RollbackTestTransaction extends Error {}
```

```ts
// modules/projects/commands/create-project.test.ts
import { test, expect } from "bun:test";
import { withTestTransaction } from "../../../shared/db/test-transaction";
import { ProjectsRepository } from "../repositories/projects-repository";
import { createProject } from "./create-project";

test("a signed-in user can create a project", async () => {
  await withTestTransaction(async (tx) => {
    const repo = new ProjectsRepository(tx);
    const project = await createProject(repo, { name: "Acme Corp", ownerId: "user_1" });
    expect(project.name).toBe("Acme Corp");
  });
});
```

If a use case genuinely needs to exercise the HTTP layer end-to-end (controller → command/query → repository → Postgres), the same `withTestTransaction` wraps a request made with Hono's app directly (`app.request(...)`) instead of an ORM call — no real network hop needed since Hono can be invoked in-process.

## `apps/web` test tiers

`apps/web` has two tiers, chosen per use case rather than one tool for everything:

- **`bun test src`** (co-located `*.test.ts`, e.g. `dashboard.test.ts`, `sign-in.test.ts`, `private-routes.test.ts`): spins up real `apps/api` + `apps/web` (`next dev`) processes with `Bun.spawn`, seeds a real signed-in session straight into Postgres via Better Auth's `testUtils` plugin (bypassing the Google OAuth dance), then asserts against a plain `fetch()`'s status/HTML body. This tier is for **server-rendered output and route guarding** — what's in the initial HTML, redirects, auth gating — anything a static fetch can observe.
- **Playwright (`apps/web/e2e/*.spec.ts`, run via `bun run test:e2e`)**: drives a real browser against real `apps/api` + `apps/web` dev servers (`apps/web/playwright.config.ts`). This tier is for **client-side interaction that a static fetch can't exercise** — opening a dialog, filling and submitting a form, React Hook Form validation, a confirm-gated delete. `apps/web/e2e/seed-session.ts` provides the same Better-Auth-`testUtils` session seeding as the `bun test` tier, adapted to hand Playwright a cookie via `context.addCookies`.

Rule of thumb: if the use case can be verified from the HTML a server returns, use the `bun test` tier. If it requires clicking, typing, or observing client-side state that only exists after hydration, use Playwright. `test:e2e` is not part of the `turbo run test` pipeline (it needs a running Postgres and is slower) — run it explicitly when a change touches interactive `apps/web` flows.
