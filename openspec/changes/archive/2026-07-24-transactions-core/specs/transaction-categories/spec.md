## ADDED Requirements

### Requirement: Every signed-in user has access to a fixed set of system categories
`apps/api` SHALL seed a small fixed set of system categories, each with a `type`
(`income`/`expense`), a `color`, and an `icon`. System categories SHALL be visible to
every signed-in user and SHALL NOT be editable or deletable by any user.

#### Scenario: System categories appear for every user
- **WHEN** any signed-in user requests their available categories
- **THEN** the response includes every system category, regardless of which user is
  asking

#### Scenario: System categories cannot be edited
- **WHEN** a signed-in user attempts to update or delete a system category
- **THEN** the request fails and the category is unchanged

### Requirement: A signed-in user can create their own custom category
`apps/api` SHALL let a signed-in user create a custom category with a `name`, a `type`
(`income`/`expense`), a `color` (valid 6-digit hex), and an `icon` (from the curated set).
All fields are required.

#### Scenario: Creating a custom category succeeds
- **WHEN** a signed-in user submits a valid name, type, color, and icon
- **THEN** a new category is persisted, owned by that user, and appears in their category
  list

#### Scenario: Creating a category without a name fails
- **WHEN** a signed-in user submits an empty name
- **THEN** the request is rejected with a validation error and no category is created

#### Scenario: Creating a category with an invalid color or icon fails
- **WHEN** a signed-in user submits a color that isn't a valid 6-digit hex value, or an
  icon outside the curated set
- **THEN** the request is rejected with a validation error and no category is created

### Requirement: A signed-in user can view their available categories
`apps/api` SHALL return every system category plus only the requesting user's own custom
categories — never another user's custom categories.

#### Scenario: Category list includes system categories and the user's own custom ones
- **WHEN** a signed-in user requests their category list
- **THEN** the response contains every system category and only that user's custom
  categories

### Requirement: A signed-in user can update their own custom category's name and appearance
`apps/api` SHALL let a signed-in user update the `name`, `color`, and `icon` of a custom
category they own. A category's `type` is set at creation and SHALL NOT be changeable
afterward.

#### Scenario: Updating a custom category's name and appearance succeeds
- **WHEN** a signed-in user submits a new name, color, and/or icon for a custom category
  they own
- **THEN** the category is updated and its `type` is unchanged

#### Scenario: A user cannot update another user's custom category
- **WHEN** a signed-in user attempts to update a custom category owned by a different
  user
- **THEN** the request fails with a not-found error, without revealing whether the
  category id exists

### Requirement: A signed-in user can delete their own custom category if it's unused
`apps/api` SHALL let a signed-in user permanently delete a custom category they own, but
SHALL reject the deletion if any transaction still references it.

#### Scenario: Deleting an unused custom category succeeds
- **WHEN** a signed-in user deletes a custom category they own that no transaction
  references
- **THEN** the category is permanently removed

#### Scenario: Deleting a custom category still in use fails
- **WHEN** a signed-in user attempts to delete a custom category they own that at least
  one transaction still references
- **THEN** the request fails with a conflict error, and the category and its
  transactions are unchanged

#### Scenario: A user cannot delete another user's custom category
- **WHEN** a signed-in user attempts to delete a custom category owned by a different
  user
- **THEN** the request fails with a not-found error and the category is not deleted
