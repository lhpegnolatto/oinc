# wallets

## Purpose

Every future transaction, card charge, or investment position in oinc needs a
wallet to attach to — this is the first vertical slice in the roadmap and the
first thing a new user does after signing in. This capability covers
create/list/update/delete of a user's own wallets, each with a name, a
balance set once at creation, and a color/icon appearance chosen at creation
and editable afterward. Balance movement via transactions is out of scope for
this capability (see `transactions-core` once it exists).

## Requirements

### Requirement: A wallet has a color and an icon
`apps/api` SHALL store a `color` (hex string) and an `icon` (a key from a fixed,
curated set of Lucide icons) for every wallet. Both fields are required — no wallet
exists without an appearance. `apps/web` SHALL render each wallet's icon inside a
circle tinted with its color wherever a wallet is displayed (at minimum, on its card
on `/wallets`).

#### Scenario: Every wallet has an appearance
- **WHEN** any wallet is created
- **THEN** it has both a `color` and an `icon` value persisted, with no way to leave
  either unset

#### Scenario: Icon must come from the curated set
- **WHEN** a create or update request includes an `icon` value that is not one of
  the fixed curated icon keys
- **THEN** the request is rejected with a validation error and no wallet is created
  or updated

#### Scenario: Color must be a valid hex value
- **WHEN** a create or update request includes a `color` value that is not a valid
  6-digit hex color (e.g. missing the `#`, wrong length, non-hex characters)
- **THEN** the request is rejected with a validation error and no wallet is created
  or updated

#### Scenario: Wallet card renders the assigned appearance
- **WHEN** a signed-in user views `/wallets`
- **THEN** each wallet's card shows its icon inside a circle tinted with its
  assigned color

### Requirement: A signed-in user can create a wallet
`apps/api` SHALL let a signed-in user create a wallet with a name, a starting
balance, a color, and an icon. `apps/web` SHALL provide a dialog (not a sheet or
full-page navigation) to create a wallet from the `/wallets` page, with the color
and icon fields pre-filled with a default so the form is submittable without
forcing an explicit choice, while still letting the user change either before
submitting.

#### Scenario: Creating a wallet succeeds
- **WHEN** a signed-in user submits the create-wallet dialog with a non-empty name,
  a numeric balance, a valid color, and a valid icon
- **THEN** a new wallet is persisted, owned by that user, and appears in their wallet
  list with the given name, balance, color, and icon

#### Scenario: Creating a wallet without a name fails
- **WHEN** a signed-in user submits the create-wallet dialog with an empty name
- **THEN** the request is rejected with a validation error and no wallet is created

#### Scenario: Creating a wallet without changing the defaults still succeeds
- **WHEN** a signed-in user submits the create-wallet dialog without touching the
  pre-filled color and icon fields
- **THEN** the wallet is created using those default values

### Requirement: A signed-in user can view only their own wallets
`apps/api` SHALL return only the wallets owned by the requesting user. `apps/web`
SHALL render this list on `/wallets`, alongside a total equal to the sum of the
listed wallets' balances.

#### Scenario: Wallet list is scoped to the requesting user
- **WHEN** a signed-in user requests their wallet list
- **THEN** the response contains only wallets owned by that user, never another
  user's wallets

#### Scenario: `/wallets` shows a net-worth total
- **WHEN** a signed-in user with two or more wallets views `/wallets`
- **THEN** the page displays each wallet's balance and a total equal to the sum of
  all listed balances

#### Scenario: No wallets yet
- **WHEN** a signed-in user with no wallets views `/wallets`
- **THEN** the page shows an empty state with a way to create the first wallet,
  rather than an error or a blank screen

### Requirement: A signed-in user can update their own wallet's name and appearance
`apps/api` SHALL let a signed-in user update the name, color, and icon of a wallet
they own. Balance is not editable through this operation — it is set only at
creation for this slice.

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

### Requirement: A signed-in user can delete their own wallet
`apps/api` SHALL let a signed-in user permanently delete a wallet they own.
`apps/web` SHALL require an explicit confirmation step before the delete request is
sent.

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

### Requirement: The dashboard links to `/wallets`
`apps/web`'s dashboard SHALL provide a visible link to `/wallets`. No wallet
create/update/delete interaction SHALL occur on the dashboard itself.

#### Scenario: Dashboard link navigates to the wallets page
- **WHEN** a signed-in user clicks the wallets link on the dashboard
- **THEN** they are navigated to `/wallets`
