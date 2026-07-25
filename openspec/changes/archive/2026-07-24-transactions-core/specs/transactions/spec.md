## ADDED Requirements

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
`apps/web` SHALL provide a quick-add sheet for creating a transaction, reachable both via
a visible quick-action affordance and via a keyboard shortcut, from anywhere in the
private app. Opening the sheet SHALL NOT navigate away from the current page.

#### Scenario: Keyboard shortcut opens the quick-add sheet
- **WHEN** a signed-in user presses the transaction shortcut key while no input,
  textarea, or other editable element has focus
- **THEN** the quick-add sheet opens in place, without a page navigation

#### Scenario: Shortcut is ignored while typing
- **WHEN** a signed-in user presses the transaction shortcut key while focus is inside a
  text input, textarea, or other editable element
- **THEN** the quick-add sheet does not open and the keystroke is treated as normal input

#### Scenario: Opening the sheet from a wallet's page pre-fills that wallet
- **WHEN** a signed-in user opens the quick-add sheet from `/wallets/[id]`
- **THEN** the sheet's wallet field is pre-filled with that wallet, and remains
  changeable before submitting

#### Scenario: Opening the sheet elsewhere requires picking a wallet
- **WHEN** a signed-in user opens the quick-add sheet from a screen that isn't scoped to
  a specific wallet
- **THEN** the sheet's wallet field starts empty and must be filled in before the
  transaction can be submitted

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
