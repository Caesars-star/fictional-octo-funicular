# API reference

All endpoints are Next.js Route Handlers under `/api/`. All authenticated
endpoints require a valid Auth.js session cookie (set by `/api/auth/*`); the
browser sends this automatically. All request/response bodies are JSON.

Errors always have the shape `{ "error": "human-readable message" }` (plus
`issues` for Zod validation failures) with an appropriate HTTP status —
never a raw stack trace or database error (see `src/lib/api-error.ts`).

## Auth

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Register a user + create their organization (+ Supplier/Contractor record if applicable). |
| `POST` | `/api/auth/request-password-reset` | Generate a reset token. Always returns a generic success message (no email enumeration). |
| `POST` | `/api/auth/reset-password` | Consume a reset token, set a new password. |
| `*` | `/api/auth/[...nextauth]` | Auth.js sign-in/sign-out/session endpoints (Credentials provider). |

## Organizations

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/organizations` | session | List organizations the caller belongs to (all, for `PLATFORM_ADMIN`). |
| `POST` | `/api/organizations` | session | Create an organization; caller becomes `OWNER`. |
| `GET` | `/api/organizations/:id` | org member | Organization detail, members, projects. |
| `PATCH` | `/api/organizations/:id` | org `ADMIN`+ | Update organization profile. |
| `POST` | `/api/organizations/:id/members` | org `ADMIN`+ | Add an existing TARA user as a member by email. |
| `PATCH` | `/api/organizations/:id/members/:membershipId` | org `ADMIN`+ | Change a member's role/status (cannot modify another `OWNER`). |

## Projects

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/projects?organizationId=` | session | List projects visible to the caller. |
| `POST` | `/api/projects` | org member | Create a project; caller becomes project `OWNER`. |
| `GET` | `/api/projects/:id` | project access | Project detail incl. site, members, counts. |
| `PATCH` | `/api/projects/:id` | project `MANAGER`+ | Update project fields/status. |
| `PUT` | `/api/projects/:id/site` | project `MANAGER`+ | Upsert site/land information. |
| `POST` | `/api/projects/:id/members` | project `MANAGER`+ | Add an existing TARA user as a project member. |

## BOQ

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/projects/:projectId/boqs` | project member | Create a BOQ (with a default "General" section). |
| `POST` | `/api/boqs/:boqId/sections` | project member | Add a section. |
| `PATCH` / `DELETE` | `/api/boqs/:boqId/sections/:sectionId` | project member / `MANAGER`+ | Rename / delete a section (cascades its items). |
| `POST` | `/api/boqs/:boqId/items` | project member | Add a line item. `estimatedTotalCost` is always server-computed as `quantity × estimatedUnitCost`. |
| `PATCH` / `DELETE` | `/api/boqs/:boqId/items/:itemId` | project member | Update / delete a line item. Any change to quantity or unit cost recomputes the line total. |

## Material catalog

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` / `POST` | `/api/catalog/categories` | session | List / create product categories. |
| `GET` / `POST` | `/api/catalog/units` | session | List / create units of measure. |
| `GET` / `POST` | `/api/catalog/products?categoryId=` | session | List / create catalog products. |
| `POST` | `/api/suppliers/:supplierId/products` | supplier org member | Upsert a supplier's price for a product. |

## RFQ / Quotations

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/projects/:projectId/rfqs` | project member | Create an RFQ from selected BOQ items (+ optional initial supplier invitations). Marks those BOQ items `RFQ_SENT`. |
| `POST` | `/api/rfqs/:rfqId/suppliers` | project member | Invite additional suppliers; moves a `DRAFT` RFQ to `OPEN`. |
| `POST` | `/api/rfqs/:rfqId/quotations` | invited supplier org member | Upsert the caller's quotation (draft or `submit: true`). Line totals, subtotal and total are always computed server-side from `quantity × unitPrice`. |
| `PATCH` | `/api/quotations/:id` | project `MANAGER`+ | Accept or reject a quotation. Accepting sets `Rfq.status = AWARDED` and the underlying BOQ items' `procurementStatus = ORDERED`. |

## Purchase orders

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/quotations/:quotationId/purchase-order` | project `MANAGER`+ | Create a purchase order from an `ACCEPTED` quotation — copies its line items and totals. One PO per quotation; fails `409` if one already exists, `400` if the quotation isn't accepted yet. |
| `PATCH` | `/api/purchase-orders/:id` | project `MANAGER`+ | Update `status` (validated against a closed forward-only transition table — see `DATABASE.md`), `expectedDeliveryDate`, or `terms`. Setting `status: "ISSUED"` stamps `issueDate` if unset. |

