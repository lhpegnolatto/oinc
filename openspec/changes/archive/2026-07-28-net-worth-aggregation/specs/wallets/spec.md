## MODIFIED Requirements

### Requirement: A signed-in user can view only their own wallets
`apps/api` SHALL return only the wallets owned by the requesting user. `apps/web`
SHALL render this list on `/wallets`, alongside a total equal to the sum of the
listed wallets' balances. This total SHALL be labeled as a wallets total, not as net
worth — the combined net-worth figure across wallets, investments, and credit cards
is a `dashboard` capability concern, not this page's.

#### Scenario: Wallet list is scoped to the requesting user
- **WHEN** a signed-in user requests their wallet list
- **THEN** the response contains only wallets owned by that user, never another
  user's wallets

#### Scenario: `/wallets` shows a wallets total
- **WHEN** a signed-in user with two or more wallets views `/wallets`
- **THEN** the page displays each wallet's balance and a total equal to the sum of
  all listed balances, labeled as a wallets total rather than net worth

#### Scenario: No wallets yet
- **WHEN** a signed-in user with no wallets views `/wallets`
- **THEN** the page shows an empty state with a way to create the first wallet,
  rather than an error or a blank screen
