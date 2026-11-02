# 05 — Security and Risks

## Threat model (summary)

| Asset | Why it matters | Primary threats |
| --- | --- | --- |
| Member PII | Names, emails, phones, attendance | IDOR, over-broad admin access, log leaks |
| Payment state | Entitlements, credits, revenue | Price tampering, webhook replay, race conditions |
| Class capacity | Fairness, safety, refunds | Oversell, double-booking, scripted hoarding |
| Admin accounts | Full operational control | Phishing, credential stuffing, privilege escalation |
| Audit trail | Accountability, incident response | Tampering, deletion, missing context |
| Availability | Bookings, check-in, payments | Abuse, runaway jobs, Mongo/Stripe outages |

Trust boundaries: browser → Next.js → Express → MongoDB/Stripe/Resend. The
browser is untrusted; Next.js is a presentation layer; **Express is the only
authorization boundary**. Stripe and Resend are external services authenticated
by signatures/secrets. Staff are trusted only within their role.

## Risk register

| # | Risk | Impact | Likelihood | Mitigation | Phase | Test |
| --- | --- | --- | --- | --- | --- | --- |
| R1 | Webhook replay/double grant | High | High | Unique `eventId`, claim/lock, transaction, ledger unique keys | 3 | Replay 3× → one grant |
| R2 | Booking oversell / double-book | High | High | Transaction + conditional counter + partial unique index | 2 | 20 parallel requests, 1 spot |
| R3 | Timezone/DST wrong session times | High | Medium | UTC storage + IANA zone + Temporal/Luxon; DST tests | 2 | Spring/fall tests |
| R4 | Admin privilege escalation | Critical | Medium | Server RBAC, deny-by-default, no role mass assignment, 2FA, last-superadmin, session revocation, audit | 1/4 | Role × route matrix |
| R5 | Price tampering | High | Medium | Server-side plan/price resolution; Stripe Price IDs only | 3 | Client-sent amount ignored |
| R6 | Credit double-spend | High | Medium | Transactional conditional decrement + unique ledger `{bookingId,reason}` | 2/3 | Concurrent consume test |
| R7 | Session/cookie theft or CSRF | High | Medium | HttpOnly/Secure/SameSite, CORS allowlist, origin checks, short privileged sessions | 1 | Cookie/CSRF tests |
| R8 | Invite token abuse | High | Medium | 32-byte token, SHA-256 hash, single-use, 48h expiry, bound email, rate limit | 1 | Expired/reused/wrong email |
| R9 | Audit log tampering | High | Low | Append-only API, DB role denies update/delete, exports | 1/4 | No update/delete route |
| R10 | PII in logs/Sentry | High | Medium | Redaction, scrubbing, no email bodies/tokens/cards | 1/5 | Log review |
| R11 | Spam/abuse on public forms | Medium | High | Rate limits, honeypot, Turnstile, size caps | 3/5 | 429 + challenge |
| R12 | Stripe state drift | High | Medium | Webhook + nightly reconcile + admin alert | 3/5 | Synthetic drift test |
| R13 | Outbox duplicate/lost email | Medium | Medium | Transactional outbox, atomic claim, one worker, retries | 2 | Worker crash test |
| R14 | Counter drift | Medium | Medium | Nightly recompute + alert | 2 | Seed drift, repair |
| R15 | Dependency/supply chain | High | Low | Lockfile, `npm audit`, Dependabot, no postinstall scripts from unknown packages | 0/5 | CI audit |
| R16 | Deployment config error | High | Medium | Zod env validation, smoke tests, migrations in release, rollback | 5 | Staging deploy |
| R17 | Backup/restore failure | Critical | Low | Atlas continuous backup, quarterly restore drill | 5 | Timed restore |
| R18 | Scope creep | High | High | Phase gates, cut lines, explicit out-of-scope | all | Gate review |

## R1 — Webhook idempotency

**Failure modes:** Stripe retries the same event; two API instances process it
concurrently; events arrive out of order; a handler succeeds but the response is
lost; a partial write grants credits without a payment row.

**Design:**
1. Raw body on the webhook route only; verify `Stripe-Signature` with the
   endpoint secret. Reject invalid signatures with 400.
2. Insert `stripeEvents` with unique `eventId`. Duplicate `processed` → 200.
3. Atomically claim `received|failed → processing` with `lockedAt`; stale locks
   (>5 min) are reclaimable.
4. Process the business change in a Mongo transaction. Use unique keys:
   `creditPurchases.stripeCheckoutSessionId`, `payments.stripePaymentIntentId`,
   `memberships.stripeSubscriptionId`, `creditLedger {bookingId, reason}`.
