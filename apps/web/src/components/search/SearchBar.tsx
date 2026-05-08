"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
      <div className="flex flex-col sm:flex-row gap-3 items-stretch bg-linen border border-sand rounded-lg p-3 shadow-sm">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Jazz saxophonist, string quartet, Bollywood DJ…"
          className="flex-1 bg-transparent outline-none text-deep-forest placeholder-stone/60 text-sm px-2"
          required
          aria-label="Talent type"
        />
        <div className="hidden sm:block w-px bg-sand self-stretch" />
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="City or region"
          className="w-full sm:w-44 bg-transparent outline-none text-deep-forest placeholder-stone/60 text-sm px-2"
          required
          aria-label="Location"
        />
        <div className="hidden sm:block w-px bg-sand self-stretch" />
        <select
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          className="bg-transparent outline-none text-deep-forest text-sm px-2 cursor-pointer"
          aria-label="Search radius"
        >
          {RADIUS_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r} mi
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-deep-forest text-bone text-sm px-6 py-2.5 rounded hover:bg-forest transition-colors shrink-0"
        >
          Search
        </button>
      </div>
    </form>
  );
}
