## MODIFIED Requirements

### Requirement: Module folder conventions exist without domain modules
`apps/api/src` SHALL contain the `app/` and `shared/` folder structure described in
`.docs/architecture/backend.md` (`shared/db`, `shared/errors`, `shared/middleware`).
`shared/auth` and `modules/<name>` domain modules MAY exist once a change introduces
them — this requirement no longer asserts their absence.

#### Scenario: Skeleton folders still exist alongside auth
- **WHEN** `apps/api/src` is inspected after auth has been introduced
- **THEN** `shared/db`, `shared/errors`, and `shared/middleware` still exist, and
  `shared/auth` plus `modules/users` exist alongside them, reflecting that domain
  modules are added incrementally rather than being permanently absent
