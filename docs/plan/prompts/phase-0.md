# Phase 0 — Scaffolding

You are implementing Phase 0 of the FORGE gym platform. This phase creates the
skeleton only; no gym features.

## Read first

1. `AGENTS.md` (repo contract — non-negotiable)
2. `docs/plan/README.md`
3. `docs/plan/01-stack-and-layout.md`
4. `docs/plan/06-testing-and-operations.md` (Local development, CI)
5. This file

Do not read the whole repo. Do not implement later phases.

## Goal

A clean, runnable monorepo with npm workspaces, Docker MongoDB replica set,
Mailpit, strict TypeScript, CI and a health check. `npm run dev` starts shared
watch, API, worker and web.

## Deliverables

### Workspace

- Root `package.json` with `"workspaces": ["frontend", "backend", "packages/*"]`,
  `"engines": {"node": ">=22"}`, `"packageManager": "npm@10"`.
- `package-lock.json` committed. No pnpm files.
- Root scripts: `dev`, `build`, `lint`, `typecheck`, `test`,
  `test:integration`, `test:e2e`, `db:up`, `db:down`, `db:init`, `db:migrate`,
  `db:seed`, `db:seed:demo`, `openapi:generate`, `openapi:check`,
  `stripe:listen`. `openapi:*` may be a no-op placeholder until Phase 1 but
  must exist and pass. Use `concurrently`, `cross-env`, `rimraf` where
  needed; all must work on Windows PowerShell.
- `.env.example` covering API, web and Docker; `.gitignore`; `.gitattributes`.

### `packages/shared`

- `@gym/shared` with Zod, TypeScript strict, `tsup` build, `src/index.ts`.
- Initial exports: roles (`superadmin|admin|coach|member`), permissions,
  pagination/error envelope schemas, and a health response schema.
- No Node/React/Mongoose/Stripe imports.

### `backend`

- Express 5 app with Helmet, CORS allowlist (`CORS_ORIGIN`), JSON body limit,
  pino + request IDs, centralized `AppError` handler, 404 handler.
- Env validation with Zod; fail fast with a clear message.
- Mongoose connection with `autoIndex: false` outside development; graceful
  shutdown.
- `GET /api/health` → `{status:"ok", db:"ok", version}`; 503 if DB is down.
- `worker.ts` placeholder loop that logs and exits cleanly on SIGTERM.
- Vitest config + one Supertest health integration test using
  `MongoMemoryReplSet` (or the CI Mongo service) and one unit test.
- `migrate-mongo` config + `migrations/` with a no-op baseline.
- Seed script skeleton with idempotent upsert helper (no domain data yet).

### `frontend`

- Next.js App Router + TypeScript strict + Tailwind 4 + shadcn/ui base.
- Route-group shells: `(marketing)`, `(auth)`, `(member)/account`,
  `(dashboard)/dashboard`; a placeholder home page with the design tokens.
- `lib/api.ts` typed fetch helper (`credentials: "include"`, base URL, error
  envelope), `lib/query.ts` TanStack Query provider, `lib/auth.ts` placeholder.
- Design tokens in `globals.css`: dark background `#0a0a0a`, lime accent
  `#a3e635`, Inter, display weight 900, hairline borders, rounded cards.
- One Playwright smoke test that the home page renders; config committed.

### Infrastructure

- `docker-compose.yml`: `mongo:8` with a single-node replica set `rs0` and a
  healthcheck; `axllent/mailpit` for SMTP (1025) + UI (8025).
- `scripts/db-init.mjs` that runs `rs.initiate` once and is idempotent.
- GitHub Actions `.github/workflows/ci.yml`: `npm ci`, lint, typecheck, build,
  unit, integration, OpenAPI placeholder. Cache npm. Upload Playwright traces
  on failure.
- `README.md` quick start for Windows and macOS.
- `docs/plan/progress.md` with a Phase 0 row.

## Constraints

- No auth, booking, Stripe, dashboard features, or marketing content yet.
- No secrets; `.env` ignored. Only `NEXT_PUBLIC_*` reaches the browser.
- No `any`; no `autoIndex: true` outside development.
- Do not add a dependency without a one-line justification.
- Do not commit or push unless the user asks.

## Tests and checks

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` pass.
- `npm run test:integration -w @gym/api` passes with Mongo.
- `npm run db:up && npm run db:init` creates a working replica set.
- `npm run dev` starts all four processes; `GET /api/health` is ok.
- CI config is valid and would run on push/PR.

## Definition of Done

All Phase 0 items in `docs/plan/04-milestones.md` are met, plus the AGENTS.md
Definition of Done checklist. Demo: health endpoint, home shell, CI green.

## Out of scope

Everything in Phases 1–5. Do not scaffold empty feature folders "for later"
beyond the module placeholders listed above.

## Report

Use the AGENTS.md reporting format. Include commands run, test output summary,
known gaps, and a suggested commit message `chore(phase-0): scaffold monorepo`.
