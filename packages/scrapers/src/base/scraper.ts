import pRetry, { AbortError } from "p-retry";
import pTimeout from "p-timeout";
import { AppError, err, ok, type Result } from "@attiko/shared/errors";
import type { NewArtist, NewPlatformProfile } from "@attiko/db/schema";

export interface ScrapeResult {
  artist: Partial<NewArtist>;
  profiles: Partial<NewPlatformProfile>[];
}

export interface ScraperConfig {
  timeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
  rateDelayMs: number;
}

const DEFAULT_CONFIG: ScraperConfig = {
  timeoutMs: 15_000,
  maxRetries: 3,
  retryDelayMs: 1_000,
  rateDelayMs: 1_000,
};

const circuitState = new Map<
  string,
  { failures: number; openedAt: number | null }
>();

const CIRCUIT_THRESHOLD = 5;
const CIRCUIT_RESET_MS = 60_000;

function getCircuit(service: string) {
  let state = circuitState.get(service);
  if (!state) {
    state = { failures: 0, openedAt: null };
    circuitState.set(service, state);
  }
  return state;
}

function isCircuitOpen(service: string): boolean {
  const state = getCircuit(service);
  if (state.openedAt === null) return false;
  if (Date.now() - state.openedAt > CIRCUIT_RESET_MS) {
    state.openedAt = null;
    state.failures = 0;
    return false;
  }
  return true;
}

function recordSuccess(service: string): void {
  const state = getCircuit(service);
  state.failures = 0;
  state.openedAt = null;
}

function recordFailure(service: string): void {
  const state = getCircuit(service);
  state.failures += 1;
  if (state.failures >= CIRCUIT_THRESHOLD) {
    state.openedAt = Date.now();
  }
}

export abstract class BaseScraper {
  protected readonly config: ScraperConfig;

  constructor(
    protected readonly serviceName: string,
    config: Partial<ScraperConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  protected async fetchWithRetry<T>(
    fn: () => Promise<T>,
    context: string
  ): Promise<Result<T, AppError>> {
    if (isCircuitOpen(this.serviceName)) {
      return err(AppError.circuitOpen(this.serviceName));
    }

    try {
      const result = await pRetry(
        async () => {
          try {
            return await pTimeout(fn(), { milliseconds: this.config.timeoutMs });
          } catch (cause) {
            // p-timeout throws an Error with message containing "timed out"
            if (cause instanceof Error && cause.constructor.name === "TimeoutError") {
              throw new AbortError(
                AppError.timeout(this.serviceName, this.config.timeoutMs)
              );
            }
            throw cause;
          }
        },
        {
          retries: this.config.maxRetries - 1,
          minTimeout: this.config.retryDelayMs,
          factor: 2,
          onFailedAttempt: (e) => {
            console.warn(
              `[${this.serviceName}] ${context} — attempt ${e.attemptNumber} failed: ${e.message}`
            );
          },
        }
      );
      recordSuccess(this.serviceName);
      return ok(result);
    } catch (cause) {
      recordFailure(this.serviceName);
      if (cause instanceof AppError) return err(cause);
      return err(AppError.externalApi(this.serviceName, cause));
    }
  }

  protected async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  abstract search(
    query: string,
    location: string
  ): Promise<Result<ScrapeResult[], AppError>>;
}
