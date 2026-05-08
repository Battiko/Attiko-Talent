import type { Request, Response, NextFunction } from "express";
import { getDb } from "@attiko/db/client";
import { users } from "@attiko/db/schema";
import { eq } from "drizzle-orm";

const SEARCH_LIMITS: Record<string, number> = {
  user: 5,
  pro: Infinity,
  agency: Infinity,
  admin: Infinity,
  owner: Infinity,
};

export async function usageLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Owners and admins bypass all limits — check first, before any billing logic
  if (user.role === "owner" || user.role === "admin") {
    return next();
  }

  // Check if trial is active
  const now = new Date();
  const trialActive = user.trialEndsAt && user.trialEndsAt > now;

  const effectiveRole = trialActive ? "pro" : user.role;
  const limit = SEARCH_LIMITS[effectiveRole] ?? SEARCH_LIMITS["user"] ?? 5;

  // Reset monthly counter if needed
  const resetDate = user.searchesResetAt;
  const monthAgo = new Date(now);
  monthAgo.setDate(monthAgo.getDate() - 30);

  if (resetDate < monthAgo) {
    const db = getDb();
    await db
      .update(users)
      .set({ searchesUsedThisMonth: 0, searchesResetAt: now })
      .where(eq(users.id, user.id));
    user.searchesUsedThisMonth = 0;
  }

  if (user.searchesUsedThisMonth >= limit) {
    res.status(429).json({
      error: "SEARCH_LIMIT_REACHED",
      message: "Monthly search limit reached. Upgrade to Pro for unlimited searches.",
      used: user.searchesUsedThisMonth,
      limit,
    });
    return;
  }

  next();
}
