"use client";

import Link from "next/link";
import { MapPin, Music, ArrowLeft, ExternalLink, Play, Mail, Phone, Link2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { SiteNav } from "@/components/layout/SiteNav";
import { AddToShortlistButton } from "@/components/shortlists/AddToShortlistButton";

function getYouTubeEmbedUrl(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/embed\/([^?]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m?.[1]) return `https://www.youtube.com/embed/${m[1]}`;
  }
  return null;
}

const SOCIAL_META: Record<string, { label: string; color: string; icon: string }> = {
  instagram: { label: "Instagram",  color: "hover:border-pink-400/40 hover:text-pink-300",  icon: "IG" },
  tiktok:    { label: "TikTok",     color: "hover:border-white/40 hover:text-white",         icon: "TT" },
  youtube:   { label: "YouTube",    color: "hover:border-red-400/40 hover:text-red-300",     icon: "YT" },
  spotify:   { label: "Spotify",    color: "hover:border-green-400/40 hover:text-green-300", icon: "SP" },
  soundcloud:{ label: "SoundCloud", color: "hover:border-orange-400/40 hover:text-orange-300", icon: "SC" },
  facebook:  { label: "Facebook",   color: "hover:border-blue-400/40 hover:text-blue-300",   icon: "FB" },
};

