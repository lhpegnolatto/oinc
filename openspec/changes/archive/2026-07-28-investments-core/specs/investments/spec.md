## ADDED Requirements

### Requirement: An investment holding has a color and an icon
`apps/api` SHALL store a `color` (hex string) and an `icon` (a key from the same
curated icon set used by wallets) for every investment holding. Both fields are
required — no holding exists without an appearance. `apps/web` SHALL render each
holding's icon inside a circle tinted with its color wherever it is displayed, at
minimum on its card on `/investments`.

#### Scenario: Every holding has an appearance
- **WHEN** any investment holding is created
- **THEN** it has both a `color` and an `icon` value persisted, with no way to leave
  either unset

#### Scenario: Icon must come from the curated set
- **WHEN** a create or update request includes an `icon` value that is not one of
  the curated icon keys
- **THEN** the request is rejected with a validation error and no holding is created
  or updated

#### Scenario: Color must be a valid hex value
- **WHEN** a create or update request includes a `color` value that is not a valid
  6-digit hex color
- **THEN** the request is rejected with a validation error and no holding is created
  or updated

### Requirement: A signed-in user can create an investment holding
`apps/api` SHALL let a signed-in user create an investment holding with a name, a
required `currentValue`, an optional `quantity`, an optional `costBasis`, a color,
and an icon. Creating a holding SHALL NOT modify any wallet's balance. `apps/web`
SHALL provide a dialog (not a sheet or full-page navigation) to create a holding
from `/investments`, with color and icon pre-filled with a default so the form is
submittable without forcing an explicit choice.

#### Scenario: Creating a holding with all fields succeeds
- **WHEN** a signed-in user submits the create-holding dialog with a non-empty name,
  a numeric `currentValue`, a `quantity`, a `costBasis`, a valid color, and a valid
  icon
- **THEN** a new holding is persisted, owned by that user, and appears in their
  holdings list with all of the given values

#### Scenario: Creating a holding with only a name and current value succeeds
- **WHEN** a signed-in user submits the create-holding dialog with a non-empty name
  and a numeric `currentValue`, leaving `quantity` and `costBasis` blank
- **THEN** a new holding is persisted with `quantity` and `costBasis` unset, and no
  validation error is raised for their absence

#### Scenario: Creating a holding without a name fails
- **WHEN** a signed-in user submits the create-holding dialog with an empty name
- **THEN** the request is rejected with a validation error and no holding is created

#### Scenario: Creating a holding without a current value fails
- **WHEN** a signed-in user submits the create-holding dialog with no `currentValue`
- **THEN** the request is rejected with a validation error and no holding is created

#### Scenario: Creating a holding never touches a wallet
- **WHEN** a signed-in user creates an investment holding
- **THEN** no wallet's `balance` changes as a result

### Requirement: A signed-in user can view only their own investment holdings
`apps/api` SHALL return only the investment holdings owned by the requesting user.
`apps/web` SHALL render this list on `/investments`, alongside a total equal to the
sum of the listed holdings' `currentValue`. Each holding SHALL display its
`updatedAt` timestamp as a relative "last updated" indicator.

#### Scenario: Holdings list is scoped to the requesting user
- **WHEN** a signed-in user requests their investment holdings
- **THEN** the response contains only holdings owned by that user, never another
  user's holdings

#### Scenario: `/investments` shows a total current value
- **WHEN** a signed-in user with two or more holdings views `/investments`
- **THEN** the page displays each holding's `currentValue` and a total equal to the
  sum of all listed holdings' `currentValue`

#### Scenario: No holdings yet
- **WHEN** a signed-in user with no investment holdings views `/investments`
- **THEN** the page shows an empty state with a way to create the first holding,
  rather than an error or a blank screen

#### Scenario: Each holding shows when it was last updated
- **WHEN** a signed-in user views `/investments`
- **THEN** each holding displays a relative "last updated" time derived from its
  `updatedAt`

### Requirement: A holding shows an unrealized gain/loss when cost basis is known
`apps/api` SHALL compute an unrealized gain/loss (`currentValue − costBasis`) for
any holding that has a `costBasis` set, and SHALL NOT compute one when `costBasis`
is unset. This value is derived at read time and is never persisted. `apps/web`
SHALL display this gain/loss alongside a holding wherever it shows `currentValue`,
and SHALL NOT display a gain/loss indicator for a holding with no `costBasis`.

#### Scenario: Gain/loss shown when cost basis is present
- **WHEN** a signed-in user views a holding with `costBasis` set to 100 and
  `currentValue` set to 150
- **THEN** the holding displays an unrealized gain of 50

#### Scenario: Loss shown when current value is below cost basis
- **WHEN** a signed-in user views a holding with `costBasis` set to 100 and
  `currentValue` set to 80
- **THEN** the holding displays an unrealized loss of 20

#### Scenario: No gain/loss shown without a cost basis
- **WHEN** a signed-in user views a holding with no `costBasis` set
- **THEN** no gain/loss indicator is displayed for that holding

### Requirement: A signed-in user can update their own investment holding
`apps/api` SHALL let a signed-in user update the name, `currentValue`, `quantity`,
`costBasis`, color, and icon of a holding they own, in any combination — no field
requires another to also be present or absent. Updating a holding SHALL NOT modify
any wallet's balance.

#### Scenario: Updating only the current value succeeds
- **WHEN** a signed-in user submits a new `currentValue` for a holding they own,
  leaving every other field unchanged
- **THEN** the holding's `currentValue` is updated and its other fields are
  unchanged

#### Scenario: Adding a cost basis to a holding that didn't have one succeeds
- **WHEN** a signed-in user submits a `costBasis` for a holding they own that
  previously had none
- **THEN** the holding's `costBasis` is updated and a gain/loss becomes visible for
  it going forward

#### Scenario: Updating a holding with an invalid color or icon fails
- **WHEN** a signed-in user submits an invalid color or an icon outside the curated
  set for a holding they own
- **THEN** the request is rejected with a validation error and the holding is
  unchanged

#### Scenario: A user cannot update another user's holding
- **WHEN** a signed-in user attempts to update a holding owned by a different user
- **THEN** the request fails with a not-found error, without revealing whether the
  holding id exists

#### Scenario: Updating a holding never touches a wallet
- **WHEN** a signed-in user updates any field of an investment holding they own
- **THEN** no wallet's `balance` changes as a result

### Requirement: A signed-in user can delete their own investment holding
`apps/api` SHALL let a signed-in user permanently delete an investment holding they
own. `apps/web` SHALL require an explicit confirmation step before the delete
request is sent. Deleting a holding SHALL NOT modify any wallet's balance.

#### Scenario: Deleting a holding succeeds after confirmation
- **WHEN** a signed-in user confirms deletion of a holding they own
- **THEN** the holding is permanently removed and no longer appears in their
  holdings list or total

#### Scenario: Deletion requires confirmation
- **WHEN** a signed-in user clicks delete on a holding
- **THEN** the holding is not deleted until the user explicitly confirms in a
  confirmation dialog

#### Scenario: A user cannot delete another user's holding
- **WHEN** a signed-in user attempts to delete a holding owned by a different user
- **THEN** the request fails with a not-found error and the holding is not deleted
