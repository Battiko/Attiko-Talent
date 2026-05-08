import {
  pgTable,
  text,
  timestamp,
  integer,
  pgEnum,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

export const userRoleEnum = pgEnum("user_role", [
  "user",
  "pro",
  "agency",
  "admin",
  "owner",
]);

export const users = pgTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    clerkId: text("clerk_id").notNull().unique(),
    // Stored lowercased+trimmed; never exposed raw in analytics or logs
    email: text("email").notNull().unique(),
    role: userRoleEnum("role").notNull().default("user"),
    stripeCustomerId: text("stripe_customer_id"),
    searchesUsedThisMonth: integer("searches_used_this_month").notNull().default(0),
    searchesResetAt: timestamp("searches_reset_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    trialUsed: boolean("trial_used").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    clerkIdIdx: index("users_clerk_id_idx").on(t.clerkId),
    emailIdx: index("users_email_idx").on(t.email),
    roleIdx: index("users_role_idx").on(t.role),
  })
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
