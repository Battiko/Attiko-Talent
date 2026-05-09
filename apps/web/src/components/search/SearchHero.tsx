"use client";

import { useRouter } from "next/navigation";
import { SearchBar } from "./SearchBar";
import { SiteNav } from "../layout/SiteNav";

export function SearchHero() {
  const router = useRouter();

  function handleSearch(query: string, location: string, radius: number) {
    const params = new URLSearchParams({ q: query, loc: location, r: String(radius) });
    router.push(`/search?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-black">
      <SiteNav />
      <div className="relative max-w-3xl mx-auto px-6 pt-20 pb-32 text-center">
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-0">
          <div className="w-[600px] h-[300px] bg-gold/[0.04] blur-[100px] rounded-full" />
        </div>
        <p className="relative text-gold/40 text-[10px] tracking-[0.4em] uppercase mb-6 font-sans">
          Talent Discovery
        </p>
        <h1 className="relative font-display text-5xl sm:text-6xl text-gold font-light mb-5 text-balance leading-[1.1]">
          Find extraordinary talent
        </h1>
        <p className="relative text-stone/60 text-base mb-12 font-sans font-light">
          Search musicians, DJs, vocalists, and dancers worldwide.
        </p>
        <div className="relative">
          <SearchBar onSearch={handleSearch} />
        </div>
      </div>
    </div>
  );
}
