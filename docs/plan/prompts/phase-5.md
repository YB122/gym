# Phase 5 — Hardening, E2E and Launch

You are implementing Phase 5. Harden the platform, prove the critical journeys,
deploy to production and leave an operational runbook. No new product features
except the optional QR check-in stretch.

## Read first

1. `AGENTS.md`
2. `docs/plan/05-security-and-risks.md` (risk register, break-glass, checklist)
3. `docs/plan/06-testing-and-operations.md` (tests, CI, deploy, monitoring)
4. `docs/plan/04-milestones.md` (Phase 5, cut lines)
5. `docs/plan/03-api-surface.md` (webhooks, health, docs)
6. This file

## Goal

A production-like deployment passes the three E2E journeys, security checklist,
backup restore and smoke tests; the runbook is complete.

## Deliverables

### Hardening

- Finalize rate limits (auth, leads, booking, checkout, invites, credits) with a
  shared store if multiple API instances; add Turnstile/honeypot to public forms.
- CORS exact allowlist, CSRF/origin checks, Helmet, CSP (Next.js nonce for
  Stripe/Google as needed), HSTS, body/time limits.
- Sentry web + API with release tags, source maps, PII scrubbing; pino redaction
  review; request IDs surfaced.
- `npm audit --omit=dev` clean of high/critical; dependency/licence review.
- Session hardening: short privileged sessions or step-up for role/refund/2FA
  reset; verify cookie flags on custom domains.
- Audit retained and append-only; DB user permissions deny update/delete if
  feasible; export tested.
- Data retention jobs: Stripe payloads, leads/messages, audit export; member
  export/deletion tested.

### Tests

- Playwright E2E (against a seeded test env, Stripe test mode):
  1. signup → verify email → buy pack → book → cancel;
  2. subscribe → webhook → book → portal cancel at period end;
  3. superadmin invite → accept + TOTP → create session → coach attendance →
     audit entry.
- Load test booking last-spot concurrency; assert zero oversell and p95 within
  target (e.g. <500 ms API at expected load).
- Full RBAC matrix, webhook replay, invite, last-superadmin, credit double-spend
  suites run in CI/nightly.
- axe checks on marketing, booking, dashboard; fix serious/critical.
- Manual test matrix: Safari/iOS, Chrome/Android, keyboard-only, reduced motion.

### Deploy

- Provision Atlas M10+, Railway/Fly API + worker, Vercel web, custom domains.
- Set env vars, secrets, CORS, cookies, Google OAuth callback, Resend domain
  (SPF/DKIM/DMARC), Stripe live webhook.
- Run migrations + production seed (location, plans, superadmin only).
- Verify health, signup/verify, booking, test checkout (live mode with a real
  low-value charge/refund), invite, 2FA, audit, portal.
- Configure Sentry, uptime check, alerts, budget alerts.
- Backups enabled; restore drill into staging with migrations + smoke tests.
- Write `docs/runbook.md`: deploy, rollback, rotate secrets, reset 2FA, replay
  webhook, reconcile Stripe, restore DB, incident checklist, contacts.
- Update `README.md` and `docs/plan/progress.md`.

### Optional stretch — QR check-in + occupancy

Only if all gates above pass and time remains:
- Short-lived signed QR token in member account.
- Coach/admin scanner page (camera or manual code) → `checkIns`.
- Live occupancy counter per location with atomic increments + nightly
  reconcile.
- Feature-flagged; no access-control hardware integration.

## Constraints

- Do not launch with failing concurrency/webhook/RBAC tests.
- Do not use live Stripe keys in preview/dev.
- Do not put secrets in the web bundle; verify `NEXT_PUBLIC_*` only.
- Do not skip the restore drill or the E2E journeys.
- Do not add POS, payroll, turnstiles, SMS, multi-location or late-cancel fees.
- Do not commit/push/deploy unless the user explicitly asks.

## Definition of Done

All Phase 5 items in `04-milestones.md`, the AGENTS.md checklist and the launch
checklist in `06-testing-and-operations.md`. Demo: production URL, three E2E
videos/traces, restore drill timing, reconciliation report, runbook.

## Report

Use the AGENTS.md format. Include deployment URLs, smoke results, known risks,
rollback steps and suggested commit `chore(phase-5): harden and launch`.
