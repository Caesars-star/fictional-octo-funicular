# Development

## Prerequisites

- Node.js 20+
- PostgreSQL 16, reachable at the connection string in `.env`

### Getting a Postgres instance

**Option A — Docker** (if available in your environment):

```bash
docker compose up -d
```

This starts Postgres on `localhost:5432` with the credentials already in
`.env.example` (`tara` / `tara_dev_password`, database `tara`).

**Option B — local PostgreSQL install** (used to develop this MVP, since
Docker's daemon wasn't reachable in that sandbox):

```bash
sudo service postgresql start
sudo -u postgres psql -c "CREATE ROLE tara LOGIN PASSWORD 'tara_dev_password' CREATEDB;"
sudo -u postgres psql -c "CREATE DATABASE tara OWNER tara;"
```

The `CREATEDB` privilege is required because `prisma migrate dev` creates a
temporary shadow database to detect drift.

## Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `AUTH_SECRET` | Auth.js session encryption key — generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Base URL of the app (`http://localhost:3000` in dev) |

Never commit `.env`. `.gitignore` already excludes it.

## Common commands

```bash
npm run dev            # start the dev server (Turbopack)
npm run build           # production build (also runs typecheck)
npm run start            # run a production build

npm run typecheck        # tsc --noEmit
npm run lint              # eslint .
npm run test               # vitest run

npm run db:migrate          # prisma migrate dev
npm run db:generate          # regenerate Prisma Client after a schema edit
npm run db:seed               # load demo/development data (idempotent)
npm run db:studio              # browse the database in Prisma Studio
```

## Project structure

See "Layers" in [ARCHITECTURE.md](./ARCHITECTURE.md).

## Adding a new module (pattern to follow)

Looking at how BOQ or RFQ/Quotation were built is the fastest way to learn
the pattern; each new module repeats the same five pieces:

1. **Schema** — add models/enums to `prisma/schema.prisma`, run
   `npm run db:migrate`.
2. **Validation** — `src/lib/validations/<module>.ts`, Zod schemas for every
   create/update payload.
3. **Authorization** — if the new module hangs off an existing entity (e.g.
   a BOQ, a project), add a `require<X>Access` helper to `src/lib/rbac.ts`
   that resolves up to the owning project/org and reuses
   `requireProjectAccess`/`requireOrgAccess`. Don't invent a parallel
   authorization path.
4. **API routes** — `src/app/api/.../route.ts`, following the existing
   routes: parse with Zod → authorize → Prisma write (in a `$transaction`
   if multiple tables change) → `logAudit(...)` → JSON response via
   `handleApiError` on failure.
5. **UI** — a server component page under `src/app/(app)/...` that reads
   directly via Prisma, plus small client components for mutations that
   `fetch()` the API route and `router.refresh()`.

## Testing

- **Unit tests** (`npm run test`, Vitest): pure logic — money/Decimal math
  (`src/lib/money.test.ts`) and Zod validation edge cases
  (`src/lib/validations/*.test.ts`: zero/negative quantities, negative
  prices, empty item lists). Add a test alongside any new calculation or
  validation schema.
- **Browser smoke test**: there's no Playwright test file committed yet,
  but the full AUTH → PROJECT → BOQ → RFQ → QUOTATION → COMPARISON flow was
  verified in a real headless Chromium session against the seeded demo
  data during development (login, BOQ totals, RFQ comparison table, zero
  console errors). Recommended next step: commit that script as
  `e2e/workflow.spec.ts` under `@playwright/test` so it runs in CI.

## Known environment quirks (this sandbox, may not apply to yours)

- The shadcn/ui CLI's registry (`ui.shadcn.com`) was unreachable through
  this environment's network proxy, so `src/components/ui/*` was
  hand-written against the same Radix primitives shadcn/ui itself uses,
  rather than fetched via `npx shadcn add`. If your environment can reach
  it, the CLI will happily coexist with these files.
- `npm install` intermittently hit a known npm/Arborist bug
  (`Cannot read properties of null (reading 'edgesOut')`) resolving peer
  dependencies for this dependency set; `--legacy-peer-deps` avoided it.
- Google Fonts (`next/font/google`) requires a build-time network fetch
  that was also blocked; the app uses a system font stack instead (see
  `src/app/globals.css` / `layout.tsx`).
- Next.js 16 renamed the `middleware.ts` convention to `proxy.ts` (Node.js
  runtime by default now, no more Edge-runtime constraint). This repo still
  uses `middleware.ts` — it works, just prints a deprecation warning — so
  the Edge/Node config split described in `ARCHITECTURE.md` is stricter
  than Next.js now requires; renaming to `proxy.ts` and merging the two
  auth config files back into one is safe cleanup for a follow-up PR.
