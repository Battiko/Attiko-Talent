# ATTIKO — Talent Search

> International talent discovery for private events & weddings

A full-stack monorepo for sourcing, vetting, and booking musicians and performers across global markets. Connects event planners and wedding coordinators with verified artists via enriched profiles built from live Spotify, YouTube, SoundCloud, and Songkick data.

---

## Architecture

```mermaid
flowchart TD
    subgraph Client
        WEB["apps/web\nNext.js 14 (App Router)"]
    end

    subgraph Auth
        CLERK["Clerk\nJWT / session mgmt"]
    end

    subgraph API
        API["apps/api\nNode.js + tRPC"]
        BULLMQ["BullMQ\nJob Queue"]
    end

    subgraph Data
        DB["packages/db\nPostgreSQL + PostGIS\n+ pgvector (Supabase)"]
        REDIS["Redis\nCache + Queue backend"]
    end

    subgraph Scrapers
        SC["packages/scrapers"]
        SPOTIFY["Spotify API"]
        YT["YouTube Data API"]
        SND["SoundCloud API"]
        SK["Songkick API"]
    end

    WEB -->|"tRPC over HTTPS"| API
    WEB <-->|"auth session"| CLERK
    API <-->|"JWT verify"| CLERK
    API --> DB
    API --> REDIS
    API --> BULLMQ
    BULLMQ --> SC
    SC --> SPOTIFY
    SC --> YT
    SC --> SND
    SC --> SK
    SC --> DB
```

---

## Stack Choices & Justification

**tRPC over FastAPI**
The web and API layers are both TypeScript. tRPC lets the router's type definitions flow directly into the Next.js client via a shared package — no code generation step, no OpenAPI schema drift, and refactors that break the contract fail at compile time rather than at runtime.

**pgvector over Pinecone**
Artist embeddings (for similarity search and "find acts like this") live in the same Supabase project as the relational data. A single database vendor means one connection string, one backup strategy, and zero marginal cost for the vector index at current scale.

**Drizzle ORM over Prisma**
Drizzle compiles to plain SQL with zero runtime overhead, works in edge runtimes (Vercel Edge Functions, Cloudflare Workers) without the Prisma query engine binary, and its type-safe query builder matches SQL semantics closely enough that queries are predictable under load.

**neverthrow for typed errors**
Service-layer functions return `Result<T, AppError>` instead of throwing. Error paths are explicit in function signatures, exhaustively checked by the TypeScript compiler, and never accidentally swallowed by a forgotten try/catch.

---

## Monorepo Structure

```
attiko/
├── apps/
│   ├── web/                  # Next.js 14 front-end (App Router)
│   │   └── src/app/
│   │       ├── (app)/        # Authenticated routes
│   │       ├── (auth)/       # Sign-in / sign-up pages
│   │       ├── api/          # Next.js route handlers
│   │       └── console-x7k2m9/  # Owner-only operations console
│   └── api/                  # Node.js tRPC server
│       └── src/
│           ├── routers/      # tRPC procedure definitions
│           ├── services/     # Business logic (neverthrow Results)
│           ├── jobs/         # BullMQ job definitions
│           └── middleware/   # Auth, logging, rate-limit
├── packages/
│   ├── db/                   # Drizzle schema, migrations, seed
│   ├── scrapers/             # Platform adapters
│   │   └── src/platforms/
│   │       ├── spotify.ts
│   │       ├── youtube.ts
│   │       ├── soundcloud.ts
│   │       └── songkick.ts
│   ├── shared/               # Zod schemas, types, constants
│   └── ui/                   # Shared React component library
├── docker/
│   └── postgres/init.sql
├── docker-compose.yml
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 20.x LTS | `nvm use 20` or `fnm use 20` |
| pnpm | 11.x | `npm i -g pnpm@11` |
| Docker Desktop | latest stable | Needed for local Postgres + Redis |

---

## Local Setup

### 1. Clone and install

```bash
git clone https://github.com/your-org/attiko.git
cd attiko
pnpm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in values for at minimum: `DATABASE_URL`, `REDIS_URL`, and the Clerk keys. All other keys are optional for local development but required for the scraper jobs to run.

### 3. Start infrastructure

```bash
docker compose up -d
```

This starts:
- PostgreSQL 16 with PostGIS 3.4 on port `5432`
- Redis 7 on port `6379`

Wait for both health checks to pass (`docker compose ps` shows `healthy`).

### 4. Run migrations and seed data

