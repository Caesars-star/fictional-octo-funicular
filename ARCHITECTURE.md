# Architecture

## System shape: modular monolith

TARA is built as a **modular monolith**: one Next.js application, one
PostgreSQL database, one deployable unit. Modules (identity, organizations,
projects, BOQ, catalog, RFQ/quotations, …) are separated by folder
boundaries and a shared Prisma schema, not by network calls.

This is a deliberate choice for the current stage:

- The MVP's transaction volume and team size don't justify the operational
  cost of microservices (extra deploys, network boundaries, distributed
  transactions).
- A single Postgres database gives us real foreign-key integrity across the
  whole PROJECT → BOQ → RFQ → QUOTATION chain, which matters more than
  independent scaling right now.
- Next.js API routes give us colocated, typed, server-validated endpoints
  next to the pages that call them, without standing up a separate backend
  service.

Nothing here blocks a future split: each module's Prisma models and API
routes are already namespaced, so a module (e.g. Catalog, or eventually
Capital/Wallet) could be extracted into its own service later if load or
team boundaries demand it.

## Layers

```
src/
  app/
    (app)/…              authenticated pages (dashboard, projects, etc.) — one route group,
                          gated by app/(app)/layout.tsx calling requirePageSession()
    api/…                Next.js Route Handlers — the HTTP API
    login, register, …   public auth pages
  components/
    ui/                  hand-built shadcn/ui-style primitives (Button, Card, Table, Dialog, …)
    <module>/             feature components (e.g. components/boq/add-boq-item-dialog.tsx)
  lib/
    prisma.ts            singleton PrismaClient
    rbac.ts               authorization: requireOrgAccess / requireProjectAccess / …
    api-error.ts          ApiError + handleApiError — the only way API routes format errors
    audit.ts               logAudit() — the only way audit trail rows get written
    money.ts               Decimal-only arithmetic helpers for financial calculations
    validations/…          Zod schemas, one file per module, shared by client forms and API routes
  auth.ts / auth.config.ts NextAuth v5 config, split for Edge-safe proxy vs Node API routes
  proxy.ts                  route protection (redirects unauthenticated requests to /login)
prisma/
  schema.prisma           the single source of truth for the data model
  seed.ts                 demo/development data
```

## Authentication architecture

