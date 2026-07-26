## ADDED Requirements

### Requirement: A credit card's statement cycle is computed from its statement close day and due day
`apps/api` SHALL compute, for any credit card, its currently open cycle (charges dated
since the most recent statement close, still accumulating) and its most-recently-closed
cycle (the cycle immediately before the open one), along with the closed cycle's due
date — all derived from the card's existing `statementCloseDay` and `dueDay`. This
computation SHALL NOT require storing any new field on the credit card or on its
charges; it is derived fresh each time it's requested.

#### Scenario: Computing cycle boundaries for a card mid-cycle
- **WHEN** a card's statement cycle is requested
- **THEN** the response includes the open cycle's start date, the closed cycle's date
  range, and the closed cycle's due date, all derived from `statementCloseDay` and
  `dueDay`

#### Scenario: Due date falls in the same month as the close
- **WHEN** a card's `dueDay` is greater than its `statementCloseDay`
- **THEN** the closed cycle's due date falls in the same calendar month as its close
  date

#### Scenario: Due date falls in the month after the close
- **WHEN** a card's `dueDay` is less than or equal to its `statementCloseDay`
- **THEN** the closed cycle's due date falls in the calendar month after its close date

### Requirement: A closed statement's total counts only posted charges dated within its cycle
`apps/api` SHALL compute a closed cycle's statement total as the sum of `amount` for
charges attached to the card with `status` set to `posted` and `date` within that
cycle's date range. A `pending` charge SHALL be excluded from a closed statement's
total regardless of its `date`, and a charge dated in the still-open cycle SHALL be
excluded from the closed cycle's total regardless of its `status`. This total is
independent of the card's `balance`, which continues to reflect every charge
regardless of cycle or status (see the `credit-cards` capability).

#### Scenario: A posted charge within the closed cycle counts toward its total
- **WHEN** a charge with `status` `posted` and a `date` inside the closed cycle exists
  on a card
- **THEN** its `amount` is included in that cycle's statement total

#### Scenario: A pending charge is excluded from the statement total until posted
- **WHEN** a charge with `status` `pending` and a `date` inside the closed cycle exists
  on a card
- **THEN** its `amount` is excluded from that cycle's statement total

#### Scenario: A charge dated in the open cycle is excluded from the closed cycle's total
- **WHEN** a posted charge is dated within the still-open cycle
- **THEN** its `amount` is excluded from the most-recently-closed cycle's statement
  total

#### Scenario: A charge posting later is reflected the next time the total is read
- **WHEN** a charge dated within the closed cycle changes `status` from `pending` to
  `posted`
- **THEN** the next request for that cycle's statement total includes it, with no
  separate recomputation step required

### Requirement: `/credit-cards` and `/credit-cards/[id]` show the closed statement's total and due date
`apps/web` SHALL display, for each credit card, the most-recently-closed statement's
total and due date, alongside the existing running `balance`.

#### Scenario: Viewing `/credit-cards` shows each card's statement total and due date
- **WHEN** a signed-in user views `/credit-cards`
- **THEN** each card shows its closed statement's total and due date alongside its
  running balance

#### Scenario: Viewing a card's own page shows its statement total and due date
- **WHEN** a signed-in user views `/credit-cards/[id]`
- **THEN** the page shows the closed statement's total and due date

#### Scenario: A closed cycle with no posted charges shows a statement total of zero
- **WHEN** a card's closed cycle has no posted charges
- **THEN** its statement total displays as zero, not an error or a blank state

### Requirement: A signed-in user can pay a credit card from a wallet they own
`apps/api` SHALL let a signed-in user record a payment against a credit card they own:
a positive `amount`, a `date`, an optional `note`, and a source wallet they own.
Recording a payment SHALL atomically decrease the card's `balance` and the source
wallet's `balance` by the payment's `amount`. `apps/web` SHALL provide a "Pay card"
action on `/credit-cards/[id]` that opens a sheet with a wallet picker and an amount
field pre-filled with the closed cycle's statement total (editable before submitting).

#### Scenario: Paying a card succeeds
- **WHEN** a signed-in user submits a payment with a positive `amount`, a valid
  `date`, and a wallet they own, against a credit card they own
- **THEN** the payment is persisted, the card's `balance` decreases by the `amount`,
  and the wallet's `balance` decreases by the same `amount`

#### Scenario: Paying a card the user doesn't own fails
- **WHEN** a signed-in user submits a payment against a credit card owned by a
  different user
- **THEN** the request fails with a not-found error, no payment is created, and no
  balance changes

#### Scenario: Paying from a wallet the user doesn't own fails
- **WHEN** a signed-in user submits a payment sourced from a wallet owned by a
  different user
- **THEN** the request fails with a not-found error, no payment is created, and no
  balance changes

#### Scenario: Paying with a non-positive amount fails
- **WHEN** a signed-in user submits a payment with an `amount` of zero or less
- **THEN** the request is rejected with a validation error and no payment is created

#### Scenario: The pre-filled payment amount can be edited
- **WHEN** a signed-in user opens the "Pay card" sheet and changes the pre-filled
  amount before submitting
- **THEN** the payment is recorded with the edited amount, not the pre-filled one

### Requirement: A signed-in user can view their own credit card's payment history
`apps/api` SHALL return only the payments belonging to a credit card the requesting
user owns, ordered by `date` descending. `apps/web` SHALL render this list on
`/credit-cards/[id]`, separate from the charge list.

#### Scenario: Payment history is scoped to the requesting card and user
- **WHEN** a signed-in user requests the payment history for a credit card they own
- **THEN** the response contains only that card's payments, ordered most recent first

#### Scenario: Requesting another user's card payment history fails
- **WHEN** a signed-in user requests the payment history for a credit card owned by a
  different user
- **THEN** the request fails with a not-found error, without revealing whether the
  card id exists

#### Scenario: A credit card with no payments yet
- **WHEN** a signed-in user views `/credit-cards/[id]` for a card with no payments
- **THEN** the payment history section shows an empty state, rather than an error or
  a blank area

### Requirement: A signed-in user can delete their own credit card payment
`apps/api` SHALL let a signed-in user permanently delete a payment they recorded.
Deleting it SHALL reverse its effect on both the card's `balance` and the source
wallet's `balance`. A payment is not editable — correcting an amount means deleting it
and recording a new one.

#### Scenario: Deleting a payment reverses both balance effects
- **WHEN** a signed-in user deletes a payment they recorded
- **THEN** the payment is permanently removed, the card's `balance` increases by the
  payment's `amount`, and the wallet's `balance` increases by the same `amount`

#### Scenario: Deleting another user's payment fails
- **WHEN** a signed-in user attempts to delete a payment recorded by a different user
- **THEN** the request fails with a not-found error and the payment is not deleted
