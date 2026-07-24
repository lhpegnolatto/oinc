## Why

`wallets-crud` (archived) deliberately deferred icon/color customization: *"deferred until
there's evidence users want it."* That evidence is now just the product owner deciding they
want it — a wallet list of same-shaped cards with only a name is hard to scan once a user
has more than two or three wallets (cash vs. bank vs. savings all look identical). Color +
icon let a wallet be recognized at a glance, which matters once `dashboard-overview` and
`transactions-core` start showing wallets more densely.

## What Changes

- Add `color` (hex string) and `icon` (Lucide icon key) columns to the `wallet` table, both
  required, no default bypass — every wallet has an appearance from creation onward.
- Create-wallet dialog gains an icon + color picker (combined trigger: icon-in-colored-circle
  → popover with an icon grid and a color section) alongside the existing name + starting
  balance fields.
- Edit-wallet dialog (currently name-only) gains the same icon + color controls, so
  appearance stays editable after creation — balance remains excluded, per the unchanged
  `wallets-crud` decision.
- Icon picker offers a curated, fixed set of ~30 finance-relevant Lucide icons (no search UI,
  no full-catalog browsing). Custom icon upload is explicitly **out of scope** for this
  change (no file/object storage exists in the codebase yet; revisit only if there's a
  concrete reason to build that infra).
- Color picker offers fixed preset swatches plus a freeform hue/saturation picker with a
  direct hex input — no legibility/contrast clamping on the freeform picker.
- `WalletCard` renders the wallet's icon inside a circle tinted with its color, next to the
  name.
- Adds a `Popover` primitive (shadcn) and a small hue/saturation + hex color-picker component
  — neither exists in `apps/web/src/components/ui/` today.
- Existing wallet rows (pre-migration) get a default color/icon backfilled via the migration
  so the columns can be `NOT NULL`.

## Capabilities

### New Capabilities
(none — this extends the existing `wallets` capability, no new domain)

### Modified Capabilities
- `wallets`: a wallet now always has a color and an icon, chosen at creation and editable
  afterward; the create and edit flows both gain appearance controls.

## Impact

- **api**: `apps/api/src/shared/db/schema/wallets-schema.ts` (new columns), a new Drizzle
  migration, `modules/wallets/domain/wallet.ts`, `schemas/create-wallet.schema.ts`,
  `schemas/update-wallet.schema.ts`, `schemas/wallet-response.schema.ts`, and the
  create/update commands — all need to carry `color`/`icon` through.
- **web**: `modules/wallets/schemas/wallet-form.schema.ts`, `create-wallet-dialog.tsx`,
  `edit-wallet-dialog.tsx`, `wallet-card.tsx`, plus two new shared pieces: an icon-picker
  component (curated Lucide set) and a color-picker component. New `components/ui/popover.tsx`
  (shadcn) and a new dependency for the hue/saturation color picker.
- **No new frequent user action** — this changes an existing occasional action (create/edit
  wallet), so the shortcut/sheet requirement from the product doc's "Fast is a feature"
  section doesn't apply here (same reasoning `wallets-crud` used for staying a dialog).
- **Not on `.docs/product/roadmap.md`** — reopens a named non-goal out of sequence rather
  than continuing the queue (next queued row is `transactions-core`); flagged here rather
  than silently jumping the line.
