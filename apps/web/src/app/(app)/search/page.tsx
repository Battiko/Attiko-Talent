"use client";

import { Suspense, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { SearchResults } from "@/components/search/SearchResults";
import { BrowseResults } from "@/components/search/BrowseResults";
import { SiteNav } from "@/components/layout/SiteNav";
import { TALENT_TYPES } from "@/lib/talentTypes";

const RADIUS_OPTIONS = [5, 10, 25, 50, 100, 250, 500] as const;

function SearchPage() {
  const router = useRouter();
  const params = useSearchParams();

  const urlQuery = params.get("q") ?? "";
  const urlLocation = params.get("loc") ?? "";
  const urlRadius = parseInt(params.get("r") ?? "50", 10);

  const [selected, setSelected] = useState<string>(urlQuery);
  const [customQuery, setCustomQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [location, setLocation] = useState(urlLocation);
  const [radius, setRadius] = useState<number>(urlRadius);

  const isSearching = Boolean(urlQuery && urlLocation);

  const visibleTypes = useMemo(() => {
    if (!filter.trim()) return TALENT_TYPES as readonly string[];
    const q = filter.toLowerCase();
    return (TALENT_TYPES as readonly string[]).filter((t) => t.toLowerCase().includes(q));
  }, [filter]);

  function toggle(type: string) {
    setSelected((prev) => (prev === type ? "" : type));
    setCustomQuery("");
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const query = selected || customQuery.trim();
    if (!query || !location.trim()) return;
    const p = new URLSearchParams({ q: query, loc: location.trim(), r: String(radius) });
    router.push(`/search?${p.toString()}`);
  }

  function handleClear() {
    setSelected("");
    setCustomQuery("");
    setFilter("");
    router.push("/search");
  }

  const activeQuery = selected || customQuery.trim();

  return (
    <div className="min-h-screen bg-black">
      <SiteNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16">

        {/* Search bar — always visible at top */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex flex-col sm:flex-row border border-gold/20 hover:border-gold/35 transition-colors duration-300 bg-charcoal/50 backdrop-blur-sm">
            {/* Active selection / custom input */}
            <div className="flex-1 flex items-center gap-2 px-5 py-4 border-b border-gold/10 sm:border-b-0">
              {selected ? (
                <>
                  <span className="text-gold text-sm font-sans">{selected}</span>
                  <button
                    type="button"
                    onClick={() => setSelected("")}
                    className="text-stone/40 hover:text-stone/70 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <input
                  type="text"
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  placeholder="Select a type below or type a custom search…"
                  className="w-full bg-transparent outline-none text-gold placeholder-stone/30 text-sm font-sans"
                  aria-label="Talent type"
                />
              )}
            </div>
            <div className="hidden sm:block w-px bg-gold/10 self-stretch" />
            {/* Location */}
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City or region"
              className="sm:w-44 bg-transparent outline-none text-gold placeholder-stone/30 text-sm px-5 py-4 font-sans border-b border-gold/10 sm:border-b-0"
              aria-label="Location"
            />
            <div className="hidden sm:block w-px bg-gold/10 self-stretch" />
            {/* Radius */}
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="bg-transparent outline-none text-stone/60 text-xs px-4 py-4 cursor-pointer font-sans appearance-none border-b border-gold/10 sm:border-b-0"
            >
              {RADIUS_OPTIONS.map((r) => (
                <option key={r} value={r} className="bg-charcoal text-gold">{r} mi</option>
              ))}
            </select>
            {/* Submit */}
            <button
              type="submit"
              disabled={!location.trim() || !activeQuery}
              className="bg-gold text-black text-[11px] tracking-widest uppercase px-8 py-4 hover:bg-gold-light transition-colors duration-300 font-medium flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <Search className="w-3.5 h-3.5" />
              Search
            </button>
          </div>
        </form>

        {/* Results or Picker */}
        {isSearching ? (
          <>
            <div className="flex items-center gap-3 mb-6">
              <p className="text-stone/40 text-[11px] tracking-widest uppercase font-sans">
                Showing results for <span className="text-gold/70">{urlQuery}</span> near <span className="text-gold/70">{urlLocation}</span>
              </p>
              <button
                onClick={handleClear}
                className="text-stone/30 hover:text-stone/60 text-xs font-sans underline underline-offset-2 transition-colors"
              >
                New search
              </button>
            </div>
            <SearchResults query={urlQuery} location={urlLocation} radiusMiles={urlRadius} />
          </>
        ) : (
          <>
            {/* Talent type picker — matches the image layout */}
            <div className="mb-2 flex items-center justify-between gap-4">
              <p className="text-stone/40 text-[10px] tracking-widest uppercase font-sans">
                Main Instruments &amp; Talent Types
              </p>
              {selected && (
                <button
                  onClick={() => setSelected("")}
                  className="text-stone/30 hover:text-stone/60 text-xs font-sans transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Filter within picker */}
            <div className="mb-4">
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter list…"
                className="w-full sm:w-64 bg-charcoal/60 border border-gold/15 text-gold placeholder-stone/30 text-xs px-4 py-2 font-sans outline-none focus:border-gold/35 transition-colors"
              />
            </div>

            {/* Checklist grid */}
            <div className="border border-gold/10 bg-charcoal/20 p-4 sm:p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-1.5">
                {visibleTypes.map((type) => {
                  const checked = selected === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggle(type)}
                      className={`flex items-center gap-2 text-left py-1 transition-colors group ${
                        checked ? "text-gold" : "text-stone/50 hover:text-stone/80"
                      }`}
                    >
                      {/* Checkbox */}
                      <span
                        className={`w-3.5 h-3.5 shrink-0 border flex items-center justify-center transition-colors ${
                          checked
                            ? "border-gold bg-gold"
                            : "border-stone/30 group-hover:border-stone/50"
                        }`}
                      >
                        {checked && (
                          <svg className="w-2 h-2 text-black" viewBox="0 0 10 10" fill="none">
                            <path d="M1.5 5.5L3.5 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <span className="text-xs font-sans leading-tight">{type}</span>
                    </button>
                  );
                })}
              </div>

              {visibleTypes.length === 0 && (
                <p className="text-stone/30 text-xs font-sans py-4 text-center">
                  No types match "{filter}"
                </p>
              )}
            </div>

            {/* Browse all when nothing selected */}
            {!selected && !customQuery && (
              <div className="mt-8">
                <p className="text-stone/30 text-[10px] tracking-widest uppercase mb-4 font-sans">
                  Or browse all performers
                </p>
                <BrowseResults talentType="" hasVideo={false} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function SearchPageWrapper() {
  return (
    <Suspense>
      <SearchPage />
    </Suspense>
  );
}
