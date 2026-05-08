import { z } from "zod";
import { router, ownerProcedure } from "../trpc.js";
import { getDb } from "@attiko/db/client";
import { users, scrapeJobs, auditLog } from "@attiko/db/schema";
import { desc, eq } from "drizzle-orm";

export const operatorRouter = router({
  getStats: ownerProcedure.query(async () => {
    const db = getDb();
    const [userCount, scrapeJobCount] = await Promise.all([
      db.select().from(users),
      db.select().from(scrapeJobs),
    ]);
    return {
      totalUsers: userCount.length,
      totalScrapeJobs: scrapeJobCount.length,
    };
  }),

  listUsers: ownerProcedure
    .input(z.object({ page: z.number().default(1), pageSize: z.number().default(50) }))
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db
        .select({
          id: users.id,
          email: users.email,
          role: users.role,
          searchesUsedThisMonth: users.searchesUsedThisMonth,
          createdAt: users.createdAt,
          stripeCustomerId: users.stripeCustomerId,
        })
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);

      return rows;
    }),

  setUserRole: ownerProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["user", "pro", "agency", "admin"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db
        .update(users)
        .set({ role: input.role, updatedAt: new Date() })
        .where(eq(users.id, input.userId));

      await db.insert(auditLog).values({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "set_user_role",
        targetType: "user",
        targetId: input.userId,
        meta: { newRole: input.role },
      });

      return { success: true };
    }),

  getAuditLog: ownerProcedure
    .input(z.object({ page: z.number().default(1), pageSize: z.number().default(100) }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(auditLog)
        .orderBy(desc(auditLog.createdAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);
    }),
});
