## ADDED Requirements

### Requirement: A wallet has a color and an icon
`apps/api` SHALL store a `color` (hex string) and an `icon` (a key from a fixed, curated set
of Lucide icons) for every wallet. Both fields are required — no wallet exists without an
appearance. `apps/web` SHALL render each wallet's icon inside a circle tinted with its color
wherever a wallet is displayed (at minimum, on its card on `/wallets`).

#### Scenario: Every wallet has an appearance
- **WHEN** any wallet is created
- **THEN** it has both a `color` and an `icon` value persisted, with no way to leave either
  unset

#### Scenario: Icon must come from the curated set
- **WHEN** a create or update request includes an `icon` value that is not one of the fixed
  curated icon keys
- **THEN** the request is rejected with a validation error and no wallet is created or
  updated

#### Scenario: Color must be a valid hex value
- **WHEN** a create or update request includes a `color` value that is not a valid 6-digit
  hex color (e.g. missing the `#`, wrong length, non-hex characters)
- **THEN** the request is rejected with a validation error and no wallet is created or
  updated

#### Scenario: Wallet card renders the assigned appearance
- **WHEN** a signed-in user views `/wallets`
- **THEN** each wallet's card shows its icon inside a circle tinted with its assigned color

## MODIFIED Requirements

### Requirement: A signed-in user can create a wallet
`apps/api` SHALL let a signed-in user create a wallet with a name, a starting balance, a
color, and an icon. `apps/web` SHALL provide a dialog (not a sheet or full-page navigation)
to create a wallet from the `/wallets` page, with the color and icon fields pre-filled with a
default so the form is submittable without forcing an explicit choice, while still letting
the user change either before submitting.

#### Scenario: Creating a wallet succeeds
- **WHEN** a signed-in user submits the create-wallet dialog with a non-empty name, a numeric
  balance, a valid color, and a valid icon
- **THEN** a new wallet is persisted, owned by that user, and appears in their wallet list
  with the given name, balance, color, and icon

#### Scenario: Creating a wallet without a name fails
- **WHEN** a signed-in user submits the create-wallet dialog with an empty name
- **THEN** the request is rejected with a validation error and no wallet is created

#### Scenario: Creating a wallet without changing the defaults still succeeds
- **WHEN** a signed-in user submits the create-wallet dialog without touching the pre-filled
  color and icon fields
- **THEN** the wallet is created using those default values

## RENAMED Requirements
- FROM: `### Requirement: A signed-in user can rename their own wallet`
- TO: `### Requirement: A signed-in user can update their own wallet's name and appearance`

## MODIFIED Requirements

### Requirement: A signed-in user can update their own wallet's name and appearance
`apps/api` SHALL let a signed-in user update the name, color, and icon of a wallet they own.
Balance is not editable through this operation — it is set only at creation for this slice.

#### Scenario: Renaming a wallet succeeds
- **WHEN** a signed-in user submits a new name for a wallet they own
- **THEN** the wallet's name is updated and its balance is unchanged

#### Scenario: Changing a wallet's color and icon succeeds
- **WHEN** a signed-in user submits a new color and/or icon for a wallet they own
- **THEN** the wallet's color and/or icon is updated and its balance is unchanged

#### Scenario: Updating a wallet with an invalid color or icon fails
- **WHEN** a signed-in user submits an invalid color or an icon outside the curated set for a
  wallet they own
- **THEN** the request is rejected with a validation error and the wallet is unchanged

#### Scenario: A user cannot update another user's wallet
- **WHEN** a signed-in user attempts to update a wallet owned by a different user
- **THEN** the request fails with a not-found error, without revealing whether the wallet id
  exists
