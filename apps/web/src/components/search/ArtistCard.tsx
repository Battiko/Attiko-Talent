"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Music } from "lucide-react";
import { formatDistance, formatRate, scoreColor } from "@/lib/utils";
import { AddToShortlistButton } from "@/components/shortlists/AddToShortlistButton";

const SOCIAL_ICONS: Record<string, { label: string; short: string }> = {
  instagram: { label: "Instagram", short: "IG" },
  tiktok:    { label: "TikTok",    short: "TT" },
  youtube:   { label: "YouTube",   short: "YT" },
};

interface ArtistCardProps {
  artist: {
    id: string;
    slug: string;
    name: string;
    talentType: string;
    bio: string | null;
    city: string | null;
    country: string | null;
    distanceMiles: number | null;
    genres: string[];
    imageUrl: string | null;
    rateMin: number | null;
    rateMax: number | null;
    rateCurrency: string | null;
    eventFitScore: number | null;
    overallScore: number | null;
    sources: string[];
    socialSources?: string[];
  };
}

export function ArtistCard({ artist }: ArtistCardProps) {
  const location = [artist.city, artist.country].filter(Boolean).join(", ");

  return (
    <Link href={`/artists/${artist.slug}`} className="group block">
      <div className="relative overflow-hidden border border-gold/10 hover:border-gold/30 transition-all duration-500 bg-charcoal">
        {/* Image */}
        <div className="aspect-[3/4] relative bg-charcoal-mid overflow-hidden">
          {artist.imageUrl ? (
            <Image
              src={artist.imageUrl}
              alt={artist.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Music className="w-10 h-10 text-charcoal-light" />
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

          {/* Score badge */}
          {artist.eventFitScore !== null && (
            <div className="absolute top-3 right-3 bg-black/70 text-[10px] tracking-widest uppercase px-2.5 py-1 backdrop-blur-sm border border-gold/20">
              <span className={scoreColor(artist.eventFitScore)}>
                {artist.eventFitScore}
              </span>
              <span className="text-stone/50 ml-1">fit</span>
            </div>
          )}

          {/* Name overlay at bottom of image */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="font-display text-xl text-gold font-light leading-tight group-hover:text-gold-light transition-colors duration-300">
              {artist.name}
            </h3>
            <p className="text-stone/60 text-[11px] tracking-widest uppercase mt-0.5 font-sans">
              {artist.talentType}
            </p>
          </div>
        </div>

        {/* Details below image */}
        <div className="p-4 border-t border-gold/10">
          {artist.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {artist.genres.slice(0, 3).map((g) => (
                <span
                  key={g}
                  className="text-[10px] tracking-widest uppercase text-stone/40 border border-gold/10 px-2 py-0.5 font-sans"
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-stone/40 text-xs font-sans">
              {location && (
                <>
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span>{location}</span>
                </>
              )}
              {artist.distanceMiles !== null && (
                <span className="text-stone/30 ml-1">· {formatDistance(artist.distanceMiles)}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {(artist.socialSources ?? []).filter((s) => SOCIAL_ICONS[s]).map((s) => (
                <span key={s} className="text-[9px] tracking-widest font-bold border border-gold/15 text-stone/40 px-1.5 py-0.5 font-sans">
                  {SOCIAL_ICONS[s]!.short}
                </span>
              ))}
              {(artist.rateMin || artist.rateMax) && (
                <span className="text-gold/60 text-xs font-sans">
                  {formatRate(artist.rateMin, artist.rateMax, artist.rateCurrency ?? "USD")}
                </span>
              )}
              <AddToShortlistButton artistId={artist.id} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
