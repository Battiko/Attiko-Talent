import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

export const scrapeJobStatusEnum = pgEnum("scrape_job_status", [
  "pending",
  "running",
  "completed",
  "failed",
  "retrying",
]);

export const scrapeJobs = pgTable(
  "scrape_jobs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    source: text("source").notNull(),
    query: text("query").notNull(),
    location: text("location"),
    status: scrapeJobStatusEnum("status").notNull().default("pending"),
    priority: text("priority").notNull().default("normal"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    lastError: text("last_error"),
    resultCount: integer("result_count"),
    triggeredBy: text("triggered_by"), // user_id or 'cron' or 'system'
    bullJobId: text("bull_job_id"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    statusIdx: index("scrape_jobs_status_idx").on(t.status),
    sourceIdx: index("scrape_jobs_source_idx").on(t.source),
    createdAtIdx: index("scrape_jobs_created_at_idx").on(t.createdAt),
  })
);

export const scrapeRateLimits = pgTable(
  "scrape_rate_limits",
  {
    domain: text("domain").primaryKey(),
    requestsPerSecond: integer("requests_per_second").notNull().default(1),
    lastRequestAt: timestamp("last_request_at", { withTimezone: true }),
    isCircuitOpen: boolean("is_circuit_open").notNull().default(false),
    circuitOpenedAt: timestamp("circuit_opened_at", { withTimezone: true }),
    consecutiveFailures: integer("consecutive_failures").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  }
);

export type ScrapeJob = typeof scrapeJobs.$inferSelect;
export type ScrapeRateLimit = typeof scrapeRateLimits.$inferSelect;
