# Phase 1 — Auth, Roles and Superadmin

You are implementing Phase 1. Build authentication, RBAC, mandatory 2FA for
privileged accounts, invite-only admins and the audit foundation.

## Read first

1. `AGENTS.md`
2. `docs/plan/01-stack-and-layout.md` (auth, routes, cookies)
3. `docs/plan/02-domain-model.md` (`users`, `adminInvites`, `auditLogs`,
   membership/status fields)
4. `docs/plan/03-api-surface.md` (auth, member, superadmin team endpoints)
5. `docs/plan/05-security-and-risks.md` (R4, R7, R8, R9)
6. `docs/plan/04-milestones.md` (Phase 1)
7. This file

## Goal

A seeded superadmin can log in, change password, enroll TOTP, invite an admin;
the invitee sets their own password and enrolls TOTP; every privileged action is
audited and server-enforced.

## Deliverables

### Auth

- Better Auth with MongoDB adapter, session cookies (`HttpOnly`, `Secure` in
  prod, `SameSite=Lax`), email/password + Google, email verification, password
  reset. Use Resend in non-dev and Mailpit SMTP in dev.
- Configure `baseURL`/trusted origins for `http://localhost:3000` and the
  production web URL. OAuth callback exact.
- Auth client/provider in Next.js; `useSession`; logout; protected layout.
- `mustChangePassword` and `twoFactorEnabled` fields; middleware that blocks
  privileged routes with `403 MUST_CHANGE_PASSWORD` / `TWO_FACTOR_REQUIRED`.

### Roles and policies

- Shared role enum + permission constants + `can(role, permission)`.
- Express middleware: `requireAuth`, `requireRole`, `requirePermission`,
  `requirePrivileged2FA`, `requirePasswordChanged`. Deny by default.
- `GET /api/v1/me`, `PATCH /api/v1/me` (name/phone/image only), change password.
- A role × route matrix test. Every `/admin/*` and `/coach/*` route declares its
  policy; no route relies on UI hiding.

### 2FA

- Better Auth two-factor plugin: TOTP enrollment (QR + secret), verification,
  backup codes shown once and hashed at rest, login challenge.
- Mandatory for `admin` and `superadmin`; optional for members (defer).
- Dashboard setup page `/dashboard/setup-2fa`; cannot reach other dashboard
  pages until enrolled.
- Break-glass script `npm run admin:reset-2fa -w @gym/api -- --email <email>`
  with audit entry + notification. Document in README.

### Superadmin seed and invites

- `seed:superadmin` script reads `SUPERADMIN_EMAIL` and
  `SUPERADMIN_TEMP_PASSWORD`; creates the user if absent; role superadmin;
  `mustChangePassword: true`; forces 2FA on first login.
- `adminInvites`: 32-byte token, SHA-256 hash stored, 48h expiry, single-use,
  bound email, role `admin` (superadmin) or `coach` (admin).
- Endpoints: create/resend/revoke/list invites; accept invite; invite metadata.
  Superadmin-only for admins; admin allowed for coaches.
- Accept flow: verify token + email, set name/password, create user, mark invite
  accepted atomically, enroll 2FA, audit. Never let the inviter choose the
  password.
- Team API/UI: list admins + pending invites, suspend, demote, promote, revoke
  sessions. Last-superadmin guard; cannot change own role/suspend self.

### Audit

- `auditLogs` model + append-only repository (insert/find only).
- Audit: privileged login, invite create/resend/revoke/accept, role/status
  change, 2FA reset, password change. Include actor, role, IP, user agent,
  request ID, before/after (redacted).
- Superadmin-only `GET /api/v1/admin/audit-logs` with filters + cursor.
- No update/delete route.

### UI

- `/login`, `/signup`, `/verify-email`, `/forgot-password`, `/reset-password`,
  `/accept-invite`, `/change-password`, `/dashboard/setup-2fa`.
- Dashboard shell with role-aware nav and a placeholder overview.
- `/dashboard/team` for superadmin: invite form, pending invites, role/status
  actions, last-superadmin messaging.
- Loading/empty/error states, accessible forms, mobile layout.

## Constraints

- Never accept `role`/`status`/`email` in `PATCH /me`.
- Never expose whether an email exists on login/forgot-password/invite metadata.
- Hash invite and reset tokens; never log them.
- Revoke all sessions on suspend/demote/delete; test with an existing cookie.
- Do not implement class/member/billing features yet.
- Do not commit/push unless asked.

## Tests

- Invite: create → accept → login; expired; reused; wrong email; revoked;
  re-invite invalidates old token.
- 2FA: privileged login requires TOTP; enrollment; backup code; reset script.
- RBAC matrix: member/coach/admin/superadmin × auth, member, coach, admin,
  team, audit routes.
- Last superadmin: cannot demote/suspend/delete; can with two; cannot self-demote.
- Session revocation on suspend/role change.
- Password reset single-use/expiry; email verification.
- Audit entries for invite/role/status/2FA actions.

## Definition of Done

All Phase 1 items in `04-milestones.md` and the AGENTS.md checklist. Demo:
seed superadmin → forced password + TOTP → invite admin → accept + TOTP →
admin sees 403 on team; superadmin sees audit entries.

## Out of scope

Classes, sessions, booking, Stripe, member management, coach rosters, marketing
content beyond the shell.

## Report

Use the AGENTS.md format. Suggested commit:
`feat(phase-1): auth, rbac, 2fa and admin invites`.
