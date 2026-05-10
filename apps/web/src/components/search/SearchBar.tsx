"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { TALENT_TYPES } from "@/lib/talentTypes";

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
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!query.trim()) { setSuggestions([]); return; }
    const q = query.toLowerCase();
    const matches = TALENT_TYPES.filter((t) => t.toLowerCase().includes(q)).slice(0, 8);
    setSuggestions(matches as unknown as string[]);
    setHighlightedIndex(-1);
  }, [query]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setShowSuggestions(false);
    if (!query.trim() || !location.trim()) return;
    if (onSearch) {
      onSearch(query.trim(), location.trim(), radius);
    } else {
      const params = new URLSearchParams({ q: query.trim(), loc: location.trim(), r: String(radius) });
      router.push(`/search?${params.toString()}`);
    }
  }

  function selectSuggestion(s: string) {
    setQuery(s);
    setSuggestions([]);
    setShowSuggestions(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlightedIndex((i) => Math.min(i + 1, suggestions.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setHighlightedIndex((i) => Math.max(i - 1, -1)); }
    if (e.key === "Enter" && highlightedIndex >= 0) { e.preventDefault(); selectSuggestion(suggestions[highlightedIndex]!); }
    if (e.key === "Escape") { setShowSuggestions(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full relative">
      <div className="flex flex-col sm:flex-row border border-gold/20 hover:border-gold/40 transition-colors duration-300 bg-charcoal/50 backdrop-blur-sm">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder="Jazz saxophonist, string quartet, Bollywood DJ…"
            className="w-full bg-transparent outline-none text-gold placeholder-stone/30 text-sm px-5 py-4 font-sans"
            aria-label="Talent type"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 border border-gold/20 border-t-0 bg-charcoal shadow-2xl">
              {suggestions.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={() => selectSuggestion(s)}
                  className={`w-full text-left px-5 py-2.5 text-sm font-sans transition-colors ${
                    i === highlightedIndex ? "bg-gold/10 text-gold" : "text-stone/60 hover:bg-gold/5 hover:text-gold"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="hidden sm:block w-px bg-gold/10 self-stretch" />
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="City or region"
          className="sm:w-44 bg-transparent outline-none text-gold placeholder-stone/30 text-sm px-5 py-4 font-sans border-t border-gold/10 sm:border-t-0"
          aria-label="Location"
        />
        <div className="hidden sm:block w-px bg-gold/10 self-stretch" />
        <select
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          className="bg-transparent outline-none text-stone/60 text-xs px-4 py-4 cursor-pointer font-sans border-t border-gold/10 sm:border-t-0 appearance-none"
        >
          {RADIUS_OPTIONS.map((r) => (
            <option key={r} value={r} className="bg-charcoal text-gold">{r} mi</option>
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
