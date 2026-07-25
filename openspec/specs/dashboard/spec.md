# dashboard

## Purpose

The dashboard is the private app's landing page — the first thing a signed-in user sees.
It gives an at-a-glance summary of net worth, spending, and recent activity across all of
the user's wallets, and offers a fast path to log a new transaction, without requiring
navigation to a specific wallet or the transactions page.

## Requirements

### Requirement: The dashboard shows net worth and a wallet breakdown chart
`apps/web`'s `/dashboard` SHALL display the user's net worth (the sum of all wallet
balances) and a chart showing each wallet's share of net worth. Wallets with a balance
less than or equal to zero SHALL be excluded from the chart's slices, but SHALL still be
included in the net-worth total.

#### Scenario: Net worth reflects all wallets, including negative ones
- **WHEN** a signed-in user has wallets with balances 100, 50, and -20
- **THEN** the dashboard's net-worth total shows 130

#### Scenario: Chart excludes non-positive-balance wallets
- **WHEN** a signed-in user has a wallet with a balance of 0 or less
- **THEN** that wallet does not appear as a slice in the wallet breakdown chart

#### Scenario: Chart slice colors match each wallet's appearance
- **WHEN** the dashboard renders the wallet breakdown chart
- **THEN** each wallet's slice is colored with that wallet's own `color`

### Requirement: The dashboard shows recent transactions across all wallets
`apps/web`'s `/dashboard` SHALL display the 5 most recent transactions across all of the
user's wallets, ordered most recent first, with a visible link to `/transactions` for the
full list. Each entry SHALL indicate which wallet it belongs to.

#### Scenario: Dashboard shows up to 5 most recent transactions
- **WHEN** a signed-in user has more than 5 transactions across their wallets
- **THEN** the dashboard shows exactly the 5 most recent, ordered most recent first

#### Scenario: Fewer than 5 transactions
- **WHEN** a signed-in user has fewer than 5 transactions total
- **THEN** the dashboard shows all of them, ordered most recent first

#### Scenario: "See all" link navigates to the transactions page
- **WHEN** a signed-in user clicks the recent-transactions section's "See all" link
- **THEN** they are navigated to `/transactions`

### Requirement: The dashboard shows top expense categories for the current month
`apps/web`'s `/dashboard` SHALL display expense categories ranked by total amount spent in
the current calendar month, as a list (name and total amount), descending by amount.
Income transactions SHALL NOT be included in this ranking.

#### Scenario: Categories ranked by amount spent this month
- **WHEN** a signed-in user has expense transactions this month across multiple categories
- **THEN** the dashboard lists those categories ordered from highest to lowest total spent
  this month

#### Scenario: No expense transactions this month
- **WHEN** a signed-in user has no expense transactions dated in the current calendar month
- **THEN** the top-categories section shows an empty state instead of a list

#### Scenario: Income transactions are excluded
- **WHEN** a signed-in user has both income and expense transactions this month
- **THEN** only expense transactions contribute to the top-categories totals

### Requirement: The dashboard provides the quick-add entry point
`apps/web`'s `/dashboard` SHALL display a visible "Add transaction" action that opens the
quick-add sheet without navigating away from the dashboard.

#### Scenario: Dashboard button opens the quick-add sheet
- **WHEN** a signed-in user clicks the dashboard's "Add transaction" action
- **THEN** the quick-add sheet opens in place, without a page navigation

### Requirement: The dashboard shows an empty state for a user with no wallets
`apps/web`'s `/dashboard` SHALL show a call-to-action to create a first wallet instead of
net worth, chart, recent-transactions, and top-categories sections when the signed-in user
has no wallets.

#### Scenario: Zero-wallet user sees a create-wallet prompt
- **WHEN** a signed-in user with no wallets visits `/dashboard`
- **THEN** they see a prompt to create their first wallet, and no net-worth, chart,
  recent-transactions, or top-categories section is shown
