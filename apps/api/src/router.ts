import { router } from "./trpc.js";
import { searchRouter } from "./routers/search.js";
import { operatorRouter } from "./routers/operator.js";
import { shortlistsRouter } from "./routers/shortlists.js";

export const appRouter = router({
  search: searchRouter,
  operator: operatorRouter,
  shortlists: shortlistsRouter,
});

export type AppRouter = typeof appRouter;
