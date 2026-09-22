# Database

PostgreSQL, managed by Prisma. Full schema: [`prisma/schema.prisma`](./prisma/schema.prisma).

## Conventions

- **IDs**: `cuid()` strings everywhere, no auto-increment integers (avoids
  leaking record counts, works cleanly with optimistic client-side IDs
  later if needed).
- **Money**: `Decimal` mapped to Postgres `numeric(p,s)` — never `Float`.
  BOQ unit costs use `numeric(14,2)`; totals use `numeric(16,2)` to leave
  headroom for large project sums; quantities use `numeric(14,3)` (fractional
  units like cubic metres are common in construction).
- **Status fields**: Prisma `enum`s, not free-text strings — every workflow
  status (`ProjectStatus`, `RfqStatus`, `QuotationStatus`,
  `ProcurementStatus`, …) is a closed, migratable set of values.
- **Timestamps**: `createdAt @default(now())`, `updatedAt @updatedAt` on
  every mutable entity.
- **Soft boundaries, hard cascades where it's safe**: child records that
  only make sense attached to a parent (`BoqSection`, `BoqItem`,
  `RfqItem`, `QuotationItem`, `PurchaseOrderItem`, `ContractParty`,
  `DeliveryItem`, `OrganizationMembership`, `ProjectMember`) cascade-delete
  with their parent. `Payment` cascades from its `Invoice` for the same
  reason, but is never itself deleted by the application — a wrong payment
  is reversed (see "Payments" below), not removed. Entities that represent
  independent economic actors (`Organization`, `Supplier`, `Product`) do
  not cascade from a project.

## Entity map (MVP scope)

```
User ──< OrganizationMembership >── Organization ──< Project
                                          │                │
                                          │                ├──< ProjectMember >── User
                                     Supplier               ├── Site (1:1)
                                     Contractor              ├──< Document >── Contract / Delivery / Milestone / Invoice (nullable)
                                                              ├──< Boq ──< BoqSection ──< BoqItem >── Product
                                                              │                                          │
                                                              ├──< Rfq ──< RfqItem ──────────────────────┘
                                                              │      │        │
                                                              │      ├──< RfqSupplier >── Supplier
                                                              │      └──< Quotation ──< QuotationItem >── RfqItem
                                                              │                │            │
                                                              │           PurchaseOrder (1:1, once ACCEPTED)
                                                              │                │      │
                                                              │                │  PurchaseOrderItem >── QuotationItem
                                                              │                │           │
                                                              │                └──< Delivery ──< DeliveryItem >── PurchaseOrderItem
                                                              │
                                                              ├──< Contract ──< ContractParty >── Organization
                                                              │        │
                                                              ├────────┴──< Milestone >── Organization (responsible party, nullable)
                                                              │                │
                                                              └──< Invoice ────┘  (nullable link to PurchaseOrder / Contract / Milestone)
                                                                       │
                                                                       └──< Payment >── Organization ×2 (payer, payee)

Product >── ProductCategory (self-referential hierarchy)
Product >── Unit
Product ──< SupplierProduct >── Supplier   (supplier price list)

AuditLog ── actor: User (nullable — system-initiated actions have no actor)
PasswordResetToken ── User
```

## Traceability

The core requirement — every economic event traces back to a project — holds
by construction:

```
BoqItem.boqId → Boq.projectId
RfqItem.boqItemId → BoqItem   (nullable: an RFQ can also carry free-standing items)
Rfq.projectId, Rfq.boqId
Quotation.rfqId → Rfq.projectId
QuotationItem.rfqItemId → RfqItem
PurchaseOrder.projectId, PurchaseOrder.quotationId → Quotation (unique — one PO per quotation)
PurchaseOrderItem.quotationItemId → QuotationItem
Delivery.purchaseOrderId → PurchaseOrder.projectId
DeliveryItem.purchaseOrderItemId → PurchaseOrderItem
Contract.projectId
Milestone.projectId, Milestone.contractId → Contract (nullable)
Invoice.projectId, Invoice.purchaseOrderId / contractId / milestoneId (all nullable)
Payment.projectId, Payment.invoiceId → Invoice
```

