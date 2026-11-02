# Progress Log

One row per OpenCode session. Update after the phase gate, not per commit.

| Phase | Date | Session / commit | Gate | Notes / follow-ups |
| --- | --- | --- | --- | --- |
| 0 — Scaffolding | — | — | pending | |
| 1 — Auth, RBAC, 2FA, invites | — | — | pending | |
| 2 — Schedule, booking, waitlist | — | — | pending | |
| 3 — Billing, credits, webhooks | — | — | pending | |
| 4 — Dashboards, operations | — | — | pending | |
| 5 — Hardening, E2E, launch | — | — | pending | |

## Gate checklist (repeat per phase)

- [ ] Demo completed and reviewed.
- [ ] `npm run lint` / `typecheck` / `test` / integration green.
- [ ] Migrations run from empty DB and from previous phase DB.
- [ ] RBAC + audit tests updated.
- [ ] OpenAPI regenerated.
- [ ] No secrets/PII/debug logs.
- [ ] Phase report written.
