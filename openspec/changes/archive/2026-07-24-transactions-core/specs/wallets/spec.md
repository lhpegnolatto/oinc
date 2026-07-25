## ADDED Requirements

### Requirement: A wallet's balance reflects its transactions
`apps/api` SHALL update a wallet's `balance` whenever a transaction attached to it is
created, updated, or deleted, atomically with that write. After creation, this is the
only way a wallet's `balance` changes.

#### Scenario: Creating a transaction updates its wallet's balance
- **WHEN** a transaction is created against a wallet
- **THEN** that wallet's `balance` reflects the transaction's effect (increased for
  income, decreased for expense)

#### Scenario: Editing or deleting a transaction updates its wallet's balance
- **WHEN** a transaction's amount, type, or wallet is changed, or the transaction is
  deleted
- **THEN** every wallet affected has its `balance` updated so it reflects only the
  transactions currently attributed to it

## MODIFIED Requirements

### Requirement: A signed-in user can update their own wallet's name and appearance
`apps/api` SHALL let a signed-in user update the name, color, and icon of a wallet
they own. Balance is not editable through this operation — after creation, it changes
only as a side effect of creating, editing, or deleting a transaction against that wallet
(see "A wallet's balance reflects its transactions").

#### Scenario: Renaming a wallet succeeds
- **WHEN** a signed-in user submits a new name for a wallet they own
- **THEN** the wallet's name is updated and its balance is unchanged

#### Scenario: Changing a wallet's color and icon succeeds
- **WHEN** a signed-in user submits a new color and/or icon for a wallet they own
- **THEN** the wallet's color and/or icon is updated and its balance is unchanged

#### Scenario: Updating a wallet with an invalid color or icon fails
- **WHEN** a signed-in user submits an invalid color or an icon outside the curated
  set for a wallet they own
- **THEN** the request is rejected with a validation error and the wallet is
  unchanged

#### Scenario: A user cannot update another user's wallet
- **WHEN** a signed-in user attempts to update a wallet owned by a different user
- **THEN** the request fails with a not-found error, without revealing whether the
  wallet id exists

#### Scenario: Updating a wallet's name or appearance never changes its balance
- **WHEN** a signed-in user submits any combination of name, color, or icon changes for
  a wallet they own
- **THEN** the wallet's `balance` is unaffected, regardless of what else changes

### Requirement: A signed-in user can delete their own wallet
`apps/api` SHALL let a signed-in user permanently delete a wallet they own.
`apps/web` SHALL require an explicit confirmation step before the delete request is
sent. Deleting a wallet SHALL also delete all of its transactions.

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
