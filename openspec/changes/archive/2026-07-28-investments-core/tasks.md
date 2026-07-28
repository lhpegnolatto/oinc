## 1. Database

- [x] 1.1 Add `investment` table to `apps/api/src/shared/db/schema/investments-schema.ts` — `id`, `userId` (FK → `user.id`, `onDelete: cascade`), `name`, `quantity` (numeric, precision 20/8, nullable), `costBasis` (numeric, precision 14/2, nullable), `currentValue` (numeric, precision 14/2, not null), `color`, `icon`, `createdAt`, `updatedAt`
- [x] 1.2 Add an index on `investment.userId` (every list/ownership-check query filters on it)
- [x] 1.3 Add `investment` relations (`user` one) and register the table in `shared/db/schema/index.ts`
- [x] 1.4 Generate the Drizzle migration (`drizzle-kit generate`) and run it against the local dev DB

## 2. `apps/api` — shared validation

- [x] 2.1 `shared/validation/investment-appearance.ts`: re-export `WALLET_ICON_KEYS`/`colorSchema`/`DEFAULT_COLOR` from `wallet-appearance.ts`/`appearance.ts` under investment-scoped names (see design.md Decision 3) — no new icon vocabulary

## 3. `apps/api` — `modules/investments`

- [x] 3.1 `domain/`: investment entity/type + domain errors (e.g. investment-not-found)
- [x] 3.2 `schemas/`: Zod request/response DTOs for create, update, list, delete — `currentValue` required, `quantity`/`costBasis` optional and independent of each other (no cross-field requirement)
- [x] 3.3 `repositories/investments-repository.ts`: Drizzle-backed CRUD scoped by `userId`, constructor takes a `db` handle (per testing.md's transaction-injection pattern)
- [x] 3.4 `commands/create-investment.ts`: creates a holding for the authenticated user; never touches any wallet
- [x] 3.5 `commands/update-investment.ts`: updates any combination of name/currentValue/quantity/costBasis/color/icon for a holding owned by the authenticated user; throws not-found if it doesn't belong to them; never touches any wallet
- [x] 3.6 `commands/delete-investment.ts`: deletes a holding owned by the authenticated user; throws not-found if it doesn't belong to them; never touches any wallet
- [x] 3.7 `queries/list-investments.ts`: returns all holdings owned by the authenticated user, each with a derived gain/loss (`currentValue − costBasis`) when `costBasis` is set, `null`/omitted otherwise (design.md Decision 5 — computed at read time, never persisted)
- [x] 3.8 `controllers/index.ts`: Hono router (`requireAuth` on all routes) — `POST /`, `GET /`, `PATCH /:id`, `DELETE /:id` — each calling exactly one command/query and shaping the response
- [x] 3.9 Mount the investments router in `app/routes.ts`

## 4. `apps/api` — tests (real Postgres, per testing.md)

- [x] 4.1 Test: a signed-in user can create a holding with a name and current value only, leaving quantity/costBasis unset
- [x] 4.2 Test: a signed-in user can create a holding with name, currentValue, quantity, and costBasis all set
- [x] 4.3 Test: creating a holding with an empty name is rejected with a validation error
- [x] 4.4 Test: creating a holding with no currentValue is rejected with a validation error
- [x] 4.5 Test: creating a holding never changes any wallet's balance
- [x] 4.6 Test: an unauthenticated request to any investments endpoint is rejected with 401
- [x] 4.7 Test: listing holdings returns only the requesting user's holdings, not another user's
- [x] 4.8 Test: a holding with a costBasis set returns a computed gain/loss equal to currentValue minus costBasis
- [x] 4.9 Test: a holding with no costBasis returns no gain/loss value
- [x] 4.10 Test: a user can update only a holding's currentValue, leaving other fields and any wallet balance unchanged
- [x] 4.11 Test: a user can add a costBasis to a holding that previously had none
- [x] 4.12 Test: a user cannot update another user's holding (not-found response)
- [x] 4.13 Test: a user can delete a holding they own
- [x] 4.14 Test: a user cannot delete another user's holding (not-found response)

## 5. `apps/web` — `modules/investments`

- [x] 5.1 `api.ts`: Hono RPC client calls for create/list/update/delete investment holdings
- [x] 5.2 `hooks/`: `useInvestmentsQuery`, `useCreateInvestmentMutation`, `useUpdateInvestmentMutation`, `useDeleteInvestmentMutation` (TanStack Query, invalidating the list query on mutation success)
- [x] 5.3 `schemas/`: view-only Zod schema for the create/edit form (client-side validation only; API types come from `AppType`)
- [x] 5.4 `components/`: holdings list (cards showing name, currentValue, gain/loss when present, relative "last updated"), total-value summary, empty state, create/edit `Dialog` (shadcn, via the shadcn skill), delete confirmation dialog
- [x] 5.5 Wire components together in an `investments-page.tsx` (or similar) module component

## 6. `apps/web` — routing

- [x] 6.1 `app/(private)/investments/page.tsx`: thin route file rendering the module's page component
- [x] 6.2 Add an "Investments" link/button on the dashboard pointing to `/investments`

## 7. `apps/web` — tests (Playwright e2e, per testing.md's interactive-flow tier)

- [x] 7.1 Test: submitting the create-holding dialog with a name and current value calls the create mutation and the new holding appears in the list
- [x] 7.2 Test: submitting the create-holding dialog with an empty name shows a validation error and does not call the API
- [x] 7.3 Test: the `/investments` page renders each holding's current value and a total equal to their sum
- [x] 7.4 Test: the `/investments` page shows an empty state with a create affordance when there are no holdings
- [x] 7.5 Test: a holding with a cost basis displays its gain/loss; a holding without one does not
- [x] 7.6 Test: updating a holding's current value updates what's displayed without changing its other fields
- [x] 7.7 Test: clicking delete does not remove the holding until the confirmation dialog is confirmed
- [x] 7.8 Test: the dashboard renders a link that navigates to `/investments`

## 8. Verification

- [x] 8.1 `bun run lint && bun test && bun run build` passes across the monorepo
- [x] 8.2 Manually walk through: sign in → dashboard → click Investments → create a holding with cost basis → confirm gain/loss shows → create a holding without cost basis → confirm no gain/loss shows → update a current value → delete a holding
