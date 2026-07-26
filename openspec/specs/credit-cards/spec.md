# credit-cards

## Purpose

Credit cards are spending on credit, tracked separately from wallets since they behave
differently (statement cycles, due dates, pending vs. posted amounts). This capability
covers a credit card as its own entity (name, appearance, `statementCloseDay`, `dueDay`,
`balance`) with full CRUD, and logging/editing/deleting a charge against a card — a
charge is a `transaction` row attached to a card instead of a wallet (see the
`transactions` capability), always `expense`, with a `pending`/`posted` `status`. A
card's `balance` (amount owed) updates atomically as a side effect of its charges, the
same way a wallet's `balance` reacts to its transactions. Statement close/due-date
*behavior* (cycle rollover, computing which charges belong to which statement) and
paying a card from a wallet are out of scope here — see the `credit-card-statements`
capability for that.

## Requirements

### Requirement: A credit card has a color and an icon
`apps/api` SHALL store a `color` (hex string) and an `icon` (a key from the same
curated set of Lucide icons used for wallets) for every credit card. Both fields are
required — no card exists without an appearance. `apps/web` SHALL render each card's
icon inside a circle tinted with its color wherever a card is displayed (at minimum,
on its card on `/credit-cards`).

#### Scenario: Every credit card has an appearance
- **WHEN** any credit card is created
- **THEN** it has both a `color` and an `icon` value persisted, with no way to leave
  either unset

#### Scenario: Icon must come from the curated set
- **WHEN** a create or update request includes an `icon` value that is not one of
  the curated icon keys
- **THEN** the request is rejected with a validation error and no card is created
  or updated

#### Scenario: Color must be a valid hex value
- **WHEN** a create or update request includes a `color` value that is not a valid
  6-digit hex color
- **THEN** the request is rejected with a validation error and no card is created
  or updated

#### Scenario: Card renders the assigned appearance
- **WHEN** a signed-in user views `/credit-cards`
- **THEN** each card shows its icon inside a circle tinted with its assigned color

### Requirement: A credit card has a statement close day and a due day
`apps/api` SHALL store a `statementCloseDay` and a `dueDay` (each an integer from 1 to
31) for every credit card. Both fields are required. This capability stores these values
only — no statement cycle, rollover, or due-date reminder behavior is computed from
them (see the `credit-card-statements` capability for that behavior).

#### Scenario: Creating a card requires both day fields
- **WHEN** a signed-in user submits a create-card request without a
  `statementCloseDay` or without a `dueDay`
- **THEN** the request is rejected with a validation error and no card is created

#### Scenario: A day field outside 1-31 is rejected
- **WHEN** a signed-in user submits a `statementCloseDay` or `dueDay` of `0`, `32`, or
  a non-integer value
- **THEN** the request is rejected with a validation error and no card is created or
  updated

### Requirement: A signed-in user can create a credit card
`apps/api` SHALL let a signed-in user create a credit card with a name, a starting
balance, a `statementCloseDay`, a `dueDay`, a color, and an icon. `apps/web` SHALL
provide a dialog (not a sheet or full-page navigation) to create a card from the
`/credit-cards` page, with the color and icon fields pre-filled with a default so the
form is submittable without forcing an explicit choice.

#### Scenario: Creating a credit card succeeds
- **WHEN** a signed-in user submits the create-card dialog with a non-empty name, a
  numeric starting balance, valid `statementCloseDay`/`dueDay` values, a valid color,
  and a valid icon
- **THEN** a new credit card is persisted, owned by that user, and appears in their
  card list with the given values

#### Scenario: Creating a credit card without a name fails
- **WHEN** a signed-in user submits the create-card dialog with an empty name
- **THEN** the request is rejected with a validation error and no card is created

#### Scenario: Creating a credit card without changing the appearance defaults still succeeds
- **WHEN** a signed-in user submits the create-card dialog without touching the
  pre-filled color and icon fields
- **THEN** the card is created using those default values

### Requirement: A signed-in user can view only their own credit cards
`apps/api` SHALL return only the credit cards owned by the requesting user.
`apps/web` SHALL render this list on `/credit-cards`, alongside a total equal to the
sum of the listed cards' balances.

#### Scenario: Credit card list is scoped to the requesting user
- **WHEN** a signed-in user requests their credit card list
- **THEN** the response contains only cards owned by that user, never another
  user's cards

#### Scenario: `/credit-cards` shows a total balance owed
- **WHEN** a signed-in user with two or more credit cards views `/credit-cards`
- **THEN** the page displays each card's balance and a total equal to the sum of all
  listed balances

#### Scenario: No credit cards yet
- **WHEN** a signed-in user with no credit cards views `/credit-cards`
- **THEN** the page shows an empty state with a way to create the first card, rather
  than an error or a blank screen

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

### Requirement: A signed-in user can update their own credit card's name, appearance, and statement fields
`apps/api` SHALL let a signed-in user update the name, color, icon,
`statementCloseDay`, and `dueDay` of a credit card they own. Balance is not editable
through this operation — after creation, it changes only as a side effect of logging,
editing, or deleting a charge against that card.

