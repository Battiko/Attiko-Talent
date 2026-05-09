import { getDb } from "@attiko/db/client";
import { artists, platformProfiles } from "@attiko/db/schema";
import { eq, isNull, and, sql } from "drizzle-orm";
import { logger } from "../logger.js";

interface EnrichResult {
  imageUrl?: string | null;
  bio?: string | null;
  videoUrl?: string | null;
}

function cleanBio(raw: string): string {
  return raw
    .replace(/<a[^>]*>.*?<\/a>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 800);
}

async function getLastFmData(name: string, apiKey: string): Promise<{ bio: string | null; imageUrl: string | null }> {
  try {
    const params = new URLSearchParams({
      method: "artist.getinfo",
      artist: name,
      api_key: apiKey,
      format: "json",
    });
    const res = await fetch(`https://ws.audioscrobbler.com/2.0/?${params}`, {
      headers: { "User-Agent": "Attiko/1.0 (bobbyattiko@me.com)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { bio: null, imageUrl: null };
    const data = await res.json() as Record<string, unknown>;
    const artist = (data as { artist?: { bio?: { summary?: string }; image?: { "#text": string; size: string }[] } }).artist;
    if (!artist) return { bio: null, imageUrl: null };
    const rawBio = artist.bio?.summary ?? "";
    const bio = rawBio ? cleanBio(rawBio) : null;
    const imageUrl = (artist.image ?? [])
      .find((i) => i.size === "extralarge" || i.size === "large")?.["#text"] ?? null;
    return {
      bio: bio && bio.length > 10 ? bio : null,
      imageUrl: imageUrl && !imageUrl.includes("2a96cbd8b46e442fc41c2b86b821562f") ? imageUrl : null,
    };
  } catch {
    return { bio: null, imageUrl: null };
  }
}

async function getYouTubeVideo(name: string, apiKey: string): Promise<{ videoUrl: string | null; imageUrl: string | null }> {
  try {
    const params = new URLSearchParams({
      part: "snippet",
      type: "video",
      q: `${name} live performance`,
      maxResults: "3",
      key: apiKey,
    });
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { videoUrl: null, imageUrl: null };
    const data = await res.json() as { items?: { id?: { videoId?: string }; snippet?: { thumbnails?: { high?: { url?: string } } } }[] };
    const first = data.items?.[0];
    const videoId = first?.id?.videoId;
    const thumbUrl = first?.snippet?.thumbnails?.high?.url ?? null;
    return {
      videoUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : null,
      imageUrl: thumbUrl ?? null,
    };
  } catch {
    return { videoUrl: null, imageUrl: null };
  }
}

async function getYouTubeChannelImage(name: string, apiKey: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      part: "snippet",
      type: "channel",
      q: name,
      maxResults: "1",
      key: apiKey,
    });
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { items?: { snippet?: { thumbnails?: { high?: { url?: string } } } }[] };
    return data.items?.[0]?.snippet?.thumbnails?.high?.url ?? null;
  } catch {
    return null;
  }
}

interface SocialProfile {
  source: "instagram" | "tiktok";
  url: string;
  username: string;
}

async function findSocialProfiles(name: string, apiKey: string, cseId: string): Promise<SocialProfile[]> {
  const found: SocialProfile[] = [];

  const platforms: { source: "instagram" | "tiktok"; site: string; pattern: RegExp }[] = [
    { source: "instagram", site: "instagram.com", pattern: /instagram\.com\/([a-zA-Z0-9._]+)\/?/ },
    { source: "tiktok",    site: "tiktok.com",    pattern: /tiktok\.com\/@([a-zA-Z0-9._]+)\/?/ },
  ];

  for (const platform of platforms) {
    try {
      const params = new URLSearchParams({
        key: apiKey,
        cx: cseId,
        q: `"${name}" site:${platform.site}`,
        num: "3",
      });
      const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const data = await res.json() as { items?: { link?: string }[] };
      for (const item of data.items ?? []) {
        const match = item.link?.match(platform.pattern);
        if (match?.[1]) {
          const username = match[1];
          // Skip generic/unrelated pages
          if (["explore", "reel", "p", "stories", "accounts", "tv"].includes(username)) continue;
          found.push({ source: platform.source, url: item.link!, username });
          break;
        }
      }
      await new Promise((r) => setTimeout(r, 300));
    } catch {
      continue;
    }
  }

  return found;
}

