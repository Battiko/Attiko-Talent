import type { Config } from "drizzle-kit";

if (!process.env["DATABASE_URL"]) {
  throw new Error("DATABASE_URL environment variable is required for migrations");
}

export default {
  schema: ["./src/schema/users.ts", "./src/schema/artists.ts", "./src/schema/scraping.ts"],
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env["DATABASE_URL"],
  },
  verbose: true,
  strict: true,
  tablesFilter: ["!geography_columns", "!geometry_columns", "!spatial_ref_sys", "!topology.*", "!layer", "!topology"],
} satisfies Config;
