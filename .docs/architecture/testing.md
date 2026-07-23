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
