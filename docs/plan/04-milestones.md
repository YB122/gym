# 04 — Milestones

One phase per OpenCode session. Each phase ends with a demo, a gate and a
short report. Do not start the next phase until the gate passes.

| Phase | Estimate | Outcome | Gate |
| --- | --- | --- | --- |
| 0 | 2–3 days | Monorepo, Docker, CI, health check | `npm run dev` + CI green |
| 1 | 4 days | Auth, RBAC, 2FA, superadmin, invites, audit | Invite + 403 matrix pass |
| 2 | 7 days | Schedule, booking, waitlist, cancellation | Concurrency test passes |
| 3 | 7 days | Stripe subscriptions, packs, credits, webhooks | Replay grants once |
| 4 | 7 days | Dashboards, members, coaches, leads, attendance | Role scoping verified |
| 5 | 4–5 days | Hardening, E2E, deploy, check-in stretch | Prod smoke + restore drill |

## Phase 0 — Scaffolding

**Goal:** a clean, runnable skeleton with guardrails.

Deliverables:
- Root `package.json` with `"workspaces": ["frontend","backend","packages/*"]`
  and `package-lock.json`; `frontend/`, `backend/`, `packages/shared/`;
  TypeScript strict, ESLint flat config, Prettier.
- Next.js App Router shell with marketing/auth/member/dashboard route groups
  and a placeholder home page using the design tokens.
- Express app with `/api/health` (DB ping), Helmet, CORS allowlist, pino,
  request IDs, centralized error handler, Zod env validation.
- `docker-compose.yml`: MongoDB single-node replica set (`rs0`) + Mailpit.
- `migrate-mongo` config and an empty migration; seed script skeleton.
- Root scripts: `dev`, `build`, `lint`, `typecheck`, `test`,
  `test:integration`, `db:up`, `db:down`, `db:init`, `db:migrate`, `db:seed`.
- `.env.example` with every variable and safe local defaults; `.gitignore`.
- GitHub Actions: install, lint, typecheck, unit, integration (Mongo service),
  build. Cache npm (`setup-node` with `cache: npm`).
- `README.md` quick start; `AGENTS.md` already present.
- `git init` and an initial commit (only if the user asks; otherwise stage).

Acceptance criteria:
- `npm install && npm run db:up && npm run db:init && npm run db:migrate && npm run dev`
  starts web, API and worker on Windows and macOS.
