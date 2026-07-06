import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc.js";
import { searchInputSchema, DEFAULT_RANKING_WEIGHTS } from "@attiko/shared/schemas";
import { getDb } from "@attiko/db/client";
import { artists, platformProfiles, users, artistContacts } from "@attiko/db/schema";
import { sql, eq, and, not, lte, gte, or, desc } from "drizzle-orm";
import { geocodeLocation } from "../services/geocoding.js";
import { logger } from "../logger.js";

const MILES_TO_METERS = 1609.344;

// Map colloquial metro names to geocodable city names
const LOCATION_ALIASES: Record<string, string> = {
  "tri-state area": "New York City, NY",
  "tri state area": "New York City, NY",
  "nyc area": "New York City, NY",
  "nyc metro": "New York City, NY",
  "nyc": "New York City, NY",
  "new york area": "New York City, NY",
  "new york metro": "New York City, NY",
  "los angeles area": "Los Angeles, CA",
  "la area": "Los Angeles, CA",
  "la metro": "Los Angeles, CA",
  "miami area": "Miami, FL",
  "south florida": "Miami, FL",
  "chicago area": "Chicago, IL",
  "chicago metro": "Chicago, IL",
  "bay area": "San Francisco, CA",
  "sf bay area": "San Francisco, CA",
  "dc area": "Washington, DC",
  "dmv": "Washington, DC",
};

function normalizeLocation(location: string): string {
  return LOCATION_ALIASES[location.toLowerCase().trim()] ?? location;
}

const SEARCH_LIMITS: Record<string, number> = {
  user: 5,
  pro: Infinity,
  agency: Infinity,
  admin: Infinity,
  owner: Infinity,
};

// Enforced here (not Express middleware) because the limit applies to this
// one procedure — Express middleware on /trpc can't target a single procedure.
async function enforceSearchLimit(
  db: ReturnType<typeof getDb>,
  user: import("@attiko/db/schema").User
): Promise<void> {
  if (user.role === "owner" || user.role === "admin") return;

  const now = new Date();
  const trialActive = user.trialEndsAt && user.trialEndsAt > now;
  const effectiveRole = trialActive ? "pro" : user.role;
  const limit = SEARCH_LIMITS[effectiveRole] ?? SEARCH_LIMITS["user"] ?? 5;

  let used = user.searchesUsedThisMonth;
  const monthAgo = new Date(now);
  monthAgo.setDate(monthAgo.getDate() - 30);
  if (user.searchesResetAt < monthAgo) {
    await db
      .update(users)
      .set({ searchesUsedThisMonth: 0, searchesResetAt: now })
      .where(eq(users.id, user.id));
    used = 0;
  }

  if (used >= limit) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Monthly search limit reached. Upgrade to Pro for unlimited searches.",
    });
  }
}

