## Context

This is the first product-domain module in the codebase — `users` (auth/provisioning) exists, but no module has yet gone through the full controllers/commands/queries/repositories/domain/schemas split described in `backend.md`, and no web module has built a real page beyond the dashboard stub. `wallets` is the template every later module (`transactions`, `credit-cards`, `investments`) will pattern-match against, so getting the shape right here matters more than the feature's own complexity suggests.

Balance, for this slice, is **not derived from anything** — a wallet stores a single `balance` column set at creation and left alone. There is no ledger yet; `transactions-core` (next in the roadmap) is what will start moving it. This is a deliberate simplification, not an oversight: modeling it as "starting balance + transactions" now would require building transaction-aware balance computation before transactions exist.

## Goals / Non-Goals

**Goals:**
- Establish the reference module shape (api + web) for every future domain module.
- Let a user create, view, rename, and delete wallets, each with a name and a balance.
- Show a net-worth total (sum of the user's wallets) on the `/wallets` page.
- Give the dashboard a single link into `/wallets`.

**Non-Goals:**
- No direct "adjust balance" action — balance is set once at creation. Editing a wallet only changes its name (see Decisions).
- No wallet types/categories (cash vs. bank vs. other) — a wallet is just a name + balance for this slice. `credit-cards-core` and `investments-core` are separate domains, not wallet subtypes, so there's no forward-looking need to model a type field now.
- No icon/color customization — deferred until there's evidence users want it; adds a field and a picker UI for no functional benefit yet.
- No soft-delete / undo — see Risks below.
- No keyboard shortcut for any wallet action — see Decisions.

## Decisions

**Dialog, not sheet, for create/edit.** `.docs/product/overview.md`'s sheet+shortcut pattern is scoped explicitly to *frequent* actions (the canonical example is add-transaction, done many times a day). Wallet create/edit happens a handful of times total per user — mostly during onboarding. Using a sheet here would imitate the pattern's form without its justification, and a `Dialog` (shadcn) is the proportionate primitive for a 2-field, occasional form. No keyboard shortcut is bound for the same reason — this is the explicit "flag the absence" the product doc requires rather than a silent gap.

**Balance is create-only, no separate adjust action.** Keeping the wallet model to `{ name, balance }` with balance immutable after creation (only settable via the create form) avoids building a parallel, temporary "manual balance edit" flow that `transactions-core` will make redundant one slice later. If a user needs to fix a starting balance before transactions exist, delete-and-recreate the wallet is an acceptable rough edge for this narrow a window — flagged here as intentional.

**No wallet type field.** Considered adding a `type` enum (`cash` | `bank` | `other`) for future filtering/iconography, but nothing in this slice or the next few roadmap rows reads it — `credit-cards-core` and `investments-core` are their own modules/tables, not wallet subtypes. Adding an unused field now would be exactly the kind of speculative scope `.docs/product/overview.md` calls out. Can be added later as an additive migration if a real need shows up.

**Delete is hard delete, with a confirmation step.** No other table references `wallets` yet (transactions doesn't exist), so there's no FK-integrity concern today. A confirmation dialog (not a second undo mechanism) is enough friction for a destructive action at this scale. This will need revisiting in `transactions-core`'s design once wallets have dependents — noted so it isn't forgotten.

**`/wallets` as its own private route, dashboard as pure entry point.** `dashboard-overview` (roadmap #3) is a separate, later slice that will build the dashboard's net-worth widget, recent transactions, and quick-add. Building wallet CRUD directly into the dashboard now would mean `dashboard-overview` has to partially undo/restructure this slice's work. Instead, the dashboard stub gets one link (`Wallets` — a `Button`/`Link` to `/wallets`), and `/wallets` is a fully self-contained page: list + total + create/edit/delete. This keeps the two slices' surface area non-overlapping.

**Ownership check happens in queries/commands, not just via a FK.** `wallets.userId` FKs to `user.id`, but every query/command additionally filters/asserts on the authenticated user's id (from `requireAuth`'s session) rather than trusting a client-supplied wallet id alone — an id from another user must 404 (via `NotFoundError`, not a 403, to avoid confirming the id's existence), consistent with how a personal-finance app should treat cross-user access.

## Risks / Trade-offs

- **[Risk]** Hard delete with no undo means a mis-click permanently loses a wallet's name/balance (no dependent data yet, so no cascading loss). → **Mitigation**: confirmation dialog before delete; acceptable given there's nothing else to lose at this stage.
- **[Risk]** No direct balance edit could frustrate a user who mis-types a starting balance and wants to fix it without recreating the wallet. → **Mitigation**: edit still allows renaming; balance correction via delete+recreate is a narrow, temporary rough edge until `transactions-core` supersedes manual balance entirely.
- **[Trade-off]** Establishing the "reference module shape" here means this slice carries more structural weight (full CQRS folder split for a 4-endpoint CRUD) than its own complexity would otherwise justify. Accepted deliberately since every later module benefits from a correct example to copy.

## Migration Plan

New `wallets` table via a Drizzle-generated migration (`drizzle-kit generate`), additive only — no existing table is touched. No backfill needed (no pre-existing wallet data). Rollback is dropping the migration; no data-loss risk beyond the feature's own data.

## Open Questions

None outstanding — balance model, delete behavior, and interaction pattern (dialog vs. sheet) were the open items from exploration and are resolved above.
