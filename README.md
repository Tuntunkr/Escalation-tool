# Escalation-tool

Multi-role escalation portal that replaces the office Google Form workflow. Sellers raise AWB issues; KAM, Ops, and Admin track and resolve them.

## Monorepo

```
apps/web         Next.js frontend (port 3000)
apps/api         Hono API (port 4000)
packages/db      Prisma + PostgreSQL (`escalation` database)
packages/shared  Shared types/constants
```

## Roles

| Role   | Access                                      |
|--------|---------------------------------------------|
| Seller | Own escalations only (+ public `/signup`)   |
| KAM    | Mapped sellers only                         |
| Ops    | All tickets + status updates                |
| Admin  | Sellers / KAM / Ops lists                   |

## Prerequisites

- Node.js >= 20
- pnpm 9 (`corepack enable`)
- PostgreSQL (local or Docker)

## Environment

Copy `.env.example` and set secrets locally (never commit real `.env` files):

- `packages/db/.env` — `DATABASE_URL`
- `apps/api/.env` — API port, JWT, CORS, database URL
- `apps/web/.env.local` — `NEXT_PUBLIC_API_URL`

Example database URL (replace password):

```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5433/escalation?schema=public"
```

Optional Docker Postgres:

```bash
docker compose up -d
```

## Quick start

```bash
corepack enable
pnpm install
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm dev:api
pnpm dev:web
```

Open http://localhost:3000

### Demo logins (password: `password123`)

- `seller1@escalation.local` / `seller2@escalation.local`
- `kam@escalation.local`
- `ops@escalation.local`
- `admin@escalation.local`

## Scripts

| Script           | Description                |
|------------------|----------------------------|
| `pnpm dev`       | Run all packages in parallel |
| `pnpm dev:web`   | Next.js only               |
| `pnpm dev:api`   | API only                   |
| `pnpm build:api` | Generate Prisma + typecheck API |
| `pnpm build:web` | Build Next.js              |
| `pnpm start:api` | Start API (production)     |
| `pnpm start:api:prod` | DB push + start API (Railway) |
| `pnpm start:web` | Start Web (production)     |
| `pnpm db:generate` | Prisma client            |
| `pnpm db:push`   | Push schema to DB          |
| `pnpm db:seed`   | Seed demo data             |
| `pnpm db:studio` | Prisma Studio              |

## Railway deploy

Monorepo needs **3 services**: Postgres + `@escalation/api` + `@escalation/web`.

### 1. Postgres
Add Railway **PostgreSQL**. Copy / reference `DATABASE_URL`.

### 2. API service (`@escalation/api`)
- Root Directory: `/` (repo root)
- Config-as-code path: `/apps/api/railway.toml`
- Variables:
  - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
  - `JWT_SECRET` = strong random string
  - `CORS_ORIGIN` = `https://YOUR-WEB.up.railway.app`
  - `APP_URL` = `https://YOUR-WEB.up.railway.app`
- Settings → Networking → **Generate Domain**
- Health: `/health`

### 3. Web service (`@escalation/web`)
- Root Directory: `/`
- Config-as-code path: `/apps/web/railway.toml`
- Variables:
  - `NEXT_PUBLIC_API_URL` = `https://YOUR-API.up.railway.app` (set **before** build)
- Generate Domain, then update API `CORS_ORIGIN` / `APP_URL` and redeploy API

### 4. Seed (optional, once)
In API service console / one-off:
```bash
pnpm db:seed
```