So from any `Quotation`, you can always resolve `quotation.rfq.projectId`
(this is exactly what `requireQuotationProjectAccess` in `src/lib/rbac.ts`
does for authorization); from any `PurchaseOrder`, `purchaseOrder.projectId`
is denormalized directly onto the row (not derived through the quotation)
so `requirePurchaseOrderAccess` can check project access in one query;
`requireDeliveryAccess` resolves through `delivery.purchaseOrder.projectId`
the same way; `Invoice` and `Payment` both carry `projectId` directly for
the same single-hop reason; and from any `Quotation`'s items back to the
originating `BoqItem`.

## Migrations

```bash
npm run db:migrate       # prisma migrate dev — creates + applies a migration from schema changes
npm run db:generate      # prisma generate — regenerate the Prisma Client after a schema edit
npm run db:studio        # prisma studio — browse the database visually
```

Migrations live in `prisma/migrations/` and are committed to the repo —
never edit an already-applied migration file; create a new one.

## Seeding

```bash
npm run db:seed
```

`prisma/seed.ts` is idempotent (uses `upsert` throughout) for catalog data,
organizations and users, so it's safe to re-run. It creates the demo
project, BOQ, RFQ/quotations, the awarded quotation's purchase order, a
first partial delivery against it, the demo contract, two milestones (one
in progress, one verified with an invoice paid in full against it), and a
partially-paid materials invoice against the purchase order — only once
each (checked via a `findFirst` before creating), so re-running it won't
duplicate the demo transaction chain.

## What's deliberately not modeled yet

`Agent`/`Lead`/`Commission` and any financing/wallet tables are out of
scope for this MVP (see `ROADMAP.md`). `PurchaseOrder`, `Contract`,
`Delivery`, `Milestone`, `Invoice` and `Payment` are now modeled — this MVP
now covers the full P4 execution phase. The schema is structured so the
remaining modules can be added without breaking existing tables:

- `Document.contractId` / `deliveryId` / `milestoneId` / `invoiceId`
  already exist for attaching files to those records once uploads are
  implemented.
- `Payment.status = RECORDED` rows are the natural input to a future
  Agent commission calculation or cash-flow analytics module — the ledger
  already exists, only the reporting layer is missing.

### Purchase orders

`PurchaseOrder` is created from an `ACCEPTED` `Quotation` — one PO per
quotation (`quotationId @unique`) — via `POST /api/quotations/:id/purchase-order`,
which copies the quotation's line items and totals verbatim (never
re-derives them) into `PurchaseOrderItem`/`PurchaseOrder.subtotal`/`total`.
Status is a closed forward-only state machine
(`src/lib/validations/purchase-order.ts`'s `PO_STATUS_TRANSITIONS`):
`DRAFT → ISSUED → ACCEPTED → PARTIALLY_DELIVERED → COMPLETED`, with
`CANCELLED` reachable from any non-terminal state. `poNumber` is
project-scoped and sequential (`PO-0001`, `PO-0002`, …), enforced by
`@@unique([projectId, poNumber])`.

### Contracts

`Contract` is a generic project-scoped agreement (`ContractType`: `SUPPLY`,
`SERVICE`, `CONSTRUCTION`, `CONSULTING`, `OTHER`) with a many-to-many
`ContractParty` join to `Organization` (each tagged `CLIENT` / `CONTRACTOR`
/ `SUPPLIER` / `CONSULTANT` / `OTHER`). Status is also a closed forward-only
state machine (`CONTRACT_STATUS_TRANSITIONS`): `DRAFT → ACTIVE →
{COMPLETED, TERMINATED}`, with `CANCELLED` reachable only from `DRAFT`
(an active contract is terminated, not cancelled).

### Deliveries

A `PurchaseOrder` can have several `Delivery` records — real shipments
often arrive in more than one batch. Each `Delivery` carries `DeliveryItem`
rows against specific `PurchaseOrderItem`s, so a delivery can be partial
(e.g. cement and sand arrive first, steel and ballast later — this is
exactly what the seed data demonstrates). Status is a closed forward-only
state machine (`DELIVERY_STATUS_TRANSITIONS`): `EXPECTED → IN_TRANSIT →
DELIVERED → VERIFIED`, with `DISPUTED` reachable from any non-terminal
status and resolvable back to `DELIVERED`/`VERIFIED`. Moving a delivery to
`VERIFIED` requires project `MANAGER`+ — recording receipt is a front-line
action, confirming it's correct is a supervisory one (the product brief's
human-in-the-loop principle: user-entered and verified information are
distinct).

