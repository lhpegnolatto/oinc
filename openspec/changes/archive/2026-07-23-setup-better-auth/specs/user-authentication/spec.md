## ADDED Requirements

### Requirement: Google OAuth is the only sign-in method
`apps/api` SHALL authenticate users exclusively via Google OAuth through Better Auth,
with `emailAndPassword` disabled. No other social provider or credential-based sign-in
SHALL be available.

#### Scenario: Signing in with Google creates a session
- **WHEN** a user completes the Google OAuth flow against `/api/auth/*`
- **THEN** a `user` row exists (created if new) and a valid session is issued

#### Scenario: Email/password sign-in is unavailable
- **WHEN** a request is made to an email/password sign-in endpoint
- **THEN** the request fails, since `emailAndPassword` is disabled on the Better Auth
  instance

### Requirement: Session cookie is readable across `apps/web` and `apps/api`'s origins
The session cookie issued by `apps/api` SHALL be sent by the browser on requests to
`apps/api` made from `apps/web`'s origin, in both local development
(`localhost:3000` → `localhost:3001`) and production.

#### Scenario: Authenticated RPC call from apps/web succeeds
- **WHEN** a signed-in user's browser calls `apps/api` via the Hono RPC client from
  `apps/web`'s origin
- **THEN** the session cookie is included in the request and `apps/api` resolves a
  valid `user`/`session` for it

#### Scenario: Cross-origin request without credentials is rejected by CORS
- **WHEN** a request to a `requireAuth`-guarded route arrives from an origin not
  present in `trustedOrigins`
- **THEN** the request is rejected by CORS rather than silently allowed through

### Requirement: Routes are public unless explicitly guarded
`apps/api` routers SHALL be reachable without a session by default. A router or route
SHALL require a session only when explicitly wrapped with the `requireAuth` middleware.

#### Scenario: Guarded route rejects an unauthenticated request
- **WHEN** a request without a valid session is made to a route using `requireAuth`
- **THEN** the response is a `401` shaped as `{ error: { code: "UNAUTHORIZED", ... } }`,
  via the shared error contract

#### Scenario: Unguarded route ignores session state
- **WHEN** a request without a session is made to a route that does not use
  `requireAuth`
- **THEN** the request is processed normally, with `user`/`session` context set to
  `null`

### Requirement: `apps/web` private routes redirect signed-out users
`app/(private)/*` SHALL be unreachable without a valid session. A request without one
SHALL redirect to `app/(public)/login`.

#### Scenario: Signed-out request is redirected before rendering
- **WHEN** a request with no session cookie is made to a route under `(private)/`
- **THEN** the request is redirected to `(public)/login` without rendering any
  `(private)/` content

#### Scenario: Stale or revoked session is caught by the authoritative check
- **WHEN** a request carries a session cookie that is no longer valid (e.g. revoked
  server-side)
- **THEN** `(private)/layout.tsx`'s authoritative check (not the optimistic middleware
  check alone) redirects to `(public)/login`

### Requirement: `apps/web` provides sign-in and sign-out actions
`apps/web` SHALL provide a way for a user to initiate Google sign-in from
`(public)/login` and to sign out from within `(private)/*`, via a Better Auth client
configured against `apps/api`'s origin.

#### Scenario: Sign-in button starts the Google OAuth flow
- **WHEN** a signed-out user clicks "Sign in with Google" on `(public)/login`
- **THEN** the Better Auth client initiates the Google OAuth flow against `apps/api`

#### Scenario: Sign-out clears the session
- **WHEN** a signed-in user triggers sign-out
- **THEN** the session is invalidated and a subsequent request to a `(private)/` route
  redirects to `(public)/login`
