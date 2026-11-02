# Reference Review — Ironhaus Strength Club

Reviewed live at <https://5173-iblk5gafzggyraauw278d.e2b.app/> on 2026-10-30.
The earlier review only saw metadata; this one rendered the SPA and read its
client source, so the findings below are from the running app, not guesses.

## What it actually is

A five-page **marketing site with lead-capture forms**, not a gym platform.

- **Stack:** Vite + React + React Router, Tailwind CSS, Framer Motion, Sonner,
  Lucide icons, and **Convex** for the backend (`@convex-dev/auth` is installed).
- **Routes:** `/`, `/classes`, `/membership`, `/coaches`, `/contact`.
  Unknown routes fall back to the home page. There is **no login, member portal,
  or dashboard route**.
- **Rendering:** fully client-side. The class schedule shows skeleton cards for
  several seconds while the Convex websocket syncs.
- **Auth:** the dependency and `users` table exist, but no auth UI or protected
  route is wired up.

## Page inventory

| Page | Sections / content |
| --- | --- |
| **Home** | Hero ("TRAIN LIKE IT ACTUALLY MATTERS"), background video, discipline marquee, stats (1,200+ members, 38 weekly classes, 9 coaches, 12 yrs), facility grid (6 features), "why Ironhaus" list, 3 testimonials, free-week CTA |
| **Classes** | Weekly schedule, day filters (All, Mon, Tue, Wed, Thu, Sat — no Fri/Sun), 6 seeded classes, level/day badges, coach, time, duration, spots left, booking modal |
| **Membership** | 3 plans — Floor Access $79/mo, Unlimited $149/mo (popular), Private Coaching $289/mo — feature lists, 4-question FAQ, signup modal |
| **Coaches** | 4 profiles: Marcus Vale (Head Coach), Lena Ortiz (Conditioning), Priya Raman (Mobility), Dre Kowalski (Boxing), with credentials |
| **Contact** | Address, phone, email, opening hours, name/email/message form |

Content details worth reusing: 16-person class cap, 12 lifting platforms,
5am–10pm opening, no lock-in contracts, free seven-day trial, 8-week programming
blocks, quarterly progress reviews.

## Backend as built

Convex schema:

- `classes` — title, coach, day (string), time (string), duration (string),
  level, spots, image, description. **Weekly template, not a dated occurrence.**
- `bookings` — classId, name, email, phone; index by class.
- `memberships` — planId, planName, price, name, email, phone, goal.
- `messages` — name, email, message.
- `users` — auth fields plus `isAdmin`; no role model, no admin UI.

Mutations:

- `bookClass` — reads the class, counts existing bookings, rejects if full or if
  the email is already booked, then inserts.
- `joinMembership` — inserts the plan **and the price sent by the client**.
- `sendMessage` — inserts a contact message.
- `stats` — counts members and bookings.

## Problems not to copy

1. **Price tampering.** `joinMembership` trusts `planId`, `planName` and `price`
   from the browser. Anyone can buy the $289 plan for $1. Plans and prices must
   live server-side and Stripe Price IDs must be resolved on the server.
2. **Oversell race.** Count-then-insert is not atomic. Two simultaneous requests
   for the last spot can both pass the check. Use a transaction or an atomic
   counter with a conditional update.
3. **Duplicate-booking race.** The duplicate check is application-side only; a
   unique index on `(classId, memberId)` is needed.
4. **No real occurrences.** Classes are `day: "Monday", time: "06:30"` strings.
   You cannot book a specific date, handle holidays, cancel one session, or
   reason about time zones. The new model needs class templates **and** dated
   sessions stored in UTC.
5. **No waitlist, cancellation, cutoff, or attendance.** The reference only
   inserts a row.
6. **No spam protection.** Public mutations accept unlimited submissions.
7. **No payments.** Membership signup is a sales lead, not a subscription.
8. **CSR-only marketing pages.** Weak SEO and a visible schedule skeleton.
   Next.js App Router with server rendering fixes this.
9. **`isAdmin` boolean, no RBAC.** No superadmin/admin/coach separation and no
   audit trail.

## Visual system (worth keeping)

- Background `#0a0a0a` (neutral-950); text white and neutral-400; hairline
  borders `white/10`.
- Accent **lime-400 `#a3e635`**; lime glow and faint grid-line backgrounds.
- **Inter Variable**, display weight 900, tight tracking (~-0.045em), hero at
  72px desktop; uppercase eyebrow labels with ~0.22em letter spacing.
- Rounded-2xl cards, image zoom on hover, slight lift, Framer Motion reveals,
  marquee strip, sticky translucent nav, dark Sonner toasts.
- Voice: direct, anti-gimmick, confidence without hype ("No juice bar, no
  tanning beds"; "We'd rather earn your renewal than trap you in it").

**Design decision for the build:** keep this industrial dark/lime language and
the content structure, but use original branding, copy and assets. Do not
copy the Ironhaus name, logos, photos or testimonials.

## What this means for our plan

- The marketing site is a known quantity: five pages, same section order, SSR'd.
- The **platform** is net-new: accounts, dated sessions, waitlist, Stripe,
  member portal, coach tools, and the superadmin dashboard.
- Booking must be modelled on **class templates → dated sessions → bookings**,
  not weekly strings.
- All prices, capacities and role checks are server-authoritative.
- The reference's visual language is a good starting point, but its backend
  patterns are exactly the anti-patterns the risk list should call out.
