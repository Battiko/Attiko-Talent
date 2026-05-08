"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Music, Star } from "lucide-react";
import { cn, formatDistance, formatRate, scoreColor } from "@/lib/utils";

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
  };
}

export function ArtistCard({ artist }: ArtistCardProps) {
  const location = [artist.city, artist.country].filter(Boolean).join(", ");

  return (
    <Link href={`/artists/${artist.slug}`} className="group block">
      <div className="bg-linen border border-sand rounded-lg overflow-hidden hover:border-stone transition-colors">
        <div className="aspect-[4/3] relative bg-sand/40 overflow-hidden">
          {artist.imageUrl ? (
            <Image
              src={artist.imageUrl}
              alt={artist.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Music className="w-10 h-10 text-stone/40" />
            </div>
          )}
          {artist.eventFitScore !== null && (
            <div className="absolute top-2 right-2 bg-deep-forest/90 text-bone text-xs px-2 py-1 rounded backdrop-blur-sm">
              <span className={scoreColor(artist.eventFitScore)}>
                {artist.eventFitScore}
              </span>
              <span className="text-stone ml-0.5">fit</span>
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-display text-lg text-deep-forest group-hover:text-forest transition-colors leading-tight">
              {artist.name}
            </h3>
          </div>

          <p className="text-stone text-xs capitalize mb-2">{artist.talentType}</p>

          {artist.genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {artist.genres.slice(0, 3).map((g) => (
                <span
                  key={g}
                  className="text-xs bg-sand text-bark px-2 py-0.5 rounded-full capitalize"
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-stone mt-auto">
            <div className="flex items-center gap-1">
              {location && (
                <>
                  <MapPin className="w-3 h-3" />
                  <span>{location}</span>
                </>
              )}
              {artist.distanceMiles !== null && (
                <span className="text-stone/60 ml-1">
                  · {formatDistance(artist.distanceMiles)}
                </span>
              )}
            </div>
            <span className="text-bark font-medium">
              {formatRate(artist.rateMin, artist.rateMax, artist.rateCurrency ?? "USD")}
            </span>
          </div>

          <div className="flex items-center gap-1 mt-2">
            {artist.sources.slice(0, 4).map((s) => (
              <span
                key={s}
                className="text-[10px] border border-sand text-stone px-1.5 py-0.5 rounded capitalize"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
