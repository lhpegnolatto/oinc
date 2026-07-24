## Context

`wallets-crud` (archived) shipped `wallet` as `{ id, userId, name, balance }` and explicitly
named icon/color as a deferred non-goal. This change reopens that non-goal — it's not the
next queued roadmap row (`transactions-core` is), so it's an out-of-sequence insert rather
than a continuation; flagged here per the archived design's own convention of naming
deviations instead of silently skipping them. No other table references `wallet` yet
(`transactions-core` hasn't shipped), so this is a low-risk, additive-only schema change.

No file/object storage exists anywhere in this codebase today (no S3/R2/Blob client, no
`@oinc/env` vars for one, no upload endpoint). That fact is what keeps custom icon upload
out of scope here rather than a preference — see Non-Goals.

## Goals / Non-Goals

**Goals:**
- Every wallet has a color and an icon, chosen at creation, editable afterward.
- Icon picker is a small curated set of finance-relevant Lucide icons.
- Color picker offers fixed presets plus a freeform hue/saturation picker with a hex input.
- `WalletCard` visually distinguishes wallets at a glance (icon in a color-tinted circle).

**Non-Goals:**
- No custom icon upload. No storage infra exists in the codebase yet, and this change
  shouldn't be the one that introduces it as a side effect of a color/icon feature — revisit
  as its own change if there's a concrete reason to build that infra later.
- No contrast/legibility clamping on the freeform color picker — any hex value a user picks
  is accepted as-is, including ones that may read poorly against a card in one theme.
  Explicit product call, not an oversight.
- No full-catalog Lucide search UI — the picker is a fixed, curated grid (~30 icons), not a
  general icon browser.
- No change to the create/edit dialog pattern itself (still a `Dialog`, not a sheet) and no
  new keyboard shortcut — wallet create/edit remains an occasional action, not a frequent
  one, so `.docs/product/overview.md`'s shortcut/sheet requirement for frequent actions
  doesn't apply, same reasoning `wallets-crud` used originally.
- No balance edit — unchanged from `wallets-crud`; out of scope for this change entirely.

## Decisions

**Two new columns on `wallet`, not a separate table.** `color: text` (hex string, e.g.
`"#22c55e"`) and `icon: text` (a key from the curated icon set, e.g. `"landmark"`), both
`NOT NULL`. No index — neither column is an FK, nor filtered/sorted/unique on. Considered a
separate `wallet_appearance` table (1:1) to keep `wallet` narrow, but with only two scalar
columns and no independent lifecycle, that's unwarranted indirection for this shape of data.

**Color is always a raw hex string, regardless of how it was picked.** Presets and the
freeform picker both resolve to the same `color` value — no `colorType`/`isCustom`
discriminator. Validated server-side as `#[0-9a-f]{6}` (case-insensitive, normalized to
lowercase on write). This is simpler than the icon case because there's no "custom vs.
built-in" storage distinction to make — a hex string is a hex string either way.

**Icon is a closed enum, not a free string.** The curated set (~30 keys) is defined once and
shared as a Zod enum consumed by both the create/update request schemas (API-side
validation — an unknown key is rejected, not silently stored) and the web icon-picker /
`WalletCard` rendering (maps key → Lucide component). Concretely: `wallet`, `piggy-bank`,
`landmark`, `banknote`, `credit-card`, `coins`, `building`, `building-2`, `wallet-cards`,
`vault`, `hand-coins`, `circle-dollar-sign`, `receipt`, `gem`, `trending-up`, and similar —
final list finalized during implementation, but must stay a fixed, hand-picked set (not
"whatever Lucide ships this version") so a future Lucide upgrade can't silently invalidate
stored values. Rejected full-catalog free-text because it would need search/virtualization
UI disproportionate to a personal-finance app's wallet count, and because an open string
column has no server-side guarantee the value is even a real icon name.

**Combined icon+color picker, one trigger.** A single control (icon rendered inside a
color-tinted circle) opens a `Popover` containing both the icon grid and the color section,
rather than two separate buttons/fields. Matches the common pattern (Notion/Linear-style)
for this exact pairing and keeps the create/edit form from growing to 4 visually separate
fields.

**New shadcn `Popover` primitive + a small color-picker dependency.** Neither exists in
`apps/web/src/components/ui/` today. A lightweight hue/saturation + hex library (e.g.
`react-colorful`, ~2KB, no dependencies) is the implementation vehicle for the freeform color
section — evaluate/confirm exact package during `tasks.md` execution via the shadcn skill,
but the shape (small, dependency-free, controlled hex value) is the constraint that matters
here, not the specific package name.

**Required at creation, not deferred to edit.** The create dialog grows from 2 fields (name,
balance) to include icon + color, pre-filled with a sensible default (first palette swatch,
`wallet` icon) so the form is immediately submittable without forcing a decision, but the
user can change either before submitting. Rejected auto-assigning a random appearance with
customization only available post-creation via edit — deliberately chosen so a wallet's
identity is settled once, at creation, rather than needing a follow-up edit for the common
case of a user who does want to pick.

## Risks / Trade-offs

- **[Risk]** A future Lucide major version could rename/remove an icon in the curated set,
  breaking the key → component mapping for existing stored wallets. → **Mitigation**: the
  curated set is a fixed internal list independent of Lucide's own naming; a Lucide upgrade
  requires checking the curated set's keys still resolve, same as any other icon library
  bump would.
- **[Risk]** Freeform color with no contrast clamping can produce a wallet that's hard to
  read in one theme. → **Mitigation**: accepted product trade-off (explicit decision above);
  revisit only if it proves to be a real usability complaint.
- **[Trade-off]** Deferring custom upload means a user who wants their own logo/photo as a
  wallet icon can't yet — acceptable since it requires new storage infra this change
  deliberately avoids introducing as a side effect.

## Migration Plan

Additive Drizzle migration: add `color` and `icon` as `NOT NULL` columns to the existing
`wallet` table. Since existing rows (if any, in dev data) predate these columns, the
migration backfills them with a fixed default (e.g. `color = '#71717a'`, `icon = 'wallet'`)
before enforcing `NOT NULL` — standard `drizzle-kit generate` prompts for this when adding a
`NOT NULL` column to a non-empty table. No backfill risk beyond this feature's own data (no
downstream table reads `wallet.color`/`wallet.icon` yet). Rollback is dropping the migration.

## Open Questions

None outstanding — storage approach for custom icons (deferred), curated vs. full icon set,
color picker legibility constraints, and required-at-creation vs. deferred-to-edit were the
open items from exploration and are resolved above.
