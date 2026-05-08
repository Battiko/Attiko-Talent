import { z } from "zod";
export { DEFAULT_RANKING_WEIGHTS } from "../types/index.js";

export const geoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(200).default(20),
});

export const rankingWeightsSchema = z.object({
  geo: z.number().min(0).max(1),
  semantic: z.number().min(0).max(1),
  socialProof: z.number().min(0).max(1),
  recency: z.number().min(0).max(1),
  eventFit: z.number().min(0).max(1),
  mediaQuality: z.number().min(0).max(1),
});

export const talentTypeSchema = z.enum([
  "musician",
  "vocalist",
  "dj",
  "dancer",
  "band",
  "ensemble",
  "instrumentalist",
  "performer",
  "other",
]);

export const searchInputSchema = z.object({
  query: z.string().min(1).max(500),
  location: z.string().min(1).max(200),
  radiusMiles: z.number().min(1).max(500).default(50),
  talentTypes: z.array(talentTypeSchema).optional(),
  genres: z.array(z.string().max(100)).max(20).optional(),
  budgetMin: z.number().min(0).optional(),
  budgetMax: z.number().min(0).optional(),
  languages: z.array(z.string().max(50)).max(10).optional(),
  groupSizeMin: z.number().int().min(1).optional(),
  groupSizeMax: z.number().int().min(1).optional(),
  willingToTravel: z.boolean().optional(),
  hasVideo: z.boolean().optional(),
  hasPressLinks: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(200).default(20),
  sortWeights: rankingWeightsSchema.optional(),
});

export const artistIdSchema = z.string().uuid();

export const scrapeJobSchema = z.object({
  source: z.enum([
    "spotify",
    "youtube",
    "soundcloud",
    "songkick",
    "bandsintown",
    "instagram",
    "tiktok",
    "mixcloud",
    "beatport",
    "gigsalad",
    "thebash",
    "weddingwire",
    "theknot",
    "backstage",
    "manual",
  ]),
  query: z.string(),
  location: z.string().optional(),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
});
