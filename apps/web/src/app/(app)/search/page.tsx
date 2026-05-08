"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SearchBar } from "@/components/search/SearchBar";
import { SearchResults } from "@/components/search/SearchResults";
import { SearchFilters } from "@/components/search/SearchFilters";
import { SiteNav } from "@/components/layout/SiteNav";

function SearchPage() {
  const params = useSearchParams();
  const query = params.get("q") ?? "";
  const location = params.get("loc") ?? "";
  const radius = parseInt(params.get("r") ?? "50", 10);

  return (
    <div className="min-h-screen bg-off-white">
      <SiteNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16">
        <div className="mb-6">
          <SearchBar
            defaultQuery={query}
            defaultLocation={location}
            defaultRadius={radius}
          />
        </div>
        {query && location ? (
          <div className="flex gap-6">
            <aside className="hidden lg:block w-64 shrink-0">
              <SearchFilters />
            </aside>
            <main className="flex-1 min-w-0">
              <SearchResults query={query} location={location} radiusMiles={radius} />
            </main>
          </div>
        ) : (
          <div className="text-center py-24 text-muted-foreground">
            <p className="font-display text-2xl text-bark">Enter a talent type and city to begin.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPageWrapper() {
  return (
    <Suspense>
      <SearchPage />
    </Suspense>
  );
}
