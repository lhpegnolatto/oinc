## REMOVED Requirements

### Requirement: A credit card charge can be logged without leaving the current screen
**Reason**: Superseded by the `transactions` capability's unified quick-add sheet — a
credit card is now one of the destinations the single "Add transaction" sheet/shortcut
supports, rather than having its own dedicated sheet and shortcut. See the
`transactions` capability's "A transaction can be logged without leaving the current
screen" requirement.
**Migration**: No user-facing data migration — this is a UX-only removal. The `c`
keyboard shortcut and the `QuickAddChargeProvider`/`QuickAddChargeSheet` components are
deleted; `/credit-cards/[id]`'s "Log charge" button now opens the unified sheet
pre-filled with that card as the destination.

## ADDED Requirements

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
