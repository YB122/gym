# Phase 4 — Dashboards and Operations

You are implementing Phase 4. Give coaches, admins and the superadmin the tools
to run the gym, and finish the public marketing site.

## Read first

1. `AGENTS.md`
2. `docs/plan/01-stack-and-layout.md` (app map, roles, design)
3. `docs/plan/03-api-surface.md` (admin, coach, superadmin endpoints)
4. `docs/plan/02-domain-model.md` (leads, audit, settings, credits)
5. `docs/plan/05-security-and-risks.md` (R4, R9, R10)
6. `docs/plan/04-milestones.md` (Phase 4)
7. `docs/plan/00-reference-review.md` (visual language, content gaps)
8. This file

## Goal

Each role can do its job through the UI, the API enforces every boundary, and a
superadmin can audit, configure and reconcile the system.

## Deliverables

### Dashboard shell

- Role-aware nav: coach (today/own sessions), admin (members, schedule, classes,
  leads, coaches), superadmin (team, billing, audit, settings).
- `/dashboard` overview: today's sessions, bookings, waitlist, new leads,
  membership/payment snapshot (role-scoped).
- 403 page for disallowed routes; no data flash before role resolution.
- Loading skeletons, empty states, error boundaries, mobile layout.

### Admin

- Members: search/paginate (email/name), detail (profile, membership, credits,
  bookings, notes), status, credit adjustment with note, audit.
  Never expose role editing here, and do not show payment amounts to admins.
- Schedule/classes: templates CRUD, one-off sessions, capacity edits (not below
  booked), cancel session with reason, roster, attendance, waitlist.
- Leads: list/filter, status, assignment, notes; convert to member (invite
  account + note). Contact inbox.
- Coaches: profiles, photo (R2 presigned upload or URL), credentials, coach
  invite, deactivate. Audit.

### Coach

- `/coach` or `/dashboard` coach view: own sessions, roster, mark
  attended/no-show/check-in.
- 404/403 for another coach's session; no billing/contact/email data.

### Superadmin

- Team: invite/resend/revoke, suspend/demote/promote, last-superadmin guard,
  reset 2FA, session revocation. All audited.
- Audit log viewer: filters (actor, action, entity, date), cursor pagination,
  export CSV (audited). No edit/delete.
- Settings: cutoff, booking window, horizon, waitlist, max bookings, grace,
  support/from email. Audited. No secrets.
- Billing: plans/prices, payments, refunds (with reason), reconcile trigger,
  drift report.
- Member export/delete (anonymize PII, preserve financial records), audited.

### Marketing and SEO

- Home, classes, membership, coaches, contact, free-week: original copy and
  assets, dark/lime industrial system, responsive, motion with
  `prefers-reduced-motion`.
- `generateMetadata`, canonical URLs, OG images, sitemap, robots, JSON-LD
  `HealthClub`/`SportsActivityLocation` with address/hours.
- Hero media optimized (poster, lazy, no layout shift); Lighthouse performance
  and SEO ≥ 90.
- Accessibility: keyboard modals, focus, labels, contrast, skip link; axe clean
  on key pages.

### Uploads (if used)

- R2 presigned upload endpoint (admin/superadmin only), content-type/size
  limits, random keys; store URL on coach/template. No arbitrary file proxy.

## Constraints

- UI role checks are convenience only; every API route enforces RBAC.
- Do not let admins access team/billing/settings/audit/export endpoints.
- Do not expose member email/phone to coaches by default.
- Do not add QR check-in or occupancy in this phase (Phase 5 stretch).
- Do not copy Ironhaus assets/copy/testimonials.
- Do not commit/push unless asked.

## Tests

- RBAC matrix for every admin/coach/superadmin route (200/403/401).
- Coach own vs another coach's roster; member blocked.
- Admin blocked from team, billing settings, audit, export, refunds.
- Last-superadmin guard via UI/API.
- Audit entry for every privileged mutation; audit API read-only.
- Member credit adjustment transactional + ledger + audit.
- Lead conversion creates invite/account and note.
- Settings validation and audit.
- Marketing metadata/JSON-LD/sitemap tests; axe on home/classes/membership.
- Upload validation (type/size) if implemented.

## Definition of Done

All Phase 4 items in `04-milestones.md` and the AGENTS.md checklist. Demo:
admin creates a class, coach marks attendance, admin adjusts credits, superadmin
invites an admin and sees the audit entries; marketing pages look production-ready.

## Out of scope

QR check-in/occupancy, SMS, multi-location, private 1:1 self-booking, gift
cards/referrals, advanced analytics.

## Report

Use the AGENTS.md format. Suggested commit:
`feat(phase-4): dashboards, operations and marketing polish`.
