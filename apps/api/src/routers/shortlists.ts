import { z } from "zod";
import { router, protectedProcedure } from "../trpc.js";
import { TRPCError } from "@trpc/server";
import { getDb } from "@attiko/db/client";
import { shortlists, shortlistItems, artists } from "@attiko/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

export const shortlistsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db
      .select()
      .from(shortlists)
      .where(eq(shortlists.userId, ctx.user.id))
      .orderBy(desc(shortlists.updatedAt));

    const counts = await Promise.all(
      rows.map((s) =>
        db.select().from(shortlistItems).where(eq(shortlistItems.shortlistId, s.id))
          .then((items) => ({ id: s.id, count: items.length }))
      )
    );
    const countMap = new Map(counts.map((c) => [c.id, c.count]));

    return rows.map((s) => ({ ...s, artistCount: countMap.get(s.id) ?? 0 }));
  }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      eventName: z.string().max(100).optional(),
      eventDate: z.string().optional(),
      eventLocation: z.string().max(200).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [shortlist] = await db
        .insert(shortlists)
        .values({
          userId: ctx.user.id,
          name: input.name,
          description: input.description ?? null,
          eventName: input.eventName ?? null,
          eventDate: input.eventDate ? new Date(input.eventDate) : null,
          eventLocation: input.eventLocation ?? null,
          shareToken: createId(),
        })
        .returning();
      return shortlist;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const [shortlist] = await db
        .select()
        .from(shortlists)
        .where(and(eq(shortlists.id, input.id), eq(shortlists.userId, ctx.user.id)))
        .limit(1);

      if (!shortlist) throw new TRPCError({ code: "NOT_FOUND" });

      const items = await db
        .select({ item: shortlistItems, artist: artists })
        .from(shortlistItems)
        .innerJoin(artists, eq(shortlistItems.artistId, artists.id))
        .where(eq(shortlistItems.shortlistId, shortlist.id));

      return {
        ...shortlist,
        items: items.map(({ item, artist }) => ({
          id: item.id,
          role: item.role,
          notes: item.notes,
          status: item.status,
          budgetCents: item.budgetCents,
          addedAt: item.addedAt.toISOString(),
          artist: {
            id: artist.id,
            slug: artist.slug,
            name: artist.name,
            talentType: artist.talentType,
            imageUrl: artist.imageUrl,
            city: artist.city,
            country: artist.country,
            genres: artist.genres,
            rateMinCents: artist.rateMinCents,
            rateMaxCents: artist.rateMaxCents,
            overallScore: artist.overallScore,
          },
        })),
      };
    }),

  addArtist: protectedProcedure
    .input(z.object({
      shortlistId: z.string(),
      artistId: z.string(),
      role: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [shortlist] = await db
        .select()
        .from(shortlists)
        .where(and(eq(shortlists.id, input.shortlistId), eq(shortlists.userId, ctx.user.id)))
        .limit(1);

      if (!shortlist) throw new TRPCError({ code: "NOT_FOUND" });

      await db
        .insert(shortlistItems)
        .values({
          shortlistId: input.shortlistId,
          artistId: input.artistId,
          role: input.role ?? null,
          notes: input.notes ?? null,
        })
        .onConflictDoNothing();

      return { success: true };
    }),

  removeArtist: protectedProcedure
    .input(z.object({ itemId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [item] = await db
        .select({ item: shortlistItems, shortlist: shortlists })
        .from(shortlistItems)
        .innerJoin(shortlists, eq(shortlistItems.shortlistId, shortlists.id))
        .where(and(eq(shortlistItems.id, input.itemId), eq(shortlists.userId, ctx.user.id)))
        .limit(1);

      if (!item) throw new TRPCError({ code: "NOT_FOUND" });
      await db.delete(shortlistItems).where(eq(shortlistItems.id, input.itemId));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db
        .delete(shortlists)
        .where(and(eq(shortlists.id, input.id), eq(shortlists.userId, ctx.user.id)));
      return { success: true };
    }),
});
