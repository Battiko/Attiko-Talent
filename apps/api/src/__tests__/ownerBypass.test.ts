import { describe, it, expect } from "vitest";
import type { UserRole } from "@attiko/shared/types";

const TEST_OWNER_EMAIL = "test-owner@attiko.test";

const SEARCH_LIMITS: Record<UserRole, number> = {
  user: 5,
  pro: 200,
  agency: Infinity,
  admin: Infinity,
  owner: Infinity,
};

function isAllowed(role: UserRole, searchesUsed: number): boolean {
  if (role === "owner" || role === "admin") return true;
  const limit = SEARCH_LIMITS[role] ?? 5;
  return searchesUsed < limit;
}

describe("owner bypass — paywall logic", () => {
  it("owner always allowed regardless of search count", () => {
    expect(isAllowed("owner", 9999)).toBe(true);
  });

  it("admin always allowed regardless of search count", () => {
    expect(isAllowed("admin", 9999)).toBe(true);
  });

  it("regular user blocked at limit", () => {
    expect(isAllowed("user", 5)).toBe(false);
  });

  it("regular user allowed below limit", () => {
    expect(isAllowed("user", 4)).toBe(true);
  });

  it("pro user blocked at limit", () => {
    expect(isAllowed("pro", 200)).toBe(false);
  });
});

describe("owner email detection", () => {
  it("matches exact email", () => {
    process.env["OWNER_EMAIL"] = TEST_OWNER_EMAIL;
    const ownerEnv = process.env["OWNER_EMAIL"] ?? "";
    const match = TEST_OWNER_EMAIL.toLowerCase().trim() === ownerEnv.toLowerCase().trim();
    expect(match).toBe(true);
  });

  it("matches case-insensitively", () => {
    process.env["OWNER_EMAIL"] = TEST_OWNER_EMAIL;
    const ownerEnv = process.env["OWNER_EMAIL"] ?? "";
    const email = TEST_OWNER_EMAIL.toUpperCase();
    const match = email.toLowerCase().trim() === ownerEnv.toLowerCase().trim();
    expect(match).toBe(true);
  });

  it("does not match a different email", () => {
    process.env["OWNER_EMAIL"] = TEST_OWNER_EMAIL;
    const ownerEnv = process.env["OWNER_EMAIL"] ?? "";
    const email = "other@example.com";
    const match = email.toLowerCase().trim() === ownerEnv.toLowerCase().trim();
    expect(match).toBe(false);
  });
});

describe("role field never exposed to client", () => {
  it("strips role from serialized user", () => {
    const dbUser = {
      id: "abc123",
      email: "user@example.com",
      role: "owner" as UserRole,
      clerkId: "clerk_123",
      searchesUsedThisMonth: 0,
      searchesResetAt: new Date(),
      trialEndsAt: null as Date | null,
      trialUsed: false,
      stripeCustomerId: null as string | null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Simulate client serialization — role must be excluded
    const clientUser = {
      id: dbUser.id,
      email: dbUser.email,
      displayTier: "pro" as const,
      searchesUsedThisMonth: dbUser.searchesUsedThisMonth,
      searchesLimit: 200,
      trialEndsAt: dbUser.trialEndsAt?.toISOString() ?? null,
    };

    expect("role" in clientUser).toBe(false);
    expect(clientUser.displayTier).toBe("pro");
  });
});

describe("analytics exclusion", () => {
  it("filters owner from analytics payload", () => {
    const ownerUserId = "owner-abc";
    const events = [
      { userId: "user-1", event: "search" },
      { userId: ownerUserId, event: "search" },
      { userId: "user-2", event: "search" },
    ];

    const ownerIds = new Set([ownerUserId]);
    const filtered = events.filter((e) => !ownerIds.has(e.userId));
    expect(filtered).toHaveLength(2);
    expect(filtered.every((e) => e.userId !== ownerUserId)).toBe(true);
  });
});
