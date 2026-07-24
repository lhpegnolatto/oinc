## Why

Nothing in oinc can exist without an account to belong to — every future transaction, card charge, or investment position needs a wallet to attach to. This is the first vertical slice in the roadmap, and it's also the first thing a new user does after signing in.

## What Changes

- New `wallets` module in `apps/api`: CRUD endpoints (create, list, update, delete) for a user's wallets, each with a name and a starting balance set at creation.
- New `wallets` module in `apps/web`: a dedicated `/wallets` page (under `app/(private)/`) listing the user's wallets with their balances and a running total, plus create/edit/delete via dialogs.
- Dashboard (`app/(private)/dashboard`, currently a stub) gets a single navigation entry point to `/wallets` — no wallet CRUD happens on the dashboard itself.
- Wallet balance for this slice is **starting balance only** — there is no direct "adjust balance" action. Balance will move via transactions once `transactions-core` ships; this is called out explicitly so it isn't mistaken for a gap.
- Wallet create/edit uses a **dialog**, not a sheet — per `.docs/product/overview.md`'s "Fast is a feature" section, the sheet+shortcut pattern is reserved for high-frequency actions (the canonical example is add-transaction). Wallet CRUD is a setup-time action a user performs a handful of times total, not a daily one, so it doesn't earn a keyboard shortcut or the sheet treatment — this is a deliberate deviation from the sheet default, stated here per the product doc's own rule that an absent shortcut must be flagged, not silently skipped.

## Capabilities

### New Capabilities
- `wallets`: create, list, update, and delete a user's wallets; each wallet has a name and a balance (set once at creation for this slice); a user only ever sees their own wallets.

### Modified Capabilities
(none — no existing spec's requirements change)

## Impact

- **apps/api**: new `src/modules/wallets/` (controllers, commands, queries, repositories, domain, schemas), new `wallets` table + Drizzle schema/migration in `shared/db/schema/`, mounted into `app/routes.ts`, guarded by `requireAuth`.
- **apps/web**: new `src/modules/wallets/` (components, hooks, schemas, api.ts), new `app/(private)/wallets/page.tsx`, a small addition to `app/(private)/dashboard/page.tsx` linking to it.
- **Database**: new `wallets` table, FK to the user (owner), indexed on the owner FK.
- No changes to auth, provisioning, or existing skeleton specs.
