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
- **Deliveries**: recorded against a purchase order's items, partial
  quantities across multiple deliveries supported, closed forward-only
  status transitions (`EXPECTED → IN_TRANSIT → DELIVERED → VERIFIED`,
  `DISPUTED` reachable from any non-terminal status). Marking a delivery
  `VERIFIED` requires project `MANAGER`+. Every delivery status change
  recomputes the parent purchase order's fulfilment status
  (`ACCEPTED → PARTIALLY_DELIVERED → COMPLETED`) from actual delivered
  quantities — never a manual PO status change.
- **Milestones**: project checkpoints (optionally tied to a contract) with
  planned/actual dates, percentage of project, responsible party, and a
  payment amount for a future invoice to be raised against. Same closed
  forward-only status model (`PLANNED → IN_PROGRESS → COMPLETED →
  VERIFIED`, `DELAYED`/`CANCELLED` off-ramps), `VERIFIED` also gated to
  project `MANAGER`+.
- **Invoices**: recorded against a purchase order, contract and/or
  milestone (all optional, independently), with a project-scoped
  duplicate-invoice-number guard per issuing organization. `total` is
  always server-computed as `subtotal + taxAmount`. Closed forward-only
  status transitions (`DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED`,
  `DISPUTED` off-ramp resolving back to `UNDER_REVIEW`); `APPROVED`
  requires project `MANAGER`+. `PARTIALLY_PAID`/`PAID` are deliberately
  unreachable via direct status update — only payments derive them.
- **Payments**: transaction *records* — evidence a payment happened
  outside TARA (bank transfer, mobile money, cheque, cash), never a claim
  that TARA moved money (see "Regulatory design principle" below). Recorded
  against an `APPROVED`/`PARTIALLY_PAID` invoice, `MANAGER`+ only, never
  edited — a mistaken entry is reversed and a corrected one recorded
  separately. Every payment change recomputes the parent invoice's
  `PARTIALLY_PAID`/`PAID` status from its `RECORDED` payment total, the
  same derived-state shape as PO fulfilment from deliveries.
- Project dashboard now also shows **actual expenditure** (sum of recorded
  payments) and **outstanding invoices** (count not yet `PAID`/`DISPUTED`),
  alongside committed cost from purchase orders — the full set of financial
  fields the product brief calls for on a project dashboard.
- Seed data + demo accounts exercising the full chain end-to-end: an
  awarded quotation, its purchase order, a first partial delivery against
  it (demonstrating the PO moving to `PARTIALLY_DELIVERED`), a sample
  contractor agreement, an in-progress milestone, a second *verified*
  milestone with an invoice paid in full against it (demonstrating
  `VERIFIED → INVOICE → PAYMENT → PAID` end to end), and a materials
  invoice against the purchase order with a partial payment recorded
  (demonstrating `PARTIALLY_PAID`).

**P4 (Execution) is now complete**: PROJECT → BOQ → RFQ → QUOTATION →
PURCHASE ORDER → DELIVERY, and CONTRACT → MILESTONE → INVOICE → PAYMENT,
both fully modeled and wired end to end.

- **Agents**: TARA's human field network — recruiting participants,
  generating leads, and performing on-site work (site visits, calls,
  recruitment, verification). An `Agent` profile is auto-created at
  registration for `AGENT`-role signups, is not project-scoped (access
  resolves to the agent's own user/org, not project membership), and gets
  its own self-service `/agent-portal` dashboard (leads, activities,
  commissions) plus an admin `/agents` directory and detail page for
  oversight users. `Lead` tracks prospects through a closed pipeline
  (`NEW → CONTACTED → QUALIFIED → CONVERTED`, `LOST` off-ramp);
  `AgentActivity` is an append-only work log; `Commission` is a standalone
  financial record (`PENDING → APPROVED → PAID`, `CANCELLED` off-ramp).
  **The module's core security property**: an agent can never create,
  approve, or convert their way into their own commission — every
  commission mutation and a lead's `CONVERTED` transition require
  `requireAgentOversight`, which explicitly excludes the acting agent's
  own `userId` regardless of their organization role (see "Financial
  controls" in `SECURITY.md`). Seed data demonstrates both the converted
  and in-pipeline lead states, and an approved-then-paid commission,
  recorded by a distinct oversight account (`agent-manager@tara.dev`) —
  never by the agent (`agent@tara.dev`) themselves.

**P5 (Network) is now complete.**

See `README.md` for demo accounts and `ARCHITECTURE.md`/`DATABASE.md` for
how it's built.

## Immediate next slice (P6 — Intelligence)

- Basic analytics: cost, procurement, payment, progress, supplier/contractor
  dashboards (this is where `recharts`, already installed, gets used —
  the underlying data, e.g. `Payment`/`Invoice`/`Delivery` history, already
  exists to report on).
- Document upload/storage (the `Document` model exists, including
  `contractId`/`deliveryId`/`milestoneId`/`invoiceId` attachment points;
  object storage integration doesn't yet).

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
services. `Payment` rows are **transaction records** — evidence that a
payment happened — not a claim that TARA moved money (see "Financial
controls" in `SECURITY.md`). Any future regulated financial functionality
must go through a licensed entity or partner integration, not be
fabricated in the app layer.

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
