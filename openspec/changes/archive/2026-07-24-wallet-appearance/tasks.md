## 1. Data model

- [x] 1.1 Add `color` (`text`, `NOT NULL`) and `icon` (`text`, `NOT NULL`) columns to `wallet`
      in `apps/api/src/shared/db/schema/wallets-schema.ts`. No index (not FK/filtered/
      sorted/unique).
- [x] 1.2 Generate the Drizzle migration (`drizzle-kit generate`), supplying backfill
      defaults for existing rows (e.g. `color = '#71717a'`, `icon = 'wallet'`) so the
      `NOT NULL` constraint applies cleanly.

## 2. Shared icon set

- [x] 2.1 Define the curated Lucide icon key list (~30 finance-relevant icons, per
      design.md) as a single Zod enum shared by API validation and web rendering — decide
      its home (e.g. `apps/api/src/shared/validation/` per existing `shared/validation`
      folder, consumed by web via existing type-safety path, or duplicated with a shared
      source of truth documented) during implementation.

## 3. API: domain, schemas, commands, queries

- [x] 3.1 Add `color: string` and `icon: string` to the `Wallet` domain interface
      (`apps/api/src/modules/wallets/domain/wallet.ts`).
- [x] 3.2 Add `color` (hex regex validation) and `icon` (curated enum from 2.1) to
      `apps/api/src/modules/wallets/schemas/create-wallet.schema.ts`, with sensible
      defaults matching the web form's pre-fill.
- [x] 3.3 Add the same `color`/`icon` fields (both optional-on-update) to
      `apps/api/src/modules/wallets/schemas/update-wallet.schema.ts`.
- [x] 3.4 Include `color` and `icon` in `toWalletResponse`
      (`apps/api/src/modules/wallets/schemas/wallet-response.schema.ts`).
- [x] 3.5 Update `apps/api/src/modules/wallets/commands/create-wallet.ts` to persist
      `color`/`icon`.
- [x] 3.6 Update `apps/api/src/modules/wallets/commands/update-wallet.ts` to allow
      updating `color`/`icon` (name-only today).
- [x] 3.7 Confirm `apps/api/src/modules/wallets/queries/list-wallets.ts` and the repository
      already select `*` / all columns (no explicit column list to update); adjust if not.

## 4. API tests (`apps/api/src/modules/wallets/controllers/index.test.ts`)

- [x] 4.1 Test: creating a wallet with a valid color and icon persists and returns both
      fields.
- [x] 4.2 Test: creating a wallet with an icon outside the curated set is rejected with a
      validation error and no wallet is created.
- [x] 4.3 Test: creating a wallet with an invalid hex color is rejected with a validation
      error and no wallet is created.
- [x] 4.4 Test: updating a wallet's color and/or icon persists the change and leaves
      balance unchanged.
- [x] 4.5 Test: updating a wallet with an invalid color or icon is rejected and the wallet
      is unchanged.
- [x] 4.6 Test: a user cannot update another user's wallet's appearance (existing
      not-found-error pattern, extended to cover color/icon fields).

## 5. Web: shared appearance controls

- [x] 5.1 Add the shadcn `Popover` primitive (`apps/web/src/components/ui/popover.tsx`) via
      the shadcn skill.
- [x] 5.2 Add a small dependency-free hue/saturation + hex color-picker library (e.g.
      `react-colorful`) to `apps/web/package.json`.
- [x] 5.3 Build a combined icon+color picker component under
      `apps/web/src/modules/wallets/components/` (e.g.
      `wallet-appearance-picker.tsx`): trigger renders the current icon in a
      color-tinted circle; popover contains the curated icon grid and a color section
      (fixed swatches + freeform picker + hex input).
- [x] 5.4 Extend `apps/web/src/modules/wallets/schemas/wallet-form.schema.ts`:
      `createWalletFormSchema` gains required `color`/`icon` (hex regex / curated enum,
      matching API validation); `editWalletFormSchema` gains the same two fields.

## 6. Web: create/edit dialogs and card

- [x] 6.1 Update `create-wallet-dialog.tsx` to include the appearance picker, with
      pre-filled defaults (first palette swatch, default icon) in `useForm`'s
      `defaultValues`.
- [x] 6.2 Update `edit-wallet-dialog.tsx` to include the appearance picker, pre-filled
      with the wallet's current color/icon.
- [x] 6.3 Update `wallet-card.tsx` to render the wallet's icon inside a circle tinted with
      its color, next to the name.
- [x] 6.4 Update `apps/web/src/modules/wallets/api.ts` (`WalletDto`/request types) to
      include `color`/`icon` end-to-end through the Hono RPC client types.

## 7. Web tests (`apps/web/e2e/wallets.spec.ts`)

- [x] 7.1 Test: a user can open the create-wallet dialog, pick a preset color and a
      curated icon, submit, and see the new wallet's card render that icon/color.
- [x] 7.2 Test: a user can enter a custom hex value in the color picker and have it
      applied to the created wallet.
- [x] 7.3 Test: a user can edit an existing wallet's icon and color and see the card
      update accordingly, with balance unchanged.

## 8. Docs

- [x] 8.1 No `roadmap.md` row exists for this change (it's an out-of-sequence insert, not
      a queued row) — no edit needed there; confirm `openspec/specs/wallets/spec.md` is
      updated via sync/archive once merged (handled by `/opsx:sync` or `/opsx:archive`,
      not a manual task here).

## 9. Verification

- [x] 9.1 `bun run lint && bun test && bun run build` passes across the monorepo.
- [x] 9.2 `bun run test:e2e` passes for the wallets flows.
