import { z } from "zod";
import { BaseScraper, type ScrapeResult } from "../base/scraper.js";
import { AppError, err, ok, type Result } from "@attiko/shared/errors";

const artistSchema = z.object({
  name: z.string(),
  mbid: z.string().optional(),
  url: z.string(),
  image: z.array(z.object({ "#text": z.string(), size: z.string() })).optional(),
  listeners: z.string().optional(),
  bio: z.object({ summary: z.string() }).optional(),
  tags: z.object({ tag: z.array(z.object({ name: z.string() })) }).optional(),
});

const searchResponseSchema = z.object({
  results: z.object({
    artistmatches: z.object({
      artist: z.array(artistSchema).default([]),
    }),
  }),
});

const artistInfoSchema = z.object({
  artist: z.object({
    name: z.string(),
    mbid: z.string().optional(),
    url: z.string(),
    image: z.array(z.object({ "#text": z.string(), size: z.string() })).optional(),
    stats: z.object({ listeners: z.string(), playcount: z.string() }).optional(),
    bio: z.object({ summary: z.string() }).optional(),
    tags: z.object({ tag: z.array(z.object({ name: z.string() })) }).optional(),
  }),
});

function cleanBio(raw: string): string {
  return raw
    .replace(/<a[^>]*>.*?<\/a>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 600);
}

function extractSocialHandles(bio: string): { instagram: string | null; tiktok: string | null } {
  const igMatch = bio.match(/instagram\.com\/([a-zA-Z0-9._]+)/i);
  const ttMatch = bio.match(/tiktok\.com\/@([a-zA-Z0-9._]+)/i);
  return {
    instagram: igMatch?.[1] ? `https://instagram.com/${igMatch[1]}` : null,
    tiktok: ttMatch?.[1] ? `https://tiktok.com/@${ttMatch[1]}` : null,
  };
}

export class LastFmScraper extends BaseScraper {
  constructor(private readonly apiKey: string) {
    super("lastfm", { rateDelayMs: 300 });
  }

  async search(query: string, location: string): Promise<Result<ScrapeResult[], AppError>> {
    const searchResult = await this.fetchWithRetry(async () => {
      const params = new URLSearchParams({
        method: "artist.search",
        artist: `${query} ${location}`,
        api_key: this.apiKey,
        format: "json",
        limit: "50",
      });
      const res = await fetch(`https://ws.audioscrobbler.com/2.0/?${params}`);
      if (!res.ok) throw new Error(`Last.fm search ${res.status}`);
      return searchResponseSchema.parse(await res.json());
    }, `search:${query}`);

    if (searchResult.isErr()) return err(searchResult.error);

    const artists = searchResult.value.results.artistmatches.artist;
    const results: ScrapeResult[] = [];

    for (const artist of artists.slice(0, 30)) {
      try {
        const infoResult = await this.fetchWithRetry(async () => {
          const params = new URLSearchParams({
            method: "artist.getinfo",
            artist: artist.name,
            api_key: this.apiKey,
            format: "json",
          });
          const res = await fetch(`https://ws.audioscrobbler.com/2.0/?${params}`);
          if (!res.ok) throw new Error(`Last.fm getinfo ${res.status}`);
          return artistInfoSchema.parse(await res.json());
        }, `info:${artist.name}`);

        const info = infoResult.isOk() ? infoResult.value.artist : null;
        const rawBio = info?.bio?.summary ?? "";
        const bio = rawBio ? cleanBio(rawBio) : null;
        const socials = bio ? extractSocialHandles(rawBio) : { instagram: null, tiktok: null };
        const genres = (info?.tags?.tag ?? []).map((t) => t.name.toLowerCase()).slice(0, 5);
        const listeners = parseInt(info?.stats?.listeners ?? "0", 10);
        const imageUrl = (info?.image ?? artist.image ?? [])
          .find((i) => i.size === "extralarge" || i.size === "large")?.["#text"] ?? null;

        const profiles: ScrapeResult["profiles"] = [
          {
            source: "manual" as const,
            externalId: `lastfm-${artist.mbid ?? artist.name.replace(/\s+/g, "-").toLowerCase()}`,
            url: artist.url,
            name: artist.name,
            bio,
            imageUrl: imageUrl || null,
            followerCount: listeners || null,
          },
        ];

        if (socials.instagram) {
          profiles.push({
            source: "instagram" as const,
            externalId: `ig-${artist.name.replace(/\s+/g, "-").toLowerCase()}`,
            url: socials.instagram,
            name: artist.name,
          });
        }

        if (socials.tiktok) {
          profiles.push({
            source: "tiktok" as const,
            externalId: `tt-${artist.name.replace(/\s+/g, "-").toLowerCase()}`,
            url: socials.tiktok,
            name: artist.name,
          });
        }

        results.push({
          artist: {
            name: artist.name,
            bio,
            imageUrl: imageUrl || null,
            genres,
            tags: genres,
            talentType: "musician" as const,
          },
          profiles,
        });

        await this.sleep(this.config.rateDelayMs);
      } catch {
        continue;
      }
    }

    return ok(results);
  }
}
