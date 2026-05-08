import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

let _client: ReturnType<typeof createClient> | undefined;

function createClient() {
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL is not set");

  const sql = postgres(url, {
    max: 10,
    idle_timeout: 30,
    connect_timeout: 10,
    transform: postgres.camel,
  });

  return drizzle(sql, { schema, logger: process.env["NODE_ENV"] === "development" });
}

export function getDb() {
  _client ??= createClient();
  return _client;
}

export type Db = ReturnType<typeof createClient>;