## Deliveries

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/purchase-orders/:purchaseOrderId/deliveries` | project member | Record a delivery against a PO's items (partial quantities allowed). `400` if the PO isn't `ACCEPTED`/`PARTIALLY_DELIVERED` yet. |
| `PATCH` | `/api/deliveries/:id` | project member (project `MANAGER`+ to set `status: "VERIFIED"`) | Update `status` (validated against a closed forward-only transition table), `deliveredDate`, `location`, `receivedById`, or `notes`. Any status change recomputes the parent PO's fulfilment status. |

## Contracts

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/projects/:projectId/contracts` | project `MANAGER`+ | Create a contract (+ optional initial parties). |
| `PATCH` | `/api/contracts/:id` | project `MANAGER`+ | Update fields and/or `status` (validated against a closed forward-only transition table). |
| `POST` | `/api/contracts/:id/parties` | project `MANAGER`+ | Add (or update the role of) a party organization on the contract. |

## Milestones

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/projects/:projectId/milestones` | project member | Create a milestone (+ optional `contractId` linking it to a project contract). |
| `PATCH` | `/api/milestones/:id` | project member (project `MANAGER`+ to set `status: "VERIFIED"`) | Update fields and/or `status` (validated against a closed forward-only transition table). Setting `status: "COMPLETED"` stamps `actualDate` if unset. |

## Example: creating an RFQ

```http
POST /api/projects/clx.../rfqs
Content-Type: application/json

{
  "title": "Cement & Steel — Foundation Works",
  "boqItemIds": ["clx_item_1", "clx_item_2"],
  "supplierIds": ["clx_supplier_1", "clx_supplier_2"],
  "dueDate": "2026-10-15",
  "notes": "Single delivery schedule preferred."
}
```

## Example: submitting a quotation

```http
POST /api/rfqs/clx_rfq_1/quotations
Content-Type: application/json

{
  "supplierId": "clx_supplier_1",
  "items": [
    { "rfqItemId": "clx_rfqitem_1", "unitPrice": "850" },
    { "rfqItemId": "clx_rfqitem_2", "unitPrice": "95000" }
  ],
  "deliveryCost": "15000",
  "taxAmount": "12920",
  "validUntil": "2026-11-01",
  "notes": "Delivery within 2 days of order confirmation.",
  "submit": true
}
```

`unitPrice` values are strings to preserve decimal precision over the wire;
the server parses and stores them as Postgres `numeric` via Prisma `Decimal`.

## Example: creating a purchase order from an accepted quotation

```http
POST /api/quotations/clx_quotation_1/purchase-order
Content-Type: application/json

{
  "expectedDeliveryDate": "2026-09-20",
  "terms": "Payment due within 30 days of delivery."
}
```

The quotation must already be `ACCEPTED` (via `PATCH /api/quotations/:id`).
The response's `purchaseOrder` includes a project-scoped, sequential
`poNumber` (`PO-0001`, `PO-0002`, …) and the copied line items.

## Example: advancing a purchase order's status

```http
PATCH /api/purchase-orders/clx_po_1
Content-Type: application/json

{ "status": "ISSUED" }
```

Returns `400` if `status` isn't a legal next step from the PO's current
status (see the transition table in `DATABASE.md`).

## Example: creating a contract

```http
POST /api/projects/clx.../contracts
Content-Type: application/json

{
  "title": "General Contractor Agreement — Phase 1",
  "contractType": "CONSTRUCTION",
  "value": "28000000",
  "startDate": "2026-03-15",
  "endDate": "2027-05-31",
  "obligations": "Contractor to deliver foundation, superstructure, roofing and finishing works per the approved BOQ.",
  "parties": [
    { "organizationId": "clx_org_developer", "role": "CLIENT" },
    { "organizationId": "clx_org_contractor", "role": "CONTRACTOR" }
  ]
}
```

## Example: recording a delivery

```http
POST /api/purchase-orders/clx_po_1/deliveries
Content-Type: application/json

{
  "items": [
    { "purchaseOrderItemId": "clx_poitem_1", "quantity": "500" },
    { "purchaseOrderItemId": "clx_poitem_2", "quantity": "20" }
  ],
  "expectedDate": "2026-09-18",
  "location": "Site store, Thika Residential Development",
  "notes": "First batch — steel and ballast still outstanding."
}
```

Delivered quantities need not cover a PO item in full; a PO can have
several partial deliveries over time. The new delivery starts as
`EXPECTED`; advance it with `PATCH /api/deliveries/:id`.

## Example: verifying a delivery

```http
PATCH /api/deliveries/clx_delivery_1
Content-Type: application/json

{ "status": "VERIFIED" }
```

Requires project `MANAGER`+. On success, the parent purchase order's
fulfilment status is recomputed automatically (see `DATABASE.md`).

## Example: creating a milestone

```http
POST /api/projects/clx.../milestones
Content-Type: application/json

{
  "contractId": "clx_contract_1",
  "name": "Foundation Complete",
  "description": "Excavation, blinding, footings and foundation walls complete and cured.",
  "plannedDate": "2026-09-30",
  "percentage": 15,
  "responsibleOrgId": "clx_org_contractor",
  "paymentAmount": "4200000"
}
```
