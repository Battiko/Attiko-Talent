import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { ConsoleLayout } from "@/components/console/ConsoleLayout";

export const dynamic = "force-dynamic";
export const metadata = {};

export default async function ConsolePage() {
  const { userId } = await auth();
  if (!userId) notFound();

  return <ConsoleLayout />;
}
