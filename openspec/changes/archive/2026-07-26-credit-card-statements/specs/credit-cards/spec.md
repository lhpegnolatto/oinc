## MODIFIED Requirements

### Requirement: A credit card's balance reflects its charges
`apps/api` SHALL update a credit card's `balance` whenever a charge attached to it is
created, updated, or deleted, or a payment against it is recorded or deleted (see the
`credit-card-statements` capability), atomically with that write. Every charge
increases the amount owed by its `amount` (see the "A signed-in user can log a
charge" requirement — charges are always type `expense` in this capability); every
payment decreases the amount owed by its `amount`. After creation, charges and
payments together are the only ways a card's `balance` changes.

#### Scenario: Logging a charge increases the card's balance
- **WHEN** a charge is created against a credit card
- **THEN** that card's `balance` increases by the charge's `amount`

#### Scenario: Editing or deleting a charge updates its card's balance
- **WHEN** a charge's `amount` or card is changed, or the charge is deleted
- **THEN** every card affected has its `balance` updated so it reflects only the
  charges currently attributed to it

#### Scenario: Recording or deleting a payment updates the card's balance
- **WHEN** a payment against a credit card is recorded, or an existing payment is
  deleted
- **THEN** that card's `balance` decreases by the payment's `amount`, or is restored
  by that amount, respectively

### Requirement: A signed-in user can delete their own credit card
`apps/api` SHALL let a signed-in user permanently delete a credit card they own.
`apps/web` SHALL require an explicit confirmation step before the delete request is
sent. Deleting a card SHALL also delete all of its charges and all payments recorded
against it.

#### Scenario: Deleting a credit card succeeds after confirmation
- **WHEN** a signed-in user confirms deletion of a credit card they own
- **THEN** the card is permanently removed and no longer appears in their card list
  or total

#### Scenario: Deletion requires confirmation
- **WHEN** a signed-in user clicks delete on a credit card
- **THEN** the card is not deleted until the user explicitly confirms in a
  confirmation dialog

#### Scenario: A user cannot delete another user's credit card
- **WHEN** a signed-in user attempts to delete a credit card owned by a different
  user
- **THEN** the request fails with a not-found error and the card is not deleted

#### Scenario: Deleting a credit card deletes its charges too
- **WHEN** a signed-in user deletes a credit card they own that has charges
- **THEN** those charges are also permanently removed

#### Scenario: Deleting a credit card deletes its payments too
- **WHEN** a signed-in user deletes a credit card they own that has payments recorded
  against it
- **THEN** those payments are also permanently removed
