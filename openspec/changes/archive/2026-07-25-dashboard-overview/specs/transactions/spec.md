## MODIFIED Requirements

### Requirement: A transaction can be logged without leaving the current screen
`apps/web` SHALL provide a quick-add sheet for creating a transaction, reachable via a
keyboard shortcut from anywhere in the private app, and via a visible quick-action
affordance on the dashboard. Opening the sheet SHALL NOT navigate away from the current
page.

#### Scenario: Keyboard shortcut opens the quick-add sheet from any private page
- **WHEN** a signed-in user presses the transaction shortcut key while no input,
  textarea, or other editable element has focus, on any page in the private app
- **THEN** the quick-add sheet opens in place, without a page navigation

#### Scenario: Shortcut is ignored while typing
- **WHEN** a signed-in user presses the transaction shortcut key while focus is inside a
  text input, textarea, or other editable element
- **THEN** the quick-add sheet does not open and the keystroke is treated as normal input

#### Scenario: Opening the sheet from a wallet's page pre-fills that wallet
- **WHEN** a signed-in user opens the quick-add sheet (by shortcut) from `/wallets/[id]`
- **THEN** the sheet's wallet field is pre-filled with that wallet, and remains
  changeable before submitting

#### Scenario: Opening the sheet elsewhere requires picking a wallet
- **WHEN** a signed-in user opens the quick-add sheet from a screen that isn't scoped to
  a specific wallet
- **THEN** the sheet's wallet field starts empty and must be filled in before the
  transaction can be submitted

#### Scenario: Dashboard is the only page with a visible quick-add button
- **WHEN** a signed-in user views a private page other than the dashboard
- **THEN** there is no visible "Add transaction" button on that page, only the keyboard
  shortcut

### Requirement: A signed-in user can view their transactions across all wallets
`apps/api` SHALL return a signed-in user's transactions across every wallet they
own, ordered by `date` descending, optionally filtered by `walletId`,
`categoryId`, `type`, a date range (`dateFrom`/`dateTo`), a case-insensitive
substring match against `note`, and optionally capped to a maximum number of results via
`limit`. `apps/web` SHALL render this on a `/transactions` page.

#### Scenario: All-wallets list is scoped to the requesting user
- **WHEN** a signed-in user requests their all-wallets transaction list
- **THEN** the response contains only transactions across wallets that user
  owns, ordered most recent first

#### Scenario: Filtering by wallet narrows the list
- **WHEN** a signed-in user filters the all-wallets list by a wallet they own
- **THEN** the response contains only that wallet's transactions

#### Scenario: Filtering by category narrows the list
- **WHEN** a signed-in user filters the all-wallets list by a category
- **THEN** the response contains only transactions referencing that category

#### Scenario: Filtering by type narrows the list
- **WHEN** a signed-in user filters the all-wallets list by `income` or
  `expense`
- **THEN** the response contains only transactions of that type

#### Scenario: Filtering by date range narrows the list
- **WHEN** a signed-in user filters the all-wallets list by a `dateFrom` and/or
  `dateTo`
- **THEN** the response contains only transactions whose `date` falls within
  that range

#### Scenario: Filtering by note search narrows the list
- **WHEN** a signed-in user filters the all-wallets list with a search term
- **THEN** the response contains only transactions whose `note` contains that
  term, case-insensitively

#### Scenario: Limiting the list caps the number of results
- **WHEN** a signed-in user requests the all-wallets list with `limit` set to a positive
  integer N, and more than N transactions match
- **THEN** the response contains exactly the N most recent matching transactions

#### Scenario: Combining filters applies all of them
- **WHEN** a signed-in user applies more than one filter at once
- **THEN** the response contains only transactions matching every applied
  filter

#### Scenario: A filter matching nothing returns an empty list
- **WHEN** a signed-in user applies a filter combination that matches no
  transactions
- **THEN** the response is an empty list, not an error
