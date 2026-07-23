# user-provisioning

## Purpose

Fynn provisions per-user defaults through a `modules/users` seed command
triggered by `shared/auth`'s user-creation hook, keeping `shared/auth` free of
direct dependencies on domain modules. This capability covers the trigger and
wiring for that seed command; it does not (yet) cover seeding real domain
data, since no domain module exists to seed into at the time this capability
was introduced.

## Requirements

### Requirement: New users trigger `modules/users`' seed command
When a new user is created, `apps/api` SHALL invoke a `modules/users` command
(`seedNewUserDefaults`) triggered from `shared/auth`'s user-creation hook, exactly once
per new user. This requirement covers the trigger and wiring only — **at the time this
change was implemented, no domain module existed yet to seed real default data into**
(see design.md Decision 4's "Revised during implementation" note), so the command's
body is a documented no-op (structured log + `TODO`) rather than writing real default
data. A future change that adds the first real domain module (e.g. `modules/wallets`)
replaces this command's body, not its trigger point. Neither this requirement nor that
future one covers a guided onboarding flow, which is explicitly out of scope.

#### Scenario: First-time sign-in triggers the seed command
- **WHEN** a user signs in for the first time and a new `user` row is created
- **THEN** `modules/users`' `seedNewUserDefaults` command is invoked with that user's id

#### Scenario: Existing user sign-in does not retrigger the seed command
- **WHEN** an existing user signs in again
- **THEN** `seedNewUserDefaults` is not invoked again, since it only runs on user
  creation, not on every sign-in

### Requirement: `shared/auth` never imports domain modules directly
The user-creation hook in `shared/auth` SHALL call into `modules/users` only.
`shared/auth` SHALL NOT import `modules/wallets`, `modules/transactions`, or any other
domain module's `commands/`, `repositories/`, or `domain/` directly — that
composition happens inside `modules/users`' own command, not in `shared/auth`.

#### Scenario: Seeding other modules' data is orchestrated from modules/users
- **WHEN** the static seed data spans more than one domain module (e.g. a wallet and
  something else)
- **THEN** `modules/users`' seed command is the one orchestrating calls into each
  module's own command, and `shared/auth` itself contains no direct import of those
  modules
