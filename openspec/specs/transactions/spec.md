# transactions

## Purpose

Transactions are the highest-frequency action oinc exists for — the day-to-day
money moving in and out of a wallet. This capability covers creating, editing,
listing, and deleting a signed-in user's own transactions, the wallet-balance
side effects of each (see the `wallets` capability's "A wallet's balance
reflects its transactions"), and the quick-add shortcut/sheet UX that makes
logging one fast enough to not interrupt whatever else the user is doing.

## Requirements

### Requirement: A signed-in user can log a transaction against their own wallet
`apps/api` SHALL let a signed-in user create a transaction with a `type`
(`income`/`expense`), a positive `amount`, a `categoryId`, a `date`, and an optional
`note`, attached to a wallet they own. The category referenced SHALL be either a system
category or one of the user's own custom categories, and its `type` SHALL match the
transaction's `type`.

#### Scenario: Logging an income transaction succeeds
- **WHEN** a signed-in user submits a valid `income` transaction for a wallet they own,
  with a category whose type is `income`
- **THEN** the transaction is persisted and the wallet's `balance` increases by the
  transaction's `amount`

#### Scenario: Logging an expense transaction succeeds
- **WHEN** a signed-in user submits a valid `expense` transaction for a wallet they own,
  with a category whose type is `expense`
- **THEN** the transaction is persisted and the wallet's `balance` decreases by the
  transaction's `amount`

#### Scenario: Logging a transaction against another user's wallet fails
- **WHEN** a signed-in user submits a transaction for a wallet owned by a different user
- **THEN** the request fails with a not-found error, no transaction is created, and no
  wallet balance changes

#### Scenario: Logging a transaction with a mismatched category type fails
- **WHEN** a signed-in user submits a transaction whose `type` does not match the `type`
  of the referenced category
- **THEN** the request is rejected with a validation error and no transaction is created

#### Scenario: Logging a transaction with a non-positive amount fails
- **WHEN** a signed-in user submits a transaction with an `amount` of zero or less
- **THEN** the request is rejected with a validation error and no transaction is created

### Requirement: A signed-in user can view their own wallet's transactions
`apps/api` SHALL return only the transactions belonging to a wallet the requesting user
owns, ordered by `date` descending. `apps/web` SHALL render this list on `/wallets/[id]`.

#### Scenario: Transaction list is scoped to the requesting wallet and user
- **WHEN** a signed-in user requests the transaction list for a wallet they own
- **THEN** the response contains only that wallet's transactions, ordered most recent
  first

#### Scenario: Requesting another user's wallet transaction list fails
- **WHEN** a signed-in user requests the transaction list for a wallet owned by a
  different user
- **THEN** the request fails with a not-found error, without revealing whether the
  wallet id exists

### Requirement: A signed-in user can edit their own transaction
`apps/api` SHALL let a signed-in user change a transaction's `amount`, `type`,
`categoryId`, `walletId`, `date`, or `note`, as long as the transaction and (for a wallet
change) the target wallet both belong to them. Any change to `amount`, `type`, or
`walletId` SHALL keep both wallets' `balance` values consistent with the new state.

#### Scenario: Editing a transaction's amount adjusts the wallet balance
- **WHEN** a signed-in user changes the `amount` of a transaction they own
- **THEN** the transaction is updated and the wallet's `balance` reflects only the new
  amount, not the old one

#### Scenario: Moving a transaction to a different wallet moves its balance effect
- **WHEN** a signed-in user changes the `walletId` of a transaction they own to a
  different wallet they also own
- **THEN** the original wallet's `balance` no longer reflects the transaction, and the
  new wallet's `balance` reflects it instead

#### Scenario: Editing another user's transaction fails
- **WHEN** a signed-in user attempts to edit a transaction owned by a different user
- **THEN** the request fails with a not-found error and nothing changes

#### Scenario: Moving a transaction to a wallet the user doesn't own fails
- **WHEN** a signed-in user attempts to change a transaction's `walletId` to a wallet
  owned by a different user
- **THEN** the request fails with a not-found error and neither wallet's balance changes

### Requirement: A signed-in user can delete their own transaction
`apps/api` SHALL let a signed-in user permanently delete a transaction they own. Deleting
it SHALL reverse its effect on its wallet's `balance`.

#### Scenario: Deleting a transaction reverses its balance effect
- **WHEN** a signed-in user deletes a transaction they own
- **THEN** the transaction is permanently removed and the wallet's `balance` no longer
  reflects it

#### Scenario: Deleting another user's transaction fails
- **WHEN** a signed-in user attempts to delete a transaction owned by a different user
- **THEN** the request fails with a not-found error and the transaction is not deleted

### Requirement: A transaction can be logged without leaving the current screen
`apps/web` SHALL provide a quick-add sheet for creating a transaction against either a
wallet or a credit card, reachable via a single keyboard shortcut from anywhere in the
private app, and via a visible quick-action affordance on the dashboard. Selecting a
credit card as the destination SHALL fix the transaction's `type` to `expense` and
reveal a `pending`/`posted` status field; selecting a wallet SHALL show the
income/expense choice and no status field. Opening the sheet SHALL NOT navigate away
from the current page.

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
- **THEN** the sheet's destination is pre-filled with that wallet, and remains
  changeable before submitting

#### Scenario: Opening the sheet from a credit card's page pre-fills that card
- **WHEN** a signed-in user opens the quick-add sheet (by shortcut, or via the "Log
  charge" affordance) from `/credit-cards/[id]`
- **THEN** the sheet's destination is pre-filled with that credit card, and remains
  changeable before submitting

#### Scenario: Opening the sheet elsewhere requires picking a destination
- **WHEN** a signed-in user opens the quick-add sheet from a screen that isn't scoped to
  a specific wallet or credit card
- **THEN** the sheet's destination starts empty and must be filled in (a wallet or a
  credit card) before the transaction can be submitted

#### Scenario: Choosing a credit card destination fixes type and reveals status
- **WHEN** a signed-in user selects a credit card as the destination in the quick-add
  sheet
- **THEN** the income/expense choice is replaced by a fixed `expense` type, and a
  `pending`/`posted` status field appears

#### Scenario: Choosing a wallet destination restores type and hides status
- **WHEN** a signed-in user selects a wallet as the destination in the quick-add sheet
- **THEN** the income/expense choice is available and no status field is shown

#### Scenario: Dashboard is the only page with a generic, unscoped quick-add button
- **WHEN** a signed-in user views a private page other than the dashboard, a wallet's
  own page, or a credit card's own page
- **THEN** there is no visible "Add transaction" button on that page, only the keyboard
  shortcut

#### Scenario: A credit card's own page shows a button scoped to that card
- **WHEN** a signed-in user views `/credit-cards/[id]`
- **THEN** a visible "Log charge" button is present that opens the quick-add sheet with
  that card pre-filled as the destination

### Requirement: A wallet's own page shows its transactions
`apps/web` SHALL provide a `/wallets/[id]` page showing a wallet's details and its
transaction list. Wallet cards on `/wallets` SHALL link to this page.

#### Scenario: Navigating to a wallet's page from the wallet list
- **WHEN** a signed-in user clicks a wallet card on `/wallets`
- **THEN** they are navigated to that wallet's `/wallets/[id]` page, showing its
  transaction list

#### Scenario: A wallet with no transactions yet
- **WHEN** a signed-in user views `/wallets/[id]` for a wallet with no transactions
- **THEN** the page shows an empty state with a way to log the first transaction, rather
  than an error or a blank screen

### Requirement: A signed-in user can view their transactions across all wallets
`apps/api` SHALL return a signed-in user's transactions across every wallet they
own, ordered by `date` descending, optionally filtered by `walletId`,
`categoryId`, `type`, a date range (`dateFrom`/`dateTo`), a case-insensitive
substring match against `note`, and optionally capped to a maximum number of results via
`limit`. `apps/web` SHALL render this on a `/transactions` page. Credit card charges
(transactions attached to a card instead of a wallet — see the `credit-cards`
capability) SHALL NOT appear in this list.

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

#### Scenario: Credit card charges never appear in the all-wallets list
- **WHEN** a signed-in user has logged one or more charges against a credit card they
  own, and requests the all-wallets transaction list with any combination of filters
- **THEN** none of those card charges appear in the response, regardless of the
  filters applied

### Requirement: Transaction list filters are reflected in the URL
`apps/web` SHALL keep the `/transactions` page's active filters synced to the
page's URL query string, so a filtered view can be reloaded, shared, or
restored via browser back/forward navigation.

#### Scenario: Reloading a filtered URL restores the same filters
- **WHEN** a signed-in user reloads `/transactions` at a URL with filters in
  the query string
- **THEN** the page shows the list filtered exactly as the URL specifies

#### Scenario: Navigating back restores the previous filter state
- **WHEN** a signed-in user changes a filter and then navigates back
- **THEN** the previously applied filters and their results are restored

### Requirement: Each row in the all-wallets list shows its wallet
`apps/web` SHALL display which wallet each transaction on `/transactions`
belongs to, using that wallet's existing color/icon appearance.

#### Scenario: A transaction row shows its wallet's appearance
- **WHEN** a signed-in user views the `/transactions` list
- **THEN** each row displays the color/icon of the wallet that transaction
  belongs to

### Requirement: Transactions has a dedicated, top-level nav entry
`apps/web` SHALL provide a "Transactions" entry in the private app's sidebar
navigation, linking to `/transactions`.

#### Scenario: Transactions is reachable from the sidebar
- **WHEN** a signed-in user views the private app's sidebar
- **THEN** a "Transactions" entry is present and links to `/transactions`
