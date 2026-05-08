"use client";

import { trpc } from "@/lib/trpc";

export function ConsoleLayout() {
  const { data: stats } = trpc.operator.getStats.useQuery();

  return (
    <div className="min-h-screen bg-deep-forest text-bone p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="font-display text-3xl mb-2">Operator Console</h1>
        <p className="text-stone text-sm mb-8">Internal admin dashboard</p>

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <Stat label="Total users" value={stats.totalUsers} />
            <Stat label="Scrape jobs" value={stats.totalScrapeJobs} />
          </div>
        )}

        <div className="bg-forest/30 border border-stone/20 rounded-lg p-6">
          <p className="text-stone/70 text-sm">
            Full console features will be populated in Phase 4.
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-forest/20 border border-stone/20 rounded-lg p-4">
      <p className="text-stone/70 text-xs mb-1">{label}</p>
      <p className="font-display text-2xl text-bone">{value}</p>
    </div>
  );
}
