import { z } from "zod";
import { BaseScraper, type ScrapeResult } from "../base/scraper.js";
import { AppError, err, ok, type Result } from "@attiko/shared/errors";

const userSchema = z.object({
  id: z.number(),
  permalink: z.string(),
  username: z.string(),
  description: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
  followers_count: z.number().optional(),
  track_count: z.number().optional(),
  city: z.string().nullable().optional(),
  country_code: z.string().nullable().optional(),
  permalink_url: z.string(),
});

const searchResponseSchema = z.object({
  collection: z.array(userSchema),
  next_href: z.string().nullable().optional(),
});

export class SoundCloudScraper extends BaseScraper {
  constructor(private readonly clientId: string) {
    super("soundcloud", { rateDelayMs: 1_000 });
  }

  async search(
    query: string,
    location: string
  ): Promise<Result<ScrapeResult[], AppError>> {
    const params = new URLSearchParams({
      q: `${query} ${location}`,
      limit: "50",
      client_id: this.clientId,
    });

    const fetchResult = await this.fetchWithRetry(async () => {
      const res = await fetch(
        `https://api.soundcloud.com/users?${params.toString()}`
      );
      if (!res.ok) throw new Error(`SoundCloud search ${res.status}`);
      return searchResponseSchema.parse(await res.json());
    }, `search:${query}`);

    if (fetchResult.isErr()) return err(fetchResult.error);

    const results: ScrapeResult[] = fetchResult.value.collection.map((u) => ({
      artist: {
        name: u.username,
        bio: u.description ?? null,
        city: u.city ?? null,
        countryCode: u.country_code ?? null,
        imageUrl: u.avatar_url?.replace("-large", "-t500x500") ?? null,
        talentType: "musician" as const,
      },
      profiles: [
        {
          source: "soundcloud" as const,
          externalId: String(u.id),
          url: u.permalink_url,
          name: u.username,
          bio: u.description ?? null,
          imageUrl: u.avatar_url?.replace("-large", "-t500x500") ?? null,
          followerCount: u.followers_count ?? null,
        },
      ],
    }));

    await this.sleep(this.config.rateDelayMs);
    return ok(results);
  }
}
