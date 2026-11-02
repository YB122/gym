# Gym Platform — Build Plan

Status: **draft for approval** · Prepared 2026-10-30 · Working brand: **FORGE Strength Club**

A production-grade gym platform for one location: marketing site, member portal,
class booking with waitlist, Stripe subscriptions and packs, and a role-based
staff dashboard. Built with Next.js (App Router), Express, MongoDB and TypeScript
in an npm workspace with separate `frontend/` and `backend/` folders.

## Decisions from the requirements grilling

| # | Question | Decision |
| --- | --- | --- |
| 1 | Scope | **Full platform + member portal.** Marketing, accounts, dated class booking with waitlist, Stripe billing, member portal, coach/admin/superadmin dashboard. |
| 4 | Architecture | **Separate folders:** `frontend/` (Next.js) and `backend/` (Express), plus `packages/shared` for Zod contracts. npm workspaces, no Turborepo. |
| 9 | Billing | **Stripe subscriptions + class packs/drop-ins**, with an idempotent webhook module. |
| 15 | Delivery | Plan first (this document set). Solo, phased, 6-week target with a 4-week MVP cut line. |
| 11 | Database | **MongoDB** (Atlas in production, single-node replica set in dev), Mongoose, `migrate-mongo`. |
| 7 | Roles | `superadmin`, `admin`, `coach`, `member`. |
| 12 | Auth | **Better Auth** with MongoDB sessions, httpOnly cookies, email/password + Google, TOTP 2FA for privileged accounts. |
| 13 | API shape | Express feature modules, controller/service/repository, Helmet, rate limits, centralized errors. |
| 18 | Design | Tailwind + shadcn/ui, original dark/lime industrial system inspired by the reference. |

All other grilling defaults are accepted. The reference site was rendered and
reviewed in `00-reference-review.md`; it is a marketing + lead-capture SPA, not
a platform, and several of its backend patterns are anti-patterns we will not copy.

## Scope

**In scope**

- Public marketing site: home, schedule, membership, coaches, contact, free-week lead.
- Accounts: email/password, Google, verification, password reset, sessions.
- Dated class sessions generated from recurring templates, capacity, waitlist,
  auto-promotion, 12-hour cancellation cutoff, attendance.
- Memberships: recurring plans, class packs, drop-ins, credits, billing portal.
- Member portal: bookings, waitlist position, membership, credits, notifications.
- Staff dashboard: coach rosters/attendance, admin classes/members/leads/coaches,
  superadmin team, billing, settings and audit log.
- Security: RBAC, TOTP 2FA, invite-only admins, last-superadmin guard,
  append-only audit log, rate limits, idempotency.
- Ops: Docker Compose, migrations, seeds, CI, Sentry, backups, deploy runbook.

**Out of scope (v1)**

POS, turnstiles/access-control hardware, payroll, native mobile app, SMS,
multi-location UI, family/corporate accounts, late-cancel fees, live-streamed
classes, custom invoicing, referral/gift-card programs. QR check-in and live
occupancy are a stretch goal in Phase 5.

## Non-negotiable product rules

- One location now, but every location-scoped document carries `locationId`.
- Sessions store UTC instants plus the location's IANA timezone; display in gym time.
- Booking is a Mongo transaction with conditional capacity updates and unique indexes.
- Prices live in the database/Stripe; the client only sends plan/pack IDs.
- Admin and superadmin accounts require TOTP 2FA. Only a superadmin manages admins.
- The last active superadmin can never be suspended, demoted or deleted.
- Every privileged action is audited. Audit logs are append-only.
- Stripe webhooks are verified, idempotent and the only source of payment truth.
- Marketing pages are server-rendered for SEO; member data is client-fetched.

## Timeline at a glance

| Phase | Focus | Estimate | Gate |
| --- | --- | --- | --- |
| 0 | Scaffolding, Docker, CI, health check | 2–3 days | `npm run dev` runs all; CI green |
| 1 | Auth, RBAC, 2FA, superadmin, invites, audit | 4 days | Invite + 2FA + 403 matrix pass |
| 2 | Templates, sessions, booking, waitlist, cancellation | 7 days | Concurrent last-spot test passes |
| 3 | Stripe subscriptions, packs, credits, webhooks | 7 days | Replayed webhook grants once |
| 4 | Dashboards, members, coaches, leads, attendance | 7 days | Every role sees only its scope |
| 5 | Hardening, E2E, deploy, check-in stretch | 4–5 days | Production smoke test + restore drill |

Total: ~6 focused weeks (7–8 weeks part-time or learning the stack). A 4-week
cut line is defined in `04-milestones.md`; the non-negotiable security and
concurrency tests are never cut.

## Documents

| File | Contents |
| --- | --- |
| `00-reference-review.md` | Live review of Ironhaus: pages, stack, schema, design system, anti-patterns |
| `01-stack-and-layout.md` | Final stack, architecture, repo layout, app map, environments, deploy topology |
| `02-domain-model.md` | Collections, embedded vs referenced, indexes, state machines, booking/credit/timezone rules |
| `03-api-surface.md` | REST conventions, endpoint tables, permission matrix, key flows, OpenAPI |
| `04-milestones.md` | Phase-by-phase deliverables, acceptance criteria, cut lines, cadence |
| `05-security-and-risks.md` | Threat model, risk register, webhook/booking/timezone/privilege mitigations, break-glass |
| `06-testing-and-operations.md` | Test strategy, CI, local dev, deploy/runbook, monitoring, backups |
| `prompts/phase-0.md` … `phase-5.md` | Ready-to-paste OpenCode prompts |
| `../AGENTS.md` | Repo contract for every agent session |

## Assumptions to confirm (none block Phase 0)

- Brand name, logo, domain and final copy; plan prices and pack sizes; real
  address/hours; photo/video assets with licences.
- Stripe account and Google OAuth credentials; sending domain for Resend.
- Free week is a **lead** (name/email/phone/goal) that an admin converts, not an
  auto-provisioned trial membership. This matches the reference and avoids
  payment-method requirements.
- Private Coaching includes unlimited classes plus four 1:1 sessions arranged
  manually by a coach in v1; 1:1 self-booking is out of scope.
- Class capacity default 16; booking window 14 days; schedule generated 8 weeks
  ahead; cancellation cutoff 12 hours; waitlist auto-promotes.
- One admin may invite coaches; only a superadmin may invite/promote admins.
- Email only (Resend); no SMS.

## Next step

1. Review this plan and the risk register.
2. Confirm or override the assumptions above.
3. Start a fresh OpenCode session in plan mode, paste
   `docs/plan/prompts/phase-0.md`, approve the plan, then switch to build mode.
4. One phase per session. Do not skip the phase gate.
