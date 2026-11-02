# 06 — Testing and Operations

## Test strategy

| Layer | Tool | Scope | Runs |
| --- | --- | --- | --- |
| Unit | Vitest | Time zones, session generation, entitlement, cutoff, waitlist order, permissions, Zod schemas | Every commit |
| API integration | Supertest + `MongoMemoryReplSet` | Auth, RBAC, invites, booking transactions, waitlist, credits, webhooks | Every PR |
| Contract | Zod/OpenAPI check | Shared schemas ↔ routes ↔ docs | CI |
| E2E | Playwright | Signup/verify/book, subscribe/book/cancel, admin invite/2FA/manage | PR (smoke) + nightly |
| Accessibility | axe-core via Playwright | Marketing + booking + dashboard key pages | Nightly |
| Load | k6 (optional) | Last-spot booking concurrency, schedule read | Before launch |

Principles:
- Test real MongoDB behavior (transactions, unique indexes), not mocks. Use
  `MongoMemoryReplSet` for integration tests.
- Fake only external services (Stripe, Resend) behind interfaces; one manual
  Stripe CLI smoke test.
- Freeze time with `vi.setSystemTime`; never `sleep`.
- Integration tests seed their own data and clear collections between tests.
- A failing test blocks the phase gate; do not skip with `.only`/`.skip` without
  a linked issue.

## Required test suites

### Unit

- `time`: DST spring-forward/fall-back session generation; local 06:30 stays
  06:30; UTC offset changes; cutoff across DST.
- `entitlement`: unlimited, floor + credits, expired credits, past_due grace,
  canceled-but-access-until, no entitlement.
- `booking`: cutoff boundary (exactly 12h), waitlist ordering, promotion grace,
  max upcoming bookings.
- `permissions`: role × capability matrix; `can()` returns false by default.
- `schemas`: shared request/response validation, unknown keys rejected.

### Integration

- **RBAC matrix:** for every sensitive route, each role gets 200/403 as expected;
  unauthenticated gets 401. Include coach-owns-session vs another coach.
- **Invite lifecycle:** create → accept → login; expired; reused; wrong email;
  revoked; re-invite invalidates old token; 2FA required after accept.
- **Last superadmin:** cannot demote/suspend/delete the only one; can with two;
  cannot change own role.
- **Session revocation:** suspend/demote invalidates existing cookies.
- **Booking concurrency:** capacity 1, 20 parallel requests → 1 booked, 19
  waitlisted; same member twice → 1; waitlist disabled → 409.
- **Waitlist:** cancel booked → oldest promoted; no credit → skip; promotion
  after cutoff gets grace; late cancel does not restore credit.
- **Cancellation:** before/after cutoff; staff override; session cancel restores
  all credits and clears waitlist.
- **Credits:** purchase grants once; booking consumes once; cancellation
  restores once; concurrent consume cannot go negative; expiry job.
- **Webhooks:** duplicate event; concurrent duplicate; out-of-order subscription
  update; handler failure/retry; unknown event ignored; bad signature 400;
  price mismatch does not grant.
- **Stripe checkout:** client cannot set amount; plan ID resolves server price;
  success page does not grant.
- **Audit:** role change, invite, credit adjustment, session cancel, refund,
  settings update each write an entry; audit API has no update/delete.
- **Leads/contact:** validation, rate limit, honeypot/Turnstile, admin status.
- **Reconciliation:** seeded drift is detected and repaired/reported.

### E2E (Playwright)

1. **Member journey:** sign up → verify email via Mailpit → buy a pack (Stripe
   test card) → book a class → see it in account → cancel before cutoff.
2. **Membership journey:** subscribe to Unlimited → webhook activates → book a
   class → open billing portal → cancel at period end.
3. **Staff journey:** superadmin invites admin → accept invite → enroll TOTP →
   create a class session → invite/activate a coach → coach marks attendance →
   superadmin sees the audit entry.

