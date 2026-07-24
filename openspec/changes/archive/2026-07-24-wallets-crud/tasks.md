## 1. Database

- [x] 1.1 Add `wallets` table to `apps/api/src/shared/db/schema/` — `id`, `userId` (FK → `user.id`, `onDelete: cascade`), `name`, `balance` (numeric), `createdAt`, `updatedAt`
- [x] 1.2 Add an index on `wallets.userId` (every list/ownership-check query filters on it)
- [x] 1.3 Add `wallet` relations (`user` one, and `sessions`-style `many(wallets)` on `user`) mirroring `auth-schema.ts`'s pattern
- [x] 1.4 Generate the Drizzle migration (`drizzle-kit generate`) and run it against the local dev DB

## 2. `apps/api` — `modules/wallets`

- [x] 2.1 `domain/`: wallet entity/type + any domain errors (e.g. wallet-not-found)
- [x] 2.2 `schemas/`: Zod request/response DTOs for create, update (rename), list, delete
- [x] 2.3 `repositories/wallets-repository.ts`: Drizzle-backed CRUD scoped by `userId`, constructor takes a `db` handle (per testing.md's transaction-injection pattern)
- [x] 2.4 `commands/create-wallet.ts`: creates a wallet with `name` + `balance` for the authenticated user
- [x] 2.5 `commands/update-wallet.ts`: renames a wallet owned by the authenticated user; throws not-found if the wallet doesn't belong to them
- [x] 2.6 `commands/delete-wallet.ts`: deletes a wallet owned by the authenticated user; throws not-found if it doesn't belong to them
- [x] 2.7 `queries/list-wallets.ts`: returns all wallets owned by the authenticated user
- [x] 2.8 `controllers/index.ts`: Hono router (`requireAuth` on all routes) — `POST /`, `GET /`, `PATCH /:id`, `DELETE /:id` — each calling exactly one command/query and shaping the response
- [x] 2.9 Mount the wallets router in `app/routes.ts`

## 3. `apps/api` — tests (real Postgres via `withTestTransaction`, per testing.md)

> `shared/db/test-transaction.ts` (the `withTestTransaction` helper testing.md documents) doesn't exist
> anywhere in the codebase yet — no prior test uses it either. These tests instead follow the pattern
> every existing `apps/api` test actually uses (`auth.test.ts`, `seed-new-user-defaults.test.ts`): a real
> row via Better Auth's `testUtils`, exercised through the real app/`db`, with manual cleanup in `finally`
> (`onDelete: cascade` on `wallet.userId` cleans up wallets when the test user is deleted). This is required
> here since the controller-level flows under test (401, ownership 404, validation) go through the real
> session-lookup middleware, which is bound to the pooled `db`, not an injectable per-test transaction.

- [x] 3.1 Test: a signed-in user can create a wallet with a name and balance
- [x] 3.2 Test: creating a wallet with an empty name is rejected with a validation error
- [x] 3.3 Test: an unauthenticated request to any wallets endpoint is rejected with 401
- [x] 3.4 Test: listing wallets returns only the requesting user's wallets, not another user's
- [x] 3.5 Test: a user can rename a wallet they own, and its balance is unchanged
- [x] 3.6 Test: a user cannot rename another user's wallet (not-found response)
- [x] 3.7 Test: a user can delete a wallet they own
- [x] 3.8 Test: a user cannot delete another user's wallet (not-found response)

## 4. `apps/web` — `modules/wallets`

- [x] 4.1 `api.ts`: Hono RPC client calls for create/list/update/delete wallets
- [x] 4.2 `hooks/`: `useWalletsQuery`, `useCreateWalletMutation`, `useUpdateWalletMutation`, `useDeleteWalletMutation` (TanStack Query, invalidating the list query on mutation success)
- [x] 4.3 `schemas/`: view-only Zod schema for the create/edit form (client-side validation only; API types come from `AppType`)
- [x] 4.4 `components/`: wallet list (cards showing name + balance), net-worth total, empty state, create/edit `Dialog` (shadcn, via the shadcn skill), delete confirmation dialog
- [x] 4.5 Wire components together in a `wallets-page.tsx` (or similar) module component

## 5. `apps/web` — routing

- [x] 5.1 `app/(private)/wallets/page.tsx`: thin route file rendering the module's page component
- [x] 5.2 Add a "Wallets" link/button on `app/(private)/dashboard/page.tsx` pointing to `/wallets`

## 6. `apps/web` — tests

> Implemented as Playwright e2e specs (`apps/web/e2e/wallets.spec.ts`, `apps/web/playwright.config.ts`,
> run via `bun run test:e2e`) rather than the bun:test SSR-fetch style used elsewhere in `apps/web` —
> these use cases require real client interaction (dialog open, form submit, RHF validation, confirm-gated
> delete) that a static HTML fetch can't exercise. This is a deliberate deviation from `testing.md`'s only
> existing web-test precedent, decided with the user mid-implementation; `testing.md` should be updated to
> document Playwright as the tool for interactive web use cases.

- [x] 6.1 Test: submitting the create-wallet dialog with a valid name and balance calls the create mutation and the new wallet appears in the list
- [x] 6.2 Test: submitting the create-wallet dialog with an empty name shows a validation error and does not call the API
- [x] 6.3 Test: the `/wallets` page renders each wallet's balance and a total equal to their sum
- [x] 6.4 Test: the `/wallets` page shows an empty state with a create affordance when there are no wallets
- [x] 6.5 Test: renaming a wallet updates its displayed name without changing its balance
- [x] 6.6 Test: clicking delete does not remove the wallet until the confirmation dialog is confirmed
- [x] 6.7 Test: the dashboard renders a link that navigates to `/wallets`

## 7. Verification

- [x] 7.1 `bun run lint && bun test && bun run build` passes across the monorepo
- [x] 7.2 Manually walk through: sign in → dashboard → click Wallets → create two wallets → confirm total → rename one → delete one → confirm total updates
      (covered end-to-end by the Playwright e2e suite; a final human pass in the browser is still recommended before shipping)
