# AGENTS.md — FORGE Gym Platform

This file is the contract for every OpenCode session in this repository.
Read it before touching code. If a phase prompt conflicts with this file,
stop and ask.

## 1. What this repo is

A production-grade gym platform for one location:

- **Marketing site** — home, schedule, membership, coaches, contact, free-week lead.
- **Member portal** — account, bookings, waitlist, membership, credits, billing.
- **Staff dashboard** — coach, admin and superadmin tools.
- **API** — Express + MongoDB, session-cookie auth, Stripe billing.

Working brand: **FORGE Strength Club** (placeholder — replace via brand config,
not by find-and-replace across the codebase). The visual direction is inspired
by Ironhaus Strength Club but uses original branding, copy and assets. Never
copy the Ironhaus name, logo, photos or testimonials.

## 2. Read order

1. `AGENTS.md` (this file)
2. `docs/plan/README.md`
3. The phase prompt in `docs/plan/prompts/phase-N.md`
4. Only the plan docs that phase references

Do not read the whole repo "for context". Keep sessions bounded to one phase.

## 3. Repo map

```
frontend/                 Next.js App Router (Vercel)
  app/
    (marketing)/          public, server-rendered pages
    (auth)/               login, signup, invite, reset
    (member)/account/     member portal
    (dashboard)/dashboard staff dashboard (role-aware UI)
  components/             ui/, marketing/, booking/, dashboard/
  lib/                    api client, auth client, query client, format
  public/
backend/                  Express API + worker (Railway/Fly)
  src/
    modules/              auth, users, classes, bookings, billing,
                          members, coaches, leads, dashboard, checkins
    shared/               errors, middleware, pagination, idempotency,
                          transactions, policies
    jobs/                 outbox worker, session generator, reconcilers
    db/                   models, indexes
    scripts/              seed, seed-superadmin, create-stripe-plans
  migrations/             migrate-mongo migrations
  tests/                  unit + integration
packages/shared/          Zod schemas, DTOs, roles, permissions, constants
docs/plan/                this plan and phase prompts
e2e/                      Playwright tests
docker-compose.yml        MongoDB replica set + Mailpit
```

No Turborepo. **npm workspaces** plus root scripts. `frontend/` and `backend/`
are the only deployable apps; `packages/shared` is a library. The root
`package.json` declares `"workspaces": ["frontend", "backend", "packages/*"]`
and the committed lockfile is `package-lock.json`.

## 4. Commands

```bash
npm install
npm run dev              # shared watch + api + worker + web
npm run build
npm run lint
npm run typecheck
npm test                 # unit
npm run test:integration # Supertest + mongodb-memory-server replica set
npm run test:e2e         # Playwright
npm run db:up            # docker compose up -d
npm run db:down
npm run db:init          # initiate the single-node replica set
npm run db:migrate
npm run db:seed
npm run db:seed:demo
npm run openapi:check
npm run stripe:listen    # forward Stripe test webhooks
```

Target one workspace with `-w`: `npm run test -w @gym/api`,
`npm run build -w @gym/web`, `npm run dev -w @gym/shared`.

All scripts must work on Windows PowerShell as well as macOS/Linux. Use
`cross-env`, `rimraf`, and Node scripts — never bash-only syntax.

## 5. Architecture rules

- `frontend` talks to `backend` over HTTP. It never imports backend code.
- `backend` never imports frontend code.
- Both import contracts from `@gym/shared`. Shared code has no Node, React,
  Mongoose or Stripe imports.
- REST, versioned under `/api/v1`. Auth routes live under `/api/auth/*`.
  Stripe webhooks live at `/api/webhooks/stripe`.
- Feature modules are `route → controller → service → repository/model`.
  Controllers do HTTP only. Services own business rules. Repositories own
  queries. No Mongoose calls in controllers.
- Marketing pages are React Server Components with ISR. Member and dashboard
  data is fetched client-side with TanStack Query and `credentials: include`.
- All server data is fetched through the typed API client in
  `frontend/lib/api`. Do not call `fetch` directly from components.
- One active location. Every location-scoped document carries `locationId`.
  Multi-location UI is out of scope until explicitly approved.

## 6. Coding conventions

- TypeScript strict. No `any`, no non-null assertions unless proven. Prefer
  `unknown` + Zod at boundaries.