#### Scenario: Renaming a credit card succeeds
- **WHEN** a signed-in user submits a new name for a card they own
- **THEN** the card's name is updated and its balance is unchanged

#### Scenario: Changing a credit card's statement fields succeeds
- **WHEN** a signed-in user submits a new `statementCloseDay` and/or `dueDay` for a
  card they own
- **THEN** the card's field(s) are updated and its balance is unchanged

#### Scenario: Updating a credit card with an invalid appearance or day field fails
- **WHEN** a signed-in user submits an invalid color, an icon outside the curated
  set, or a day field outside 1-31 for a card they own
- **THEN** the request is rejected with a validation error and the card is unchanged

#### Scenario: A user cannot update another user's credit card
- **WHEN** a signed-in user attempts to update a credit card owned by a different
  user
- **THEN** the request fails with a not-found error, without revealing whether the
  card id exists

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

### Requirement: A signed-in user can log a charge against their own credit card
`apps/api` SHALL let a signed-in user create a charge with a positive `amount`, a
`categoryId`, a `date`, an optional `note`, and a `status` (`pending` or `posted`,
defaulting to `posted` if omitted), attached to a credit card they own. A charge's
type is always `expense`. The category referenced SHALL be either a system category
or one of the user's own custom categories, and its `type` SHALL be `expense`.

#### Scenario: Logging a charge succeeds
- **WHEN** a signed-in user submits a valid charge for a card they own, with an
  `expense`-type category
- **THEN** the charge is persisted and the card's `balance` increases by the
  charge's `amount`

#### Scenario: Logging a charge without a status defaults to posted
- **WHEN** a signed-in user submits a charge without a `status`
- **THEN** the charge is persisted with `status` set to `posted`

#### Scenario: Logging a charge with an explicit pending status succeeds
- **WHEN** a signed-in user submits a charge with `status` set to `pending`
- **THEN** the charge is persisted with `status` set to `pending`, and the card's
  `balance` increases by the charge's `amount` the same as a posted charge (the
  pending/posted distinction has no effect on `balance` in this capability)

#### Scenario: Logging a charge against another user's card fails
- **WHEN** a signed-in user submits a charge for a credit card owned by a different
  user
- **THEN** the request fails with a not-found error, no charge is created, and no
  card balance changes

#### Scenario: Logging a charge with a non-expense category fails
- **WHEN** a signed-in user submits a charge referencing a category whose `type` is
  `income`
- **THEN** the request is rejected with a validation error and no charge is created

#### Scenario: Logging a charge with a non-positive amount fails
- **WHEN** a signed-in user submits a charge with an `amount` of zero or less
- **THEN** the request is rejected with a validation error and no charge is created

### Requirement: A signed-in user can view their own credit card's charges
`apps/api` SHALL return only the charges belonging to a credit card the requesting
user owns, ordered by `date` descending. `apps/web` SHALL render this list on
`/credit-cards/[id]`.

#### Scenario: Charge list is scoped to the requesting card and user
- **WHEN** a signed-in user requests the charge list for a credit card they own
- **THEN** the response contains only that card's charges, ordered most recent first

#### Scenario: Requesting another user's card charge list fails
- **WHEN** a signed-in user requests the charge list for a credit card owned by a
  different user
- **THEN** the request fails with a not-found error, without revealing whether the
  card id exists

### Requirement: A signed-in user can edit their own credit card charge
`apps/api` SHALL let a signed-in user change a charge's `amount`, `categoryId`,
`cardId`, `date`, `note`, or `status`, as long as the charge and (for a card change)
the target card both belong to them. Moving a charge's `cardId` SHALL only be
allowed to another credit card the user owns — not to a wallet. Any change to
`amount` or `cardId` SHALL keep both cards' `balance` values consistent with the new
state.

#### Scenario: Editing a charge's amount adjusts the card balance
- **WHEN** a signed-in user changes the `amount` of a charge they own
- **THEN** the charge is updated and the card's `balance` reflects only the new
  amount, not the old one

#### Scenario: Moving a charge to a different card moves its balance effect
- **WHEN** a signed-in user changes the `cardId` of a charge they own to a
  different credit card they also own
- **THEN** the original card's `balance` no longer reflects the charge, and the new
  card's `balance` reflects it instead

#### Scenario: Editing another user's charge fails
- **WHEN** a signed-in user attempts to edit a charge owned by a different user
- **THEN** the request fails with a not-found error and nothing changes

#### Scenario: Moving a charge to a card the user doesn't own fails
- **WHEN** a signed-in user attempts to change a charge's `cardId` to a credit card
  owned by a different user
- **THEN** the request fails with a not-found error and neither card's balance
  changes

### Requirement: A signed-in user can delete their own credit card charge
`apps/api` SHALL let a signed-in user permanently delete a charge they own. Deleting
it SHALL reverse its effect on its card's `balance`.

#### Scenario: Deleting a charge reverses its balance effect
- **WHEN** a signed-in user deletes a charge they own
- **THEN** the charge is permanently removed and the card's `balance` no longer
  reflects it

