import {
  pgTable,
  text,
  timestamp,
  integer,
  real,
  boolean,
  jsonb,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

export const talentTypeEnum = pgEnum("talent_type", [
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

export const platformSourceEnum = pgEnum("platform_source", [
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
]);

export const artists = pgTable(
  "artists",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    talentType: talentTypeEnum("talent_type").notNull().default("musician"),
    bio: text("bio"),
    bioLanguage: text("bio_language"),
    // Geocoded location
    locationLabel: text("location_label"),
    city: text("city"),
    region: text("region"),
    country: text("country"),
    countryCode: text("country_code"),
    lat: real("lat"),
    lng: real("lng"),
    // geo_point (GEOMETRY) column is added via raw SQL after push — PostGIS types are not supported by drizzle-kit
    // Media
    imageUrl: text("image_url"),
    imageHash: text("image_hash"),
    videoUrl: text("video_url"),
    audioUrl: text("audio_url"),
    websiteUrl: text("website_url"),
    // Taxonomy
    genres: text("genres").array().notNull().default(sql`'{}'::text[]`),
    instruments: text("instruments").array().notNull().default(sql`'{}'::text[]`),
    languages: text("languages").array().notNull().default(sql`'{}'::text[]`),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    // Rates (normalized to USD cents)
    rateMinCents: integer("rate_min_cents"),
    rateMaxCents: integer("rate_max_cents"),
    rateCurrency: text("rate_currency").default("USD"),
    // AI-generated scores (0–100)
    eventFitScore: integer("event_fit_score"),
    socialProofScore: integer("social_proof_score"),
    mediaQualityScore: integer("media_quality_score"),
    recencyScore: integer("recency_score"),
    overallScore: integer("overall_score"),
    // Vector embedding (1536 dims — text-embedding-3-small / claude)
    embedding: text("embedding"), // stored as JSON string until pgvector ext confirmed
    // Metadata
    willingToTravel: boolean("willing_to_travel"),
    groupSizeMin: integer("group_size_min"),
    groupSizeMax: integer("group_size_max"),
    pressLinks: text("press_links").array().notNull().default(sql`'{}'::text[]`),
    yearsActive: integer("years_active"),
    // Identity resolution
    canonicalId: text("canonical_id"), // self-referential; null = this is canonical
    mergedFrom: text("merged_from").array().notNull().default(sql`'{}'::text[]`),
    isOptedOut: boolean("is_opted_out").notNull().default(false),
    optedOutAt: timestamp("opted_out_at", { withTimezone: true }),
    // Enrichment metadata
    enrichedAt: timestamp("enriched_at", { withTimezone: true }),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
    lastCrawledAt: timestamp("last_crawled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    // Extra enrichment data stored as JSON
    meta: jsonb("meta").default(sql`'{}'::jsonb`),
  },
  (t) => ({
    slugIdx: index("artists_slug_idx").on(t.slug),
    nameIdx: index("artists_name_idx").on(t.name),
    talentTypeIdx: index("artists_talent_type_idx").on(t.talentType),
    countryIdx: index("artists_country_idx").on(t.countryCode),
    overallScoreIdx: index("artists_overall_score_idx").on(t.overallScore),
    isOptedOutIdx: index("artists_opted_out_idx").on(t.isOptedOut),
    // Spatial index created separately via raw SQL migration
  })
);

export const platformProfiles = pgTable(
  "platform_profiles",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    artistId: text("artist_id")
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    source: platformSourceEnum("source").notNull(),
    externalId: text("external_id").notNull(),
    url: text("url").notNull(),
    name: text("name"),
    bio: text("bio"),
    imageUrl: text("image_url"),
    followerCount: integer("follower_count"),
    followingCount: integer("following_count"),
    postCount: integer("post_count"),
    engagementRate: real("engagement_rate"),
    verifiedBadge: boolean("verified_badge").notNull().default(false),
    monthlyListeners: integer("monthly_listeners"),
    playCount: integer("play_count"),
    viewCount: integer("view_count"),
    rawData: jsonb("raw_data"),
    lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    artistIdIdx: index("platform_profiles_artist_id_idx").on(t.artistId),
    sourceIdx: index("platform_profiles_source_idx").on(t.source),
    externalIdIdx: index("platform_profiles_external_id_idx").on(t.externalId),
    // Unique per source + externalId
    uniqueSourceExternal: index("platform_profiles_unique_source_external").on(
      t.source,
      t.externalId
    ),
  })
);

export const artistContacts = pgTable(
  "artist_contacts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    artistId: text("artist_id")
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // email, phone, instagram_dm, booking_platform, etc.
    subtype: text("subtype"), // booking, management, press, personal, etc.
    value: text("value").notNull(),
    label: text("label"),
    sourceUrl: text("source_url"),
    sourcePlatform: text("source_platform"),
    confidenceScore: integer("confidence_score").notNull().default(50),
    isVerified: boolean("is_verified").notNull().default(false),
    verificationStatus: text("verification_status").default("unverified"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    artistIdIdx: index("artist_contacts_artist_id_idx").on(t.artistId),
    typeIdx: index("artist_contacts_type_idx").on(t.type),
  })
);

export const shortlists = pgTable(
  "shortlists",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    shareToken: text("share_token").unique(),
    isPublic: boolean("is_public").notNull().default(false),
    eventName: text("event_name"),
    eventDate: timestamp("event_date", { withTimezone: true }),
    eventLocation: text("event_location"),
    budgetTotal: integer("budget_total_cents"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    userIdIdx: index("shortlists_user_id_idx").on(t.userId),
    shareTokenIdx: index("shortlists_share_token_idx").on(t.shareToken),
  })
);

export const shortlistItems = pgTable(
  "shortlist_items",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    shortlistId: text("shortlist_id")
      .notNull()
      .references(() => shortlists.id, { onDelete: "cascade" }),
    artistId: text("artist_id")
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    role: text("role"),
    notes: text("notes"),
    budgetCents: integer("budget_cents"),
    status: text("status").default("considering"),
    addedAt: timestamp("added_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    shortlistIdIdx: index("shortlist_items_shortlist_id_idx").on(t.shortlistId),
    artistIdIdx: index("shortlist_items_artist_id_idx").on(t.artistId),
  })
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    actorId: text("actor_id"),
    actorRole: text("actor_role"),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    actorIdIdx: index("audit_log_actor_id_idx").on(t.actorId),
    actionIdx: index("audit_log_action_idx").on(t.action),
    createdAtIdx: index("audit_log_created_at_idx").on(t.createdAt),
  })
);

export type Artist = typeof artists.$inferSelect;
export type NewArtist = typeof artists.$inferInsert;
export type PlatformProfile = typeof platformProfiles.$inferSelect;
export type NewPlatformProfile = typeof platformProfiles.$inferInsert;
export type ArtistContact = typeof artistContacts.$inferSelect;
export type Shortlist = typeof shortlists.$inferSelect;
export type ShortlistItem = typeof shortlistItems.$inferSelect;
export type AuditLogEntry = typeof auditLog.$inferInsert;
