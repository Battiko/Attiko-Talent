import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
  REDIS_URL: z.string().url("REDIS_URL must be a valid URL"),
  CLERK_SECRET_KEY: z.string().min(1, "CLERK_SECRET_KEY is required"),
  OWNER_EMAIL: z
    .string()
    .email("OWNER_EMAIL must be a valid email")
    .transform((v) => v.toLowerCase().trim()),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  INTERNAL_API_SECRET: z.string().min(32, "INTERNAL_API_SECRET must be ≥32 chars"),
  ANTHROPIC_API_KEY: z.string().optional(),
  SPOTIFY_CLIENT_ID: z.string().optional(),
  SPOTIFY_CLIENT_SECRET: z.string().optional(),
  YOUTUBE_API_KEY: z.string().optional(),
  SOUNDCLOUD_CLIENT_ID: z.string().optional(),
  SOUNDCLOUD_CLIENT_SECRET: z.string().optional(),
  SONGKICK_API_KEY: z.string().optional(),
  BANDSINTOWN_APP_ID: z.string().optional(),
  MAPBOX_SECRET_TOKEN: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_PRO_MONTHLY: z.string().optional(),
  STRIPE_PRICE_AGENCY_MONTHLY: z.string().optional(),
  SERPER_API_KEY: z.string().optional(),
  HUNTER_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_MAPBOX_TOKEN: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

/**
 * Validate server-side environment variables at boot.
 * Call this once in apps/api and apps/web server startup.
 * Throws a descriptive error and exits the process if required keys are missing.
 */
export function validateServerEnv(env: NodeJS.ProcessEnv = process.env): ServerEnv {
  const result = serverEnvSchema.safeParse(env);
  if (!result.success) {
    const missing = result.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    console.error(
      `\n[Attiko] ❌ Environment validation failed — missing or invalid variables:\n${missing}\n\nSee .env.example for documentation.\n`
    );
    process.exit(1);
  }
  return result.data;
}

export function validateClientEnv(env: Record<string, string | undefined> = {}): ClientEnv {
  return clientEnvSchema.parse(env);
}
