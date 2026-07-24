## ADDED Requirements

### Requirement: A signed-in user can create a wallet
`apps/api` SHALL let a signed-in user create a wallet with a name and a starting
balance. `apps/web` SHALL provide a dialog (not a sheet or full-page navigation) to
create a wallet from the `/wallets` page.

#### Scenario: Creating a wallet succeeds
- **WHEN** a signed-in user submits the create-wallet dialog with a non-empty name and
  a numeric balance
- **THEN** a new wallet is persisted, owned by that user, and appears in their wallet
  list with the given name and balance

#### Scenario: Creating a wallet without a name fails
- **WHEN** a signed-in user submits the create-wallet dialog with an empty name
- **THEN** the request is rejected with a validation error and no wallet is created

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

### Requirement: A signed-in user can rename their own wallet
`apps/api` SHALL let a signed-in user update the name of a wallet they own. Balance
is not editable through this operation — it is set only at creation for this slice.

#### Scenario: Renaming a wallet succeeds
- **WHEN** a signed-in user submits a new name for a wallet they own
- **THEN** the wallet's name is updated and its balance is unchanged

#### Scenario: A user cannot rename another user's wallet
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
