import { router } from "./trpc.js";
import { searchRouter } from "./routers/search.js";
import { operatorRouter } from "./routers/operator.js";

export const appRouter = router({
  search: searchRouter,
  operator: operatorRouter,
});

export type AppRouter = typeof appRouter;