```bash
pnpm db:migrate        # applies all Drizzle migrations
pnpm db:seed           # seeds 500 demo artists with enriched profiles
```

### 5. Start all services

```bash
pnpm dev
```

Turbo starts the API server (port `4000`) and the Next.js dev server (port `3000`) in parallel with shared cache.

---

## Environment Variable Reference

| Variable | Required | Description | Where to get it |
|----------|----------|-------------|-----------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (must include PostGIS) | Supabase → Project Settings → Database |
| `REDIS_URL` | Yes | Redis connection string for cache and BullMQ | Railway or Upstash dashboard |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk public key for browser auth | Clerk dashboard → API Keys |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key for server-side verification | Clerk dashboard → API Keys |
| `OWNER_EMAIL` | Yes | Email that receives silent owner role on login | Your own email address |
| `INTERNAL_API_SECRET` | Yes | Shared secret for service-to-service calls | `openssl rand -hex 32` |
| `SPOTIFY_CLIENT_ID` | Scraper only | Spotify app client ID | developer.spotify.com/dashboard |
| `SPOTIFY_CLIENT_SECRET` | Scraper only | Spotify app secret | developer.spotify.com/dashboard |
| `YOUTUBE_API_KEY` | Scraper only | YouTube Data API v3 key | console.cloud.google.com |
| `SOUNDCLOUD_CLIENT_ID` | Scraper only | SoundCloud app client ID | developers.soundcloud.com |
| `SOUNDCLOUD_CLIENT_SECRET` | Scraper only | SoundCloud app secret | developers.soundcloud.com |
| `SONGKICK_API_KEY` | Scraper only | Songkick partner API key | songkick.com/developer |
| `ANTHROPIC_API_KEY` | Enrichment only | Claude API key for profile enrichment | console.anthropic.com |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Maps | Mapbox public token for artist geo maps | account.mapbox.com |
| `MAPBOX_SECRET_TOKEN` | Maps | Mapbox secret token for server-side geocoding | account.mapbox.com |
| `GOOGLE_MAPS_API_KEY` | Maps | Google Maps API key (fallback) | console.cloud.google.com |
| `STRIPE_SECRET_KEY` | Billing | Stripe secret key | dashboard.stripe.com/apikeys |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Billing | Stripe publishable key | dashboard.stripe.com/apikeys |
| `STRIPE_WEBHOOK_SECRET` | Billing | Webhook signing secret | Stripe CLI or dashboard |
| `STRIPE_PRICE_PRO_MONTHLY` | Billing | Pro plan price ID | Stripe dashboard → Products |
| `STRIPE_PRICE_AGENCY_MONTHLY` | Billing | Agency plan price ID | Stripe dashboard → Products |
| `RESEND_API_KEY` | Email | Resend API key for transactional email | resend.com/api-keys |
| `EMAIL_FROM` | Email | From address for outgoing mail | Your verified Resend domain |
| `NEXT_PUBLIC_POSTHOG_KEY` | Analytics | PostHog project API key | app.posthog.com → Settings |
| `SENTRY_DSN` | Observability | Sentry DSN for error tracking | sentry.io → Project → Keys |
| `SERPER_API_KEY` | Enrichment | Serper search API for web enrichment | serper.dev |
| `HUNTER_API_KEY` | Enrichment | Hunter.io key for email verification | hunter.io/api-keys |
| `NODE_ENV` | Yes | `development` or `production` | Set in deployment platform |

---

## Deployment Runbook

### Web (`apps/web`) → Vercel

1. Import the repository in the Vercel dashboard.
2. Set the root directory to `apps/web`.
3. Framework preset: **Next.js**.
4. Add all `NEXT_PUBLIC_*` and server-side env vars in Vercel → Settings → Environment Variables.
5. Deploy. Vercel automatically runs `pnpm build` via Turborepo.

### API (`apps/api`) → Railway or Fly.io

**Railway:**
1. Create a new Railway project and connect the repo.
2. Set start command: `node dist/index.js` (after `pnpm build` in the api workspace).
3. Add all env vars in the Railway service variables panel.
4. Add a Redis service from the Railway marketplace and copy the `REDIS_URL` into the API service.

**Fly.io:**
1. `cd apps/api && fly launch` — follow prompts.
2. `fly secrets set DATABASE_URL=... REDIS_URL=... CLERK_SECRET_KEY=...`
3. `fly deploy`

### Database → Supabase

