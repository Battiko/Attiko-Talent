import { z } from "zod";
import { router, ownerProcedure } from "../trpc.js";
import { getDb } from "@attiko/db/client";
import { users, scrapeJobs, auditLog, artists } from "@attiko/db/schema";
import { desc, eq, count, ilike, or, isNull, sql, and } from "drizzle-orm";
import { SpotifyScraper, YouTubeScraper, LastFmScraper, MusicBrainzScraper } from "@attiko/scrapers";
import { geocodeLocation } from "../services/geocoding.js";
import { ingestScrapeResults } from "../services/ingest.js";
import { logger } from "../logger.js";
import { enrichArtistById, bulkEnrichMissing, enrichSocialProfiles, bulkEnrichSocial } from "../services/enrich.js";

const LOCATION_EXPANSIONS: Record<string, string[]> = {
  "tri-state area": ["New York City", "Brooklyn", "Queens", "Bronx", "Staten Island", "Newark", "Jersey City", "Hoboken", "Stamford", "Hartford", "Bridgeport", "Long Island"],
  "tri state area": ["New York City", "Brooklyn", "Queens", "Bronx", "Staten Island", "Newark", "Jersey City", "Hoboken", "Stamford", "Hartford", "Bridgeport", "Long Island"],
  "nyc area": ["New York City", "Brooklyn", "Queens", "Bronx", "Staten Island", "Long Island", "Newark", "Jersey City"],
  "new york area": ["New York City", "Brooklyn", "Queens", "Bronx", "Staten Island", "Long Island", "White Plains", "Yonkers"],
  "new york": ["New York City", "Brooklyn", "Queens", "Bronx", "Long Island"],
  "new jersey": ["Newark", "Jersey City", "Hoboken", "Trenton", "Atlantic City", "Princeton"],
  "connecticut": ["Stamford", "Hartford", "Bridgeport", "New Haven", "Greenwich"],
  "miami area": ["Miami", "Miami Beach", "Fort Lauderdale", "Boca Raton", "West Palm Beach"],
  "los angeles area": ["Los Angeles", "Hollywood", "Santa Monica", "Burbank", "Pasadena"],
  "london area": ["London", "East London", "North London", "South London"],
};

function expandLocation(location: string): string[] {
  const key = location.toLowerCase().trim();
  return LOCATION_EXPANSIONS[key] ?? [location];
}