5. Mark `processed` in the same transaction or immediately after. On transient
   failure, mark `failed`, return 500, let Stripe retry.
6. For subscription updates, fetch the current subscription from Stripe or
   compare period/`event.created`; never regress `active` to `canceled` because
   an old event arrived late.
7. Nightly reconciliation compares Stripe subscriptions/payments with local
   state and alerts on unexplained drift.

**Tests:** duplicate event; concurrent duplicate; out-of-order update; handler
throws after partial write; stale lock recovery; unknown event type → ignored.

**Never:** grant access on the success page; trust metadata prices; process an
unverified payload; store the webhook secret in the database.

## R2 — Booking race conditions

**Failure modes:** two members book the last spot; the same member double-clicks;
a cancellation promotes two people into one spot; a credit is consumed but the
booking insert fails.

**Design:**
- One transaction for: entitlement check, conditional `bookedCount` increment,
  booking insert, credit consumption, outbox write.
- Conditional update: `{_id, status:"scheduled", $expr:{$lt:["$bookedCount","$capacity"]}}`
  with `$inc`. If it returns null, the session is full/cancelled.
- Partial unique index `{sessionId, memberId}` where `active:true` for duplicate
  protection, independent of application checks.
- Waitlist promotion in the same transaction as cancellation; if the conditional
  capacity update fails, leave the entry waitlisted.
- Retry `TransientTransactionError` up to 3 times with jitter; surface a clean
  409 after that.
- Nightly reconcile counters from bookings; alert on any drift.

**Tests:** 20 parallel requests for 1 spot → exactly 1 booked, 19 waitlisted (or
409 if waitlist disabled); same member twice → 1 booking; cancel + promote
concurrently → no oversell; credit consume failure rolls back the booking;
counter reconcile repairs seeded drift.

**Do not:** use `countDocuments` to decide capacity; use a Redis lock as the only
guard; insert first and decrement later; rely on UI disabling the button.

## R3 — Timezone and DST

**Failure modes:** a 06:30 class shifts to 05:30/07:30 after DST; sessions are
generated twice; cutoff is computed in the wrong zone; admin edits a template
and rewrites history.

**Design:**
- Store `startsAt`/`endsAt` as UTC instants, plus `timezone`, `localDate`,
  `localStartTime` for display/debugging.
- Use `Temporal` (`@js-temporal/polyfill`) or Luxon for all zone arithmetic.
  Never add 24h to a local time; never use `Date` setters for local math.
- Recurrence is defined in gym-local wall time; convert each occurrence to UTC.
- Idempotent generation via unique `{templateId, startsAt}`.
- Cutoff is instant math: `startsAt - cutoffHours` in UTC. The UI shows the
  cutoff in gym time.
- Tests around spring-forward and fall-back, plus a template that crosses a DST
  boundary; assert local time stays constant and UTC offset changes.
- Admin display uses the location zone, not the browser zone; label it
  ("America/Los_Angeles").

**Do not:** store local time strings as the only time; use server local time;
assume all days are 24h; regenerate sessions without an idempotency key.

## R4 — Admin privilege escalation

**Failure modes:** an admin changes their own role; a member updates `role` via
`PATCH /me`; a hidden UI route is reachable; an old session survives demotion;
the last superadmin is suspended; an invite is reused or forwarded.

**Design:**
- Deny-by-default policy map; every route declares `requireRole`/permission.
- `PATCH /me` whitelists name/phone/image only. Role/status are separate
  superadmin endpoints with strict Zod schemas.
- Only superadmin can invite/promote/demote admins. Admins may invite coaches.
- Last-superadmin guard: count active superadmins; refuse if target is the last.
- Cannot change own role; cannot suspend self.
- Revoke all sessions on role/status change; Better Auth session check on every
  request; privileged sessions shorter.
- TOTP required before admin routes; `TWO_FACTOR_REQUIRED` otherwise.
- Audit before/after with actor, IP, request ID.
- Tests iterate every role × sensitive route and assert 403.

**Do not:** rely on `isAdmin` booleans; accept `role` in a generic update; trust
JWT claims without a session check; let the UI be the only guard.

## R5 — Price tampering and billing integrity

- Client sends `{planId}` or `{packId}`, never `price`/`amount`.
- Server loads the plan/product, resolves `stripePriceId`, creates Checkout.
- Verify the Stripe Price/amount in the webhook against the local plan before
  granting; log mismatches and do not grant.
- Stripe Price changes create a new Price; existing subscriptions keep theirs.
- Refunds are superadmin-only, require a reason, revoke unused credits and are
  audited.

## R6 — Credit double-spend

- Decrement inside the booking transaction with
  `findOneAndUpdate({_id, creditsRemaining:{$gt:0}}, {$inc:{creditsRemaining:-1}})`.
