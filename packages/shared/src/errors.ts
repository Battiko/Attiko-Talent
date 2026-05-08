import { err, ok, type Result } from "neverthrow";

export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "EXTERNAL_API_ERROR"
  | "DATABASE_ERROR"
  | "SCRAPER_ERROR"
  | "TIMEOUT_ERROR"
  | "CIRCUIT_OPEN"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    public readonly cause?: unknown,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
  }

  static validation(message: string, context?: Record<string, unknown>): AppError {
    return new AppError("VALIDATION_ERROR", message, undefined, context);
  }

  static notFound(resource: string): AppError {
    return new AppError("NOT_FOUND", `${resource} not found`);
  }

  static unauthorized(): AppError {
    return new AppError("UNAUTHORIZED", "Authentication required");
  }

  static forbidden(): AppError {
    return new AppError("FORBIDDEN", "Insufficient permissions");
  }

  static rateLimited(retryAfterMs?: number): AppError {
    return new AppError("RATE_LIMITED", "Rate limit exceeded", undefined, {
      retryAfterMs,
    });
  }

  static externalApi(service: string, cause: unknown): AppError {
    return new AppError("EXTERNAL_API_ERROR", `${service} API error`, cause);
  }

  static database(cause: unknown): AppError {
    return new AppError("DATABASE_ERROR", "Database operation failed", cause);
  }

  static scraper(url: string, cause: unknown): AppError {
    return new AppError("SCRAPER_ERROR", `Scraper failed for ${url}`, cause, { url });
  }

  static timeout(service: string, timeoutMs: number): AppError {
    return new AppError("TIMEOUT_ERROR", `${service} timed out after ${timeoutMs}ms`, undefined, {
      timeoutMs,
    });
  }

  static circuitOpen(service: string): AppError {
    return new AppError("CIRCUIT_OPEN", `Circuit breaker open for ${service}`);
  }

  static internal(message: string, cause?: unknown): AppError {
    return new AppError("INTERNAL_ERROR", message, cause);
  }
}

export { ok, err, type Result };