function SocialBadge({ source, url }: { source: string; url: string }) {
  const meta = SOCIAL_META[source] ?? { label: source, color: "hover:border-gold/40 hover:text-gold", icon: "→" };
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 border border-gold/15 text-stone/50 px-5 py-3 text-xs tracking-widest uppercase font-sans transition-all duration-300 ${meta.color}`}>
      <span className="font-bold text-[10px]">{meta.icon}</span>
      {meta.label}
      <ExternalLink className="w-3 h-3 opacity-50" />
    </a>
  );
}

function PlatformCard({ source, url, followerCount, verifiedBadge }: {
  source: string;
  url: string;
  followerCount: number | null;
  verifiedBadge: boolean;
}) {
  const meta = SOCIAL_META[source];
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className={`flex items-center justify-between border border-gold/10 bg-charcoal/50 px-5 py-4 transition-all duration-300 group ${meta?.color ?? "hover:border-gold/30 hover:text-gold"}`}>
      <div className="flex items-center gap-4">
        <span className="text-[10px] font-bold text-gold/30 font-sans group-hover:text-current transition-colors">{meta?.icon ?? "→"}</span>
        <div>
          <p className="text-gold/70 text-xs tracking-widest uppercase font-sans group-hover:text-current transition-colors duration-300">
            {meta?.label ?? source}
            {verifiedBadge && <span className="ml-2 text-gold/30">✓</span>}
          </p>
          {followerCount && (
            <p className="text-stone/40 text-xs font-sans mt-0.5">{followerCount.toLocaleString()} followers</p>
          )}
        </div>
      </div>
      <ExternalLink className="w-3.5 h-3.5 text-gold/20 group-hover:text-current transition-colors duration-300" />
    </a>
  );
}

export default function ArtistPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const { data: artist, isLoading, error } = trpc.search.getArtist.useQuery({ slug });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black">
        <SiteNav />
        <div className="max-w-4xl mx-auto px-6 pt-12 pb-16 space-y-4">
          <div className="h-80 bg-charcoal border border-gold/5 animate-pulse" />
          <div className="h-8 bg-charcoal border border-gold/5 w-1/2 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className="min-h-screen bg-black">
        <SiteNav />
        <div className="max-w-4xl mx-auto px-6 pt-32 text-center">
          <p className="font-display text-4xl text-gold/50 font-light mb-6">Artist not found</p>
          <Link href="/search" className="text-stone/40 hover:text-gold text-xs tracking-widest uppercase transition-colors duration-300">
            ← Back to search
          </Link>
        </div>
      </div>
    );
  }

  const location = [artist.city, artist.country].filter(Boolean).join(", ");
  const youtubeEmbed = artist.videoUrl ? getYouTubeEmbedUrl(artist.videoUrl) : null;
  const youtubeProfile = artist.platformProfiles.find((p) => p.source === "youtube");
  const youtubeEmbedFromProfile = youtubeProfile?.url ? getYouTubeEmbedUrl(youtubeProfile.url) : null;
  const embedUrl = youtubeEmbed ?? youtubeEmbedFromProfile;

  return (
    <div className="min-h-screen bg-black">
      <SiteNav />
      <div className="max-w-4xl mx-auto px-6 pt-10 pb-20">
        <Link
          href="/search"
          className="inline-flex items-center gap-2 text-stone/40 hover:text-gold text-[11px] tracking-widest uppercase transition-colors duration-300 mb-10 font-sans"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to search
        </Link>

        {/* Hero */}
        <div className="border border-gold/10 overflow-hidden mb-6">
          {artist.imageUrl ? (
            <div className="aspect-[21/9] relative overflow-hidden">
              <img src={artist.imageUrl} alt={artist.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            </div>
          ) : (
            <div className="aspect-[21/9] flex items-center justify-center bg-charcoal">
              <Music className="w-16 h-16 text-charcoal-light" />
            </div>
          )}

          <div className="p-8 sm:p-10">
            <div className="flex items-start justify-between gap-4 mb-3">
              <h1 className="font-display text-4xl sm:text-5xl text-gold font-light leading-tight">{artist.name}</h1>
              <div className="flex items-center gap-3 shrink-0 pt-1">
                {artist.overallScore !== null && (
                  <span className="text-[10px] tracking-widest uppercase border border-gold/20 text-gold/50 px-3 py-1.5 font-sans">
                    Score {artist.overallScore}
                  </span>
                )}
                <AddToShortlistButton artistId={artist.id} />
              </div>
            </div>

            <p className="text-stone/50 text-[11px] tracking-widest uppercase mb-4 font-sans">{artist.talentType}</p>

            {/* Social quick-links */}
            {artist.platformProfiles.filter((p) => ["instagram", "tiktok", "facebook"].includes(p.source)).length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {artist.platformProfiles
                  .filter((p) => ["instagram", "tiktok", "facebook"].includes(p.source))
                  .map((p) => <SocialBadge key={p.source} source={p.source} url={p.url} />)}
              </div>
            )}

            {location && (
              <div className="flex items-center gap-2 text-stone/40 text-sm mb-6 font-sans">
                <MapPin className="w-3.5 h-3.5" />
                <span>{location}</span>
              </div>
            )}

            {artist.bio && (
              <p className="text-gold/60 leading-relaxed mb-6 font-sans text-base font-light max-w-2xl">{artist.bio}</p>
            )}

            {artist.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {artist.genres.map((g) => (
                  <span key={g} className="text-[10px] tracking-widest uppercase border border-gold/10 text-stone/40 px-3 py-1 font-sans">{g}</span>
                ))}
              </div>
            )}

            {(artist.rateMinCents || artist.rateMaxCents) && (
              <div className="border-t border-gold/10 pt-5 mt-2">
                <p className="text-[10px] tracking-widest uppercase text-stone/30 mb-1.5 font-sans">Rate</p>
                <p className="text-gold font-display text-xl font-light">
                  {artist.rateMinCents && artist.rateMaxCents
                    ? `$${Math.round(artist.rateMinCents / 100).toLocaleString()} – $${Math.round(artist.rateMaxCents / 100).toLocaleString()}`
                    : artist.rateMinCents
                    ? `From $${Math.round(artist.rateMinCents / 100).toLocaleString()}`
                    : `Up to $${Math.round(artist.rateMaxCents! / 100).toLocaleString()}`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Video embed */}
        {embedUrl && (
          <div className="border border-gold/10 overflow-hidden mb-6">
            <div className="px-6 pt-5 pb-3 flex items-center gap-3 border-b border-gold/10">
              <Play className="w-3.5 h-3.5 text-gold/40" />
              <h2 className="font-display text-lg text-gold/80 font-light tracking-wide">Performance</h2>
            </div>
            <div className="aspect-video">
              <iframe
                src={embedUrl}
                title={`${artist.name} performance`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {/* Direct video link */}
        {artist.videoUrl && !embedUrl && (
          <div className="border border-gold/10 p-6 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Play className="w-3.5 h-3.5 text-gold/40" />
              <h2 className="font-display text-lg text-gold/80 font-light">Performance</h2>
            </div>
            <a
              href={artist.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[11px] tracking-widest uppercase text-stone/40 hover:text-gold border border-gold/10 hover:border-gold/30 px-5 py-2.5 transition-all duration-300 font-sans"
            >
              Watch <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Contact */}
        {artist.contacts && artist.contacts.length > 0 && (
          <div className="border border-gold/10 p-6 sm:p-8 mb-6">
            <h2 className="font-display text-lg text-gold/80 font-light mb-1">Contact</h2>
            <div className="w-8 h-px bg-gold/20 mb-6" />
            <div className="space-y-3">
              {artist.contacts.map((c, i) => {
                const isEmail = c.type === "email";
                const isPhone = c.type === "phone";
                const href = isEmail ? `mailto:${c.value}` : isPhone ? `tel:${c.value}` : c.value;
                return (
                  <div key={i} className="flex items-center justify-between border border-gold/10 px-5 py-4">
                    <div className="flex items-center gap-4">
                      {isEmail ? <Mail className="w-3.5 h-3.5 text-gold/30" /> : isPhone ? <Phone className="w-3.5 h-3.5 text-gold/30" /> : <Link2 className="w-3.5 h-3.5 text-gold/30" />}
                      <div>
                        <p className="text-stone/30 text-[10px] tracking-widest uppercase font-sans">{c.label ?? `${c.type}${c.subtype ? ` · ${c.subtype}` : ""}`}</p>
                        <a href={href} target={isEmail || isPhone ? undefined : "_blank"} rel="noopener noreferrer"
                          className="text-gold/70 text-sm hover:text-gold transition-colors duration-300 font-sans">
                          {c.value}
                        </a>
                      </div>
                    </div>
                    {c.isVerified && <span className="text-[10px] tracking-widest text-gold/30 font-sans">✓ verified</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Platform profiles */}
        {artist.platformProfiles.length > 0 && (
          <div className="border border-gold/10 p-6 sm:p-8">
            <h2 className="font-display text-lg text-gold/80 font-light mb-1">Find them online</h2>
            <div className="w-8 h-px bg-gold/20 mb-6" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {artist.platformProfiles.map((p) => (
                <PlatformCard
                  key={p.source}
                  source={p.source}
                  url={p.url}
                  followerCount={p.followerCount}
                  verifiedBadge={p.verifiedBadge}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