Use API fixtures to create users/sessions where UI setup is slow, but exercise
the real UI for the critical path. Run against a dedicated test database and
Stripe test mode. Never run E2E against production.

## CI pipeline

```yaml
# .github/workflows/ci.yml (shape)
jobs:
  verify:
    services:
      mongo:
        image: mongo:8
        options: >-
          --health-cmd "mongosh --eval 'db.runCommand({ping:1})'"
          --health-interval 10s --health-timeout 5s --health-retries 5
    steps:
      - checkout
      - setup-node 22 with cache: npm
      - npm ci
      - npm run lint
      - npm run typecheck
      - npm run build
      - npm test
      - npm run test:integration
      - npm run openapi:check
      - npm audit --omit=dev --audit-level=high
```

- Use `MongoMemoryReplSet` in tests; the service container is a fallback for
  parity. The URI must enable a replica set.
- Cache npm downloads; do not cache `node_modules`.
- Upload Playwright traces/screenshots on failure.
- Nightly: full E2E + axe + dependency audit; optionally k6 smoke.
- Protect `main`: require verify + one review (even solo, use a PR for phases).

## Local development

Prerequisites: Node 22 LTS, npm 10 (bundled), Docker Desktop (WSL2), Stripe CLI,
Git. Windows PowerShell commands:

```powershell
Copy-Item .env.example .env
npm install
npm run db:up
npm run db:init
npm run db:migrate
npm run db:seed
npm run dev
```

Services:

| Service | URL |
| --- | --- |
| Web | http://localhost:3000 |
| API | http://localhost:4000 |
| Health | http://localhost:4000/api/health |
| Mailpit | http://localhost:8025 |
| Mongo | mongodb://localhost:27017/gym?replicaSet=rs0 |

Stripe webhooks:

```bash
stripe login
npm run stripe:listen
# forwards to http://localhost:4000/api/webhooks/stripe
```

Use Stripe test cards (`4242 4242 4242 4242`) and the CLI's webhook secret in
`.env` (`STRIPE_WEBHOOK_SECRET`). Restart the API after changing env vars.

### npm workspace commands

```bash
npm run dev -w @gym/api
npm run dev -w @gym/web
npm run worker:dev -w @gym/api
npm test -w @gym/api
npm run test:integration -w @gym/api
npm run build -w @gym/shared
```

Root scripts use `concurrently` for `dev`; it works on Windows. Use `cross-env`
for env vars and `rimraf` for cleanup.

## Environment variables

Backend (`backend/.env`):

| Variable | Example / notes |
| --- | --- |
| `NODE_ENV` | `development` |
| `PORT` | `4000` |
| `API_URL` | `http://localhost:4000` |
| `WEB_URL` | `http://localhost:3000` |
| `MONGODB_URI` | `mongodb://localhost:27017/gym?replicaSet=rs0` |
| `BETTER_AUTH_SECRET` | 32+ random bytes |
| `BETTER_AUTH_URL` | `http://localhost:4000` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | OAuth credentials |
| `STRIPE_SECRET_KEY` | `sk_test_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from `stripe listen` |
| `STRIPE_SUCCESS_URL` | `http://localhost:3000/account/membership?checkout=success` |
| `STRIPE_CANCEL_URL` | `http://localhost:3000/membership?checkout=cancelled` |
| `RESEND_API_KEY` | optional in dev; Mailpit SMTP instead |
| `SMTP_HOST`, `SMTP_PORT` | `localhost`, `1025` |
| `EMAIL_FROM` | `FORGE <train@example.com>` |
| `SUPERADMIN_EMAIL` | seed only |
| `SUPERADMIN_TEMP_PASSWORD` | seed only, force change |
| `SENTRY_DSN` | optional in dev |
| `CORS_ORIGIN` | `http://localhost:3000` |

Frontend (`frontend/.env.local`):

| Variable | Example |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | only if using Stripe.js directly; Checkout redirect does not need it |
| `NEXT_PUBLIC_SENTRY_DSN` | optional |

