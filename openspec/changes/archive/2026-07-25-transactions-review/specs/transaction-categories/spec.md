## ADDED Requirements

### Requirement: A signed-in user can manage their categories from a dedicated page
`apps/web` SHALL provide a `/transactions/categories` page listing every
category available to the signed-in user (all system categories plus their own
custom categories). Edit and delete actions SHALL be available only for the
user's own custom categories; system categories SHALL render without an edit
or delete affordance.

#### Scenario: Categories page lists system and the user's own custom categories
- **WHEN** a signed-in user views `/transactions/categories`
- **THEN** the page lists every system category and only that user's own
  custom categories

#### Scenario: A system category has no edit or delete action
- **WHEN** a signed-in user views a system category on this page
- **THEN** no edit or delete action is available for it

#### Scenario: A custom category has edit and delete actions
- **WHEN** a signed-in user views one of their own custom categories on this
  page
- **THEN** edit and delete actions are available for it

#### Scenario: Editing a custom category from this page updates it
- **WHEN** a signed-in user edits a custom category's name, color, or icon
  from this page
- **THEN** the category is updated and the page reflects the new values

#### Scenario: Deleting an unused custom category from this page removes it
- **WHEN** a signed-in user deletes a custom category from this page that no
  transaction references
- **THEN** the category is removed from the page

#### Scenario: Deleting a custom category still in use shows an inline error
- **WHEN** a signed-in user attempts to delete a custom category from this
  page that at least one transaction still references
- **THEN** the page shows an inline error explaining the category is still in
  use, the category is not removed, and the user stays on the page

### Requirement: Categories is reachable as a nested nav entry under Transactions
`apps/web` SHALL show a "Categories" entry nested under "Transactions" in the
private app's sidebar navigation, linking to `/transactions/categories`.

#### Scenario: Categories link appears nested under Transactions
- **WHEN** a signed-in user views the private app's sidebar
- **THEN** a "Categories" entry is shown nested under "Transactions" and links
  to `/transactions/categories`
