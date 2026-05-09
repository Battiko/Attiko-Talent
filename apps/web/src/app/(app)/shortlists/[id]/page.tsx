"use client";

import Link from "next/link";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { SiteNav } from "@/components/layout/SiteNav";
import { ArrowLeft, Trash2, MapPin, Music, Calendar } from "lucide-react";
import { formatRate } from "@/lib/utils";

export default function ShortlistPage({ params }: { params: { id: string } }) {
  const { data, refetch, isLoading } = trpc.shortlists.get.useQuery({ id: params.id });
  const removeArtist = trpc.shortlists.removeArtist.useMutation({ onSuccess: refetch });
  const [removing, setRemoving] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black">
        <SiteNav />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 pb-16 space-y-4">
          {[1,2,3].map((i) => <div key={i} className="h-24 bg-charcoal rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-black">
        <SiteNav />
        <div className="max-w-4xl mx-auto px-4 pt-24 text-center">
          <p className="font-display text-2xl text-gold">Shortlist not found</p>
          <Link href="/shortlists" className="text-gold/50 hover:text-gold text-sm mt-4 inline-block">← Back to shortlists</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <SiteNav />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-16">
        <Link href="/shortlists" className="inline-flex items-center gap-2 text-gold/50 hover:text-gold text-sm transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to shortlists
        </Link>

        <div className="mb-8">
          <h1 className="font-display text-3xl text-gold mb-2">{data.name}</h1>
          <div className="flex flex-wrap gap-4 text-stone text-sm">
            {data.eventName && <span>{data.eventName}</span>}
            {data.eventDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(data.eventDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </span>
            )}
            {data.eventLocation && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {data.eventLocation}
              </span>
            )}
          </div>
          {data.description && <p className="text-gold/60 text-sm mt-2">{data.description}</p>}
        </div>

        {data.items.length === 0 ? (
          <div className="text-center py-16 border border-charcoal-mid rounded-lg">
            <p className="font-display text-xl text-gold mb-2">No artists yet</p>
            <p className="text-stone text-sm mb-4">Search for artists and add them to this shortlist.</p>
            <Link href="/search" className="bg-gold text-black px-5 py-2.5 rounded text-sm font-medium hover:bg-gold-light transition-colors">
              Search artists
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-stone text-sm mb-4">{data.items.length} {data.items.length === 1 ? "artist" : "artists"}</p>
            {data.items.map((item) => (
              <div key={item.id} className="bg-charcoal border border-charcoal-mid rounded-lg p-4 flex items-center gap-4 hover:border-gold/20 transition-colors">
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-charcoal-mid shrink-0 flex items-center justify-center">
                  {item.artist.imageUrl ? (
                    <img src={item.artist.imageUrl} alt={item.artist.name} className="w-full h-full object-cover" />
                  ) : (
                    <Music className="w-6 h-6 text-charcoal-light" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <Link href={`/artists/${item.artist.slug}`} className="font-display text-gold hover:text-gold-light transition-colors">
                    {item.artist.name}
                  </Link>
                  <div className="flex flex-wrap items-center gap-3 mt-0.5 text-xs text-stone">
                    <span className="capitalize">{item.artist.talentType}</span>
                    {[item.artist.city, item.artist.country].filter(Boolean).join(", ") && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {[item.artist.city, item.artist.country].filter(Boolean).join(", ")}
                      </span>
                    )}
                    {item.artist.genres.slice(0, 2).map((g) => (
                      <span key={g} className="bg-charcoal-mid px-2 py-0.5 rounded-full capitalize">{g}</span>
                    ))}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-gold text-sm font-medium">
                    {formatRate(
                      item.artist.rateMinCents ? item.artist.rateMinCents / 100 : null,
                      item.artist.rateMinCents ? item.artist.rateMinCents / 100 : null,
                      "USD"
                    )}
                  </p>
                  {item.artist.overallScore && (
                    <p className="text-stone text-xs mt-0.5">Score {item.artist.overallScore}</p>
                  )}
                </div>

                <button
                  onClick={() => { setRemoving(item.id); removeArtist.mutate({ itemId: item.id }, { onSettled: () => setRemoving(null) }); }}
                  disabled={removing === item.id}
                  className="text-stone/30 hover:text-red-400 transition-colors shrink-0 ml-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
