import { describe, it, expect } from "vitest";
import { validateServerEnv } from "@attiko/shared/env";

describe("env validation", () => {
  it("passes with all required vars", () => {
    const env = {
      DATABASE_URL: "postgresql://localhost/test",
      REDIS_URL: "redis://localhost:6379",
      CLERK_SECRET_KEY: "sk_test_xxx",
      OWNER_EMAIL: "test-owner@attiko.test",
      INTERNAL_API_SECRET: "a-secret-that-is-at-least-32-chars-long",
      NODE_ENV: "test",
    } satisfies Record<string, string>;

    expect(() => validateServerEnv(env)).not.toThrow();
  });

  it("normalizes OWNER_EMAIL to lowercase", () => {
    const env = {
      DATABASE_URL: "postgresql://localhost/test",
      REDIS_URL: "redis://localhost:6379",
      CLERK_SECRET_KEY: "sk_test_xxx",
      OWNER_EMAIL: "TEST-OWNER@ATTIKO.TEST",
      INTERNAL_API_SECRET: "a-secret-that-is-at-least-32-chars-long",
    } satisfies Record<string, string>;

    const result = validateServerEnv(env);
    expect(result.OWNER_EMAIL).toBe("test-owner@attiko.test");
  });

  it("fails when DATABASE_URL is missing", () => {
    const env = {
      REDIS_URL: "redis://localhost:6379",
      CLERK_SECRET_KEY: "sk_test_xxx",
      OWNER_EMAIL: "test-owner@attiko.test",
      INTERNAL_API_SECRET: "a-secret-that-is-at-least-32-chars-long",
    } as Record<string, string>;

    const originalExit = process.exit;
    const calls: number[] = [];
    process.exit = ((code: number) => {
      calls.push(code);
    }) as never;
    const originalError = console.error;
    console.error = () => {};

    validateServerEnv(env);

    process.exit = originalExit;
    console.error = originalError;

    expect(calls[0]).toBe(1);
  });
});
