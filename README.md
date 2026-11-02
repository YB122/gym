# FORGE Strength Club

Production-grade gym platform for one location: a marketing site, member portal,
class booking with waitlist, Stripe billing and a role-based staff dashboard.

The repository is deliberately **two independent npm projects**, not a workspace:

```
gym/
├─ frontend/   Next.js App Router (web)
├─ backend/    Express 5 + MongoDB API and worker
├─ docs/       product plan and phase prompts
├─ scripts/    repo-level checks (contract copy guard)
├─ docker-compose.yml   MongoDB replica set + Mailpit
├─ .env.example         one local env template for both apps
└─ .github/workflows/ci.yml
```

Each app has its own `package.json`, `package-lock.json` and `node_modules`.
There is no root `package.json` and no shared package. The small API contract
file is duplicated:

- `backend/src/shared/contracts.ts`
- `frontend/lib/contracts.ts`

They must be byte-for-byte identical. `node scripts/check-contracts.mjs` runs in
CI and fails the build if they drift.

## Prerequisites

- Node.js 22 LTS or newer (npm 10+)
- Docker Desktop with the WSL2 backend (Windows) or Docker Engine (macOS/Linux)
- Git
- Stripe CLI (only needed for billing phases)

## Quick start

### 1. Environment and infrastructure

From the repository root:

```powershell
Copy-Item .env.example .env
docker compose up -d
```

macOS/Linux:

```bash
cp .env.example .env
docker compose up -d
```

### 2. Backend

```powershell
cd backend
npm install
npm run db:init
npm run db:migrate
npm run db:seed
npm run dev
```

The API listens on `http://localhost:4000`. Health:
`http://localhost:4000/api/health`.

### 3. Frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

The web app listens on `http://localhost:3000`. Its scripts load the root
`.env` with `dotenv-cli`, so `NEXT_PUBLIC_*` values stay in one place.

### 4. Checks

```powershell
# backend
cd backend
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run build
npm run openapi:check

# frontend
cd ../frontend
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

`npm run test:integration` starts a temporary MongoDB replica set with
`mongodb-memory-server`; it does not need the Docker database. The first run
downloads a `mongod` binary.

Install the Playwright browser once:

```powershell
npx playwright install chromium
```

## Services

| Service | URL |
| --- | --- |
| Web | http://localhost:3000 |
| API | http://localhost:4000 |
| Health | http://localhost:4000/api/health |
| Mailpit | http://localhost:8025 |
| MongoDB | `mongodb://localhost:27017/gym?replicaSet=rs0` |

## Backend commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | API with `tsx watch` |
| `npm run worker:dev` | Background worker placeholder |
| `npm run build` / `npm start` | Build and run the API |
| `npm test` | Unit tests |
| `npm run test:integration` | Supertest + Mongo replica set |
| `npm run db:up` / `npm run db:down` | Docker Compose services |
| `npm run db:init` | One-time `rs.initiate` |
| `npm run db:migrate` | `migrate-mongo up` |
| `npm run db:seed` | Idempotent seed skeleton |
| `npm run openapi:generate` | Write `../openapi.json` |
| `npm run openapi:check` | Fail if the spec is stale |

## Frontend commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server on 3000 |
| `npm run build` / `npm start` | Production build and server |
| `npm run test:e2e` | Playwright smoke test |
| `npm run ui:add -- button` | Add a shadcn/ui primitive |
| `npm run format` | Prettier |

## Environment

- `.env` at the repo root is ignored; `.env.example` is committed.
- Backend loads `backend/.env` first, then the root `.env`.
- Frontend scripts pass the root `.env` to Next.js with `dotenv-cli`.
- Only `NEXT_PUBLIC_*` values may reach the browser. Never put a Stripe secret,
  Mongo URI or auth secret in a public variable.
- Docker Compose uses no secrets.

## Windows notes

- Docker Desktop must use the WSL2 backend.
- Use PowerShell; all scripts are cross-platform (`cross-env`, `dotenv-cli`,
  Docker Compose).
- If PowerShell cannot find `npm` but `npm.cmd --version` works, a stray
  extensionless `npm` file is earlier on `PATH`. Use `npm.cmd` or fix the
  `PATH` order.
- Backend and frontend each have their own lockfile; run `npm install` inside
  each folder after pulling changes.

## Phase 0 scope

Included: two-app layout, strict TypeScript, ESLint + Prettier, Next.js route
shells and design tokens, Express health API, Zod env validation, pino request
logging, Mongo replica set + Mailpit, migrations, seed skeleton, CI.

Not included yet: authentication, RBAC, sessions, 2FA, booking, waitlist,
Stripe, dashboards and marketing content. Those are Phases 1–5 in
`docs/plan/`.

## Plan

Read `AGENTS.md` first, then `docs/plan/README.md` and the current phase prompt
in `docs/plan/prompts/`. Do not start the next phase until the current gate
passes.
