"use client";

import { trpc } from "@/lib/trpc";
import { ArtistCard } from "./ArtistCard";

interface SearchResultsProps {
  query: string;
  location: string;
  radiusMiles: number;
}

export function SearchResults({ query, location, radiusMiles }: SearchResultsProps) {
  const { data, isLoading, error } = trpc.search.search.useQuery(
    { query, location, radiusMiles, page: 1, pageSize: 20 },
    { enabled: Boolean(query && location) }
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-72 bg-sand/40 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-destructive text-sm">{error.message}</p>
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="font-display text-2xl text-bark mb-2">No results found</p>
        <p className="text-stone text-sm">
          Try broadening your search radius or adjusting the talent type.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-stone text-sm mb-4">
        {data.items.length > 0
          ? `${data.items.length} performers found near ${data.geocodedLocation?.label ?? location}`
          : ""}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.items.map((artist: (typeof data.items)[number]) => (
          <ArtistCard key={artist.id} artist={artist} />
        ))}
      </div>
    </div>
  );
}