- Insert a ledger row unique on `{bookingId, reason:"booking"}`.
- If any step fails, the transaction aborts; no partial consumption.
- Restoration is also ledgered and idempotent (`{bookingId, reason:"cancellation"}`).
- Admin adjustments are additive ledger rows, never direct balance edits.

## R7 — Auth, sessions and CSRF

- Better Auth session cookies: `HttpOnly`, `Secure` in production,
  `SameSite=Lax`, `Path=/`, `Domain=.example.com`; 7-day member sessions,
  shorter privileged sessions if supported (otherwise 12h absolute + re-auth
  for sensitive actions in Phase 5).
- Web and API on custom subdomains of the same site. Avoid `SameSite=None`
  unless a genuine cross-site client (e.g. mobile) requires it.
- CORS: exact origin allowlist, `credentials:true`, limited methods/headers,
  no wildcard with credentials.
- CSRF: SameSite + `Origin`/`Referer` checks on state-changing requests; Better
  Auth's CSRF token where applicable. Reject requests with a missing/foreign
  origin for cookie-authenticated mutations.
- OAuth: exact redirect URIs, state/PKCE handled by Better Auth, verified email
  required, allowlist of providers.
- Password reset: 30-minute single-use token, hashed at rest, generic response,
  rate limited, invalidate other sessions on reset (optional).
- Email verification: required before booking; resend limited.
- Login throttling: per IP + per account, exponential backoff, no account
  enumeration.
- Session revocation helper called on suspend/demote/delete/password reset.
- Sensitive actions (role change, refund, 2FA reset) require a recent login or
  TOTP step-up in Phase 5.

## R8 — Invites and privileged onboarding

- 32-byte random token, base64url; store only SHA-256 hash.
- 48-hour expiry; single-use atomic `pending → accepted`; bound to the invited
  email; invalidate previous pending invites for the same email.
- Accept page shows masked email + role; never leaks whether an email exists
  outside the token.
- Accept endpoint rate-limited; token comparison constant-time.
- Invited admin sets their own password; the superadmin never sees it.
- 2FA enrollment is mandatory before dashboard access; backup codes shown once.
- Resend/revoke are superadmin-only and audited.
- Break-glass: `npm run admin:reset-2fa -w @gym/api -- --email …` run on the
  server with DB access; writes an audit entry and notifies the user. Document
  who may run it and require a second approval for production.

## R9 — Audit integrity

- `auditLogs` is append-only: repository exposes `insert`/`find` only.
- No update/delete API; optional Atlas custom role denies update/delete on the
  collection for the app user.
- Every privileged mutation writes before/after (redacted), actor, role, IP,
  user agent, request ID, timestamp.
- Audit failures must not silently swallow the action: write in the same
  transaction where possible, or fail closed for role/billing changes.
- Export is superadmin-only and itself audited.
- Retention ≥ 1 year; export before purge; protect PII in exports.

## R10 — PII, privacy and logging

- Collect the minimum: name, email, phone (optional), emergency contact only if
  needed, attendance. Do not collect health data in v1.
- Redact cookies, authorization, passwords, tokens, Stripe payload secrets and
  email bodies from logs. Mask emails (`a***@example.com`) where full value is
  not needed.
- Sentry: `beforeSend` scrubs PII; disable request bodies; restrict access.
- Analytics: privacy-friendly (Plausible/Umami) or Vercel Analytics; no ad
  pixels; consent banner only if cookies require it.
- Member export/deletion: superadmin-only, audited; anonymize PII, preserve
  financial records; document retention.
- Data at rest: Atlas encryption; TLS everywhere; secrets in the platform's
  secret store, not `.env` committed.
- Backups contain PII: restrict access, encrypt, test restore, set retention.

## R11 — Abuse and rate limits

| Surface | Limit (initial) | Extra |
| --- | --- | --- |
| `POST /auth/sign-in` | 10/min/IP + 5/min/account | backoff, generic errors |
| `POST /auth/sign-up` | 5/hour/IP | Turnstile |
| `POST /public/leads`, `/contact` | 5/hour/IP | honeypot + Turnstile |
| `POST /sessions/:id/bookings` | 20/min/user | idempotency key |
| `POST /checkout/*` | 10/min/user | idempotency key |
| Invite accept | 10/hour/IP | token attempt limit |
| Credit adjustment | 30/hour/admin | audit + note |
| Webhooks | Stripe signature | no IP allowlist (Stripe ranges change) |

Use `express-rate-limit` with a shared store (Redis/Upstash) if the API scales
beyond one instance; otherwise memory is acceptable for v1 but document the
limitation. Add request size limits and a global timeout.