1. Create a new Supabase project. PostGIS and pgvector are enabled by default.
2. Copy the connection string from Project Settings → Database → Connection string (URI mode).
3. Run migrations against production: `DATABASE_URL=<prod-url> pnpm db:migrate`
4. Enable Row Level Security on all tables from the Supabase dashboard after migration.

---

## Troubleshooting

**`pnpm install` fails with peer dependency errors**
Ensure you are on pnpm 11. Run `pnpm --version` and upgrade with `npm i -g pnpm@11` if needed. Node 20 is required; older versions produce incompatible peer resolutions.

**Docker containers not reaching healthy status**
Run `docker compose logs postgres` or `docker compose logs redis`. The most common cause is a port conflict — another Postgres instance on 5432. Change the host port mapping in `docker-compose.yml` (e.g. `"5433:5432"`) and update `DATABASE_URL` accordingly.

**`pnpm db:migrate` fails with "relation already exists"**
The migration history is out of sync. If this is a local dev database you can reset: `docker compose down -v && docker compose up -d`, then re-run migrate.

**tRPC type errors after adding a new procedure**
Run `pnpm typecheck` from the root. Turborepo builds packages in dependency order; if `packages/shared` has a stale build cache, type inference in `apps/web` will be stale. Run `pnpm clean && pnpm install && pnpm dev` to fully rebuild.

**Clerk auth loop on sign-in**
Confirm `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`, and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` are set in `.env.local` **and** that the Clerk application's Allowed Origins list includes `http://localhost:3000`.

**Scraper jobs not firing**
Check that `REDIS_URL` is reachable from the API process and that at least one BullMQ worker is running (the dev server starts a worker automatically). Inspect the queue with `pnpm exec bullboard` or connect a Redis CLI and run `KEYS bull:*`.

---

## Testing

```bash
# Run all unit and integration tests across all packages
pnpm test

# Type-check all packages (no emit)
pnpm typecheck

# Run tests for a single package
pnpm --filter @attiko/scrapers test

# Watch mode during development
pnpm --filter @attiko/api test --watch
```

Tests use Vitest. Coverage reports are written to `coverage/` in each package. Integration tests that hit the database expect `DATABASE_URL` to point at a running Postgres instance (the Docker container works).

---

## ⚙️ Operator Notes

> These notes are for the operator/owner only. Do not share this section with end users.

### Setting OWNER_EMAIL

Add the following to `.env.local` for local development and to the production host's environment (Railway, Fly.io, or Vercel server-side env):

```
OWNER_EMAIL=your-actual-email@domain.com
```

Keep the value **lowercased and trimmed** — the auth middleware compares it against the lowercased email returned by Clerk. Mismatches mean the owner role is never granted.

### Hidden Console URL

The owner operations console is accessible at:

```
/console-x7k2m9
```

Visiting this path while **logged out** or while logged in as a **non-owner** returns a plain 404 — no indication that a console exists. The path is only functional when the authenticated user's email matches `OWNER_EMAIL`.

### Recovery If Locked Out

If you lose access to the owner account:

1. Set `OWNER_EMAIL` to the email address of any account you **can** log into.
2. Redeploy (or restart the API process) so the new env var is picked up.
3. Log in with that account. On the next login, the role is silently promoted to owner.
4. Reset `OWNER_EMAIL` back to your primary email once access is restored.

### Rotating the Console Path

To change the console URL from `/console-x7k2m9` to a new secret path:

1. Rename the directory: `mv apps/web/src/app/console-x7k2m9 apps/web/src/app/<new-path>`
2. Update any direct references to the old path in `apps/web/src/middleware.ts` — the middleware allowlist controls which paths skip standard auth checks.
3. Deploy. The old path returns 404 immediately.

### Promoting Admins

Only an **owner** can promote another user to admin. This is done from inside the console UI — there is no CLI or direct database shortcut by design. Admin promotion is logged in the audit table.

---

## Contributing

This project follows [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

```
feat(scrapers): add Bandsintown adapter for live event data
fix(api): handle null coordinates in artist geo query
chore(db): bump Drizzle to 0.31
docs: update env variable reference table
```

**Branch naming:** `feat/`, `fix/`, `chore/`, `docs/` prefixes matching the commit type.

**Pull request checklist:**
- `pnpm typecheck` passes with zero errors
- `pnpm test` passes
- New env vars are documented in `.env.example` and the README table
- Migrations are forward-only (no destructive column drops without a deprecation period)

Husky runs lint-staged on commit: ESLint + Prettier on all staged `.ts`/`.tsx` files.