- `GET /api/health` returns `{status:"ok", db:"ok"}`.
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` pass.
- CI is green on the initial commit.
- No secrets committed; `.env` ignored.

Tests: one API health integration test; one shared schema unit test; one
Playwright smoke test that the home page renders.

Demo: open the home shell, hit health, show CI.

## Phase 1 — Auth, roles and the superadmin

**Goal:** only the right people get in, and every privileged action is traceable.

Deliverables:
- Better Auth with MongoDB adapter, email/password + Google, email verification,
  password reset, session cookies; Resend + Mailpit templates.
- `users` role/status fields; `requireAuth`, `requireRole`, `requirePermission`,
  `requirePrivileged2FA`, `requirePasswordChanged` middleware; centralized
  policy map in `packages/shared`.
- Seed script for the first superadmin from `SUPERADMIN_EMAIL` and
  `SUPERADMIN_TEMP_PASSWORD`; force password change; force TOTP enrollment.
- TOTP 2FA + hashed backup codes; login challenge; enrollment page; break-glass
  reset script (`admin:reset-2fa`) with audit.
- Admin invite model + single-use hashed token + Resend email + accept page;
  superadmin team API/UI (list, invite, resend, revoke, suspend, demote).
- Last-superadmin guard; session revocation on role/status change.
- Append-only `auditLogs` + audit service; write `auth.login` for privileged
  accounts, invite/role/status changes, 2FA reset.
- Auth pages: login, signup, verify, forgot/reset, accept invite, change
  password, dashboard 2FA setup. Dashboard shell with role-aware nav.
- Tests: invite expiry/reuse/wrong email; 2FA gate; 403 matrix for all roles;
  last-superadmin; session revocation; password reset.

Acceptance criteria:
- A seeded superadmin logs in, changes password, enrolls TOTP, invites an admin.
- The invited admin sets their own password, enrolls TOTP and reaches
  `/dashboard`.
- An admin cannot invite/promote another admin; a member cannot access any
  `/admin/*` route (403 from the API, not just hidden UI).
- Suspending a user invalidates their existing session immediately.
- The last superadmin cannot be demoted/suspended.
- `auditLogs` contains the invite/role/status entries with actor and request ID.

Out of scope: class/member CRUD, Stripe, coach rosters.

## Phase 2 — Schedule and booking

**Goal:** real dated sessions, correct capacity under concurrency, waitlist and
cancellation.

Deliverables:
- Location seed + timezone utilities (`Temporal`/Luxon) in shared; DST tests.
- `classTemplates` CRUD (admin API + UI) and one-off sessions.
- Session generator (8 weeks, idempotent, nightly job + on template change).
- Public schedule endpoint + `/classes` page: date filters, capacity badges,
  coach, time, waitlist state; SSR shell + client filters.
- Member booking API with transaction, conditional capacity, unique index,
  entitlement check (unlimited + admin-granted credits now; Stripe purchases
  arrive in Phase 3), idempotency key, waitlist position.
- Waitlist join/promotion/expiry; cancellation with 12h cutoff; promotion
  grace; session cancel by gym; credit restoration hooks (no Stripe yet).
- Member portal bookings page: upcoming/past, cancel, waitlist position.
- Email/notification outbox for booking, waitlist, promotion, cancellation,
  session cancellation. Worker process.
- Admin schedule/roster UI: week view, create/cancel session, roster, attendance.
- Tests: 10 parallel requests for 1 spot → exactly 1 booked + 9 waitlisted;
  duplicate booking; cutoff boundary; waitlist order/promotion; DST generation;
  session cancellation; roster permissions.

Acceptance criteria:
- The public schedule shows real dates in gym time, not weekly strings.
- The last spot cannot be oversold under concurrency.
- A cancellation promotes the oldest waitlisted member and emails them.
- A member cannot cancel inside 12 hours; staff can with a reason.
- A pack credit consumed on booking is restored on a timely cancellation
  (tested with an admin-granted credit).
- DST spring-forward/fall-back tests pass.
- Counters reconcile to zero drift in the nightly job test.

Out of scope: Stripe, real payments, admin member management, leads.

## Phase 3 — Billing, memberships and credits

**Goal:** money is server-authoritative, webhooks are idempotent, and access is
granted exactly once.

Deliverables:
- Seed Stripe products/prices for the three plans and three packs/drop-in;
  store IDs on `membershipPlans` and `packProducts`; script is idempotent and
  refuses to run against live mode without an explicit flag.
- Checkout endpoints: subscription, pack, drop-in. Server resolves prices,
  creates/reuses a Stripe customer, sets metadata, returns the hosted URL.
- Billing Portal endpoint for payment method, invoices, cancellation.
- `stripeEvents` inbox, raw-body signature verification, unique event id,
  claim/lock/retry, transaction processing; duplicate and out-of-order tests.
- Webhook handlers: checkout completed, subscription created/updated/deleted,
  invoice paid/failed, charge refunded. Update membership/payment/credits.
- Entitlement service wired into booking: unlimited membership, pack credits,
  drop-in credits, past-due grace, canceled access until period end.
- Credit ledger + expiry job + admin adjustment API (audited).
- Member billing UI: plans/packs, checkout success polling, membership status,
  renewal date, portal button, credit balances/ledger.
- Superadmin billing read models: plans, prices, payments, subscription status.
- Emails: receipt, payment failed, membership canceled, credits granted.
- Tests: checkout price cannot be tampered; duplicate `checkout.session.completed`
  grants once; out-of-order subscription events don't regress state; failed
  payment sets past_due + grace; cancellation at period end retains access;
  credit double-spend blocked; refund revokes unused credits.

Acceptance criteria:
- A test-mode subscription activates access only after the webhook; the success
  page alone never grants access.
- Replaying the same webhook 3 times leaves exactly one membership/credit grant.
- A pack purchase grants the right credits once; booking consumes one; timely
  cancellation restores it; late cancellation does not.
- A member with no entitlement gets 403 `NO_ENTITLEMENT` and a clear upgrade CTA.
- Billing Portal cancellation sets `cancelAtPeriodEnd`; access survives to
  `accessUntil`.
- `npm run test:integration -w @gym/api` covers the webhook/concurrency suites.

Out of scope: refunds UI beyond superadmin, dunning emails beyond the basics,
tax handling (Stripe Tax can be enabled later).

## Phase 4 — Dashboards and operations

**Goal:** staff can run the gym without touching the database.

Deliverables:
- Dashboard shell: role-aware nav, today's sessions, occupancy/booking stats,
  quick actions; 403 page for disallowed routes.
- Admin members: search/paginate, detail, status, notes, credit adjustments,
  booking history, membership/credit summary.
- Admin schedule/classes: templates CRUD, one-off sessions, capacity edits,
  cancel session, roster, attendance, waitlist view.
- Coach view: own sessions, roster, attendance; no member billing/contact data.
- Leads inbox: free-week/contact, status, assignment, notes; convert to member
  (create account invite + optional trial note).
- Coaches: profiles, photo, credentials, coach invites, deactivate.
- Superadmin: team page (invite/resend/revoke/suspend/demote, last-superadmin
  guard, reset 2FA), audit log viewer/export, settings, billing plans/payments,
  reconciliation trigger, member export/deletion.
- Public marketing polish: home, schedule, membership, coaches, contact,
  free-week; original copy/assets; SEO metadata, JSON-LD, sitemap, robots, OG.
- Accessibility pass: keyboard modal, focus, contrast, labels, reduced motion.
- Tests: RBAC matrix for every admin/coach route; audit entries for each
  privileged action; lead conversion; coach cannot see another coach's roster;
  admin cannot access team/billing/settings/audit; suspension revokes sessions.

Acceptance criteria:
- Each role sees only its navigation and receives 403 from disallowed APIs.
- A coach can mark attendance for their own session and cannot open another
  coach's roster.
- An admin can create a recurring class, cancel one session, adjust credits
  with a note, and convert a lead.
- A superadmin can invite an admin, view the audit trail, change a booking rule,
  and trigger reconciliation.
- Every privileged mutation has an audit entry with actor, before/after and
  request ID.
- Lighthouse SEO/accessibility ≥ 90 on marketing pages; axe has no serious
  violations on the main flows.

Out of scope: QR check-in, live occupancy, SMS, multi-location, private-session
self-booking.

## Phase 5 — Hardening, E2E and launch

**Goal:** prove the critical paths, deploy safely, and leave an operational
runbook.

Deliverables:
- Rate limits and abuse controls finalized (auth, leads, booking, checkout,
  invites, credits); Turnstile on public forms; CORS/CSRF/security headers/CSP.
- Sentry (web + API), release tags, source maps, PII scrubbing; pino redaction;
  uptime check; alert rules.
- Playwright E2E: signup → verify → book; subscribe/pack → book → cancel;
  superadmin invites admin → accept + 2FA → manage session. Run against a
  seeded test environment; Stripe test card.
- Load test booking last-spot concurrency; verify p95 and zero oversell.
- Backup/restore drill on Atlas; document RPO/RTO; run Stripe reconciliation.
- Deployment: Vercel + Railway/Fly + Atlas; custom domains; cookies; OAuth;
  Resend domain verification (SPF/DKIM/DMARC); Stripe live webhook; secrets.
- Production seed: location, plans/prices, superadmin only; no demo members.
- Runbook: deploy, rollback, rotate secrets, reset 2FA, replay webhook,
  reconcile Stripe, restore DB, incident checklist.
- Optional stretch: QR check-in + live occupancy (only if all gates pass).
- Final security review against the risk register; dependency audit; license
  check on images/fonts.

Acceptance criteria:
- All three E2E journeys pass on a production-like environment.
- Production smoke: health, signup/verify, booking, test checkout, webhook,
  admin invite, 2FA, audit entry.
- Restore drill succeeds and is timed; reconciliation shows zero unexplained
  drift.
- No high/critical vulnerabilities in `npm audit`; no secrets in the bundle.
- Runbook is complete enough for someone else to deploy and roll back.

## Cut lines

### 4-week MVP (if time is tight)

Phases 0–3 plus a **minimal** Phase 4:

- Keep: marketing pages, auth/RBAC/2FA, superadmin invite, schedule, booking,
  waitlist, cancellation, Stripe subscriptions + packs, member portal, member
  search/detail, schedule/roster/attendance, deploy.
- Defer: coach dashboard polish, audit viewer UI (API/audit still written),
  lead pipeline beyond a simple list, private coaching display, QR check-in,
  Google OAuth (email/password first), advanced SEO/OG art.
- Never cut: booking transaction + concurrency test, webhook idempotency +
  replay test, 2FA, last-superadmin guard, server-side RBAC, audit writes,
  migrations, backups.

### 6-week target

All phases 0–4 and the non-stretch parts of Phase 5. QR check-in/occupancy only
if the launch gates are green and there is spare time.

## Phase gates

Before moving on, all must be true:

- [ ] Demo of the phase's user-visible outcome.
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, integration suite green.
- [ ] New migrations run from an empty DB and from the previous phase's DB.
- [ ] RBAC/audit tests updated for every new route.
- [ ] OpenAPI regenerated and committed.
- [ ] No new secrets, PII leaks or debug logs.
- [ ] Phase report written; risks/follow-ups listed.
- [ ] User has reviewed the demo and approved the next phase.

## Cadence

- One phase per OpenCode session; start in plan mode, get approval, then build.
- Keep a `docs/plan/progress.md` log: phase, date, commit, gate result, notes.
- Commit at each gate with `feat(phase-N): …` (only when the user asks).
- If a phase exceeds its estimate by >30%, stop and re-cut scope rather than
  silently expanding.
- Bug fixes found in a later phase go back into the owning phase's tests.

## Dependency order

`0 → 1 → 2 → 3 → 4 → 5` is the critical path. Phase 3 depends on Phase 2's
booking/credit hooks; Phase 4 depends on 1–3. Marketing polish can start in
parallel with Phase 4 once the design tokens exist, but do not block the API.
