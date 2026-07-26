## MODIFIED Requirements

### Requirement: A signed-in user can view their transactions across all wallets
`apps/api` SHALL return a signed-in user's transactions across every wallet they
own, ordered by `date` descending, optionally filtered by `walletId`,
`categoryId`, `type`, a date range (`dateFrom`/`dateTo`), a case-insensitive
substring match against `note`, and optionally capped to a maximum number of results via
`limit`. `apps/web` SHALL render this on a `/transactions` page. Credit card charges
(transactions attached to a card instead of a wallet — see the `credit-cards`
capability) SHALL NOT appear in this list.

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

#### Scenario: Limiting the list caps the number of results
- **WHEN** a signed-in user requests the all-wallets list with `limit` set to a positive
  integer N, and more than N transactions match
- **THEN** the response contains exactly the N most recent matching transactions

#### Scenario: Combining filters applies all of them
- **WHEN** a signed-in user applies more than one filter at once
- **THEN** the response contains only transactions matching every applied
  filter

#### Scenario: A filter matching nothing returns an empty list
- **WHEN** a signed-in user applies a filter combination that matches no
  transactions
- **THEN** the response is an empty list, not an error

#### Scenario: Credit card charges never appear in the all-wallets list
- **WHEN** a signed-in user has logged one or more charges against a credit card they
  own, and requests the all-wallets transaction list with any combination of filters
- **THEN** none of those card charges appear in the response, regardless of the
  filters applied
