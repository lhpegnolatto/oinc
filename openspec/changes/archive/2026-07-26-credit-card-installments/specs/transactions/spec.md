## MODIFIED Requirements

### Requirement: A transaction can be logged without leaving the current screen
`apps/web` SHALL provide a quick-add sheet for creating a transaction against either a
wallet or a credit card, reachable via a single keyboard shortcut from anywhere in the
private app, and via a visible quick-action affordance on the dashboard. Selecting a
credit card as the destination SHALL fix the transaction's `type` to `expense` and
reveal a `pending`/`posted` status field; selecting a wallet SHALL show the
income/expense choice and no status field. Opening the sheet SHALL NOT navigate away
from the current page.

#### Scenario: Keyboard shortcut opens the quick-add sheet from any private page
- **WHEN** a signed-in user presses the transaction shortcut key while no input,
  textarea, or other editable element has focus, on any page in the private app
- **THEN** the quick-add sheet opens in place, without a page navigation

#### Scenario: Shortcut is ignored while typing
- **WHEN** a signed-in user presses the transaction shortcut key while focus is inside a
  text input, textarea, or other editable element
- **THEN** the quick-add sheet does not open and the keystroke is treated as normal input

#### Scenario: Opening the sheet from a wallet's page pre-fills that wallet
- **WHEN** a signed-in user opens the quick-add sheet (by shortcut) from `/wallets/[id]`
- **THEN** the sheet's destination is pre-filled with that wallet, and remains
  changeable before submitting

#### Scenario: Opening the sheet from a credit card's page pre-fills that card
- **WHEN** a signed-in user opens the quick-add sheet (by shortcut, or via the "Log
  charge" affordance) from `/credit-cards/[id]`
- **THEN** the sheet's destination is pre-filled with that credit card, and remains
  changeable before submitting

#### Scenario: Opening the sheet elsewhere requires picking a destination
- **WHEN** a signed-in user opens the quick-add sheet from a screen that isn't scoped to
  a specific wallet or credit card
- **THEN** the sheet's destination starts empty and must be filled in (a wallet or a
  credit card) before the transaction can be submitted

#### Scenario: Choosing a credit card destination fixes type and reveals status
- **WHEN** a signed-in user selects a credit card as the destination in the quick-add
  sheet
- **THEN** the income/expense choice is replaced by a fixed `expense` type, and a
  `pending`/`posted` status field appears

#### Scenario: Choosing a wallet destination restores type and hides status
- **WHEN** a signed-in user selects a wallet as the destination in the quick-add sheet
- **THEN** the income/expense choice is available and no status field is shown

#### Scenario: Dashboard is the only page with a generic, unscoped quick-add button
- **WHEN** a signed-in user views a private page other than the dashboard, a wallet's
  own page, or a credit card's own page
- **THEN** there is no visible "Add transaction" button on that page, only the keyboard
  shortcut

#### Scenario: A credit card's own page shows a button scoped to that card
- **WHEN** a signed-in user views `/credit-cards/[id]`
- **THEN** a visible "Log charge" button is present that opens the quick-add sheet with
  that card pre-filled as the destination