export const operatorRouter = router({
  getStats: ownerProcedure.query(async () => {
    const db = getDb();
    const [userRows, scrapeJobRows, artistRows] = await Promise.all([
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(scrapeJobs),
      db.select({ count: count() }).from(artists),
    ]);
    return {
      totalUsers: userRows[0]?.count ?? 0,
      totalScrapeJobs: scrapeJobRows[0]?.count ?? 0,
      totalArtists: artistRows[0]?.count ?? 0,
    };
  }),

  triggerScrape: ownerProcedure
    .input(z.object({
      query: z.string().min(1),
      location: z.string().min(1),
      platforms: z.array(z.enum(["spotify", "youtube", "lastfm", "musicbrainz"])).min(1),
    }))
    .mutation(async ({ input }) => {
      const locations = expandLocation(input.location);
      let totalCreated = 0;
      let totalUpdated = 0;
      let totalSkipped = 0;
      const errors: string[] = [];

      for (const location of locations) {
        const geoResult = await geocodeLocation(location);
        if (geoResult.isErr()) {
          errors.push(`Could not geocode: ${location}`);
          continue;
        }
        const geo = geoResult.value;

      for (const platform of input.platforms) {
        try {
          let results: Awaited<ReturnType<SpotifyScraper["search"]>> | Awaited<ReturnType<YouTubeScraper["search"]>>;

          if (platform === "spotify") {
            const clientId = process.env["SPOTIFY_CLIENT_ID"];
            const clientSecret = process.env["SPOTIFY_CLIENT_SECRET"];
            if (!clientId || !clientSecret) { errors.push("Spotify credentials not configured"); continue; }
            const scraper = new SpotifyScraper(clientId, clientSecret);
            results = await scraper.search(input.query, location);
          } else if (platform === "youtube") {
            const apiKey = process.env["YOUTUBE_API_KEY"];
            if (!apiKey) { errors.push("YouTube API key not configured"); continue; }
            const scraper = new YouTubeScraper(apiKey);
            results = await scraper.search(input.query, location);
          } else if (platform === "lastfm") {
            const apiKey = process.env["LASTFM_API_KEY"];
            if (!apiKey) { errors.push("Last.fm API key not configured"); continue; }
            const scraper = new LastFmScraper(apiKey);
            results = await scraper.search(input.query, location);
          } else {
            const scraper = new MusicBrainzScraper();
            results = await scraper.search(input.query, location);
          }

          if (results.isErr()) {
            errors.push(`${platform} (${location}): ${results.error.message}`);
            continue;
          }

          const summary = await ingestScrapeResults(results.value, geo);
          totalCreated += summary.created;
          totalUpdated += summary.updated;
          totalSkipped += summary.skipped;
          logger.info({ platform, location, ...summary }, "Search ingested");
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          errors.push(`${platform} (${location}): ${msg}`);
        }
      }
      } // end location loop

      return { created: totalCreated, updated: totalUpdated, skipped: totalSkipped, errors };
    }),

  listArtists: ownerProcedure
    .input(z.object({
      page: z.number().default(1),
      pageSize: z.number().default(50),
      search: z.string().optional(),
      missingField: z.enum(["image", "bio", "geo", "genres"]).optional(),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];
      if (input.search) {
        conditions.push(ilike(artists.name, `%${input.search}%`));
      }
      if (input.missingField === "image") conditions.push(isNull(artists.imageUrl));
      if (input.missingField === "bio") conditions.push(isNull(artists.bio));
      if (input.missingField === "geo") conditions.push(sql`geo_point IS NULL`);
      if (input.missingField === "genres") conditions.push(sql`array_length(${artists.genres}, 1) IS NULL`);

      const [rows, totalRows] = await Promise.all([
        db.select({
          id: artists.id, slug: artists.slug, name: artists.name,
          talentType: artists.talentType, imageUrl: artists.imageUrl,
          bio: artists.bio, city: artists.city, country: artists.country,
          genres: artists.genres, overallScore: artists.overallScore,
          isOptedOut: artists.isOptedOut, createdAt: artists.createdAt,
        })
        .from(artists)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(artists.createdAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize),
        db.select({ count: count() }).from(artists).where(conditions.length ? and(...conditions) : undefined),
      ]);

      return { rows, total: totalRows[0]?.count ?? 0 };
    }),

  updateArtist: ownerProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      bio: z.string().nullable().optional(),
      imageUrl: z.string().nullable().optional(),
      talentType: z.enum(["musician","vocalist","dj","dancer","band","ensemble","instrumentalist","performer","other"]).optional(),
      isOptedOut: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { id, ...fields } = input;
      await db.update(artists).set({ ...fields, updatedAt: new Date() }).where(eq(artists.id, id));
      await db.insert(auditLog).values({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "update_artist", targetType: "artist", targetId: id });
      return { success: true };
    }),

  deleteArtist: ownerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.delete(artists).where(eq(artists.id, input.id));
      await db.insert(auditLog).values({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "delete_artist", targetType: "artist", targetId: input.id });
      return { success: true };
    }),

  getDataQuality: ownerProcedure.query(async () => {
    const db = getDb();
    const [total, missingImage, missingBio, missingGeo, missingGenres, optedOut] = await Promise.all([
      db.select({ count: count() }).from(artists),
      db.select({ count: count() }).from(artists).where(isNull(artists.imageUrl)),
      db.select({ count: count() }).from(artists).where(isNull(artists.bio)),
      db.select({ count: count() }).from(artists).where(sql`geo_point IS NULL`),
      db.select({ count: count() }).from(artists).where(sql`array_length(${artists.genres}, 1) IS NULL`),
      db.select({ count: count() }).from(artists).where(eq(artists.isOptedOut, true)),
    ]);
    const t = total[0]?.count ?? 1;
    return {
      total: t,
      missingImage: missingImage[0]?.count ?? 0,
      missingBio: missingBio[0]?.count ?? 0,
      missingGeo: missingGeo[0]?.count ?? 0,
      missingGenres: missingGenres[0]?.count ?? 0,
      optedOut: optedOut[0]?.count ?? 0,
      withImage: t - (missingImage[0]?.count ?? 0),
      withBio: t - (missingBio[0]?.count ?? 0),
      withGeo: t - (missingGeo[0]?.count ?? 0),
      withGenres: t - (missingGenres[0]?.count ?? 0),
    };
  }),

  listUsers: ownerProcedure
    .input(z.object({ page: z.number().default(1), pageSize: z.number().default(50) }))
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db
        .select({
          id: users.id,
          email: users.email,
          role: users.role,
          searchesUsedThisMonth: users.searchesUsedThisMonth,
          createdAt: users.createdAt,
          stripeCustomerId: users.stripeCustomerId,
        })
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);

      return rows;
    }),

  setUserRole: ownerProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["user", "pro", "agency", "admin"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db
        .update(users)
        .set({ role: input.role, updatedAt: new Date() })
        .where(eq(users.id, input.userId));

      await db.insert(auditLog).values({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "set_user_role",
        targetType: "user",
        targetId: input.userId,
        meta: { newRole: input.role },
      });

      return { success: true };
    }),

  enrichArtist: ownerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const result = await enrichArtistById(input.id);
      return { updated: Object.keys(result).length > 0, fields: Object.keys(result) };
    }),

  bulkEnrich: ownerProcedure
    .input(z.object({
      field: z.enum(["image", "bio", "video"]),
      limit: z.number().default(25),
    }))
    .mutation(async ({ input }) => {
      return bulkEnrichMissing(input.field, input.limit);
    }),

  enrichSocial: ownerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return enrichSocialProfiles(input.id);
    }),

  bulkEnrichSocial: ownerProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .mutation(async ({ input }) => {
      return bulkEnrichSocial(input.limit);
    }),

  getAuditLog: ownerProcedure
    .input(z.object({ page: z.number().default(1), pageSize: z.number().default(100) }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(auditLog)
        .orderBy(desc(auditLog.createdAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);
    }),
});