- Zod schemas in `packages/shared` are the single source of truth for request
  and response shapes. Infer types from schemas; do not hand-write duplicates.
- Money is integer minor units (`priceCents`). Never floats.
- Instants are stored and transported as UTC ISO strings / BSON dates.
  Display in the location's IANA timezone. Use the shared time module
  (Temporal polyfill or Luxon); never native `Date` arithmetic for DST.
- IDs are Mongo ObjectId hex strings, validated by Zod.
- Errors use `AppError` with a stable `code`, HTTP status, safe message and
  optional details. Never leak stack traces or Mongo errors to clients.
- Logs are structured (pino) with `requestId`, `userId`, `role`, route and
  latency. Redact cookies, authorization, tokens, passwords and card data.
- Comments explain *why*, not *what*. Keep them rare.
- Prefer small files and named exports. No default exports except Next.js
  pages/layouts where required.
- UI: Tailwind + shadcn/ui, mobile-first, keyboard accessible, visible focus,
  loading/empty/error states for every async surface, `prefers-reduced-motion`.

## 7. Security invariants (non-negotiable)

1. **Authorize on the API.** Hiding a button is not authorization.
2. **Roles:** `superadmin`, `admin`, `coach`, `member`. Deny by default.
   Never accept `role` from a general profile update. Role changes go through
   superadmin-only endpoints and are audited.
3. **Prices and plan IDs are server-side.** The client sends a plan/pack ID,
   never an amount. Resolve Stripe Price IDs on the server.
4. **Booking is transactional.** Capacity, waitlist and credit consumption use
   a Mongo transaction plus conditional updates and unique indexes. Never
   count-then-insert.
5. **Stripe webhooks are idempotent.** Verify the raw-body signature, store
   `event.id` uniquely, process once, and never grant access from a success URL.
6. **Privileged accounts require TOTP 2FA.** Admin/superadmin routes return
   `403 TWO_FACTOR_REQUIRED` until enrollment is complete.
7. **Revoke sessions** when a user is suspended, demoted or deleted.
8. **Protect the last superadmin.** Refuse to suspend, demote or delete the
   final active superadmin.
9. **Audit privileged actions** in the append-only `auditLogs` collection.
   Never expose an update/delete route for audit logs.
10. **Validate everything** with shared Zod schemas. Never pass `req.body` or
    `req.query` into Mongoose. Reject unknown keys (`.strict()`).
11. **No secrets in the browser.** Only `NEXT_PUBLIC_*` values may reach the
    client; never a Stripe secret, Mongo URI, auth secret or Resend key.
12. **Rate limit** auth, public forms, booking, invites, checkout and credit
    adjustments.
13. **No PII in logs or analytics.** Mask emails where possible.

## 8. Data rules

- Use `migrate-mongo` for schema/data changes. Every schema change ships with
  a migration and a rollback note.
- `autoIndex` is disabled in production. Indexes are created by an explicit
  migration and verified in CI.
- Do not embed unbounded arrays (bookings in a session, members in a plan).
  Reference them. Embed only small, bounded value objects (opening hours,
  recurrence rule, plan features, audit snapshots).
- Denormalized counters (`bookedCount`, `waitlistCount`, credit balances) are
  maintained inside transactions and reconciled by a nightly job.
- Soft-delete only where the plan says so. Bookings and audit logs are never
  hard-deleted by normal app code.
- Seed data is idempotent and separate from migrations.

## 9. Testing rules

- Every business rule gets a unit test. Every DB/API path gets an integration
  test against a real MongoDB replica set (`MongoMemoryReplSet`).
- Required integration suites: RBAC matrix, invite lifecycle, last-superadmin
  guard, concurrent last-spot booking, waitlist promotion, cancellation cutoff,
  Stripe webhook idempotency, credit double-spend.
- Required unit suites: DST/session generation, entitlement resolution,
  cancellation deadline, waitlist ordering, permission policy.
- Use `vi.setSystemTime` for time tests. Never sleep.
- Stripe and Resend are behind interfaces and faked in tests; one Stripe CLI
  smoke test is manual.
- E2E covers three journeys: signup → verify → book; subscribe/pack → book →
  cancel; superadmin invites admin → accept + 2FA → manage a session.
- A phase is not done while any lint, typecheck, unit or integration test fails.

## 10. Workflow for every task

