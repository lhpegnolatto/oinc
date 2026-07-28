## MODIFIED Requirements

### Requirement: The dashboard shows net worth and a wallet breakdown chart
`apps/web`'s `/dashboard` SHALL display the user's net worth, computed as the sum of
all wallet balances plus all investment holdings' `currentValue`, minus the sum of
all credit card balances. It SHALL also display a chart showing each wallet's and
each investment holding's share of the combined wallets-plus-investments total, and a
labeled summary of the three contributing totals (wallets, investments, credit
cards). Wallets and investment holdings with a value less than or equal to zero SHALL
be excluded from the chart's slices, but SHALL still be included in their respective
totals. Credit card balances SHALL NOT appear as chart slices, since a chart slice
represents a positive share of a whole and a credit card balance is a liability
subtracted from that whole, not a share of it.

#### Scenario: Net worth combines wallets, investments, and credit cards
- **WHEN** a signed-in user has wallets summing to 130, investment holdings summing
  to 500, and credit card balances summing to 80
- **THEN** the dashboard's net-worth total shows 550

#### Scenario: Net worth reflects all wallets, including negative ones
- **WHEN** a signed-in user has wallets with balances 100, 50, and -20, no
  investments, and no credit cards
- **THEN** the dashboard's net-worth total shows 130

#### Scenario: Chart excludes non-positive-balance wallets
- **WHEN** a signed-in user has a wallet with a balance of 0 or less
- **THEN** that wallet does not appear as a slice in the breakdown chart

#### Scenario: Chart excludes non-positive-value investment holdings
- **WHEN** a signed-in user has an investment holding with a `currentValue` of 0 or
  less
- **THEN** that holding does not appear as a slice in the breakdown chart

#### Scenario: Chart slice colors match each wallet's or holding's appearance
- **WHEN** the dashboard renders the breakdown chart
- **THEN** each wallet's slice is colored with that wallet's own `color`, and each
  investment holding's slice is colored with that holding's own `color`

#### Scenario: Credit card balances never appear as chart slices
- **WHEN** a signed-in user has one or more credit cards with a balance greater than
  zero
- **THEN** no credit card appears as a slice in the breakdown chart, regardless of
  its balance

#### Scenario: Summary shows the three contributing totals
- **WHEN** a signed-in user views the dashboard's net-worth section
- **THEN** they see the total across their wallets, the total across their
  investment holdings, and the total across their credit card balances, each
  labeled, alongside the combined net-worth number
