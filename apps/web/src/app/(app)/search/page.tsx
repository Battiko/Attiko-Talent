"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SearchBar } from "@/components/search/SearchBar";
import { SearchResults } from "@/components/search/SearchResults";
import { BrowseResults } from "@/components/search/BrowseResults";
import { SiteNav } from "@/components/layout/SiteNav";

const TALENT_TABS = [
  { label: "All", value: "" },
  { label: "Musicians", value: "musician" },
  { label: "Vocalists", value: "vocalist" },
  { label: "DJs", value: "dj" },
  { label: "Bands", value: "band" },
  { label: "Dancers", value: "dancer" },
  { label: "Ensembles", value: "ensemble" },
];

function SearchPage() {
  const params = useSearchParams();
  const query = params.get("q") ?? "";
  const location = params.get("loc") ?? "";
  const radius = parseInt(params.get("r") ?? "50", 10);
  const [activeType, setActiveType] = useState("");
  const [hasVideoOnly, setHasVideoOnly] = useState(false);

  const isSearching = Boolean(query && location);

  return (
    <div className="min-h-screen bg-black">
      <SiteNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16">
        <div className="mb-5">
          <SearchBar defaultQuery={query} defaultLocation={location} defaultRadius={radius} />
        </div>

        {!isSearching && (
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-2">
              {TALENT_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveType(tab.value)}
                  className={`text-[10px] tracking-widest uppercase px-4 py-2 border transition-colors duration-200 font-sans ${
                    activeType === tab.value
                      ? "border-gold/60 text-gold bg-gold/5"
                      : "border-gold/15 text-stone/40 hover:border-gold/30 hover:text-stone/70"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setHasVideoOnly(!hasVideoOnly)}
              className={`text-[10px] tracking-widest uppercase px-4 py-2 border transition-colors duration-200 font-sans ml-auto ${
                hasVideoOnly
                  ? "border-gold/60 text-gold bg-gold/5"
                  : "border-gold/15 text-stone/40 hover:border-gold/30 hover:text-stone/70"
              }`}
            >
              Has Video
            </button>
          </div>
        )}

        {isSearching ? (
          <SearchResults query={query} location={location} radiusMiles={radius} />
        ) : (
          <BrowseResults
            talentType={activeType}
            hasVideo={hasVideoOnly}
          />
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
