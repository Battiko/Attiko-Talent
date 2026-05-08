import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc.js";
import { searchInputSchema, DEFAULT_RANKING_WEIGHTS } from "@attiko/shared/schemas";
import { getDb } from "@attiko/db/client";
import { artists, platformProfiles, users } from "@attiko/db/schema";
import { sql, eq, and, not, lte, gte, or } from "drizzle-orm";
import { geocodeLocation } from "../services/geocoding.js";
import { logger } from "../logger.js";

const MILES_TO_METERS = 1609.344;

export const searchRouter = router({
  search: protectedProcedure
    .input(searchInputSchema)
    .query(async ({ input, ctx }) => {
      const user = ctx.user;
      const db = getDb();
      const weights = input.sortWeights ?? DEFAULT_RANKING_WEIGHTS;

      // Geocode the location
      const geoResult = await geocodeLocation(input.location);
      if (geoResult.isErr()) {
        logger.warn({ error: geoResult.error, location: input.location }, "Geocoding failed");
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Could not geocode location: ${input.location}`,
        });
      }
      const { lat, lng } = geoResult.value;
      const radiusMeters = input.radiusMiles * MILES_TO_METERS;

      // Base query — PostGIS spatial filter
      const conditions = [
        not(artists.isOptedOut),
        sql`${artists.geoPoint} IS NOT NULL`,
        sql`ST_DWithin(
          ${artists.geoPoint}::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${radiusMeters}
        )`,
      ];

      if (input.talentTypes && input.talentTypes.length > 0) {
        conditions.push(
          or(...input.talentTypes.map((t) => eq(artists.talentType, t)))!
        );
      }

      if (input.budgetMin !== undefined) {
        conditions.push(
          or(
            lte(artists.rateMinCents, input.budgetMin * 100),
            sql`${artists.rateMinCents} IS NULL`
          )!
        );
      }

      if (input.budgetMax !== undefined) {
        conditions.push(
          or(
            gte(artists.rateMaxCents, input.budgetMax * 100),
            sql`${artists.rateMaxCents} IS NULL`
          )!
        );
      }

      const offset = (input.page - 1) * input.pageSize;

      const rows = await db
        .select({
          artist: artists,
          distanceMeters: sql<number>`ST_Distance(
            ${artists.geoPoint}::geography,
            ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
          )`,
        })
        .from(artists)
        .where(and(...conditions))
        .orderBy(
          sql`(
            COALESCE(${artists.overallScore}, 0) * ${weights.semantic + weights.socialProof + weights.eventFit + weights.mediaQuality}
            + COALESCE(${artists.recencyScore}, 0) * ${weights.recency}
            - (ST_Distance(
                ${artists.geoPoint}::geography,
                ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
              ) / ${radiusMeters}) * ${weights.geo} * 100
          ) DESC`
        )
        .limit(input.pageSize)
        .offset(offset);

      // Fetch platform profiles for results
      const artistIds = rows.map((r) => r.artist.id);
      const profiles =
        artistIds.length > 0
          ? await db
              .select()
              .from(platformProfiles)
              .where(
                or(...artistIds.map((id) => eq(platformProfiles.artistId, id)))!
              )
          : [];

      const profilesByArtist = new Map<string, typeof profiles>();
      for (const p of profiles) {
        const arr = profilesByArtist.get(p.artistId) ?? [];
        arr.push(p);
        profilesByArtist.set(p.artistId, arr);
      }

      // Increment search counter (skip for owner/admin)
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

      const profiles = await db
        .select()
        .from(platformProfiles)
        .where(eq(platformProfiles.artistId, row.id));

      return {
        ...row,
        geoPoint: undefined, // never serialize PostGIS type to client
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
      };
    }),
});