## R12 — Stripe drift and reconciliation

- Stripe is the source of truth for subscription/payment state.
- Nightly job pages through active subscriptions and recent payments, compares
  to local records, and writes a reconciliation report.
- Alerts: subscription active in Stripe but no local access; local active but
  Stripe canceled; payment succeeded but no credits; credits granted without a
  payment.
- Manual “Reconcile now” is superadmin-only and audited.
- Never auto-delete local records on mismatch; flag for review.

## R13 — Outbox and email

- Write outbox rows in the same transaction as the business change.
- One worker replica; atomic claim with `lockedAt`; exponential backoff; max
  attempts; dead-letter status for manual review.
- Resend idempotency keys per outbox row; tolerate duplicate sends.
- Bounce/complaint webhook adds to a suppression list; transactional emails
  still send where legally appropriate, marketing does not.
- Mailpit in dev; never send real email from tests.

## R14 — Counter drift

- `bookedCount`/`waitlistCount` are caches. Nightly recompute from `bookings`
  (`status in booked/attended` and `waitlisted`), compare, repair, and alert.
- Admin capacity edits cannot go below `bookedCount`.
- Session cancellation sets counters to zero and terminal states.
- Dashboards show a warning if reconciliation is stale.

## R15 — Dependencies and supply chain

- Commit `package-lock.json`; CI uses `npm ci`.
- `npm audit --omit=dev` and Dependabot; review transitive additions.
- Avoid packages with postinstall scripts unless justified; pin versions.
- Verify image/font licences; no copied Ironhaus assets.
- Secrets scanning in CI (e.g. gitleaks) and pre-commit if the team grows.

## R16 — Deployment and configuration

- Zod-validate env at boot; fail fast with a clear list of missing vars.
- Migrations run as a release command; never at app startup in parallel.
- Health check checks Mongo; readiness separate from liveness.
- Custom domains for cookies/OAuth; preview deployments use test keys only.
- Separate Stripe test/live keys and webhook secrets per environment.
- Feature flags for risky rollouts (billing, waitlist) if needed.
- Rollback: redeploy previous image; forward-only migrations with
  expand/contract; keep the previous env vars.

## R17 — Backups and disaster recovery

- Atlas continuous backups (M10+) with point-in-time restore; test quarterly.
- Document RPO (e.g. 15 min) and RTO (e.g. 4 h) for v1.
- Export audit logs and payment records before any destructive migration.
- Restore drill: restore to a staging cluster, run smoke tests, record time.
- Stripe remains the source for payments; Mongo loss can be rebuilt for
  financial state with reconciliation, but bookings/audit cannot.

## Break-glass procedures

1. **Superadmin locked out (2FA).** Verify identity out-of-band; run
   `npm run admin:reset-2fa -w @gym/api -- --email <email>` on the server;
   audit entry; force re-enrollment; notify.
2. **Last superadmin compromised.** Suspend the account via DB script, create a
   new superadmin from env with forced password + 2FA, revoke all sessions,
   review audit logs, rotate secrets.
3. **Stripe webhook outage.** Events retry automatically; monitor
   `stripeEvents` failed count; replay from the Stripe dashboard after deploy;
   run reconciliation.
4. **Booking counter corruption.** Freeze bookings for the affected session
   (status `cancelled` or maintenance flag), recompute from bookings, notify
   affected members, reopen.
5. **Secret leak.** Rotate auth secret, Stripe keys, Resend key, Mongo
   credentials; invalidate sessions; review logs; redeploy; disclose per policy.

All break-glass actions require two-person approval in production and an audit
entry even when performed via script.

## Security checklist (launch)

- [ ] Server-side RBAC matrix tested for every route; no client-only checks.
- [ ] 2FA enforced for all admin/superadmin accounts; recovery codes stored.
- [ ] Last-superadmin guard tested.
- [ ] Invite tokens hashed, single-use, expiring, rate-limited.
- [ ] Sessions revoked on role/status change.
- [ ] Cookies HttpOnly/Secure/SameSite; CORS exact; CSRF/origin checks.
- [ ] Prices resolved server-side; webhook signature + idempotency tested.
- [ ] Booking/credits transactional; concurrency tests pass.
- [ ] Rate limits + Turnstile on public/auth/money endpoints.
- [ ] Audit logs append-only; privileged actions covered.
- [ ] No secrets in client bundle; env validated; secrets rotated from defaults.
- [ ] Dependency audit clean; images/fonts licensed.
- [ ] Backups enabled; restore drill passed.
- [ ] Sentry/log redaction verified; no PII.
- [ ] Security headers/CSP; HTTPS/HSTS; no directory listing.
- [ ] Runbook and incident contacts documented.
