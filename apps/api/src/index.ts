import { validateServerEnv } from "@attiko/shared/env";
validateServerEnv();

import express from "express";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { createId } from "@paralleldrive/cuid2";
import { appRouter } from "./router.js";
import { clerkAuthMiddleware } from "./middleware/auth.js";
import { runHealthCheck } from "./services/health.js";
import { logger } from "./logger.js";
import type { Context } from "./trpc.js";

const app = express();
const PORT = parseInt(process.env["PORT"] ?? "4000", 10);

app.use(cors({ origin: ["http://localhost:3000", "http://localhost:3001"], credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

// Attach correlation ID
app.use((req, _res, next) => {
  (req as express.Request & { requestId: string }).requestId = createId();
  next();
});

// Auth
app.use(clerkAuthMiddleware);

// Health check — no auth required
app.get("/api/health", async (_req, res) => {
  const result = await runHealthCheck();
  const httpStatus = result.status === "down" ? 503 : 200;
  res.status(httpStatus).json(result);
});

// tRPC
app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext: (opts): Context => ({
      req: opts.req as express.Request,
      res: opts.res as express.Response,
      user: (opts.req as express.Request & { user?: Context["user"] }).user ?? null,
      requestId: (opts.req as express.Request & { requestId: string }).requestId ?? createId(),
    }),
    onError: ({ path, error }) => {
      logger.error({ path, error: error.message, code: error.code }, "tRPC error");
    },
  })
);

const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, "Attiko API server started");
});

// Graceful shutdown
function shutdown(signal: string): void {
  logger.info({ signal }, "Received shutdown signal — closing gracefully");
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });
  setTimeout(() => {
    logger.error("Forced shutdown after 10s timeout");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection");
});
