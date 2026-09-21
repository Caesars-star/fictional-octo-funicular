# Roadmap

## What's built (this checkpoint)

The full workflow AUTH → ORGANIZATION → PROJECT → BOQ → MATERIAL CATALOG →
RFQ → SUPPLIER QUOTATION → COMPARISON, backed by real PostgreSQL, with:

- Registration/login/logout, RBAC (persona + org role + project role),
  password-reset architecture, audit logging.
- Organizations: create, members, roles.
- Projects: create/edit, status, site/land info, members, dashboard
  (estimated value, estimated cost, committed cost from active POs, BOQ/RFQ/
  contract counts).
- BOQ: sections, line items, server-computed totals (`Decimal`, never
  float).
- Material catalog: categories, units, products, supplier price lists.
- Suppliers directory.
- RFQ: create from BOQ items, invite suppliers.
- Quotations: supplier submission (draft/submit), server-computed
  subtotal/total, PM-side comparison table, accept/reject (accepting awards
  the RFQ and marks the underlying BOQ items `ORDERED`).
- **Purchase orders**: created from an `ACCEPTED` quotation (copies its line
  items/totals verbatim), project-scoped sequential PO numbers, closed
  forward-only status transitions (`DRAFT → ISSUED → ACCEPTED →
  PARTIALLY_DELIVERED → COMPLETED`, `CANCELLED` from any non-terminal
  state).
- **Contracts**: generic project-scoped agreement with typed parties
  (`CLIENT`/`CONTRACTOR`/`SUPPLIER`/`CONSULTANT`/`OTHER`), value, dates,
  obligations, closed forward-only status transitions (`DRAFT → ACTIVE →
  {COMPLETED, TERMINATED}`).
- Seed data + demo accounts exercising the full chain end-to-end, including
  an awarded quotation, its purchase order, and a sample contractor
  agreement.

See `README.md` for demo accounts and `ARCHITECTURE.md`/`DATABASE.md` for
how it's built.

## Immediate next slice (P4 — Execution, continued)

The natural continuation of the workflow already modeled:

1. **Deliveries** — track against a purchase order, with verification
   status; the natural trigger for `PurchaseOrder.status` moving to
   `PARTIALLY_DELIVERED`/`COMPLETED` instead of that being a manual change.
2. **Milestones** — project/contract milestones with planned/actual dates,
   percentage complete, and payment linkage.
3. **Invoices** — from POs/contracts, with approval workflow.
4. **Payment records** — explicitly labeled as *transaction records*, not a
   banking/wallet system (see "Regulatory design principle" below).

## Then (P5 — Network, P6 — Intelligence)

- Agents: leads, activities, verification tasks, commissions.
- Basic analytics: cost, procurement, payment, progress, supplier/contractor
  dashboards (this is where `recharts`, already installed, gets used).
- Document upload/storage (the `Document` model exists; object storage
  integration doesn't yet).

## Explicitly deferred (P7 — future capital, do not build yet)

Per the product brief, these are architecturally anticipated but must not
be built as mocks presented as real:

- TARA Capital (credit, invoice finance, project finance, supplier finance).
- TARA Wallet (balances, settlement, transaction accounts).
- TARA Notes (structured receivables/payment instruments).
- TARA Risk Engine, TARA Intelligence (forecasting, anomaly detection).
- TARA GIS (the `Site`/`Project` models already carry `latitude`/`longitude`
  and a `parcelReference` so a future GIS integration has something to key
  off, but no mapping/spatial features exist yet).
- Cryptocurrency, blockchain, tokenization, automated lending — out of
  scope entirely per the product brief's "utility before monetization"
  principle.

## Regulatory design principle

TARA is currently a technology/coordination platform. It does not accept
deposits, provide regulated lending, issue securities, or operate payment
services. When "payments" are modeled (P4), they are **transaction
records** — evidence that a payment happened — not a claim that TARA moved
money. Any future regulated financial functionality must go through a
licensed entity or partner integration, not be fabricated in the app layer.

## Known technical debt

- ~~`middleware.ts` should become `proxy.ts`~~ — done (`src/proxy.ts`).
- **No file/document upload flow yet** — `Document` is metadata-only.
- **No rate limiting** on auth endpoints — see `SECURITY.md`.
- **No transactional email provider** — password reset links are logged to
  the console in development; needs a real provider before production.
- **Leftover GitHub Skills exercise files** (`.github/workflows/*.yml`
  besides any real CI, `.github/steps/`, `PROFILE.md`) — unrelated to TARA,
  harmless, safe to delete whenever convenient.
- **No CI pipeline configured yet** — `npm run typecheck && npm run lint &&
  npm run test && npm run build` is the full local quality gate; wiring it
  into GitHub Actions is a good next step.
