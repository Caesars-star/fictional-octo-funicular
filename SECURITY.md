# Security

## Authentication

- Passwords hashed with **bcrypt**, cost factor 12
  (`src/app/api/auth/register/route.ts`, `.../reset-password/route.ts`).
  Never stored or logged in plaintext.
- Sessions are Auth.js-issued, encrypted JWTs (`AUTH_SECRET`-derived),
  `httpOnly` cookies. No session state in the database (Credentials-only
  MVP; see `ARCHITECTURE.md`).
- `/api/auth/request-password-reset` always returns the same generic
  success message whether or not the email exists — the endpoint cannot be
  used to enumerate registered accounts. Reset tokens are single-use
  (`usedAt`), random 32-byte hex, and expire after 30 minutes
  (`PasswordResetToken`).
- No transactional email provider is wired up yet: in development, the
  reset link is logged to the server console instead of emailed. This is
  clearly commented in the route and **must** be replaced with a real email
  provider before this goes to production — see `ROADMAP.md`.

## Authorization

- Every API route calls a `require*` helper from `src/lib/rbac.ts` before
  touching the database — see "Authorization architecture" in
  `ARCHITECTURE.md` for the full role model. There is no endpoint that
  trusts a client-supplied `organizationId`/`projectId` for access control;
  every write is checked against the caller's actual membership rows.
- Server components use non-throwing `canAccessOrg`/`canAccessProject` and
  render `notFound()` (404) rather than a 403 on denial, so unauthorized
  users can't distinguish "doesn't exist" from "exists, but not yours."
- `middleware.ts` is a coarse gate (redirects any unauthenticated request
  to non-public routes to `/login`) — it is **not** the authorization
  layer. Every API route re-checks authorization independently, per
  Next.js's own guidance that middleware must not be relied on alone for
  auth (see the `proxy.js` docs' "Execution order" note referenced in
  `DEVELOPMENT.md`).

## Input validation

- Every API route parses its body through a Zod schema
  (`src/lib/validations/`) before use. Invalid input returns `400` with
  `{ error, issues }` — never reaches Prisma with unvalidated data.
- Quantities and prices are validated as positive (or non-negative, where
  zero is legitimate — e.g. a supplier discount) `Decimal`-parseable
  strings. Negative and zero-quantity edge cases are covered by
  `src/lib/validations/boq.test.ts` and `rfq.test.ts`.

## Data integrity

- All monetary values are Postgres `numeric` via Prisma `Decimal` — never
  `Float` — and all money math goes through `src/lib/money.ts`. Line totals
  and quotation totals are **always recomputed server-side** on every
  write; a client-submitted total is parsed and discarded, never persisted
  directly.
- Every significant write (registration, org/project creation, BOQ/RFQ/
  quotation changes, membership changes, password resets) writes an
  `AuditLog` row via `src/lib/audit.ts` — actor, action, entity type/id,
  metadata, timestamp. Audit logging failures are caught and logged
  server-side; they never block or roll back the underlying action.

## Error handling

- `src/lib/api-error.ts`'s `handleApiError` is the single place API routes
  format errors. Zod errors → `400` with field-level `issues`. Known Prisma
  error codes (`P2002` unique constraint, `P2003` FK violation, `P2025` not
  found) are translated into short, safe messages. Everything else is
  logged server-side with `console.error` and returns a generic `500` —
  **no stack trace, SQL, or internal error text ever reaches the client.**

## Secrets

- `.env` is git-ignored; `.env.example` documents every variable without
  real values.
- `AUTH_SECRET` must be a real random value in any non-local environment —
  never commit a real secret to this file or to git history.

## Known gaps (tracked for follow-up, not silently ignored)

- **No rate limiting** yet on `/api/auth/*` (login, register, password
  reset) — needed before production exposure to slow down credential
  stuffing / enumeration attempts.
- **No CSRF token** beyond what Auth.js's own cookie-based CSRF protection
  provides for its own routes; custom mutation routes rely on
  `SameSite=Lax` cookies and same-origin `fetch()` calls from the app's own
  client components. Revisit if a cross-origin client is ever added.
- **File uploads are not implemented** in this MVP (Document metadata model
  exists; storage integration is a `ROADMAP.md` item) — so there is no
  upload-handling surface to secure yet. When added, validate MIME type,
  size limits, and store outside the web root / in object storage with
  signed URLs, never trusting a client-supplied filename for the storage
  path.
- **Residual `npm audit` findings**: `prisma`'s own CLI tooling (the
  `@prisma/config` dependency chain, used only for `prisma migrate` /
  `prisma studio` at dev time) transitively pulls a vulnerable
  `deepmerge-ts` version. This is dev-tooling only — never bundled into the
  application runtime — and the only available fix is a downgrade to an
  older Prisma release, which isn't a net improvement. Re-check
  `npm audit` when bumping Prisma.
