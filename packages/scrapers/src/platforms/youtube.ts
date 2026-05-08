import { z } from "zod";
import { BaseScraper, type ScrapeResult } from "../base/scraper.js";
import { AppError, err, ok, type Result } from "@attiko/shared/errors";

const channelSchema = z.object({
  id: z.object({ channelId: z.string() }),
  snippet: z.object({
    channelTitle: z.string(),
    description: z.string().optional(),
    thumbnails: z
      .object({
        high: z.object({ url: z.string() }).optional(),
        default: z.object({ url: z.string() }).optional(),
      })
      .optional(),
  }),
});

const searchResponseSchema = z.object({
  items: z.array(channelSchema).default([]),
  nextPageToken: z.string().optional(),
});

const channelStatsSchema = z.object({
  items: z
    .array(
      z.object({
        statistics: z.object({
          subscriberCount: z.string().optional(),
          viewCount: z.string().optional(),
        }),
      })
    )
    .default([]),
});

export class YouTubeScraper extends BaseScraper {
  constructor(private readonly apiKey: string) {
    super("youtube", { rateDelayMs: 200 });
  }

  async search(
    query: string,
    _location: string
  ): Promise<Result<ScrapeResult[], AppError>> {
    const params = new URLSearchParams({
      part: "snippet",
      type: "channel",
      q: `${query} wedding musician`,
      maxResults: "50",
      key: this.apiKey,
    });

    const fetchResult = await this.fetchWithRetry(async () => {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?${params.toString()}`
      );
      if (!res.ok) throw new Error(`YouTube search ${res.status}`);
      return searchResponseSchema.parse(await res.json());
    }, `search:${query}`);

    if (fetchResult.isErr()) return err(fetchResult.error);

    const channelIds = fetchResult.value.items
      .map((i) => i.id.channelId)
      .join(",");

    if (!channelIds) return ok([]);

    const statsResult = await this.fetchWithRetry(async () => {
      const statsParams = new URLSearchParams({
        part: "statistics",
        id: channelIds,
        key: this.apiKey,
      });
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?${statsParams.toString()}`
      );
      if (!res.ok) throw new Error(`YouTube channel stats ${res.status}`);
      return channelStatsSchema.parse(await res.json());
    }, `stats:${channelIds}`);

    const statsMap = new Map<string, { subscribers: number; views: number }>();
    if (statsResult.isOk()) {
      fetchResult.value.items.forEach((channel, i) => {
        const stat = statsResult.value.items[i];
        if (stat) {
          statsMap.set(channel.id.channelId, {
            subscribers: parseInt(stat.statistics.subscriberCount ?? "0", 10),
            views: parseInt(stat.statistics.viewCount ?? "0", 10),
          });
        }
      });
    }

    const results: ScrapeResult[] = fetchResult.value.items.map((channel) => {
      const stats = statsMap.get(channel.id.channelId);
      const channelUrl = `https://www.youtube.com/channel/${channel.id.channelId}`;
      return {
        artist: {
          name: channel.snippet.channelTitle,
          bio: channel.snippet.description ?? null,
          imageUrl:
            channel.snippet.thumbnails?.high?.url ??
            channel.snippet.thumbnails?.default?.url ??
            null,
          talentType: "musician" as const,
        },
        profiles: [
          {
            source: "youtube" as const,
            externalId: channel.id.channelId,
            url: channelUrl,
            name: channel.snippet.channelTitle,
            bio: channel.snippet.description ?? null,
            imageUrl:
              channel.snippet.thumbnails?.high?.url ??
              channel.snippet.thumbnails?.default?.url ??
              null,
            followerCount: stats?.subscribers ?? null,
            viewCount: stats?.views ?? null,
          },
        ],
      };
    });

    await this.sleep(this.config.rateDelayMs);
    return ok(results);
  }
}
