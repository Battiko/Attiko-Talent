import { getDb } from "@attiko/db/client";
import { sql } from "drizzle-orm";
import type { HealthCheckResult, ServiceCheck } from "@attiko/shared/types";

const APP_VERSION = "0.1.0";

async function checkDatabase(): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    const db = getDb();
    await db.execute(sql`SELECT 1`);
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (error) {
    return {
      status: "error",
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkRedis(): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    const { Redis } = await import("ioredis");
    const redis = new Redis(process.env["REDIS_URL"] ?? "redis://localhost:6379", {
      connectTimeout: 3_000,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    await redis.connect();
    await redis.ping();
    await redis.quit();
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (error) {
    return {
      status: "error",
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkQueue(): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    const { Queue } = await import("bullmq");
    const queue = new Queue("health-check", {
      connection: { url: process.env["REDIS_URL"] ?? "redis://localhost:6379" },
    });
    await queue.getWorkers();
    await queue.close();
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (error) {
    return {
      status: "error",
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function runHealthCheck(): Promise<HealthCheckResult> {
  const [database, redis, queue] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkQueue(),
  ]);

  const allOk = database.status === "ok" && redis.status === "ok" && queue.status === "ok";
  const anyDown = database.status === "error" && redis.status === "error";

  return {
    status: allOk ? "ok" : anyDown ? "down" : "degraded",
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
    checks: { database, redis, queue },
  };
}
