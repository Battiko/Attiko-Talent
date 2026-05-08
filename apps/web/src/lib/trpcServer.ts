import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@attiko/api/router";

export function createServerClient() {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000"}/trpc`,
        transformer: superjson,
      }),
    ],
  });
}
