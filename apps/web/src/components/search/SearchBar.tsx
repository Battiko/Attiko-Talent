"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

const RADIUS_OPTIONS = [5, 10, 25, 50, 100, 250, 500] as const;

interface SearchBarProps {
  defaultQuery?: string;
  defaultLocation?: string;
  defaultRadius?: number;
  onSearch?: (query: string, location: string, radius: number) => void;
}

export function SearchBar({
  defaultQuery = "",
  defaultLocation = "",
  defaultRadius = 50,
  onSearch,
}: SearchBarProps) {
  const [query, setQuery] = useState(defaultQuery);
  const [location, setLocation] = useState(defaultLocation);
  const [radius, setRadius] = useState(defaultRadius);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || !location.trim()) return;
    if (onSearch) {
      onSearch(query.trim(), location.trim(), radius);
    } else {
      const params = new URLSearchParams({
        q: query.trim(),
        loc: location.trim(),
        r: String(radius),
      });
      router.push(`/search?${params.toString()}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col sm:flex-row border border-gold/20 hover:border-gold/40 transition-colors duration-300 bg-charcoal/50 backdrop-blur-sm">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Jazz saxophonist, string quartet, Bollywood DJ…"
          className="flex-1 bg-transparent outline-none text-gold placeholder-stone/30 text-sm px-5 py-4 font-sans"
          required
          aria-label="Talent type"
        />
        <div className="hidden sm:block w-px bg-gold/10 self-stretch" />
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="City or region"
          className="sm:w-44 bg-transparent outline-none text-gold placeholder-stone/30 text-sm px-5 py-4 font-sans border-t border-gold/10 sm:border-t-0"
          required
          aria-label="Location"
        />
        <div className="hidden sm:block w-px bg-gold/10 self-stretch" />
        <select
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          className="bg-transparent outline-none text-stone/60 text-xs px-4 py-4 cursor-pointer font-sans border-t border-gold/10 sm:border-t-0 appearance-none"
          aria-label="Search radius"
        >
          {RADIUS_OPTIONS.map((r) => (
            <option key={r} value={r} className="bg-charcoal text-gold">
              {r} mi
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-gold text-black text-[11px] tracking-widest uppercase px-8 py-4 hover:bg-gold-light transition-colors duration-300 font-medium flex items-center justify-center gap-2 border-t border-gold/10 sm:border-t-0"
        >
          <Search className="w-3.5 h-3.5" />
          Search
        </button>
      </div>
    </form>
  );
}
