# Phase 3 — Billing, Memberships and Credits

You are implementing Phase 3. Wire Stripe subscriptions, class packs and
drop-ins with idempotent webhooks and server-authoritative entitlements.

## Read first

1. `AGENTS.md`
2. `docs/plan/02-domain-model.md` (`membershipPlans`, `memberships`,
   `creditPurchases`, `creditLedger`, `payments`, `stripeEvents`, entitlements)
3. `docs/plan/03-api-surface.md` (checkout, portal, webhooks, member billing)
4. `docs/plan/05-security-and-risks.md` (R1, R5, R6, R12, R16)
5. `docs/plan/06-testing-and-operations.md` (Stripe setup, env, smoke tests)
6. `docs/plan/04-milestones.md` (Phase 3)
7. This file

## Goal

A member can subscribe or buy a pack, access is granted exactly once by a
verified webhook, credits cannot be double-spent, and the billing portal works.

## Deliverables

### Plans and Stripe products

- `membershipPlans` + pack products seeded from Stripe test IDs; idempotent
  `seed:stripe` script. Refuse live mode unless `--live` is explicit.
- Plans: Floor Access (no classes), Unlimited (unlimited), Private Coaching
  (unlimited classes + manual 1:1). Packs 5/10/20 + drop-in.
- Never accept price/amount from the client. Resolve `stripePriceId` server-side.
- Price changes create a new Stripe Price; archive the old. Existing
  subscriptions keep their price.

### Checkout and portal

- `POST /checkout/subscription {planId}`, `/checkout/pack {packId}`,
  `/checkout/drop-in {sessionId?}`; create/reuse customer; metadata
  `{memberId,type,planId|packId}`; return hosted URL.
- `POST /me/billing/portal`; return Stripe Billing Portal URL.
- Success page polls membership/credits; it never grants access.
- `Idempotency-Key` on checkout creation.

### Webhooks

- `POST /api/webhooks/stripe` before `express.json()`, raw body, signature
  verification, unique `stripeEvents.eventId`, claim/lock/retry state machine.
- Handlers: `checkout.session.completed`,
  `customer.subscription.created|updated|deleted`, `invoice.paid`,
  `invoice.payment_failed`, `charge.refunded`.
- Process in a transaction; grant membership/credits/payment row/outbox once.
- Verify the Stripe amount/price against the local plan before granting; log and
  skip mismatches.
- Out-of-order subscription events must not regress state; fetch current
  subscription or compare periods.
- Duplicate `processed` event → 200, no side effects. Failed event → 500 so
  Stripe retries; stale processing lock reclaimable.

### Entitlements and credits

- Wire the entitlement service into booking: unlimited membership; pack/drop-in
  credits; past_due grace; canceled access until `accessUntil`; no entitlement
  → `403 NO_ENTITLEMENT`.
- Credit consume/restore inside the booking transaction; ledger unique on
  `{bookingId, reason}`; expiry job; admin adjustment API (audited) for Phase 4
  UI.
- Purchases grant credits once keyed by Checkout Session id.
- Refund handler revokes unused credits and records the refund.

### UI and email

- `/membership`: plans/packs, checkout CTAs, FAQ; logged-out users go to signup
  then resume checkout.
- `/account/membership`: status, renewal, access until, portal button, invoices
  link.
- `/account/credits`: balances + ledger.
- Emails: receipt, payment failed, membership canceled, credits granted.
- Superadmin read-only billing endpoints: plans, prices, payments, subscription
  status. Full billing UI in Phase 4.

### Reconciliation

- Nightly job compares active Stripe subscriptions and recent payments with
  local records; write a report and alert on mismatches. Manual trigger endpoint
  is superadmin-only (Phase 4 UI), audited.
- Never auto-delete local data on mismatch; flag it.

## Constraints

- Stripe is the source of truth for payments; Mongo is the source for app access.
- Checkout requires a verified email; unverified members are sent to verification.
- No card data touches our servers; use Checkout/Portal only.
- No client-supplied prices, plan names or credit amounts.
- Webhook route must not be behind session auth; verify the signature instead.
- Do not add tax handling, invoices beyond the portal, or dunning flows beyond
  the basics.
- Do not commit/push unless asked.

## Tests

- Client sends a fake amount → ignored; server price used.
- Duplicate `checkout.session.completed` ×3 → one membership/credit grant.
- Concurrent duplicate webhook → one grant.
- Out-of-order subscription updated/deleted → no regression.
- Bad signature → 400; unknown event → ignored; handler failure → retry.
- Past_due grace; canceled access until period end; portal cancellation.
- Credit consume/restore/double-spend; expiry; refund revokes unused credits.
- Booking blocked with no entitlement; allowed with unlimited/pack.
- Reconciliation detects seeded drift.

## Definition of Done

All Phase 3 items in `04-milestones.md` and the AGENTS.md checklist. Demo:
subscribe in test mode → webhook activates → book → portal cancel → access
survives to period end; replay webhook → no duplicate.

## Out of scope

Billing UI beyond the superadmin read-only endpoints, tax, coupons/referrals, gift cards,
invoicing customization, SMS.

## Report

Use the AGENTS.md format. Suggested commit:
`feat(phase-3): stripe billing, credits and idempotent webhooks`.
