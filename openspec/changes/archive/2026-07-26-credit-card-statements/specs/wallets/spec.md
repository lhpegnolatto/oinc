## MODIFIED Requirements

### Requirement: A wallet's balance reflects its transactions
`apps/api` SHALL update a wallet's `balance` whenever a transaction attached to it is
created, updated, or deleted, or a credit card payment sourced from it is recorded or
deleted (see the `credit-card-statements` capability), atomically with that write.
After creation, transactions and credit card payments together are the only ways a
wallet's `balance` changes.

#### Scenario: Creating a transaction updates its wallet's balance
- **WHEN** a transaction is created against a wallet
- **THEN** that wallet's `balance` reflects the transaction's effect (increased for
  income, decreased for expense)

#### Scenario: Editing or deleting a transaction updates its wallet's balance
- **WHEN** a transaction's amount, type, or wallet is changed, or the transaction is
  deleted
- **THEN** every wallet affected has its `balance` updated so it reflects only the
  transactions currently attributed to it

#### Scenario: Recording or deleting a credit card payment updates the wallet's balance
- **WHEN** a payment sourced from a wallet is recorded against a credit card, or an
  existing such payment is deleted
- **THEN** that wallet's `balance` decreases by the payment's `amount`, or is restored
  by that amount, respectively

### Requirement: A signed-in user can delete their own wallet
`apps/api` SHALL let a signed-in user permanently delete a wallet they own.
`apps/web` SHALL require an explicit confirmation step before the delete request is
sent. Deleting a wallet SHALL also delete all of its transactions and all credit card
payments sourced from it.

#### Scenario: Deleting a wallet succeeds after confirmation
- **WHEN** a signed-in user confirms deletion of a wallet they own
- **THEN** the wallet is permanently removed and no longer appears in their wallet
  list or total

#### Scenario: Deletion requires confirmation
- **WHEN** a signed-in user clicks delete on a wallet
- **THEN** the wallet is not deleted until the user explicitly confirms in a
  confirmation dialog

#### Scenario: A user cannot delete another user's wallet
- **WHEN** a signed-in user attempts to delete a wallet owned by a different user
- **THEN** the request fails with a not-found error and the wallet is not deleted

#### Scenario: Deleting a wallet deletes its transactions too
- **WHEN** a signed-in user deletes a wallet they own that has transactions
- **THEN** those transactions are also permanently removed

#### Scenario: Deleting a wallet deletes its credit card payments too
- **WHEN** a signed-in user deletes a wallet they own that has credit card payments
  sourced from it
- **THEN** those payments are also permanently removed
