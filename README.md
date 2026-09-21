# TARA — Construction Transaction OS

TARA is a Kenya-focused construction-sector economic infrastructure platform. It
coordinates projects, BOQs, procurement, suppliers, contractors, contracts and
(in later phases) payments and financing across the construction value chain,
turning each transaction into structured, traceable data.

This repository is the **TARA Construction Transaction OS MVP**, covering
the workflow

```
AUTH → ORGANIZATION → PROJECT → BOQ → MATERIAL CATALOG → RFQ → SUPPLIER QUOTATION → COMPARISON
                                                                          ↓
                                                        ACCEPT → PURCHASE ORDER
                                                        (+ CONTRACTS, independently, per project)
```

See [ROADMAP.md](./ROADMAP.md) for what's deliberately out of scope for now
(deliveries, invoices, payments, financing, GIS, AI) and why.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend & backend | Next.js 16 (App Router), TypeScript |
| UI | Tailwind CSS v4, hand-built shadcn/ui-style components on Radix primitives |
| Database | PostgreSQL |
| ORM | Prisma 6 |
| Validation | Zod (shared client/server schemas) |
| Auth | Auth.js (NextAuth) v5, Credentials provider, bcrypt password hashing |
| Testing | Vitest (unit), Playwright (browser smoke) |

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the reasoning behind these
choices and the module boundaries.

## Getting started

### Prerequisites

- Node.js 20+
- A PostgreSQL 16 server (local install or `docker compose up -d` if Docker
  is available in your environment)

### Setup

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL / AUTH_SECRET
npm run db:migrate          # create the schema
npm run db:seed             # load demo data (see below)
npm run dev                 # http://localhost:3000
```

Full details, including how to run without Docker, are in
[DEVELOPMENT.md](./DEVELOPMENT.md).

### Demo accounts

`npm run db:seed` creates a demo organization ("TARA Demo Development Ltd"),
a demo project ("Thika Residential Development — Demo Project") with a BOQ,
an RFQ with two supplier quotations ready to compare, one of them accepted
with a purchase order (`PO-0001`) issued from it, and a sample general
contractor agreement. All seeded accounts share the password
`TaraDemo2026!`:

| Email | Role |
| --- | --- |
| `developer@tara.dev` | DEVELOPER — owns the demo organization |
| `pm@tara.dev` | PROJECT_MANAGER — manages the demo project |
| `supplier-cement@tara.dev` | SUPPLIER — Rift Valley Cement Suppliers Ltd |
| `supplier-hardware@tara.dev` | SUPPLIER — Jenga Hardware & Steel Supplies |
| `contractor-general@tara.dev` | CONTRACTOR — BuildRight General Contractors |

This is clearly-labelled fictional demo data, not real companies or
transactions.

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — system, module and API architecture
- [DATABASE.md](./DATABASE.md) — schema, entity relationships, migrations
- [API.md](./API.md) — REST endpoint reference
- [DEVELOPMENT.md](./DEVELOPMENT.md) — local setup, scripts, testing
- [SECURITY.md](./SECURITY.md) — auth, authorization, data handling
- [ROADMAP.md](./ROADMAP.md) — what's built, what's next, what's deliberately deferred

## Repository note

This repository was originally created from GitHub's "Introduction to
GitHub" Skills exercise. The leftover exercise files
(`.github/workflows/*-exercise.yml`, `.github/steps/`, `PROFILE.md`) are
unrelated to TARA and harmless to leave in place, but can be deleted if you'd
like a clean tree.
