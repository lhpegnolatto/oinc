## ADDED Requirements

### Requirement: A signed-in user can view their transactions across all wallets
`apps/api` SHALL return a signed-in user's transactions across every wallet they
own, ordered by `date` descending, optionally filtered by `walletId`,
`categoryId`, `type`, a date range (`dateFrom`/`dateTo`), and a case-insensitive
substring match against `note`. `apps/web` SHALL render this on a `/transactions`
page.

#### Scenario: All-wallets list is scoped to the requesting user
- **WHEN** a signed-in user requests their all-wallets transaction list
- **THEN** the response contains only transactions across wallets that user
  owns, ordered most recent first

#### Scenario: Filtering by wallet narrows the list
- **WHEN** a signed-in user filters the all-wallets list by a wallet they own
- **THEN** the response contains only that wallet's transactions

#### Scenario: Filtering by category narrows the list
- **WHEN** a signed-in user filters the all-wallets list by a category
- **THEN** the response contains only transactions referencing that category

#### Scenario: Filtering by type narrows the list
- **WHEN** a signed-in user filters the all-wallets list by `income` or
  `expense`
- **THEN** the response contains only transactions of that type

#### Scenario: Filtering by date range narrows the list
- **WHEN** a signed-in user filters the all-wallets list by a `dateFrom` and/or
  `dateTo`
- **THEN** the response contains only transactions whose `date` falls within
  that range

#### Scenario: Filtering by note search narrows the list
- **WHEN** a signed-in user filters the all-wallets list with a search term
- **THEN** the response contains only transactions whose `note` contains that
  term, case-insensitively

#### Scenario: Combining filters applies all of them
- **WHEN** a signed-in user applies more than one filter at once
- **THEN** the response contains only transactions matching every applied
  filter

#### Scenario: A filter matching nothing returns an empty list
- **WHEN** a signed-in user applies a filter combination that matches no
  transactions
- **THEN** the response is an empty list, not an error

### Requirement: Transaction list filters are reflected in the URL
`apps/web` SHALL keep the `/transactions` page's active filters synced to the
page's URL query string, so a filtered view can be reloaded, shared, or
restored via browser back/forward navigation.

#### Scenario: Reloading a filtered URL restores the same filters
- **WHEN** a signed-in user reloads `/transactions` at a URL with filters in
  the query string
- **THEN** the page shows the list filtered exactly as the URL specifies

#### Scenario: Navigating back restores the previous filter state
- **WHEN** a signed-in user changes a filter and then navigates back
- **THEN** the previously applied filters and their results are restored

### Requirement: Each row in the all-wallets list shows its wallet
`apps/web` SHALL display which wallet each transaction on `/transactions`
belongs to, using that wallet's existing color/icon appearance.

#### Scenario: A transaction row shows its wallet's appearance
- **WHEN** a signed-in user views the `/transactions` list
- **THEN** each row displays the color/icon of the wallet that transaction
  belongs to

### Requirement: Transactions has a dedicated, top-level nav entry
`apps/web` SHALL provide a "Transactions" entry in the private app's sidebar
navigation, linking to `/transactions`.

#### Scenario: Transactions is reachable from the sidebar
- **WHEN** a signed-in user views the private app's sidebar
- **THEN** a "Transactions" entry is present and links to `/transactions`