#### Scenario: Deleting another user's charge fails
- **WHEN** a signed-in user attempts to delete a charge owned by a different user
- **THEN** the request fails with a not-found error and the charge is not deleted

### Requirement: A signed-in user can split a credit card charge into installments
`apps/api` SHALL let a signed-in user create an installment plan for a credit card they
own: a total `amount`, a `categoryId`, a starting `date`, an optional `note`, a
`status`, and an installment `count` of 2 or more. The plan SHALL be persisted as
`count` separate charges, one per calendar month starting from the given date, each
carrying the same `installmentPlanId` and its own 1-based `installmentNumber` out of
`installmentCount`. Each installment's `amount` SHALL be `total / count` rounded to 2
decimals, except the last installment, which SHALL be whatever remains so the
installments sum exactly to `total`. Creating the plan SHALL increase the card's
`balance` by the full `total`, atomically with the writes.

#### Scenario: Splitting a charge into installments succeeds
- **WHEN** a signed-in user submits a charge for a card they own with an installment
  `count` of 2 or more and a valid `expense`-type category
- **THEN** `count` charges are persisted, dated one per month starting from the
  submitted date, sharing an `installmentPlanId`, and the card's `balance` increases by
  the full submitted `total`

#### Scenario: Installment amounts sum exactly to the total
- **WHEN** a signed-in user splits a charge whose `total` does not divide evenly by
  `count`
- **THEN** every installment but the last is `total / count` rounded to 2 decimals, and
  the last installment is the remainder, so the sum of all installments equals `total`
  exactly

#### Scenario: A count of 1 (or omitted) is a regular, non-installment charge
- **WHEN** a signed-in user submits a charge without an installment `count`, or with a
  `count` of 1
- **THEN** exactly one charge is created with no `installmentPlanId` set, identical to
  logging a charge today

#### Scenario: Splitting a charge against another user's card fails
- **WHEN** a signed-in user submits an installment plan for a credit card owned by a
  different user
- **THEN** the request fails with a not-found error, no charges are created, and no
  card balance changes

#### Scenario: Splitting a charge with a non-expense category fails
- **WHEN** a signed-in user submits an installment plan referencing a category whose
  `type` is `income`
- **THEN** the request is rejected with a validation error and no charges are created

#### Scenario: Splitting a charge with a non-positive total or an invalid count fails
- **WHEN** a signed-in user submits an installment plan with a `total` of zero or less,
  or a `count` less than 1
- **THEN** the request is rejected with a validation error and no charges are created

### Requirement: A signed-in user can delete an installment and every remaining installment in its plan
`apps/api` SHALL let a signed-in user delete a charge that belongs to an installment
plan together with every other charge in that same plan dated on or after it, as long
as the charge belongs to them. Deleting SHALL reverse each removed charge's effect on
its card's `balance`. `apps/web` SHALL offer this alongside the existing single-charge
delete when the charge being deleted has an installment plan with at least one later
installment remaining.

#### Scenario: Deleting an installment and its remaining siblings reverses their balance effect
- **WHEN** a signed-in user deletes an installment charge they own and chooses to
  delete it and all remaining installments
- **THEN** that charge and every other charge in the same plan dated on or after it are
  permanently removed, and the card's `balance` no longer reflects any of them

#### Scenario: Earlier installments in the plan are untouched
- **WHEN** a signed-in user deletes an installment and its remaining siblings
- **THEN** installments in the same plan dated before the deleted one are not removed
  and the card's `balance` still reflects them

#### Scenario: The option is not offered for a non-installment charge or the last installment
- **WHEN** a signed-in user opens the delete confirmation for a charge with no
  installment plan, or for the last installment in its plan
- **THEN** only the single-charge delete option is available

#### Scenario: Deleting another user's installment plan fails
- **WHEN** a signed-in user attempts to delete an installment (and its remaining
  siblings) belonging to a charge owned by a different user
- **THEN** the request fails with a not-found error and nothing is removed

### Requirement: A credit card's own page shows its details and charges
`apps/web` SHALL provide a `/credit-cards/[id]` page showing a card's details and its
charge list. Card entries on `/credit-cards` SHALL link to this page.

#### Scenario: Navigating to a card's page from the credit card list
- **WHEN** a signed-in user clicks a credit card on `/credit-cards`
- **THEN** they are navigated to that card's `/credit-cards/[id]` page, showing its
  charge list

#### Scenario: A credit card with no charges yet
- **WHEN** a signed-in user views `/credit-cards/[id]` for a card with no charges
- **THEN** the page shows an empty state with a way to log the first charge, rather
  than an error or a blank screen

### Requirement: Credit cards has a dedicated, top-level nav entry
`apps/web` SHALL provide a "Credit Cards" entry in the private app's sidebar
navigation, linking to `/credit-cards`.

#### Scenario: Credit cards is reachable from the sidebar
- **WHEN** a signed-in user views the private app's sidebar
- **THEN** a "Credit Cards" entry is present and links to `/credit-cards`
