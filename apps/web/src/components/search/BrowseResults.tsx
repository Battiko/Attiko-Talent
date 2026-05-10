"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { ArtistCard } from "./ArtistCard";

interface BrowseResultsProps {
  talentType: string;
  hasVideo: boolean;
}

export function BrowseResults({ talentType, hasVideo }: BrowseResultsProps) {
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.search.browse.useQuery({
    talentTypes: talentType ? [talentType] : undefined,
    hasVideo: hasVideo || undefined,
    page,
    pageSize: 24,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] bg-charcoal border border-gold/5 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="font-display text-3xl text-gold/60 font-light mb-3">No artists yet</p>
        <p className="text-stone/40 text-sm font-sans">
          The database is being populated. Check back soon or try a search above.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {data.items.map((artist) => (
          <ArtistCard key={artist.id} artist={artist} />
        ))}
      </div>

      {(data.hasMore || page > 1) && (
        <div className="flex items-center justify-center gap-4 mt-10">
          {page > 1 && (
            <button
              onClick={() => setPage((p) => p - 1)}
              className="text-[10px] tracking-widest uppercase px-8 py-3 border border-gold/20 text-stone/50 hover:border-gold/40 hover:text-gold transition-colors font-sans"
            >
              Previous
            </button>
          )}
          {data.hasMore && (
            <button
              onClick={() => setPage((p) => p + 1)}
              className="text-[10px] tracking-widest uppercase px-8 py-3 border border-gold/20 text-stone/50 hover:border-gold/40 hover:text-gold transition-colors font-sans"
            >
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  );
}