- **Auth.js (NextAuth) v5**, Credentials provider, JWT session strategy (no
  database session table — simplest correct option for a credentials-only
  MVP; OAuth providers can be added later without a session-strategy
  migration since JWT sessions don't require the Prisma adapter).
- Passwords hashed with **bcrypt**, cost factor 12, in `src/app/api/auth/register/route.ts`
  and `src/app/api/auth/reset-password/route.ts`. Never logged, never
  returned from any API response.
- **Split config** (`auth.config.ts` vs `auth.ts`): `proxy.ts` runs the
  edge-safe `authConfig`, while the Credentials provider (which queries
  Postgres) is only loaded by `auth.ts`, used from Node.js API routes and
  server components. Next.js 16 renamed the `middleware.ts` convention to
  `proxy.ts` and now defaults it to the Node.js runtime rather than Edge,
  so this split is no longer strictly required for Prisma-compatibility —
  it's kept anyway because it's a clean boundary (nothing that touches the
  database runs in the proxy) and costs nothing to keep.
- `proxy.ts` redirects any unauthenticated request to a non-public path to
  `/login?callbackUrl=…`. Public paths are listed once, in `auth.config.ts`.

## Authorization architecture (`src/lib/rbac.ts`)

Two independent axes, checked in every API route that touches non-public
data — never trusted from the client:

1. **Persona** (`User.role`): `PLATFORM_ADMIN`, `DEVELOPER`,
   `PROJECT_MANAGER`, `SUPPLIER`, `CONTRACTOR`, `CONSULTANT`, `AGENT`,
   `FINANCE_PARTNER`, `HOMEOWNER`, `ORGANIZATION_ADMIN`. Drives which
   dashboard/module a user sees; `PLATFORM_ADMIN` bypasses org/project
   membership checks entirely.
2. **Membership role**, scoped per-entity:
   - `OrganizationMembership.role` (`OWNER` / `ADMIN` / `MEMBER`) — what a
     user may do inside one organization.
   - `ProjectMember.role` (`OWNER` / `MANAGER` / `MEMBER` / `VIEWER`) — what
     a user may do inside one project. Org `OWNER`/`ADMIN` members bypass
     project-level membership (they manage the org that owns the project).

Every API route calls one of `requireSessionUser`, `requireOrgAccess`,
`requireProjectAccess`, `requireBoqAccess`, `requireRfqAccess`,
`requireSupplierAccess`, `requireQuotationProjectAccess`,
`requirePurchaseOrderAccess`, `requireContractAccess`,
`requireDeliveryAccess`, or `requireMilestoneAccess` before touching the
database — each of the latter resolves up to the owning project and
delegates to `requireProjectAccess` rather than re-implementing access
logic (`requireDeliveryAccess`, for instance, resolves through
`delivery.purchaseOrder.projectId`). These throw `ApiError(401|403|404,
message)`, which `handleApiError` turns into a safe JSON response — routes
never leak Prisma error internals to the client (see `SECURITY.md`).

Server components use the non-throwing `canAccessOrg` / `canAccessProject`
variants and call `notFound()` on failure, so unauthorized access to
`/organizations/[id]` or `/projects/[id]` renders a 404 rather than leaking
existence via a 403.

## Financial calculation architecture (`src/lib/money.ts`)

All monetary values are Postgres `numeric` (via Prisma `Decimal`), never
`Float`. All money math — BOQ line totals, quotation subtotals/totals — goes
through `multiplyDecimal` / `sumDecimal`, which wrap `Prisma.Decimal`. API
routes **recompute** totals server-side from quantity × unit price on every
write; a client-submitted total is never trusted or stored directly. A
purchase order is the one place a total is *copied* rather than recomputed
— it's created from an already-server-computed, `ACCEPTED` quotation, and
copying (not re-deriving) is what keeps the PO an accurate snapshot of what
was actually accepted. See `src/lib/money.test.ts` for the exactness tests
(including the classic `0.1 + 0.2` float-precision case, and the delivery
fulfilment comparison logic) and the status-transition tests in
`src/lib/validations/*.test.ts`.

## Status transition architecture

Purchase orders, contracts, deliveries and milestones all use a **closed,
forward-only status transition table** — `PO_STATUS_TRANSITIONS` /
`CONTRACT_STATUS_TRANSITIONS` / `DELIVERY_STATUS_TRANSITIONS` /
`MILESTONE_STATUS_TRANSITIONS` in their respective
`src/lib/validations/*.ts` files — mapping each status to the set of
statuses it may legally move to next (e.g. a `DRAFT` PO may become
`ISSUED` or `CANCELLED`, never jump straight to `COMPLETED`). The `PATCH`
routes for each resource check the requested status against its table
before writing, returning `400` on an illegal transition. This is the same
idea as `RfqStatus`/`QuotationStatus` already being closed enums, taken one
step further: not just *which* values are valid, but *which changes
between them* are valid. The next state-machine-shaped module (e.g.
`Invoice`) should follow the same pattern rather than validating
transitions ad hoc in the route handler.

Two of these tables also gate a status value behind a *role*, not just a
legal-transition check: moving a `Delivery` or `Milestone` to `VERIFIED`
requires project `MANAGER`+, while every other transition only requires
`MEMBER`+. This is the same human-in-the-loop distinction the product
brief calls for — recording that something happened (a delivery arrived, a
milestone's work looks done) is a front-line action; confirming it's
*correct* is a supervisory one, and the two must not collapse into a
single "mark it done" button.

Deliveries add one more piece: **derived status**. A `PurchaseOrder`'s
`PARTIALLY_DELIVERED`/`COMPLETED` status is never set directly by a client
— `recomputePurchaseOrderDeliveryStatus` (`src/lib/purchase-orders.ts`)
derives it from the sum of each `PurchaseOrderItem`'s fulfilling
(`DELIVERED`/`VERIFIED`, not `DISPUTED`) delivery quantities every time a
delivery's status changes, and only ever moves the PO forward. A future
`Invoice`-vs-milestone reconciliation is likely to want the same shape:
compute the derived state from the underlying event records, don't let a
client set it directly.

## API architecture

REST-ish Route Handlers under `src/app/api/`, one file per resource,
matching the URL hierarchy of the domain model (see `API.md` for the full
list):

```
/api/organizations
/api/organizations/[organizationId]
/api/organizations/[organizationId]/members
/api/projects
/api/projects/[projectId]
/api/projects/[projectId]/boqs
/api/projects/[projectId]/rfqs
/api/projects/[projectId]/contracts
/api/boqs/[boqId]/sections
/api/boqs/[boqId]/items
/api/rfqs/[rfqId]/suppliers
/api/rfqs/[rfqId]/quotations
/api/quotations/[quotationId]/purchase-order
/api/purchase-orders/[purchaseOrderId]
/api/purchase-orders/[purchaseOrderId]/deliveries
/api/deliveries/[deliveryId]
/api/contracts/[contractId]
/api/contracts/[contractId]/parties
/api/projects/[projectId]/milestones
/api/milestones/[milestoneId]
/api/quotations/[quotationId]
/api/catalog/{categories,units,products}
/api/suppliers/[supplierId]/products
```

Every route: parses/validates the body with a Zod schema from
`src/lib/validations/`, authorizes via `src/lib/rbac.ts`, performs the
Prisma write (in a `$transaction` when multiple tables must stay
consistent), writes an `AuditLog` row via `logAudit()`, and returns JSON.
Errors always go through `handleApiError`.

## Frontend architecture

- Server Components fetch data directly via Prisma (no internal HTTP
  round-trip) and pass it to Client Components as props.
- Mutations happen in small Client Components (`"use client"`) that `fetch()`
  the relevant API route and call `router.refresh()` on success — no global
  client-state store; the server is the source of truth.
- `src/components/ui/` is a hand-built, Radix-based component set in the
  shadcn/ui style (the shadcn CLI's registry was unreachable from this
  environment's network policy, so components are authored directly rather
  than fetched).

## Why these architectural choices, briefly

| Decision | Reasoning |
| --- | --- |
| Next.js App Router, one repo | Avoids a separate frontend/backend deploy for an MVP with modest traffic; colocated types end-to-end. |
| Prisma + Postgres | Strong relational integrity for a graph this interconnected (Project → BOQ → RFQ → Quotation); `numeric` columns for money. |
| JWT sessions, no Prisma adapter | Credentials-only MVP doesn't need database sessions; keeps auth simple until OAuth is actually needed. |
| Two-file auth config | Keeps Prisma (Node-only) out of the proxy file's bundle, and out of anything that isn't already known to run server-side. |
| Zod schemas shared by forms & routes | One source of truth for "what's a valid quantity/price," enforced server-side regardless of what the client sends. |
| BOQ totals computed on read, not stored | Avoids an entire class of "cached total drifted from line items" bugs; a BOQ's total is always `sum(item.estimatedTotalCost)` at query time. |
| Quotation totals stored, but always server-recomputed on write | Quotations are compared and accepted/rejected as a frozen snapshot, so `subtotal`/`total` are persisted — but every `POST .../quotations` recomputes them from `quantity × unitPrice` server-side; a client-submitted total is never trusted or stored directly. |