async function saveSocialProfiles(artistId: string, profiles: SocialProfile[]): Promise<void> {
  const db = getDb();
  for (const profile of profiles) {
    try {
      await db.insert(platformProfiles).values({
        artistId,
        source: profile.source,
        externalId: `${profile.source}-${profile.username}`,
        url: profile.url,
        name: profile.username,
      }).onConflictDoNothing();
    } catch {
      continue;
    }
  }
}

export async function enrichSocialProfiles(artistId: string): Promise<{ found: string[] }> {
  const db = getDb();
  const apiKey = process.env["YOUTUBE_API_KEY"];
  const cseId = process.env["GOOGLE_CSE_ID"];
  if (!apiKey || !cseId) return { found: [] };

  const [artist] = await db.select({ id: artists.id, name: artists.name }).from(artists).where(eq(artists.id, artistId));
  if (!artist) return { found: [] };

  const profiles = await findSocialProfiles(artist.name, apiKey, cseId);
  if (profiles.length > 0) {
    await saveSocialProfiles(artistId, profiles);
    logger.info({ artistId, artistName: artist.name, found: profiles.map((p) => p.source) }, "Social profiles found");
  }
  return { found: profiles.map((p) => p.source) };
}

export async function bulkEnrichSocial(limit: number): Promise<{ enriched: number; total: number }> {
  const db = getDb();
  // Artists that have no instagram or tiktok profile yet
  const rows = await db
    .select({ id: artists.id })
    .from(artists)
    .limit(limit);

  let enriched = 0;
  for (const row of rows) {
    const result = await enrichSocialProfiles(row.id);
    if (result.found.length > 0) enriched++;
    await new Promise((r) => setTimeout(r, 500));
  }
  return { enriched, total: rows.length };
}

export async function enrichArtistById(artistId: string): Promise<EnrichResult> {
  const db = getDb();
  const lastFmKey = process.env["LASTFM_API_KEY"];
  const youtubeKey = process.env["YOUTUBE_API_KEY"];

  const [artist] = await db
    .select({ id: artists.id, name: artists.name, imageUrl: artists.imageUrl, bio: artists.bio, videoUrl: artists.videoUrl })
    .from(artists)
    .where(eq(artists.id, artistId));

  if (!artist) return {};

  const updates: EnrichResult = {};

  if (lastFmKey) {
    const { bio, imageUrl } = await getLastFmData(artist.name, lastFmKey);
    if (!artist.imageUrl && imageUrl) updates.imageUrl = imageUrl;
    if (!artist.bio && bio) updates.bio = bio;
  }

  if (youtubeKey) {
    if (!artist.imageUrl && !updates.imageUrl) {
      const channelImage = await getYouTubeChannelImage(artist.name, youtubeKey);
      if (channelImage) updates.imageUrl = channelImage;
    }

    if (!artist.videoUrl) {
      const { videoUrl, imageUrl: thumbUrl } = await getYouTubeVideo(artist.name, youtubeKey);
      if (videoUrl) updates.videoUrl = videoUrl;
      if (!artist.imageUrl && !updates.imageUrl && thumbUrl) updates.imageUrl = thumbUrl;
    }
  }

  if (Object.keys(updates).length > 0) {
    await db.update(artists).set({ ...updates, updatedAt: new Date() }).where(eq(artists.id, artistId));
    logger.info({ artistId, artistName: artist.name, updates: Object.keys(updates) }, "Artist enriched");
  }

  return updates;
}

export async function bulkEnrichMissing(
  field: "image" | "bio" | "video",
  limit: number
): Promise<{ enriched: number; total: number }> {
  const db = getDb();

  const condition =
    field === "image" ? isNull(artists.imageUrl) :
    field === "bio" ? isNull(artists.bio) :
    isNull(artists.videoUrl);

  const rows = await db
    .select({ id: artists.id })
    .from(artists)
    .where(and(condition))
    .limit(limit);

  let enriched = 0;
  for (const row of rows) {
    const result = await enrichArtistById(row.id);
    const relevant =
      field === "image" ? result.imageUrl :
      field === "bio" ? result.bio :
      result.videoUrl;
    if (relevant) enriched++;
    await new Promise((r) => setTimeout(r, 300));
  }

  return { enriched, total: rows.length };
}
