## MODIFIED Requirements

### Requirement: The dashboard shows net worth, a wallet breakdown, and links to `/wallets`
`apps/web`'s dashboard SHALL provide a visible link to `/wallets`, alongside a net-worth
total and a wallet breakdown chart (see the `dashboard` capability for their behavior). No
wallet create/update/delete interaction SHALL occur on the dashboard itself.

#### Scenario: Dashboard link navigates to the wallets page
- **WHEN** a signed-in user clicks the wallets link on the dashboard
- **THEN** they are navigated to `/wallets`

#### Scenario: No wallet CRUD available on the dashboard
- **WHEN** a signed-in user views the dashboard
- **THEN** there is no control to create, edit, or delete a wallet anywhere on the page