Production overrides: custom domains, live Stripe keys, verified Resend domain,
`NODE_ENV=production`, `Secure` cookies, Atlas URI with TLS. Validate all at
boot with Zod; never log values.

## Deployment runbook

### 1. Provision

- **MongoDB Atlas:** M10+ project per environment, database user with
  readWrite on the app DB, IP allowlist for API egress, continuous backups,
  alerts. Copy the SRV URI.
- **Railway/Fly API:** create the service from `backend/Dockerfile`; set env;
  health check `/api/health`; one instance to start; release command
  `npm run db:migrate -w @gym/api` (or an equivalent compiled command).
- **Worker:** same image, start command `npm run start:worker -w @gym/api`,
  exactly one replica.
- **Vercel web:** import `frontend/`, set env, build `npm run build -w @gym/web`
  (or root build with the workspace filter), framework Next.js.
- **Domains:** `app.example.com` → Vercel; `api.example.com` → Railway/Fly.
  Use custom domains, not provider preview hostnames, for auth.
- **Resend:** verify the sending domain (SPF/DKIM/DMARC); set `EMAIL_FROM`.
- **Stripe:** create products/prices in test, run the seed script, configure the
  webhook endpoint and events, copy the signing secret. Repeat in live only
  after the test-mode E2E passes.

### 2. Release order

1. Run migrations against the target DB (backup/snapshot first).
2. Deploy the API; wait for health.
3. Deploy the worker (one replica).
4. Deploy the web app.
5. Run smoke tests (below).
6. Watch errors/webhook failures for 30 minutes.

Migrations are backward-compatible for one release (expand/contract) so the
previous API can run during a rolling deploy.

### 3. Production seed

```bash
npm run db:seed -w @gym/api          # location, plans, packs, settings
npm run seed:superadmin -w @gym/api  # reads env, forces password + 2FA
```

Never run the demo seed in production. Seed scripts are idempotent and refuse
to overwrite existing plans/prices silently.

### 4. Stripe setup

- Products: Floor Access, Unlimited, Private Coaching; packs 5/10/20; drop-in.
- Prices: recurring monthly for plans; one-time for packs/drop-in.
- Webhook events: `checkout.session.completed`,
  `customer.subscription.created|updated|deleted`, `invoice.paid`,
  `invoice.payment_failed`, `charge.refunded`.
- Customer Portal: enable payment method update, invoice history, cancellation;
  configure cancellation policy (at period end).
- Test the full flow with `4242 4242 4242 4242`, then a declined card, then a
  refund in test mode.

### 5. DNS, cookies and OAuth

- `A/CNAME` for `app` and `api`; TLS via the platform.
- Cookie domain `.example.com`; `SameSite=Lax`; `Secure`; `HttpOnly`.
- CORS allowlist exactly `https://app.example.com` (plus localhost in dev).
- Google OAuth redirect: `https://api.example.com/api/auth/callback/google`.
- Set `BETTER_AUTH_URL=https://api.example.com`, `WEB_URL=https://app.example.com`.
- Verify cookies in DevTools: no `document.cookie` access, correct domain,
  `Secure`, no CORS errors.

### 6. Smoke tests

- [ ] `GET /api/health` → ok/db ok.
- [ ] Marketing home, schedule, plans, coaches load with correct metadata.
- [ ] Sign up → verify email → login.
- [ ] Buy a pack with a test card → webhook grants credits exactly once.
- [ ] Book a class → appears in account → cancel before cutoff.
- [ ] Superadmin login → 2FA → invite admin → accept → 2FA → dashboard.
- [ ] Create class → coach roster → mark attendance.
- [ ] Audit log shows the privileged actions.
- [ ] Billing portal opens; cancellation sets period-end.
- [ ] Stripe webhook replay does not duplicate credits.
- [ ] 404/403 pages behave; no stack traces.

## Monitoring and alerts

