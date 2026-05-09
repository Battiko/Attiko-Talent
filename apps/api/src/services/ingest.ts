import { getDb } from "@attiko/db/client";
import { artists, platformProfiles } from "@attiko/db/schema";
import type { ScrapeResult } from "@attiko/scrapers";
import { sql, eq, and } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { geocodeLocation } from "./geocoding.js";
import { logger } from "../logger.js";

function slugify(name: string, suffix: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) + `-${suffix}`;
}

function calcSocialProofScore(followerCount: number | null | undefined): number {
  if (!followerCount || followerCount <= 0) return 10;
  // log scale: 100 followers = ~20, 10k = ~50, 1M = ~90
  return Math.min(100, Math.round(10 + (Math.log10(followerCount) / 6) * 80));
}

function calcMediaQualityScore(result: ScrapeResult["artist"]): number {
  let score = 20;
  if (result.imageUrl) score += 30;
  if (result.bio && result.bio.length > 50) score += 25;
  if (result.videoUrl) score += 25;
  return Math.min(100, score);
}

function calcEventFitScore(genres: string[]): number {
  const eventGenres = ["jazz", "classical", "wedding", "acoustic", "pop", "soul", "r&b", "latin", "bossa nova", "swing", "blues", "folk"];
  if (genres.length === 0) return 40;
  const matches = genres.filter((g) => eventGenres.some((e) => g.toLowerCase().includes(e)));
  const base = 30;
  const bonus = Math.min(70, (matches.length / Math.max(1, genres.length)) * 70);
  return Math.round(base + bonus);
}

export interface IngestSummary {
  created: number;
  updated: number;
  skipped: number;
}

export async function ingestScrapeResults(
  results: ScrapeResult[],
  defaultLocation: { lat: number; lng: number; city: string | null; country: string | null; label: string } | null
): Promise<IngestSummary> {
  const db = getDb();
  const summary: IngestSummary = { created: 0, updated: 0, skipped: 0 };

  for (const result of results) {
    try {
      const profiles = result.profiles;
      if (!profiles || profiles.length === 0) {
        summary.skipped++;
        continue;
      }

      const primaryProfile = profiles[0]!;
      if (!primaryProfile.source || !primaryProfile.externalId) {
        summary.skipped++;
        continue;
      }

      // Check if this platform profile already exists
      const [existingProfile] = await db
        .select({ artistId: platformProfiles.artistId })
        .from(platformProfiles)
        .where(
          and(
            eq(platformProfiles.source, primaryProfile.source),
            eq(platformProfiles.externalId, primaryProfile.externalId)
          )
        )
        .limit(1);

      const artistData = result.artist;
      const genres = artistData.genres ?? [];
      const followerCount = primaryProfile.followerCount ?? null;

      const socialProofScore = calcSocialProofScore(followerCount);
      const mediaQualityScore = calcMediaQualityScore(artistData);
      const eventFitScore = calcEventFitScore(genres);
      const overallScore = Math.round(eventFitScore * 0.35 + socialProofScore * 0.35 + mediaQualityScore * 0.30);

      // Use artist's own location if available, else fall back to search location
      let location = defaultLocation;
      if (artistData.city && artistData.countryCode) {
        const geoResult = await geocodeLocation(`${artistData.city}, ${artistData.countryCode}`);
        if (geoResult.isOk()) {
          location = geoResult.value;
        }
      }

      if (existingProfile) {
        // Update existing artist's scores and media
        await db
          .update(artists)
          .set({
            imageUrl: artistData.imageUrl ?? undefined,
            bio: artistData.bio ?? undefined,
            genres: genres.length > 0 ? genres : undefined,
            socialProofScore,
            mediaQualityScore,
            eventFitScore,
            overallScore,
            enrichedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(artists.id, existingProfile.artistId));

        // Update platform profile
        await db
          .update(platformProfiles)
          .set({
            followerCount: primaryProfile.followerCount ?? undefined,
            imageUrl: primaryProfile.imageUrl ?? undefined,
            bio: primaryProfile.bio ?? undefined,
            lastFetchedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(platformProfiles.source, primaryProfile.source),
              eq(platformProfiles.externalId, primaryProfile.externalId)
            )
          );

        summary.updated++;
      } else {
        // Create new artist
        const name = artistData.name ?? primaryProfile.name ?? "Unknown Artist";
        const suffix = createId().slice(0, 8);
        const slug = slugify(name, suffix);

        const [newArtist] = await db
          .insert(artists)
          .values({
            slug,
            name,
            talentType: artistData.talentType ?? "musician",
            bio: artistData.bio ?? null,
            imageUrl: artistData.imageUrl ?? null,
            videoUrl: artistData.videoUrl ?? null,
            genres: genres,
            tags: genres,
            languages: ["English"],
            city: location?.city ?? artistData.city ?? null,
            country: location?.country ?? null,
            locationLabel: location?.label ?? null,
            lat: location?.lat ?? null,
            lng: location?.lng ?? null,
            socialProofScore,
            mediaQualityScore,
            eventFitScore,
            overallScore,
            rateCurrency: "USD",
            enrichedAt: new Date(),
          })
          .returning({ id: artists.id });

        if (!newArtist) {
          summary.skipped++;
          continue;
        }

        // Set geo_point if we have coordinates
        if (location?.lat && location?.lng) {
          await db.execute(
            sql`UPDATE artists SET geo_point = ST_SetSRID(ST_MakePoint(${location.lng}, ${location.lat}), 4326) WHERE id = ${newArtist.id}`
          );
        }

        // Insert all platform profiles
        for (const profile of profiles) {
          if (!profile.source || !profile.externalId || !profile.url) continue;
          await db
            .insert(platformProfiles)
            .values({
              artistId: newArtist.id,
              source: profile.source,
              externalId: profile.externalId,
              url: profile.url,
              name: profile.name ?? name,
              bio: profile.bio ?? null,
              imageUrl: profile.imageUrl ?? null,
              followerCount: profile.followerCount ?? null,
              viewCount: profile.viewCount ?? null,
              lastFetchedAt: new Date(),
            })
            .onConflictDoNothing();
        }

        summary.created++;
      }
    } catch (err) {
      logger.warn({ err }, "Failed to ingest scrape result — skipping");
      summary.skipped++;
    }
  }

  return summary;
}
