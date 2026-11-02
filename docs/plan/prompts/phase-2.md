# Phase 2 — Schedule and Booking

You are implementing Phase 2. Build dated class sessions, transactional booking,
waitlist auto-promotion, cancellation rules and rosters.

## Read first

1. `AGENTS.md`
2. `docs/plan/02-domain-model.md` (`classTemplates`, `classSessions`, `bookings`,
   business rules, time zones, consistency jobs)
3. `docs/plan/03-api-surface.md` (public sessions, member bookings, admin
   sessions/roster, coach roster)
4. `docs/plan/05-security-and-risks.md` (R2, R3, R6, R13, R14)
5. `docs/plan/04-milestones.md` (Phase 2)
6. This file

## Goal

A member sees real dated sessions in gym time, books without oversell, joins a
waitlist, gets promoted automatically, and cannot cancel inside 12 hours. Staff
can manage sessions and attendance.

## Deliverables

### Time and location

- Shared time module using `Temporal` (`@js-temporal/polyfill`) or Luxon.
  Helpers: gym-local date/time → UTC, UTC → local display, DST-safe recurrence,
  cancellation cutoff, formatting.
- Seed one location (`America/Los_Angeles`) and expose public location data.
- Unit tests for spring-forward/fall-back and a cutoff crossing DST.

### Templates and sessions

- `classTemplates` model + admin CRUD (API and minimal UI).
- Recurrence generator: `daysOfWeek`, `startTime`, `startsOn`, `endsOn`,
  `exceptions`; create 8 weeks ahead; idempotent upsert on
  `{templateId, startsAt}`; nightly job + on template change.
- One-off sessions (`templateId: null`).
- Admin session cancel: reason required; cancel bookings, restore credits,
  clear waitlist, email.
- Public `GET /public/sessions?from&to` (max 31 days) with capacity/remaining;
  `/classes` page with date filters, coach, time, level, spots left, waitlist
  state. SSR shell + client filters.

### Booking

- `POST /sessions/:id/bookings` with cookie auth, entitlement check,
  `Idempotency-Key`, transaction:
  - conditional `bookedCount` increment (`$lt capacity`, status scheduled);
  - insert booking (`active:true`, `sessionStartsAt`);
  - consume a credit if the entitlement source is a pack;
  - outbox confirmation.
- If full and waitlist enabled: increment `waitlistCount`, insert `waitlisted`,
  return position. If disabled: `409 SESSION_FULL`.
- Duplicate active booking → `409 ALREADY_BOOKED` via partial unique index.
- `DELETE /bookings/:id`: cutoff check, status cancelled, decrement count,
  restore credit only if before cutoff, promote oldest waitlisted in the same
  transaction. Waitlist entries can always cancel before start (decrement
  `waitlistCount`, no cutoff).
- Promotion: conditional counter update; `promotedAt`; credit consumption;
  `promotionGraceUntil` if inside cutoff; email + notification; skip entries
  with no credit.
- Max upcoming bookings and booking window from `systemSettings`.
- `GET /me/bookings` upcoming/past with session snapshot + waitlist position.

### Credits (no Stripe yet)

- Models for `creditPurchases` + `creditLedger`; entitlement service supports
  unlimited memberships (seed/test) and credits.
- Admin-granted/test credits only in this phase; Stripe purchase arrives in
  Phase 3. Do not fake a purchase UI.
- Transactional consume/restore + ledger unique keys.

### Staff and member UI

- `/account/bookings`: upcoming/past, cancel with cutoff messaging, waitlist
  position.
- `/dashboard/schedule`: week view, create one-off, cancel session, open roster.
- `/dashboard/roster/[sessionId]`: booked/waitlist, mark attended/no-show.
- `/coach`: own sessions + roster/attendance; 403 on another coach's session.
- Outbox worker: booking confirmed, waitlisted, promoted, cancelled, session
  cancelled. Mailpit in dev.

## Constraints

- Capacity must never be decided with `countDocuments`. Use the transaction +
  conditional update.
- Booking requires a verified email; unverified members get a clear 403/CTA.
- Do not consume a credit before capacity is reserved.
- Do not trust client time zone or price/credit amounts.
- Do not add Stripe or real payments in this phase.
- Do not hard-delete sessions/bookings; cancel/archive.
- Do not commit/push unless asked.

## Tests

- 20 parallel requests for 1 spot → exactly 1 booked + 19 waitlisted.
- Same member twice → one active booking.
- Cancel before cutoff → waitlist promotion; after cutoff → 409; staff override.
- Promotion inside cutoff → grace cancel restores credit.
- Waitlist ordering and skip when no credit.
- Credit consume/restore idempotency; no negative balance.
- Session cancel → all credits restored, waitlist expired, emails queued.
- DST generation and local display; cutoff boundary exactly 12h.
- Coach cannot access another coach's roster; member cannot access roster APIs.
- Counter reconcile repairs seeded drift.

## Definition of Done

All Phase 2 items in `04-milestones.md` and the AGENTS.md checklist. Demo:
schedule → book last spot → second member waitlisted → cancel → promotion email.

## Out of scope

Stripe checkout, real pack purchases, admin member management, leads, audit
viewer UI, QR check-in.

## Report

Use the AGENTS.md format. Suggested commit:
`feat(phase-2): schedule, booking, waitlist and cancellation`.
