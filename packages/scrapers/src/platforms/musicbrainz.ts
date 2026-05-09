import { z } from "zod";
import { BaseScraper, type ScrapeResult } from "../base/scraper.js";
import { AppError, err, ok, type Result } from "@attiko/shared/errors";

const artistSchema = z.object({
  id: z.string(),
  name: z.string(),
  "sort-name": z.string().optional(),
  disambiguation: z.string().optional(),
  type: z.string().optional(),
  area: z.object({ name: z.string(), "iso-3166-1-codes": z.array(z.string()).optional() }).optional(),
  "begin-area": z.object({ name: z.string() }).optional(),
  tags: z.array(z.object({ name: z.string(), count: z.number() })).optional(),
  relations: z.array(z.object({
    type: z.string(),
    url: z.object({ resource: z.string() }).optional(),
  })).optional(),
});

const searchSchema = z.object({
  artists: z.array(artistSchema).default([]),
  count: z.number().optional(),
});

function extractSocialFromUrls(relations: z.infer<typeof artistSchema>["relations"]): {
  instagram: string | null;
  tiktok: string | null;
  youtube: string | null;
  facebook: string | null;
} {
  const result = { instagram: null as string | null, tiktok: null as string | null, youtube: null as string | null, facebook: null as string | null };
  for (const rel of relations ?? []) {
    const url = rel.url?.resource ?? "";
    if (url.includes("instagram.com")) result.instagram = url;
    else if (url.includes("tiktok.com")) result.tiktok = url;
    else if (url.includes("youtube.com") || url.includes("youtu.be")) result.youtube = url;
    else if (url.includes("facebook.com")) result.facebook = url;
  }
  return result;
}

function mapType(type: string | undefined): "musician" | "vocalist" | "dj" | "band" | "ensemble" | "performer" | "other" {
  const t = (type ?? "").toLowerCase();
  if (t === "person") return "musician";
  if (t === "group") return "band";
  if (t === "orchestra" || t === "choir") return "ensemble";
  return "musician";
}

export class MusicBrainzScraper extends BaseScraper {
  constructor() {
    super("musicbrainz", { rateDelayMs: 1200, timeoutMs: 20_000 });
  }

  async search(query: string, location: string): Promise<Result<ScrapeResult[], AppError>> {
    // Try multiple location variations to maximize results
    const locationVariants = [location];
    const lower = location.toLowerCase();
    if (lower.includes("brooklyn") || lower.includes("bronx") || lower.includes("queens") || lower.includes("staten island") || lower.includes("long island")) {
      locationVariants.push("New York", "New York City");
    }
    if (lower.includes("new jersey") || lower.includes("hoboken") || lower.includes("jersey city")) {
      locationVariants.push("New Jersey");
    }
    if (lower.includes("connecticut") || lower.includes("ct")) {
      locationVariants.push("Connecticut");
    }

    const allArtists: z.infer<typeof artistSchema>[] = [];
    const seen = new Set<string>();

    for (const loc of locationVariants) {
      const result = await this.fetchWithRetry(async () => {
        const params = new URLSearchParams({
          query: `tag:"${query}" AND area:"${loc}"`,
          limit: "25",
          fmt: "json",
          inc: "tags+url-rels",
        });
        const res = await fetch(`https://musicbrainz.org/ws/2/artist?${params}`, {
          headers: { "User-Agent": "Attiko/1.0 (bobbyattiko@me.com)" },
        });
        if (!res.ok) throw new Error(`MusicBrainz ${res.status}`);
        return searchSchema.parse(await res.json());
      }, `search:${query}:${loc}`);

      if (result.isOk()) {
        for (const a of result.value.artists) {
          if (!seen.has(a.id)) { seen.add(a.id); allArtists.push(a); }
        }
      }
      await this.sleep(this.config.rateDelayMs);
    }

    // Fallback: no location filter if nothing found
    if (allArtists.length === 0) {
      const fallback = await this.fetchWithRetry(async () => {
        const params = new URLSearchParams({
          query: `tag:"${query}"`,
          limit: "25",
          fmt: "json",
          inc: "tags+url-rels",
        });
        const res = await fetch(`https://musicbrainz.org/ws/2/artist?${params}`, {
          headers: { "User-Agent": "Attiko/1.0 (bobbyattiko@me.com)" },
        });
        if (!res.ok) throw new Error(`MusicBrainz fallback ${res.status}`);
        return searchSchema.parse(await res.json());
      }, `fallback:${query}`);

      if (fallback.isErr()) return err(fallback.error);
      return ok(this.mapResults(fallback.value.artists));
    }

    return ok(this.mapResults(allArtists));
  }

  private mapResults(artists: z.infer<typeof artistSchema>[]): ScrapeResult[] {
    return artists.map((a) => {
      const genres = (a.tags ?? [])
        .sort((x, y) => y.count - x.count)
        .slice(0, 5)
        .map((t) => t.name.toLowerCase());

      const socials = extractSocialFromUrls(a.relations);
      const country = a.area?.["iso-3166-1-codes"]?.[0] ?? null;
      const city = a["begin-area"]?.name ?? a.area?.name ?? null;

      const profiles: ScrapeResult["profiles"] = [
        {
          source: "manual" as const,
          externalId: `mb-${a.id}`,
          url: `https://musicbrainz.org/artist/${a.id}`,
          name: a.name,
        },
      ];

      if (socials.instagram) profiles.push({ source: "instagram" as const, externalId: `ig-mb-${a.id}`, url: socials.instagram, name: a.name });
      if (socials.tiktok) profiles.push({ source: "tiktok" as const, externalId: `tt-mb-${a.id}`, url: socials.tiktok, name: a.name });
      if (socials.youtube) profiles.push({ source: "youtube" as const, externalId: `yt-mb-${a.id}`, url: socials.youtube, name: a.name });
      if (socials.facebook) profiles.push({ source: "manual" as const, externalId: `fb-mb-${a.id}`, url: socials.facebook, name: a.name });

      return {
        artist: {
          name: a.name,
          talentType: mapType(a.type),
          genres,
          tags: genres,
          city,
          countryCode: country,
        },
        profiles,
      };
    });
  }
}