| Signal | Tool | Alert |
| --- | --- | --- |
| API 5xx rate | Sentry/Railway | >1% for 5 min |
| p95 latency | Railway/metrics | >500 ms for 10 min |
| Webhook failures | `stripeEvents` count | any `failed` >5 min |
| Outbox backlog | `outboxEvents` pending | >50 or oldest >10 min |
| Booking errors | logs/metrics | `SESSION_FULL` spike, 5xx |
| DB connections/CPU | Atlas | >80% for 10 min |
| Uptime | external check | 2 consecutive failures |
| Payment failures | Stripe/Sentry | daily summary |
| Reconciliation drift | job report | any unexplained mismatch |

Dashboards: request rate/latency/errors, booking success/waitlist, webhook
status, outbox lag, active memberships, revenue snapshot. Keep PII out.

## Backups and recovery

- Atlas continuous backups + daily snapshots; retention per plan.
- Test restore quarterly into a staging cluster; run migrations + smoke tests;
  record time in the runbook.
- Export audit logs monthly to encrypted storage (or retain per policy).
- Stripe data is external; keep the local mirror for support.
- Document RPO/RTO; for v1 target RPO ≤15 min, RTO ≤4 h.
- Never restore over production without a change freeze and a second approval.

## Rollback

1. Web: promote the previous Vercel deployment.
2. API/worker: redeploy the previous image; keep env vars compatible.
3. DB: forward-only; if a migration is destructive, use the expand/contract
   rollback plan (restore snapshot only as a last resort).
4. Stripe: do not delete events; replay from the dashboard after rollback.
5. Communicate: status page/email if members are affected; write a postmortem.

## Cost sketch (monthly, USD, approximate)

| Item | Dev | Production |
| --- | --- | --- |
| Atlas | M0 free / M10 ~$60 | M10+ ~$60–120 |
| Railway API + worker | ~$5–15 | ~$20–40 |
| Vercel | Hobby free | Pro ~$20 |
| Resend | free tier | ~$20 |
| Sentry | free tier | ~$26 |
| Stripe | per transaction | per transaction |
| Domain | ~$12/year | ~$12/year |

Budget alerts on Atlas/Railway/Vercel. The stack is intentionally low-ops; add
Redis only if rate limits/queues outgrow a single instance.

## Launch checklist

- [ ] All phase gates passed; risk register reviewed.
- [ ] Production env validated; secrets set and rotated from defaults.
- [ ] Migrations + indexes applied; seed idempotent.
- [ ] Backups enabled; restore drill done.
- [ ] Stripe live keys/webhook verified with a real test charge/refund.
- [ ] Resend domain verified; test email lands in inbox, not spam.
- [ ] Custom domains/cookies/OAuth verified.
- [ ] Sentry/alerts/uptime live; runbook linked.
- [ ] Legal pages (privacy/terms), cancellation policy, contact details.
- [ ] Accessibility and Lighthouse checks pass.
- [ ] Support inbox monitored; refund/2FA reset procedures documented.
- [ ] Incident contacts and status page ready.

## Windows notes

- Use PowerShell for commands; root npm scripts must not use `&&` with Unix-only
  tools. `concurrently`, `cross-env`, `rimraf` are cross-platform.
- Docker Desktop must use the WSL2 backend; keep the repo on the Windows
  filesystem (`D:\Project\gym`) for performance, not inside WSL.
- If `rs.initiate` fails, check that port 27017 is free and the container is
  healthy; run `docker compose logs mongo`.
- Playwright: `npx playwright install chromium` once; use `--headed` for
  debugging.
- Line endings: `.gitattributes` with `* text=auto eol=lf` for code; keep
  `.ps1` scripts CRLF if added.

## Open operational questions

- Who is on call / who approves break-glass in production?
- Refund policy and who may issue them (default: superadmin only).
- Data retention period for leads/messages and audit logs.
- Whether to enable Stripe Tax now or later.
- SMS reminders (out of scope) and calendar invites (nice-to-have).
- Brand/domain/email sender and final plan prices.
