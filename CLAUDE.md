# ATTIKO — Talent Search Platform ("Attiko Noir")

International talent discovery for private events & weddings. Bobby's most
important project. Event planners search for performers by skill + region;
profiles are scraped from YouTube/Spotify/Last.fm/MusicBrainz and enriched.

## Architecture (pnpm monorepo)
- `apps/api` — Express + tRPC (port 4000). Routers: `search` (user-facing),
  `shortlists`, `operator` (owner console). Services: `ingest`, `enrich`,
  `autoPopulate` (daily scrape cron), `classify` (AI vetting), `geocoding`
  (Nominatim + 24h cache). Auth: Clerk; roles user/pro/agency/admin/owner.
- `apps/web` — Next.js frontend (Vercel: attiko-talent-web.vercel.app).
  Owner console lives at the obfuscated route `console-x7k2m9`.
- `packages/db` — Drizzle + PostGIS. `geo_point` GEOMETRY column is raw SQL
  (drizzle-kit can't express it). `packages/scrapers` — platform clients.
- **DATABASE POINTS TO PRODUCTION**: `apps/api/.env` DATABASE_URL is Neon
  (~16.4K artists). The local docker PostGIS (`docker compose up -d postgres`,
  db `attiko_dev`, ~3.1K artists) is a stale dev copy. Any script you run with
  that .env touches PROD — be deliberate.

## Run
```bash
docker compose up -d postgres        # local dev DB only
pnpm --filter @attiko/api dev        # API :4000 (uses apps/api/.env → PROD db!)
pnpm --filter @attiko/web dev        # web :3000
pnpm --filter @attiko/api typecheck && pnpm --filter @attiko/api test
```

## The relevance problem (2026-07-06 diagnosis — read before touching search)
Bobby's core complaint was "random profiles". Root causes found and fixed:
1. Scraped locations are the SEARCH city, not the artist's city — thousands
   of artists share identical NYC coords. (NOT yet fixed — hardest problem.)
2. 84% of artists were talent_type 'musician' and ~79% had no genres/tags —
   the searched skill was discarded at ingest. Fixed: query is kept as a tag
   and mapped to talent_type (`talentTypeFromQuery` in ingest.ts).
3. Query words were OR'd; ranking was follower-driven. Fixed: AND'd words +
   match-quality relevance ranking (name/tags ≫ bio mention).
4. ~76% of profiles are unvetted YouTube channels (lesson channels, "- Topic"
   auto-channels, churches, fan pages). Fixed via AI vetting (below).

## AI vetting (services/classify.ts)
- claude-sonnet-4-6 judges each profile: bookable act? correct talent type?
  skills/genres? Junk → `meta.notPerformer=true` (+ reason); search/browse
  exclude it. Progress markers in `meta.classifiedAt` / `meta.classifyError`.
- Run: owner console endpoints `startClassification` / `getClassificationStatus`,
  or CLI: `pnpm --filter @attiko/api exec tsx --env-file .env src/scripts/classify.ts [--max N]`
- ~15 artists/call, ~$2 per 1K artists, ~13s/batch. Full-catalog run started
  2026-07-06 (~14.5K artists, ~$32). "- Topic"/VEVO channels were pre-flagged
  by SQL for free.
- To re-run after errors: clear markers —
  `UPDATE artists SET meta = meta - 'classifiedAt' - 'classifyError' WHERE meta->>'classifyError' IS NOT NULL;`

## Hard-won knowledge
- ANTHROPIC_API_KEY (apps/api/.env) is the same key as ~/studio and
  ~/amex-optimizer — one Anthropic account funds all three. If Claude calls
  fail instantly, check credits at console.anthropic.com.
- Search limits are enforced INSIDE the search procedure (`enforceSearchLimit`
  in routers/search.ts) — Express middleware can't target one tRPC procedure;
  middleware/usageLimit.ts is legacy/unmounted.
- postgres-js can't cast a JS array param inside `||` — build explicit
  `ARRAY[...]::text[]` literals (see applyClassification).
- YouTube API quota: 10K units/day, 100/search — autoPopulate caps at 95.
- Nominatim policy is 1 req/s — geocodeLocation caches 24h; keep it that way.
- Advanced search filters in the zod schema (languages, groupSize,
  willingToTravel, hasPressLinks) are accepted but NOT implemented in the
  search procedure; UI filter panel says "coming soon". Implement both sides
  together.

## Working standards (all models, all sessions)
1. Quality first — never trade quality for speed; engineer the proper solution.
2. Read every file you're about to change end-to-end first.
3. Real bugs → hardening → polish. Verify with REAL runs: typecheck, tests,
   and SQL against the DB (prod, carefully) — not assumptions.
4. Update "Status" below when you finish a session.

## Status
- **2026-07-06: full audit + relevance overhaul committed.** Fixed: unenforced
  paywall, inverted budget filters, ingest data-wipe, social-enrich loop,
  geocode caching, contact ordering. Added AI vetting + skill-tag ingest +
  relevance ranking. 1,819 auto-channels junk-flagged in prod by SQL; full
  AI vetting run launched over remaining ~14.5K (check
  `getClassificationStatus` / classify script output for completion).
- Next (not yet done): fix fake locations (extract real city from bio/channel
  during classification, re-geocode); implement the advanced filters end to
  end; embeddings/pgvector for semantic search; new bookable-first sources
  (GigSalad, The Bash enums exist but no scrapers).
