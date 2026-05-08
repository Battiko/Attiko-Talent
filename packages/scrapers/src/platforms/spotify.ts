import { z } from "zod";
import { BaseScraper, type ScrapeResult } from "../base/scraper.js";
import { AppError, err, ok, type Result } from "@attiko/shared/errors";

const tokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
});

const artistSchema = z.object({
  id: z.string(),
  name: z.string(),
  genres: z.array(z.string()),
  popularity: z.number(),
  followers: z.object({ total: z.number() }).optional(),
  images: z
    .array(z.object({ url: z.string(), width: z.number().nullable(), height: z.number().nullable() }))
    .optional(),
  external_urls: z.object({ spotify: z.string() }),
});

const searchResponseSchema = z.object({
  artists: z.object({
    items: z.array(artistSchema),
    total: z.number(),
  }),
});

export class SpotifyScraper extends BaseScraper {
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string
  ) {
    super("spotify", { rateDelayMs: 500 });
  }

  private async getToken(): Promise<Result<string, AppError>> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return ok(this.accessToken);
    }
    return this.fetchWithRetry(async () => {
      const creds = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
      const res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${creds}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      });
      if (!res.ok) {
        throw new Error(`Spotify token error: ${res.status}`);
      }
      const data = tokenResponseSchema.parse(await res.json());
      this.accessToken = data.access_token;
      this.tokenExpiresAt = Date.now() + data.expires_in * 1000 - 60_000;
      return data.access_token;
    }, "getToken");
  }

  async search(
    query: string,
    _location: string
  ): Promise<Result<ScrapeResult[], AppError>> {
    const tokenResult = await this.getToken();
    if (tokenResult.isErr()) return err(tokenResult.error);
    const token = tokenResult.value;

    const params = new URLSearchParams({
      q: query,
      type: "artist",
      limit: "50",
    });

    const fetchResult = await this.fetchWithRetry(async () => {
      const res = await fetch(
        `https://api.spotify.com/v1/search?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(`Spotify search ${res.status}`);
      return searchResponseSchema.parse(await res.json());
    }, `search:${query}`);

    if (fetchResult.isErr()) return err(fetchResult.error);

    const results: ScrapeResult[] = fetchResult.value.artists.items.map(
      (a) => ({
        artist: {
          name: a.name,
          genres: a.genres,
          imageUrl: a.images?.[0]?.url ?? null,
          talentType: "musician" as const,
        },
        profiles: [
          {
            source: "spotify" as const,
            externalId: a.id,
            url: a.external_urls.spotify,
            name: a.name,
            followerCount: a.followers?.total ?? null,
            rawData: a as unknown as Record<string, unknown>,
          },
        ],
      })
    );

    await this.sleep(this.config.rateDelayMs);
    return ok(results);
  }
}
