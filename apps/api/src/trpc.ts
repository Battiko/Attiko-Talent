import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import superjson from "superjson";
import type { Request, Response } from "express";
import type { User } from "@attiko/db/schema";

export interface Context {
  req: Request;
  res: Response;
  user: User | null;
  requestId: string;
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof z.ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const ownerProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user || (ctx.user.role !== "owner" && ctx.user.role !== "admin")) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