After any delivery status change, `recomputePurchaseOrderDeliveryStatus`
(`src/lib/purchase-orders.ts`) sums each `PurchaseOrderItem`'s delivered
quantity across its `DELIVERED`/`VERIFIED` (not `DISPUTED`) deliveries and
compares it to the ordered quantity, moving the parent `PurchaseOrder` from
`ACCEPTED` to `PARTIALLY_DELIVERED` or `COMPLETED`. This only ever moves a
PO *forward* — it never reverts one automatically, and it only touches POs
already `ACCEPTED` or `PARTIALLY_DELIVERED` (consistent with
`PO_STATUS_TRANSITIONS`).

### Milestones

`Milestone` is a project-scoped checkpoint, optionally tied to a `Contract`
(`contractId` nullable) and to a `responsibleOrg` (nullable `Organization`
— typically the contractor accountable for it). It carries `plannedDate`/
`actualDate`, an integer `percentage` (0–100, the share of the project this
checkpoint represents), and an optional `paymentAmount` — the hook a future
`Invoice` module raises a claim against once a milestone is verified.
Status is a closed forward-only state machine
(`MILESTONE_STATUS_TRANSITIONS`): `PLANNED → IN_PROGRESS → COMPLETED →
VERIFIED`, with `DELAYED` reachable from `PLANNED`/`IN_PROGRESS` and
`CANCELLED` from any non-terminal status; `COMPLETED` can also revert to
`IN_PROGRESS` if verification fails. As with deliveries, only project
`MANAGER`+ can mark a milestone `VERIFIED`.

### Invoices

`Invoice` names the organization billing (`issuedByOrgId`, required) and
optionally points at whichever of `PurchaseOrder` / `Contract` / `Milestone`
it's billing against (all nullable — an invoice can be raised against any
one of them, or none, e.g. a standalone consultancy fee). `invoiceNumber`
is the number as it appears on the invoice the issuing organization sent —
not a TARA-generated number — with `@@unique([projectId, issuedByOrgId,
invoiceNumber])` so the same organization can't submit the same invoice
number twice on a project (this is the "duplicate invoice numbers" edge
case the product brief calls out by name; the API layer turns the
resulting `P2002` into a specific, actionable `409` message rather than a
generic one). `total` is always server-computed as `subtotal + taxAmount`.

Status is a closed forward-only state machine
(`INVOICE_STATUS_TRANSITIONS`): `DRAFT → SUBMITTED → UNDER_REVIEW →
APPROVED`, with `DISPUTED` reachable from `SUBMITTED`/`UNDER_REVIEW`/
`APPROVED`/`PARTIALLY_PAID` and resolvable back to `UNDER_REVIEW`.
**`PARTIALLY_PAID` and `PAID` do not appear in any transition's allowed
list** — they are unreachable via `PATCH`, by design; only
`recomputeInvoicePaymentStatus` sets them (see "Payments" below).
Approving an invoice (`APPROVED`) requires project `MANAGER`+ — it
authorizes the invoice for payment, the same financial-control significance
as accepting a quotation or issuing a PO.

### Payments

`Payment` rows are transaction *records* — evidence that a payment was
made outside TARA (bank transfer, mobile money, cheque, cash), **never a
claim that TARA itself moved money**. Each carries `payerOrgId` and
`payeeOrgId` explicitly (the payee is always set server-side from
`invoice.issuedByOrgId`, never client-supplied, so it can't drift from who
actually issued the invoice) plus `amount`, `paymentDate`, `paymentMethod`
(`BANK_TRANSFER` / `MOBILE_MONEY` / `CHEQUE` / `CASH` / `OTHER`) and an
optional `reference`. Status is just `RECORDED` or `REVERSED` — there is no
`PATCH` for editing a payment's fields; a mistaken entry is reversed (kept,
marked `REVERSED`, visible in the payments list) and a corrected one
recorded separately, so the record never silently loses history. Recording
or reversing a payment always requires project `MANAGER`+.

After any payment is recorded or reversed,
`recomputeInvoicePaymentStatus` (`src/lib/invoices.ts`) sums the invoice's
`RECORDED` (not `REVERSED`) payment amounts and compares them to
`invoice.total`, moving the invoice from `APPROVED` to `PARTIALLY_PAID` or
`PAID`. Same shape as `recomputePurchaseOrderDeliveryStatus`: only ever
moves the invoice *forward*, and only touches invoices already `APPROVED`
or `PARTIALLY_PAID`.
