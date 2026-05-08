import type { Request, Response, NextFunction } from "express";
import { createClerkClient, verifyToken } from "@clerk/backend";
import { getDb } from "@attiko/db/client";
import { users } from "@attiko/db/schema";
import { eq } from "drizzle-orm";
import { timingSafeEqual } from "crypto";
import { logger } from "../logger.js";

let _clerk: ReturnType<typeof createClerkClient> | undefined;

function getClerk() {
  _clerk ??= createClerkClient({
    secretKey: process.env["CLERK_SECRET_KEY"] ?? "",
  });
  return _clerk;
}

/**
 * Constant-time email comparison to prevent timing attacks on owner detection.
 */
function isOwnerEmail(email: string): boolean {
  const ownerEmail = process.env["OWNER_EMAIL"];
  if (!ownerEmail) return false;
  const normalized = email.toLowerCase().trim();
  const owner = ownerEmail.toLowerCase().trim();
  if (normalized.length !== owner.length) return false;
  try {
    return timingSafeEqual(Buffer.from(normalized), Buffer.from(owner));
  } catch {
    return false;
  }
}

export async function clerkAuthMiddleware(
  req: Request & { user?: typeof users.$inferSelect | null },
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      req.user = null;
      return next();
    }

    const secretKey = process.env["CLERK_SECRET_KEY"] ?? "";
    const payload = await verifyToken(token, { secretKey });
    const clerkId = payload.sub;

    const db = getDb();

    let [user] = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);

    if (!user) {
      // First-time login — fetch email from Clerk and provision user
      const clerk = getClerk();
      const clerkUser = await clerk.users.getUser(clerkId);
      const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
      const normalizedEmail = email.toLowerCase().trim();
      const role = isOwnerEmail(normalizedEmail) ? "owner" : "user";

      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);

      [user] = await db
        .insert(users)
        .values({
          clerkId,
          email: normalizedEmail,
          role,
          trialEndsAt,
        })
        .onConflictDoUpdate({
          target: users.clerkId,
          set: { updatedAt: new Date() },
        })
        .returning();
    } else if (user.email && isOwnerEmail(user.email) && user.role !== "owner") {
      // Existing user — re-check owner status on every login
      [user] = await db
        .update(users)
        .set({ role: "owner", updatedAt: new Date() })
        .where(eq(users.id, user.id))
        .returning();
      logger.info({ userId: user?.id }, "Owner role auto-promoted");
    }

    req.user = user ?? null;
    return next();
  } catch (cause) {
    logger.warn({ cause }, "Auth middleware: invalid token");
    req.user = null;
    return next();
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: typeof users.$inferSelect | null;
    }
  }
}
