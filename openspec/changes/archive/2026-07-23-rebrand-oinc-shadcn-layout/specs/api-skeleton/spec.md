## MODIFIED Requirements

### Requirement: Postgres connectivity via Drizzle
`apps/api` SHALL connect to PostgreSQL through a Drizzle client configured via
`drizzle-kit`, using `DATABASE_URL` from `@oinc/env`.

#### Scenario: App connects to local Postgres
- **WHEN** the local `docker-compose` Postgres service is running and `apps/api`
  starts with a valid `DATABASE_URL`
- **THEN** the Drizzle client can open a connection and execute a trivial query
  against it
