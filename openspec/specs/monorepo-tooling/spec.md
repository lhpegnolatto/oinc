# monorepo-tooling

## Purpose

Defines the shared tooling foundation for the oinc monorepo: Bun workspaces
for dependency management, Turborepo for task orchestration, Biome as the
sole linter/formatter, and a pinned package manager version for reproducible
installs.

## Requirements

### Requirement: Workspace-based monorepo
The repository SHALL be a Bun-workspaces monorepo managed by Turborepo, with
`apps/*` and `packages/*` as workspace roots declared in the root `package.json`.

#### Scenario: Fresh install resolves all workspaces
- **WHEN** a contributor runs `bun install` from the repo root on a clean checkout
- **THEN** dependencies for `apps/web`, `apps/api`, and every package under
  `packages/*` are resolved and linked in a single pass, with no per-app lockfiles

### Requirement: Orchestrated build/test/lint pipeline
Turborepo SHALL orchestrate `build`, `dev`, `test`, `lint`, and `check-types` across
every workspace using each package's declared dependency graph, so tasks run in
dependency order and cache per-package outputs.

#### Scenario: Root scripts fan out across workspaces
- **WHEN** a contributor runs `bun run build`, `bun run lint`, or `bun test` from
  the repo root
- **THEN** Turborepo executes that task for every workspace that defines it,
  respecting `^build`-style dependency ordering declared in `turbo.json`

#### Scenario: Full local verification succeeds on a clean checkout
- **WHEN** a contributor runs `bun run lint && bun test && bun run build` from a
  clean checkout with no prior Turborepo cache
- **THEN** all three commands complete successfully with no failing packages

### Requirement: Single linter/formatter
Biome SHALL be the only linter and formatter in the repository, configured once at
the root and extended (not duplicated) by any package that needs overrides.

#### Scenario: No competing lint/format tooling exists
- **WHEN** the repository is inspected for lint/format configuration
- **THEN** exactly one root `biome.json` (`"root": true`) exists, any package-level
  override uses `"extends": "//"`, and no ESLint or Prettier config file is present
  anywhere in the repo

### Requirement: Pinned package manager
The root `package.json` SHALL pin an exact Bun version via `packageManager`, so
installs are reproducible across machines.

#### Scenario: Package manager version is explicit
- **WHEN** the root `package.json` is inspected
- **THEN** it declares `"packageManager": "bun@<exact-version>"` rather than a
  floating or absent version
