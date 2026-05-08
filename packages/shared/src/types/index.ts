export type UserRole = "user" | "pro" | "agency" | "admin" | "owner";

export type PlatformSource =
  | "spotify"
  | "youtube"
  | "soundcloud"
  | "songkick"
  | "bandsintown"
  | "instagram"
  | "tiktok"
  | "mixcloud"
  | "beatport"
  | "gigsalad"
  | "thebash"
  | "weddingwire"
  | "theknot"
  | "backstage"
  | "manual";

export type TalentType =
  | "musician"
  | "vocalist"
  | "dj"
  | "dancer"
  | "band"
  | "ensemble"
  | "instrumentalist"
  | "performer"
  | "other";

export type EventFitCategory = "wedding" | "private_event" | "corporate" | "festival" | "club" | "unknown";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface PaginationInput {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Serialized artist profile returned to the client — role field is never included
export interface ArtistProfile {
  id: string;
  slug: string;
  name: string;
  talentType: TalentType;
  bio: string | null;
  location: string | null;
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  distanceMiles: number | null;
  genres: string[];
  instruments: string[];
  languages: string[];
  tags: string[];
  imageUrl: string | null;
  videoUrl: string | null;
  audioUrl: string | null;
  rateMin: number | null;
  rateMax: number | null;
  rateCurrency: string | null;
  eventFitScore: number | null;
  socialProofScore: number | null;
  mediaQualityScore: number | null;
  recencyScore: number | null;
  overallScore: number | null;
  sources: PlatformSource[];
  platformProfiles: PlatformProfileSummary[];
  lastActiveAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformProfileSummary {
  source: PlatformSource;
  externalId: string;
  url: string;
  followerCount: number | null;
  verifiedBadge: boolean;
}

export interface SearchInput {
  query: string;
  location: string;
  radiusMiles: number;
  talentTypes?: TalentType[];
  genres?: string[];
  budgetMin?: number;
  budgetMax?: number;
  languages?: string[];
  groupSizeMin?: number;
  groupSizeMax?: number;
  willingToTravel?: boolean;
  hasVideo?: boolean;
  hasPressLinks?: boolean;
  page?: number;
  pageSize?: number;
  sortWeights?: RankingWeights;
}

export interface RankingWeights {
  geo: number;
  semantic: number;
  socialProof: number;
  recency: number;
  eventFit: number;
  mediaQuality: number;
}

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  geo: 0.25,
  semantic: 0.30,
  socialProof: 0.20,
  recency: 0.10,
  eventFit: 0.10,
  mediaQuality: 0.05,
};

// Client-safe user type — never includes role, internal fields, or OWNER_EMAIL comparison logic
export interface ClientUser {
  id: string;
  email: string;
  displayTier: "free" | "pro" | "agency";
  searchesUsedThisMonth: number;
  searchesLimit: number;
  trialEndsAt: string | null;
}

export interface HealthCheckResult {
  status: "ok" | "degraded" | "down";
  version: string;
  timestamp: string;
  checks: {
    database: ServiceCheck;
    redis: ServiceCheck;
    queue: ServiceCheck;
  };
}

export interface ServiceCheck {
  status: "ok" | "error";
  latencyMs: number;
  error?: string;
}
