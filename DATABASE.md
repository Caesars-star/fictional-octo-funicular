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
  `RfqItem`, `QuotationItem`, `OrganizationMembership`, `ProjectMember`)
  cascade-delete with their parent. Entities that represent independent
  economic actors (`Organization`, `Supplier`, `Product`) do not cascade
  from a project.

## Entity map (MVP scope)

```
User ──< OrganizationMembership >── Organization ──< Project
                                          │                │
                                          │                ├──< ProjectMember >── User
                                     Supplier               ├── Site (1:1)
                                     Contractor              ├──< Document
                                                              ├──< Boq ──< BoqSection ──< BoqItem >── Product
                                                              │                                          │
                                                              └──< Rfq ──< RfqItem ──────────────────────┘
                                                                    │        │
                                                                    ├──< RfqSupplier >── Supplier
                                                                    └──< Quotation ──< QuotationItem >── RfqItem
                                                                              │
                                                                         Supplier

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
```

So from any `Quotation`, you can always resolve `quotation.rfq.projectId`
(this is exactly what `requireQuotationProjectAccess` in `src/lib/rbac.ts`
does for authorization) and from any `Quotation`'s items back to the
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
project, BOQ and RFQ/quotations only once (checked via a `findFirst` before
creating), so re-running it won't duplicate the demo transaction chain.

## What's deliberately not modeled yet

`PurchaseOrder`, `Contract`, `Delivery`, `Invoice`, `Payment`, `Milestone`,
`Agent`/`Lead`/`Commission`, and any financing/wallet tables are out of
scope for this MVP (see `ROADMAP.md`). The schema is structured so they can
be added without breaking existing tables:

- `Quotation.status = ACCEPTED` is the natural trigger point for a future
  `PurchaseOrder` to be created from it.
- `BoqItem.procurementStatus` already has `ORDERED` / `DELIVERED` values
  reserved for when `PurchaseOrder`/`Delivery` models exist.
- `Document.type` already includes `CONTRACT`, `INVOICE`, `RECEIPT`,
  `DELIVERY_NOTE` for when those modules attach real records to these
  document types instead of just a category label.
