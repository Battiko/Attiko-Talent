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
          <div key={i} className="aspect-[3/4] bg-charcoal border border-gold/5 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-400/70 text-sm font-sans">{error.message}</p>
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="font-display text-3xl text-gold/60 font-light mb-3">No results found</p>
        <p className="text-stone/40 text-sm font-sans">
          Try broadening your search radius or adjusting the talent type.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-stone/40 text-[11px] tracking-widest uppercase mb-6 font-sans">
        {data.items.length} performers found near {data.geocodedLocation?.label ?? location}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.items.map((artist: (typeof data.items)[number]) => (
          <ArtistCard key={artist.id} artist={artist} />
        ))}
      </div>
    </div>
  );
}