export const searchRouter = router({
  me: protectedProcedure.query(({ ctx }) => ({
    role: ctx.user.role,
    email: ctx.user.email,
  })),

  browse: protectedProcedure
    .input(z.object({
      talentTypes: z.array(z.string()).optional(),
      genres: z.array(z.string()).optional(),
      hasVideo: z.boolean().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(24),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [
        not(artists.isOptedOut),
        sql`NOT COALESCE((meta->>'notPerformer')::boolean, false)`,
      ];

      if (input.talentTypes && input.talentTypes.length > 0) {
        conditions.push(or(...input.talentTypes.map((t) => eq(artists.talentType, t as any)))!);
      }
      if (input.genres && input.genres.length > 0) {
        conditions.push(sql`${artists.genres} && ARRAY[${sql.join(input.genres.map((g) => sql`${g}`), sql`, `)}]::text[]`);
      }
      if (input.hasVideo) {
        conditions.push(not(sql`${artists.videoUrl} IS NULL`));
      }

      const offset = (input.page - 1) * input.pageSize;
      const rows = await db
        .select({
          id: artists.id, slug: artists.slug, name: artists.name,
          talentType: artists.talentType, bio: artists.bio,
          city: artists.city, country: artists.country,
          genres: artists.genres, imageUrl: artists.imageUrl,
          videoUrl: artists.videoUrl,
          rateMinCents: artists.rateMinCents, rateMaxCents: artists.rateMaxCents,
          rateCurrency: artists.rateCurrency,
          eventFitScore: artists.eventFitScore, overallScore: artists.overallScore,
        })
        .from(artists)
        .where(and(...conditions))
        .orderBy(desc(sql`COALESCE(${artists.overallScore}, 0)`))
        .limit(input.pageSize)
        .offset(offset);

      return {
        items: rows.map((r) => ({
          ...r,
          rateMin: r.rateMinCents ? r.rateMinCents / 100 : null,
          rateMax: r.rateMaxCents ? r.rateMaxCents / 100 : null,
          distanceMiles: null,
          sources: [] as string[],
          socialSources: [] as string[],
        })),
        page: input.page,
        hasMore: rows.length === input.pageSize,
      };
    }),

  search: protectedProcedure
    .input(searchInputSchema)
    .query(async ({ input, ctx }) => {
      const user = ctx.user;
      const db = getDb();
      await enforceSearchLimit(db, user);
      const weights = input.sortWeights ?? DEFAULT_RANKING_WEIGHTS;

      const resolvedLocation = normalizeLocation(input.location);
      const geoResult = await geocodeLocation(resolvedLocation);
      if (geoResult.isErr()) {
        logger.warn({ error: geoResult.error, location: input.location, resolved: resolvedLocation }, "Geocoding failed");
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Could not find location: "${input.location}". Try a city name like "New York" or "Brooklyn".`,
        });
      }
      const { lat, lng } = geoResult.value;
      const radiusMeters = input.radiusMiles * MILES_TO_METERS;

      const conditions = [
        not(artists.isOptedOut),
        // Exclude profiles the AI vetting pass flagged as non-performers
        sql`NOT COALESCE((meta->>'notPerformer')::boolean, false)`,
        sql`geo_point IS NOT NULL`,
        sql`ST_DWithin(
          geo_point::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${radiusMeters}
        )`,
      ];

      // Every query word must match SOMEWHERE on the artist (AND across words,
      // OR across fields). The old OR-across-words let "jazz saxophonist"
      // return anyone matching just "jazz" — a big source of irrelevant results.
      // queryRelevance ranks matches by field quality: a hit in the name or
      // skill tags is worth far more than a passing mention in a bio.
      let queryRelevance = sql`0`;
      if (input.query && input.query.trim()) {
        const words = input.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
        for (const word of words) {
          const pattern = `%${word}%`;
          conditions.push(
            or(
              sql`LOWER(${artists.name}) LIKE ${pattern}`,
              sql`LOWER(COALESCE(${artists.bio}, '')) LIKE ${pattern}`,
              sql`LOWER(${artists.talentType}::text) LIKE ${pattern}`,
              sql`EXISTS (SELECT 1 FROM unnest(${artists.genres}) g WHERE LOWER(g) LIKE ${pattern})`,
              sql`EXISTS (SELECT 1 FROM unnest(${artists.tags}) t WHERE LOWER(t) LIKE ${pattern})`
            )!
          );
          queryRelevance = sql`${queryRelevance}
            + (CASE WHEN LOWER(${artists.name}) LIKE ${pattern} THEN 40 ELSE 0 END)
            + (CASE WHEN LOWER(${artists.talentType}::text) LIKE ${pattern}
                      OR EXISTS (SELECT 1 FROM unnest(${artists.tags}) t WHERE LOWER(t) LIKE ${pattern})
                      OR EXISTS (SELECT 1 FROM unnest(${artists.genres}) g WHERE LOWER(g) LIKE ${pattern})
                    THEN 30 ELSE 0 END)`;
        }
      }

      if (input.talentTypes && input.talentTypes.length > 0) {
        conditions.push(or(...input.talentTypes.map((t) => eq(artists.talentType, t)))!);
      }

      // Budget overlap: the artist's rate range must intersect the user's
      // budget range. Artists with no published rate are always included.
      if (input.budgetMax !== undefined) {
        conditions.push(or(lte(artists.rateMinCents, input.budgetMax * 100), sql`${artists.rateMinCents} IS NULL`)!);
      }

      if (input.budgetMin !== undefined) {
        conditions.push(or(gte(artists.rateMaxCents, input.budgetMin * 100), sql`${artists.rateMaxCents} IS NULL`)!);
      }

      const offset = (input.page - 1) * input.pageSize;

      const rows = await db
        .select({
          artist: artists,
          distanceMeters: sql<number>`ST_Distance(
            geo_point::geography,
            ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
          )`,
        })
        .from(artists)
        .where(and(...conditions))
        .orderBy(
          sql`(
            (${queryRelevance}) * 3
            + COALESCE(${artists.overallScore}, 0) * ${sql.raw(String(weights.semantic + weights.socialProof + weights.eventFit + weights.mediaQuality))}
            + COALESCE(${artists.recencyScore}, 0) * ${sql.raw(String(weights.recency))}
            - (ST_Distance(
                geo_point::geography,
                ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
              ) / ${radiusMeters}) * ${sql.raw(String(weights.geo))} * 100
          ) DESC`
        )
        .limit(input.pageSize)
        .offset(offset);

      const artistIds = rows.map((r) => r.artist.id);
      const profiles =
        artistIds.length > 0
          ? await db.select().from(platformProfiles).where(or(...artistIds.map((id) => eq(platformProfiles.artistId, id)))!)
          : [];

      const profilesByArtist = new Map<string, typeof profiles>();
      for (const p of profiles) {
        const arr = profilesByArtist.get(p.artistId) ?? [];
        arr.push(p);
        profilesByArtist.set(p.artistId, arr);
      }

      if (user.role !== "owner" && user.role !== "admin") {
        await db
          .update(users)
          .set({ searchesUsedThisMonth: sql`${users.searchesUsedThisMonth} + 1` })
          .where(eq(users.id, user.id));
      }

      const results = rows.map((r) => {
        const artistProfiles = profilesByArtist.get(r.artist.id) ?? [];
        return {
          id: r.artist.id,
          slug: r.artist.slug,
          name: r.artist.name,
          talentType: r.artist.talentType,
          bio: r.artist.bio,
          location: r.artist.locationLabel,
          city: r.artist.city,
          country: r.artist.country,
          lat: r.artist.lat,
          lng: r.artist.lng,
          distanceMiles: r.distanceMeters / MILES_TO_METERS,
          genres: r.artist.genres,
          instruments: r.artist.instruments,
          languages: r.artist.languages,
          tags: r.artist.tags,
          imageUrl: r.artist.imageUrl,
          videoUrl: r.artist.videoUrl,
          audioUrl: r.artist.audioUrl,
          rateMin: r.artist.rateMinCents ? r.artist.rateMinCents / 100 : null,
          rateMax: r.artist.rateMaxCents ? r.artist.rateMaxCents / 100 : null,
          rateCurrency: r.artist.rateCurrency,
          eventFitScore: r.artist.eventFitScore,
          socialProofScore: r.artist.socialProofScore,
          mediaQualityScore: r.artist.mediaQualityScore,
          recencyScore: r.artist.recencyScore,
          overallScore: r.artist.overallScore,
          sources: [...new Set(artistProfiles.map((p) => p.source))],
          platformProfiles: artistProfiles.map((p) => ({
            source: p.source,
            externalId: p.externalId,
            url: p.url,
            followerCount: p.followerCount,
            verifiedBadge: p.verifiedBadge,
          })),
          lastActiveAt: r.artist.lastActiveAt?.toISOString() ?? null,
          createdAt: r.artist.createdAt.toISOString(),
          updatedAt: r.artist.updatedAt.toISOString(),
        };
      });

      return {
        items: results,
        total: results.length,
        page: input.page,
        pageSize: input.pageSize,
        hasMore: results.length === input.pageSize,
        geocodedLocation: geoResult.value,
      };
    }),

  getArtist: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [row] = await db
        .select()
        .from(artists)
        .where(and(eq(artists.slug, input.slug), not(artists.isOptedOut)))
        .limit(1);

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Artist not found" });
      }

      const [profiles, contacts] = await Promise.all([
        db.select().from(platformProfiles).where(eq(platformProfiles.artistId, row.id)),
        db.select().from(artistContacts).where(eq(artistContacts.artistId, row.id)).orderBy(desc(artistContacts.confidenceScore)),
      ]);

      return {
        ...row,
        platformProfiles: profiles.map((p) => ({
          source: p.source,
          externalId: p.externalId,
          url: p.url,
          name: p.name,
          followerCount: p.followerCount,
          verifiedBadge: p.verifiedBadge,
          viewCount: p.viewCount,
          playCount: p.playCount,
          lastFetchedAt: p.lastFetchedAt?.toISOString() ?? null,
        })),
        contacts: contacts.map((c) => ({
          type: c.type,
          subtype: c.subtype,
          value: c.value,
          label: c.label,
          isVerified: c.isVerified,
          confidenceScore: c.confidenceScore,
        })),
      };
    }),
});
