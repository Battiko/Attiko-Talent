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
    <div className="min-h-screen bg-off-white">
      <SiteNav />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-24 pb-32 text-center">
        <h1 className="font-display text-5xl sm:text-6xl text-deep-forest mb-4 text-balance">
          Find extraordinary talent
        </h1>
        <p className="text-stone text-lg mb-12">
          Search musicians, DJs, vocalists, and dancers worldwide.
        </p>
        <SearchBar onSearch={handleSearch} />
      </div>
    </div>
  );
}
