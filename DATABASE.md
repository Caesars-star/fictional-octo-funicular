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
  with their parent. Entities that represent independent economic actors
  (`Organization`, `Supplier`, `Product`) do not cascade from a project.

## Entity map (MVP scope)

```
User ──< OrganizationMembership >── Organization ──< Project
                                          │                │
                                          │                ├──< ProjectMember >── User
                                     Supplier               ├── Site (1:1)
                                     Contractor              ├──< Document >── Contract / Delivery / Milestone (nullable)
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
                                                              └────────┴──< Milestone >── Organization (responsible party, nullable)

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
```

So from any `Quotation`, you can always resolve `quotation.rfq.projectId`
(this is exactly what `requireQuotationProjectAccess` in `src/lib/rbac.ts`
does for authorization); from any `PurchaseOrder`, `purchaseOrder.projectId`
is denormalized directly onto the row (not derived through the quotation)
so `requirePurchaseOrderAccess` can check project access in one query;
`requireDeliveryAccess` resolves through `delivery.purchaseOrder.projectId`
the same way; and from any `Quotation`'s items back to the originating
`BoqItem`.

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
first partial delivery against it, the demo contract, and a milestone only
once (checked via a `findFirst` before creating), so re-running it won't
duplicate the demo transaction chain.

## What's deliberately not modeled yet

`Invoice`, `Payment`, `Agent`/`Lead`/`Commission`, and any financing/wallet
tables are out of scope for this MVP (see `ROADMAP.md`). `PurchaseOrder`,
`Contract`, `Delivery` and `Milestone` are now modeled (see below). The
schema is structured so the rest can be added without breaking existing
tables:

- `Document.type` already includes `INVOICE`, `RECEIPT` for when the
  invoicing module attaches real records to these document types instead
  of just a category label. `Document.contractId` / `deliveryId` /
  `milestoneId` already exist for attaching files to those records once
  uploads are implemented.
- `Milestone.paymentAmount` is the natural hook for a future `Invoice` to
  be raised against a completed, verified milestone.

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
