import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { ConsoleLayout } from "@/components/console/ConsoleLayout";
import { createServerClient } from "@/lib/trpcServer";

export const dynamic = "force-dynamic";

// No metadata — page must not appear in sitemaps or SEO
export const metadata = {};

export default async function ConsolePage() {
  const { getToken, userId: clerkId } = await auth();

  if (!clerkId) {
    notFound();
  }

  // Verify operator status server-side via API
  const token = await getToken();
  if (!token) notFound();

  try {
    const serverTrpc = createServerClient();
    // If this throws UNAUTHORIZED or NOT_FOUND, the user isn't operator
    await (serverTrpc as {
      operator: { getStats: { query: () => Promise<unknown> } };
    }).operator.getStats.query();
  } catch {
    notFound();
  }

  return <ConsoleLayout />;
}
