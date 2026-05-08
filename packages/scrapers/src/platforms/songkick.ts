import { z } from "zod";
import { BaseScraper, type ScrapeResult } from "../base/scraper.js";
import { AppError, err, ok, type Result } from "@attiko/shared/errors";

const artistSchema = z.object({
  id: z.number(),
  displayName: z.string(),
  uri: z.string(),
  onTourUntil: z.string().nullable().optional(),
  identifier: z
    .array(z.object({ mbid: z.string().optional(), href: z.string() }))
    .optional(),
});

const metroAreaSchema = z.object({
  id: z.number(),
  displayName: z.string(),
  uri: z.string(),
  country: z.object({ displayName: z.string() }),
});

const artistSearchSchema = z.object({
  resultsPage: z.object({
    results: z.object({
      artist: z.array(artistSchema).optional().default([]),
    }),
    totalEntries: z.number().optional(),
  }),
});

const metroSearchSchema = z.object({
  resultsPage: z.object({
    results: z.object({
      location: z
        .array(z.object({ metroArea: metroAreaSchema }))
        .optional()
        .default([]),
    }),
  }),
});

const eventsSchema = z.object({
  resultsPage: z.object({
    results: z.object({
      event: z
        .array(
          z.object({
            performance: z.array(
              z.object({
                artist: artistSchema,
                billingIndex: z.number(),
              })
            ),
          })
        )
        .optional()
        .default([]),
    }),
    totalEntries: z.number().optional(),
  }),
});

export class SongkickScraper extends BaseScraper {
  constructor(private readonly apiKey: string) {
    super("songkick", { rateDelayMs: 500 });
  }

  private async getMetroId(city: string): Promise<Result<number | null, AppError>> {
    const params = new URLSearchParams({
      query: city,
      apikey: this.apiKey,
    });

    return this.fetchWithRetry(async () => {
      const res = await fetch(
        `https://api.songkick.com/api/3.0/search/locations.json?${params.toString()}`
      );
      if (!res.ok) throw new Error(`Songkick metro search ${res.status}`);
      const data = metroSearchSchema.parse(await res.json());
      const first = data.resultsPage.results.location[0];
      return first?.metroArea.id ?? null;
    }, `getMetro:${city}`);
  }

  async search(
    query: string,
    location: string
  ): Promise<Result<ScrapeResult[], AppError>> {
    const metroResult = await this.getMetroId(location);
    if (metroResult.isErr()) return err(metroResult.error);
    const metroId = metroResult.value;

    let items: z.infer<typeof artistSchema>[] = [];

    if (metroId) {
      const eventsResult = await this.fetchWithRetry(async () => {
        const params = new URLSearchParams({
          metro_area_id: String(metroId),
          apikey: this.apiKey,
          per_page: "50",
        });
        const res = await fetch(
          `https://api.songkick.com/api/3.0/metro_areas/${metroId}/calendar.json?${params.toString()}`
        );
        if (!res.ok) throw new Error(`Songkick events ${res.status}`);
        return eventsSchema.parse(await res.json());
      }, `events:${metroId}`);

      if (eventsResult.isOk()) {
        const seen = new Set<number>();
        for (const event of eventsResult.value.resultsPage.results.event) {
          for (const perf of event.performance) {
            if (!seen.has(perf.artist.id)) {
              seen.add(perf.artist.id);
              items.push(perf.artist);
            }
          }
        }
      }
    }

    if (items.length === 0) {
      const searchResult = await this.fetchWithRetry(async () => {
        const params = new URLSearchParams({
          query,
          apikey: this.apiKey,
          per_page: "50",
        });
        const res = await fetch(
          `https://api.songkick.com/api/3.0/search/artists.json?${params.toString()}`
        );
        if (!res.ok) throw new Error(`Songkick artist search ${res.status}`);
        return artistSearchSchema.parse(await res.json());
      }, `search:${query}`);

      if (searchResult.isErr()) return err(searchResult.error);
      items = searchResult.value.resultsPage.results.artist;
    }

    const results: ScrapeResult[] = items.map((a) => ({
      artist: {
        name: a.displayName,
        talentType: "musician" as const,
      },
      profiles: [
        {
          source: "songkick" as const,
          externalId: String(a.id),
          url: a.uri,
          name: a.displayName,
        },
      ],
    }));

    await this.sleep(this.config.rateDelayMs);
    return ok(results);
  }
}
