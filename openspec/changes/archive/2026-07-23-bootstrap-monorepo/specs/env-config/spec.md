## ADDED Requirements

### Requirement: Centralized environment variable validation
`@fynn/env` SHALL be the single package that defines and validates environment
variables used anywhere in the monorepo, via `@t3-oss/env-core`. Application code
SHALL NOT read `process.env` directly.

#### Scenario: Missing required variable fails fast
- **WHEN** `apps/api` starts without `DATABASE_URL` set in its environment
- **THEN** startup throws a validation error identifying `DATABASE_URL` as missing,
  rather than proceeding with `undefined`

#### Scenario: Empty string is treated as unset
- **WHEN** `DATABASE_URL` is present in the environment but set to an empty string
- **THEN** validation treats it as unset (`emptyStringAsUndefined: true`) rather
  than silently passing an empty string through

### Requirement: Apps consume shared schemas, not raw process.env
Each app SHALL import and extend `@fynn/env`'s schema(s) for its own env file
rather than declaring an independent validation scheme.

#### Scenario: apps/api extends the shared schema
- **WHEN** `apps/api`'s env module is inspected
- **THEN** it imports a schema exported from `@fynn/env` and extends it with any
  api-specific variables, rather than calling `createEnv` from scratch with a
  duplicated `DATABASE_URL` definition
