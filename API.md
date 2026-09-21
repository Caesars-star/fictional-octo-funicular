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
