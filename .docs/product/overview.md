# Product — Overview

This directory is the source of truth for *why* oinc exists and *what* it's for — the
product counterpart to [.docs/architecture/](../architecture/overview.md), which covers
*how* it's built. It exists so that every OpenSpec proposal makes scope and UX decisions
consistent with what's written here, instead of re-deriving (or drifting from) product
intent change by change.

- **overview.md** (this file) — vision, problem, target user, core domains, product
  principles, non-goals.

As product areas grow enough to need their own detail, split them out the same way
`.docs/architecture/` splits by app (e.g. `transactions.md`, `investments.md`) instead of
growing this file indefinitely.

If a change needs to deviate from anything here, the deviation must be called out
explicitly in that change's `design.md` or `proposal.md`, and this doc should be updated
afterward — see [Keeping this documentation authoritative](#keeping-this-documentation-authoritative).

## Vision

oinc is a personal finance app that helps someone answer one question at a glance:
*where is my money going, and what do I have?* It covers wallets, transactions, credit
cards, and investments as one connected picture, without asking the user to become a
bookkeeper to use it.

## Problem

Most people don't have a spending or net-worth problem — they have a *visibility*
problem. Money moves across a wallet, a couple of credit cards, and maybe a brokerage
account, and none of it is in one place. The tools that do aggregate it (spreadsheets,
full accounting suites) cost more effort to maintain than the insight is worth, so people
give up after a week. oinc's bet is that if logging and reviewing money takes seconds,
people will actually keep doing it.

## Target user

One individual managing their own personal finances — not a household with shared
accounts, not a business, not an accountant. Someone who wants enough structure to feel
in control of their money, and no more.

## Core domains

These are the four current pillars of the product — examples of the product-facing
domains, not an exhaustive or closed set of every module the codebase will ever have
(e.g. `modules/users`, which owns account/session-lifecycle concerns rather than a
product pillar, already exists alongside them). They map directly to the module
boundaries described in [backend.md](../architecture/backend.md)
(`apps/api/src/modules/*`) and [frontend.md](../architecture/frontend.md)
(`apps/web/src/modules/*`):

- **Wallets** — where money physically/virtually sits (cash, bank accounts). The
  starting point for a user's net worth.
- **Transactions** — the individual inflows/outflows against a wallet or card. The
  highest-frequency action in the product, and the one speed decisions below are
  optimized around.
- **Credit cards** — spending on credit, tracked separately from wallets since it
  behaves differently (statement cycles, due dates, pending vs. posted amounts).
- **Investments** — what the user holds outside of cash (brokerage-style positions).
  Scope here stays deliberately shallow — see [Non-goals](#non-goals).

A new domain only gets added here once it's a real, committed product direction — this
list is not meant to speculatively grow ahead of what's actually being built.

## Product principles

### Simple, not comprehensive

oinc is not trying to become a full accounting system. Every feature decision should be
weighed against: *does this help an individual understand and organize their own money,
or does it add bookkeeping-grade complexity for a case we don't need to serve?* When in
doubt, cut scope rather than add a configuration option to cover an edge case.

### Fast is a feature, not a nice-to-have

Because logging a transaction is the highest-frequency action in the app, the time it
takes to do that (and other common actions) directly determines whether people keep
using oinc. Speed is treated as a hard product requirement, not a later optimization
pass, and it applies on both keyboard and touch/mobile screens:

- **Keyboard**: every frequent action should have a shortcut, and shortcuts should be
  discoverable (visible hints), not hidden trivia.
- **Screen**: the same frequent actions should be reachable in as few taps as possible —
  e.g. a persistent quick-action affordance rather than a multi-step nested flow.

The canonical example: adding a transaction from the dashboard opens a sheet in place
(no page navigation, no context loss) and is also bound to a keyboard shortcut. Any new
frequent action (e.g. logging a card charge, moving money between wallets) should default
to this same pattern — sheet-over-current-view plus a shortcut — unless there's a
specific reason it needs a full page.

```
Dashboard
 └─ [+ Add transaction] button  ───┐
                                     ├─→ opens Sheet (same screen, no navigation)
 Keyboard shortcut (e.g. "n")  ─────┘
```

When a proposal introduces a new frequent user action, its `design.md` should state
explicitly how that action is reachable via shortcut and via a low-friction screen
interaction — treat "no shortcut yet" the same way `.docs/architecture/` treats a missing
index: acceptable to flag as a deliberate gap, not acceptable to silently skip.

## Non-goals

Kept explicit so scope creep has something concrete to be checked against:

- No general-purpose accounting features: no double-entry ledgers, multi-currency
  consolidation, or tax reporting.
- No multi-user/shared-account features (households, business accounts, permissions)
  unless a future change explicitly decides to take this on.
- No investment-grade analytics (portfolio optimization, tax-lot accounting, real-time
  market data feeds) — investments are tracked for net-worth visibility, not managed as
  a trading tool.
- No feature should require the user to understand accounting terminology to use it.

## Keeping this documentation authoritative

This directory (`.docs/product/`) is *product intent*; OpenSpec `changes/` are individual
slices of work applied against that intent. Two things keep them from drifting apart:

1. **`openspec/config.yaml` → `context`** should carry a condensed pointer back to this
   file plus the handful of product constraints that must never be silently violated
   (simple-over-comprehensive, shortcut/quick-action expectation for frequent actions) —
   the same way it already does for `.docs/architecture/`.
2. When a change's proposal or design deviates from something decided here (adds scope
   this doc calls a non-goal, ships a frequent action without a shortcut), that deviation
   needs a stated rationale in the change itself — and if it's meant to become the new
   direction rather than a one-off, this doc should be updated in the same change.