1. Read the phase prompt and the docs it names.
2. Restate the scope and list the files you will touch.
3. Implement the smallest coherent slice.
4. Add/update tests in the same change.
5. Run `npm run lint`, `npm run typecheck`, `npm test`, and the relevant
   integration suite.
6. Update the plan doc/OpenAPI/migration if behavior changed.
7. Report: what changed, commands run, test results, risks, suggested commit
   message, and what is deliberately out of scope.

Stop when the phase's definition of done is met. Do not start the next phase.

## 11. Boundaries — do not

- Do not implement POS, turnstiles/access hardware, payroll, native mobile,
  SMS, multi-location UI, family accounts or late-cancel fees.
- Do not add a dependency without a one-line justification and a check that
  the standard library or an existing package cannot do it.
- Do not change auth, booking, billing or RBAC invariants without explicit
  approval.
- Do not run destructive DB commands against anything but local/test.
- Do not commit, push, or open a PR unless the user asks.
- Do not copy Ironhaus assets, copy, prices, coach names or testimonials.
- Do not use `Date` math for time zones, `autoIndex` in prod, `$where`, or
  raw request objects in queries.

## 12. Definition of Done

A phase is done only when:

- [ ] Scope in the phase prompt is implemented; out-of-scope work is untouched.
- [ ] Shared Zod schemas and inferred types are updated.
- [ ] API endpoints have validation, auth, rate limits, correct status codes
      and OpenAPI entries.
- [ ] DB changes have a migration and indexes.
- [ ] Privileged actions write an audit log entry.
- [ ] Unit + integration tests cover the new rules and pass.
- [ ] `npm run lint`, `npm run typecheck`, `npm run build` pass.
- [ ] UI has loading, empty, error and mobile states; keyboard accessible.
- [ ] No secrets, PII or debug logs added.
- [ ] Phase report written with commands, results and risks.

## 13. Phase index

| Phase | Prompt | Outcome |
| --- | --- | --- |
| 0 | `docs/plan/prompts/phase-0.md` | Monorepo, tooling, Docker, CI, health check |
| 1 | `docs/plan/prompts/phase-1.md` | Auth, roles, 2FA, superadmin, admin invites, audit |
| 2 | `docs/plan/prompts/phase-2.md` | Schedule, sessions, booking, waitlist, cancellation |
| 3 | `docs/plan/prompts/phase-3.md` | Stripe subscriptions, packs, credits, webhooks |
| 4 | `docs/plan/prompts/phase-4.md` | Dashboards, members, coaches, leads, attendance |
| 5 | `docs/plan/prompts/phase-5.md` | Hardening, E2E, deploy, check-in stretch |

## 14. Local setup (Windows)

Prerequisites: Node 22 LTS (includes npm 10), Docker Desktop (WSL2 backend),
Stripe CLI, Git. Then:

```powershell
Copy-Item .env.example .env
npm install
npm run db:up
npm run db:init
npm run db:migrate
npm run db:seed
npm run dev
```

Local URLs: web `http://localhost:3000`, API `http://localhost:4000`,
Mailpit `http://localhost:8025`, Mongo `localhost:27017`.

`npm run db:init` runs `rs.initiate` once. If Mongo was already initialised, it
is a no-op. The Mongo URI must include `?replicaSet=rs0` or transactions fail.

## 15. Troubleshooting

- **"Transaction numbers are only allowed on a replica set member"** — run
  `npm run db:init`; check `MONGODB_URI` includes `replicaSet=rs0`.
- **Cookie missing in the browser** — check `credentials: "include"`, exact
  CORS origin, `SameSite`/`Secure`, and that web and API share a site
  (`app.example.com` + `api.example.com`, not `*.vercel.app` + `*.railway.app`).
- **Stripe webhook 400** — the webhook route must receive the raw body before
  `express.json()`; check `STRIPE_WEBHOOK_SECRET`.
- **OAuth redirect mismatch** — the Google callback must exactly match
  `BETTER_AUTH_URL/api/auth/callback/google`.
- **DST test failure** — use the shared time module; never add 24h to a local
  time.

## 16. Reporting format

End every session with:

```
Phase: N — name
Changed: ...
Tests: npm run lint ✅  npm run typecheck ✅  npm test ✅  integration ✅
Manual checks: ...
Risks / follow-ups: ...
Suggested commit: feat(phase-N): ...
Out of scope: ...
```
