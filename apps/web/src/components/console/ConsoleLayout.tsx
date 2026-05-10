"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Trash2, Play, Save, ExternalLink, Sparkles } from "lucide-react";

type Tab = "search" | "presets" | "artists" | "quality" | "users" | "audit" | "auto-populate";
type Platform = "spotify" | "youtube" | "lastfm" | "musicbrainz";

interface Preset { name: string; query: string; location: string; platforms: Platform[] }

const DEFAULT_PLATFORMS: Platform[] = ["youtube", "lastfm", "musicbrainz"];
const PRESET_KEY = "attiko_search_presets";

function loadPresets(): Preset[] {
  try { return JSON.parse(localStorage.getItem(PRESET_KEY) ?? "[]"); } catch { return []; }
}
function savePresets(p: Preset[]) { localStorage.setItem(PRESET_KEY, JSON.stringify(p)); }

export function ConsoleLayout() {
  const [activeTab, setActiveTab] = useState<Tab>("search");
  const { data: stats, refetch: refetchStats } = trpc.operator.getStats.useQuery();

  const TABS: { key: Tab; label: string }[] = [
    { key: "auto-populate", label: "Auto-Populate" },
    { key: "search", label: "Search Artists" },
    { key: "presets", label: "Presets" },
    { key: "artists", label: "Artist Manager" },
    { key: "quality", label: "Data Quality" },
    { key: "users", label: "Users" },
    { key: "audit", label: "Audit Log" },
  ];

  return (
    <div className="min-h-screen bg-black text-gold">
      <div className="border-b border-charcoal-mid px-8 py-5 flex items-baseline gap-3">
        <span className="font-display text-2xl tracking-widest text-gold uppercase">ATTIKO</span>
        <span className="text-stone text-xs">— Operator Console</span>
      </div>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-8">
          <Stat label="Artists" value={stats?.totalArtists ?? 0} />
          <Stat label="Users" value={stats?.totalUsers ?? 0} />
          <Stat label="Search Jobs" value={stats?.totalScrapeJobs ?? 0} />
        </div>
        <div className="flex gap-1 border-b border-charcoal-mid mb-6 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 text-sm whitespace-nowrap transition-colors ${activeTab === t.key ? "text-gold border-b-2 border-gold" : "text-stone hover:text-gold"}`}>
              {t.label}
            </button>
          ))}
        </div>
        {activeTab === "auto-populate" && <AutoPopulateTab />}
        {activeTab === "search" && <SearchTab onSuccess={refetchStats} />}
        {activeTab === "presets" && <PresetsTab />}
        {activeTab === "artists" && <ArtistsTab onSuccess={refetchStats} />}
        {activeTab === "quality" && <QualityTab />}
        {activeTab === "users" && <UsersTab />}
        {activeTab === "audit" && <AuditTab />}
      </div>
    </div>
  );
}

/* ── Auto-Populate Tab ── */
function AutoPopulateTab() {
  const { data: status, refetch } = trpc.operator.getAutoPopulateStatus.useQuery(undefined, {
    refetchInterval: (query) => (query.state.data?.running ? 3000 : false),
  });
  const start = trpc.operator.startAutoPopulate.useMutation({ onSuccess: () => refetch() });

  const pct = status && status.totalSteps > 0
    ? Math.round((status.completedSteps / status.totalSteps) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="bg-charcoal border border-charcoal-mid rounded-lg p-6">
        <h2 className="font-display text-xl text-gold mb-1">Auto-Populate Database</h2>
        <p className="text-stone text-sm mb-1">
          Scrapes all 110+ talent types across New York City, Brooklyn, and Newark via YouTube, Last.fm, and MusicBrainz.
        </p>
        <p className="text-stone/50 text-xs mb-6">Runs automatically every day at 8:00 AM EST. You can also trigger it manually below.</p>

        <button
          onClick={() => start.mutate()}
          disabled={status?.running || start.isPending}
          className="flex items-center gap-2 bg-gold text-black px-6 py-2.5 rounded text-sm font-medium hover:bg-gold-light transition-colors disabled:opacity-40"
        >
          <Sparkles className="w-4 h-4" />
          {status?.running ? "Running…" : "Run Now"}
        </button>
      </div>

      {status && (status.running || status.completedAt) && (
        <div className="bg-charcoal border border-charcoal-mid rounded-lg p-6 space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-gold text-sm font-medium">{status.running ? "In Progress" : "Last Run Complete"}</p>
            {status.startedAt && (
              <p className="text-stone/50 text-xs">Started {new Date(status.startedAt).toLocaleString()}</p>
            )}
          </div>

          <div>
            <div className="flex justify-between text-xs text-stone mb-1.5">
              <span>{status.completedSteps.toLocaleString()} / {status.totalSteps.toLocaleString()} talent-location pairs</span>
              <span>{pct}%</span>
            </div>
            <div className="w-full bg-charcoal-mid rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${status.running ? "bg-gold animate-pulse" : "bg-gold"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {status.running && status.currentQuery && (
            <p className="text-stone text-xs">
              Scraping: <span className="text-gold">{status.currentQuery}</span>
              {status.currentLocation && <> in <span className="text-gold">{status.currentLocation}</span></>}
            </p>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="font-display text-2xl text-gold">{status.created.toLocaleString()}</p>
              <p className="text-stone text-xs mt-0.5">Created</p>
            </div>
            <div className="text-center">
              <p className="font-display text-2xl text-gold">{status.updated.toLocaleString()}</p>
              <p className="text-stone text-xs mt-0.5">Updated</p>
            </div>
            <div className="text-center">
              <p className="font-display text-2xl text-gold">{status.skipped.toLocaleString()}</p>
              <p className="text-stone text-xs mt-0.5">Skipped</p>
            </div>
          </div>

          {status.completedAt && (
            <p className="text-stone/40 text-xs">Completed {new Date(status.completedAt).toLocaleString()}</p>
          )}

          {status.errors.length > 0 && (
            <div className="border border-red-400/20 rounded p-3">
              <p className="text-red-400/70 text-xs font-medium mb-1">{status.errors.length} errors</p>
              <div className="space-y-0.5 max-h-32 overflow-y-auto">
                {status.errors.slice(0, 20).map((e, i) => (
                  <p key={i} className="text-red-400/50 text-xs">{e}</p>
                ))}
                {status.errors.length > 20 && (
                  <p className="text-red-400/30 text-xs">+{status.errors.length - 20} more</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-charcoal border border-charcoal-mid rounded-lg p-5">
        <p className="text-stone text-xs uppercase tracking-wider mb-3">Coverage</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gold mb-1">Talent Types</p>
            <p className="text-stone/60 text-xs">110+ types including Jazz, Latin, Gospel, Classical, DJs, Dancers, and more</p>
          </div>
          <div>
            <p className="text-gold mb-1">Locations</p>
            <p className="text-stone/60 text-xs">New York City, Brooklyn, Newark</p>
          </div>
          <div>
            <p className="text-gold mb-1">Platforms</p>
            <p className="text-stone/60 text-xs">Last.fm, MusicBrainz (YouTube reserved for per-artist enrichment)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Search Tab ── */
function SearchTab({ onSuccess }: { onSuccess: () => void }) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [platforms, setPlatforms] = useState<Platform[]>(DEFAULT_PLATFORMS);
  const [result, setResult] = useState<{ created: number; updated: number; skipped: number; errors: string[] } | null>(null);

  const scrape = trpc.operator.triggerScrape.useMutation({
    onSuccess: (data) => { setResult(data); onSuccess(); },
  });

  function toggle(p: Platform) { setPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]); }

  function saveAsPreset() {
    if (!query.trim() || !location.trim()) return;
    const presets = loadPresets();
    const name = `${query} — ${location}`;
    if (!presets.find((p) => p.name === name)) {
      savePresets([...presets, { name, query: query.trim(), location: location.trim(), platforms }]);
      alert("Preset saved!");
    }
  }

  return (
    <div className="bg-charcoal border border-charcoal-mid rounded-lg p-6">
      <h2 className="font-display text-xl text-gold mb-1">Search for Artists</h2>
      <p className="text-stone text-sm mb-6">Find real artists from YouTube, Last.fm, and MusicBrainz.</p>
      <div className="space-y-4 mb-6">
        <div>
          <label className="text-stone text-xs uppercase tracking-wider block mb-1.5">Talent Type / Query</label>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. jazz vocalist, wedding band, DJ"
            className="w-full bg-black border border-charcoal-mid text-gold placeholder-stone/40 rounded px-3 py-2.5 text-sm outline-none focus:border-gold/50" />
        </div>
        <div>
          <label className="text-stone text-xs uppercase tracking-wider block mb-1.5">Location</label>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. New York, tri-state area, Miami"
            className="w-full bg-black border border-charcoal-mid text-gold placeholder-stone/40 rounded px-3 py-2.5 text-sm outline-none focus:border-gold/50" />
          <p className="text-stone/40 text-xs mt-1">Try "tri-state area", "NYC area", "New Jersey", or "Connecticut" to search multiple cities at once.</p>
        </div>
        <div>
          <label className="text-stone text-xs uppercase tracking-wider block mb-2">Platforms</label>
          <div className="flex flex-wrap gap-3">
            {(["youtube", "lastfm", "musicbrainz", "spotify"] as Platform[]).map((p) => (
              <button key={p} onClick={() => toggle(p)}
                className={`px-4 py-2 rounded text-sm capitalize border transition-colors ${platforms.includes(p) ? "bg-gold text-black border-gold" : "bg-transparent text-stone border-charcoal-mid hover:border-gold/40"}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={() => { if (!query.trim() || !location.trim() || !platforms.length) return; setResult(null); scrape.mutate({ query: query.trim(), location: location.trim(), platforms }); }}
          disabled={scrape.isPending || !query.trim() || !location.trim()}
          className="bg-gold text-black px-6 py-2.5 rounded text-sm font-medium hover:bg-gold-light transition-colors disabled:opacity-40">
          {scrape.isPending ? "Searching…" : "Search"}
        </button>
        <button onClick={saveAsPreset} disabled={!query.trim() || !location.trim()}
          className="flex items-center gap-2 border border-charcoal-mid text-gold/60 hover:text-gold hover:border-gold/40 px-4 py-2.5 rounded text-sm transition-colors disabled:opacity-40">
          <Save className="w-4 h-4" /> Save as Preset
        </button>
      </div>
      {scrape.isPending && <p className="text-stone text-sm mt-4 animate-pulse">Searching {platforms.join(", ")}…</p>}
      {result && (
        <div className="mt-6 border border-charcoal-mid rounded-lg p-4">
          <p className="text-gold text-sm font-medium mb-2">Search complete</p>
          <div className="flex gap-6 text-sm">
            <span className="text-stone">Created: <span className="text-gold">{result.created}</span></span>
            <span className="text-stone">Updated: <span className="text-gold">{result.updated}</span></span>
            <span className="text-stone">Skipped: <span className="text-gold">{result.skipped}</span></span>
          </div>
          {result.errors.length > 0 && <div className="mt-3">{result.errors.map((e, i) => <p key={i} className="text-red-400 text-xs">{e}</p>)}</div>}
        </div>
      )}
    </div>
  );
}

/* ── Presets Tab ── */
function PresetsTab() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { created: number; updated: number }>>({});

  useEffect(() => { setPresets(loadPresets()); }, []);

  const scrape = trpc.operator.triggerScrape.useMutation({
    onSuccess: (data, vars) => {
      setResults((prev) => ({ ...prev, [`${vars.query}—${vars.location}`]: { created: data.created, updated: data.updated } }));
      setRunning(null);
    },
  });

  function remove(name: string) {
    const updated = presets.filter((p) => p.name !== name);
    savePresets(updated);
    setPresets(updated);
  }

  function run(preset: Preset) {
    setRunning(preset.name);
    scrape.mutate({ query: preset.query, location: preset.location, platforms: preset.platforms });
  }

  if (!presets.length) {
    return (
      <div className="bg-charcoal border border-charcoal-mid rounded-lg p-8 text-center">
        <p className="font-display text-xl text-gold mb-2">No presets saved</p>
        <p className="text-stone text-sm">Go to Search Artists, fill in a query and location, then click "Save as Preset".</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {presets.map((preset) => {
        const key = `${preset.query}—${preset.location}`;
        const res = results[key];
        return (
          <div key={preset.name} className="bg-charcoal border border-charcoal-mid rounded-lg px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-gold font-medium">{preset.query}</p>
              <p className="text-stone text-xs mt-0.5">{preset.location} · {preset.platforms.join(", ")}</p>
              {res && <p className="text-xs text-gold/50 mt-1">Last run: +{res.created} created, {res.updated} updated</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => run(preset)} disabled={running === preset.name}
                className="flex items-center gap-1.5 bg-gold text-black px-3 py-1.5 rounded text-xs font-medium hover:bg-gold-light transition-colors disabled:opacity-40">
                <Play className="w-3 h-3" />{running === preset.name ? "Running…" : "Run"}
              </button>
              <button onClick={() => remove(preset.name)} className="text-stone/30 hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Artist Manager Tab ── */
function ArtistsTab({ onSuccess }: { onSuccess: () => void }) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<{ name?: string; bio?: string | null; imageUrl?: string | null }>({});
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [enrichMsg, setEnrichMsg] = useState<Record<string, string>>({});

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, refetch } = trpc.operator.listArtists.useQuery({ page, pageSize: 20, search: debouncedSearch || undefined });
  const update = trpc.operator.updateArtist.useMutation({ onSuccess: () => { refetch(); setEditing(null); onSuccess(); } });
  const del = trpc.operator.deleteArtist.useMutation({ onSuccess: () => { refetch(); onSuccess(); } });
  const enrich = trpc.operator.enrichArtist.useMutation({
    onSuccess: (data, vars) => {
      setEnrichingId(null);
      setEnrichMsg((prev) => ({ ...prev, [vars.id]: data.updated ? `✓ Updated: ${data.fields.join(", ")}` : "Already complete" }));
      refetch();
    },
    onError: (_err, vars) => {
      setEnrichingId(null);
      setEnrichMsg((prev) => ({ ...prev, [vars.id]: "Failed" }));
    },
  });

  const totalPages = Math.ceil((data?.total ?? 0) / 20);

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search artists by name…"
          className="flex-1 bg-charcoal border border-charcoal-mid text-gold placeholder-stone/40 rounded px-3 py-2 text-sm outline-none focus:border-gold/50" />
        <span className="text-stone text-sm self-center">{data?.total.toLocaleString() ?? "…"} artists</span>
      </div>
      <div className="bg-charcoal border border-charcoal-mid rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-charcoal-mid">
              <th className="text-left px-4 py-3 text-stone text-xs uppercase tracking-wider">Artist</th>
              <th className="text-left px-4 py-3 text-stone text-xs uppercase tracking-wider hidden sm:table-cell">Type</th>
              <th className="text-left px-4 py-3 text-stone text-xs uppercase tracking-wider hidden md:table-cell">Location</th>
              <th className="text-left px-4 py-3 text-stone text-xs uppercase tracking-wider">Score</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {data?.rows.map((a) => (
              <>
                <tr key={a.id} className="border-b border-charcoal-mid last:border-0 hover:bg-charcoal-mid/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {a.imageUrl
                        ? <img src={a.imageUrl} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                        : <div className="w-8 h-8 rounded bg-charcoal-mid shrink-0" />}
                      <div>
                        <Link href={`/artists/${a.slug}`} target="_blank" className="text-gold hover:text-gold-light transition-colors flex items-center gap-1">
                          {a.name} <ExternalLink className="w-3 h-3 opacity-40" />
                        </Link>
                        {!a.imageUrl && <span className="text-red-400/60 text-xs">no image</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-stone capitalize hidden sm:table-cell">{a.talentType}</td>
                  <td className="px-4 py-3 text-stone hidden md:table-cell">{[a.city, a.country].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-4 py-3 text-stone">{a.overallScore ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {enrichMsg[a.id] && <span className="text-[10px] text-gold/50">{enrichMsg[a.id]}</span>}
                      <button onClick={() => { setEnrichingId(a.id); enrich.mutate({ id: a.id }); }}
                        disabled={enrichingId === a.id}
                        className="flex items-center gap-1 text-stone/50 hover:text-gold text-xs transition-colors disabled:opacity-40">
                        <Sparkles className="w-3 h-3" />{enrichingId === a.id ? "…" : "Enrich"}
                      </button>
                      <button onClick={() => { setEditing(editing === a.id ? null : a.id); setEditFields({ name: a.name, bio: a.bio, imageUrl: a.imageUrl }); }}
                        className="text-stone/50 hover:text-gold text-xs transition-colors">Edit</button>
                      <button onClick={() => { if (confirm(`Delete "${a.name}"?`)) del.mutate({ id: a.id }); }}
                        className="text-stone/30 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
                {editing === a.id && (
                  <tr key={`${a.id}-edit`} className="border-b border-charcoal-mid bg-black">
                    <td colSpan={5} className="px-4 py-4">
                      <div className="space-y-3">
                        <input value={editFields.name ?? ""} onChange={(e) => setEditFields((f) => ({ ...f, name: e.target.value }))} placeholder="Name"
                          className="w-full bg-charcoal border border-charcoal-mid text-gold rounded px-3 py-2 text-sm outline-none" />
                        <input value={editFields.imageUrl ?? ""} onChange={(e) => setEditFields((f) => ({ ...f, imageUrl: e.target.value || null }))} placeholder="Image URL"
                          className="w-full bg-charcoal border border-charcoal-mid text-gold placeholder-stone/40 rounded px-3 py-2 text-sm outline-none" />
                        <textarea value={editFields.bio ?? ""} onChange={(e) => setEditFields((f) => ({ ...f, bio: e.target.value || null }))} placeholder="Bio"
                          rows={3} className="w-full bg-charcoal border border-charcoal-mid text-gold placeholder-stone/40 rounded px-3 py-2 text-sm outline-none resize-none" />
                        <div className="flex gap-3">
                          <button onClick={() => update.mutate({ id: a.id, ...editFields })}
                            className="bg-gold text-black px-4 py-1.5 rounded text-xs font-medium hover:bg-gold-light transition-colors">Save</button>
                          <button onClick={() => setEditing(null)} className="text-stone hover:text-gold text-xs transition-colors">Cancel</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="text-stone hover:text-gold text-sm transition-colors disabled:opacity-30">← Previous</button>
          <span className="text-stone text-sm">Page {page} of {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="text-stone hover:text-gold text-sm transition-colors disabled:opacity-30">Next →</button>
        </div>
      )}
    </div>
  );
}

/* ── Data Quality Tab ── */
function QualityTab() {
  const { data, refetch } = trpc.operator.getDataQuality.useQuery();
  const { data: missingImage } = trpc.operator.listArtists.useQuery({ page: 1, pageSize: 10, missingField: "image" });
  const { data: missingBio } = trpc.operator.listArtists.useQuery({ page: 1, pageSize: 10, missingField: "bio" });
  const { data: missingGeo } = trpc.operator.listArtists.useQuery({ page: 1, pageSize: 10, missingField: "geo" });
  const [enrichResult, setEnrichResult] = useState<Record<string, string>>({});

  const bulkEnrich = trpc.operator.bulkEnrich.useMutation({
    onSuccess: (result, vars) => {
      setEnrichResult((prev) => ({ ...prev, [vars.field]: `✓ Enriched ${result.enriched} of ${result.total}` }));
      refetch();
    },
  });

  const bulkSocial = trpc.operator.bulkEnrichSocial.useMutation({
    onSuccess: (result) => {
      setEnrichResult((prev) => ({ ...prev, social: `✓ Found social for ${result.enriched} of ${result.total}` }));
    },
  });

  if (!data) return <div className="text-stone text-sm">Loading…</div>;

  const pct = (n: number) => data.total ? Math.round((n / data.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="bg-charcoal border border-charcoal-mid rounded-lg p-5">
        <p className="text-gold text-sm font-medium mb-1">Auto-Enrich</p>
        <p className="text-stone text-xs mb-4">Pull missing photos, bios, videos, and social profiles automatically.</p>
        <div className="flex flex-wrap gap-3">
          {(["image", "bio", "video"] as const).map((field) => (
            <div key={field} className="flex items-center gap-2">
              <button
                onClick={() => bulkEnrich.mutate({ field, limit: 25 })}
                disabled={bulkEnrich.isPending || bulkSocial.isPending}
                className="flex items-center gap-1.5 bg-gold/10 hover:bg-gold/20 border border-gold/20 text-gold text-xs px-4 py-2 rounded transition-colors disabled:opacity-40">
                <Sparkles className="w-3.5 h-3.5" />
                {bulkEnrich.isPending && bulkEnrich.variables?.field === field
                  ? "Enriching…"
                  : `Enrich missing ${field}s (25)`}
              </button>
              {enrichResult[field] && <span className="text-gold/50 text-xs">{enrichResult[field]}</span>}
            </div>
          ))}
          <div className="flex items-center gap-2">
            <button
              onClick={() => bulkSocial.mutate({ limit: 20 })}
              disabled={bulkEnrich.isPending || bulkSocial.isPending}
              className="flex items-center gap-1.5 bg-gold/10 hover:bg-gold/20 border border-gold/20 text-gold text-xs px-4 py-2 rounded transition-colors disabled:opacity-40">
              <Sparkles className="w-3.5 h-3.5" />
              {bulkSocial.isPending ? "Searching…" : "Find Instagram & TikTok (20)"}
            </button>
            {enrichResult["social"] && <span className="text-gold/50 text-xs">{enrichResult["social"]}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <QualityStat label="Have Photo" value={data.withImage} total={data.total} pct={pct(data.withImage)} />
        <QualityStat label="Have Bio" value={data.withBio} total={data.total} pct={pct(data.withBio)} />
        <QualityStat label="Have Location" value={data.withGeo} total={data.total} pct={pct(data.withGeo)} />
        <QualityStat label="Have Genres" value={data.withGenres} total={data.total} pct={pct(data.withGenres)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GapList title="Missing Photo" artists={missingImage?.rows ?? []} missingCount={data.missingImage} />
        <GapList title="Missing Bio" artists={missingBio?.rows ?? []} missingCount={data.missingBio} />
        <GapList title="Missing Location" artists={missingGeo?.rows ?? []} missingCount={data.missingGeo} />
      </div>
    </div>
  );
}

function QualityStat({ label, value, total, pct }: { label: string; value: number; total: number; pct: number }) {
  return (
    <div className="bg-charcoal border border-charcoal-mid rounded-lg p-4">
      <p className="text-stone text-xs mb-1">{label}</p>
      <p className="font-display text-2xl text-gold">{pct}%</p>
      <div className="w-full bg-charcoal-mid rounded-full h-1 mt-2">
        <div className="bg-gold h-1 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-stone/50 text-xs mt-1">{value.toLocaleString()} / {total.toLocaleString()}</p>
    </div>
  );
}

function GapList({ title, artists, missingCount }: { title: string; artists: { id: string; slug: string; name: string }[]; missingCount: number }) {
  return (
    <div className="bg-charcoal border border-charcoal-mid rounded-lg p-4">
      <p className="text-stone text-xs uppercase tracking-wider mb-3">{title} <span className="text-red-400/70">({missingCount.toLocaleString()})</span></p>
      <div className="space-y-2">
        {artists.slice(0, 8).map((a) => (
          <Link key={a.id} href={`/artists/${a.slug}`} target="_blank"
            className="block text-sm text-gold/70 hover:text-gold transition-colors truncate">
            {a.name}
          </Link>
        ))}
        {missingCount > 8 && <p className="text-stone/40 text-xs">+{(missingCount - 8).toLocaleString()} more</p>}
      </div>
    </div>
  );
}

/* ── Users Tab ── */
function UsersTab() {
  const { data: users } = trpc.operator.listUsers.useQuery({ page: 1, pageSize: 50 });
  const setRole = trpc.operator.setUserRole.useMutation();
  return (
    <div className="bg-charcoal border border-charcoal-mid rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-charcoal-mid">
          <th className="text-left px-4 py-3 text-stone text-xs uppercase tracking-wider">Email</th>
          <th className="text-left px-4 py-3 text-stone text-xs uppercase tracking-wider">Role</th>
          <th className="text-left px-4 py-3 text-stone text-xs uppercase tracking-wider">Searches</th>
          <th className="text-left px-4 py-3 text-stone text-xs uppercase tracking-wider">Actions</th>
        </tr></thead>
        <tbody>
          {users?.map((u) => (
            <tr key={u.id} className="border-b border-charcoal-mid last:border-0">
              <td className="px-4 py-3 text-gold">{u.email}</td>
              <td className="px-4 py-3"><span className="text-xs border border-charcoal-mid text-stone px-2 py-0.5 rounded capitalize">{u.role}</span></td>
              <td className="px-4 py-3 text-stone">{u.searchesUsedThisMonth}</td>
              <td className="px-4 py-3">
                <select defaultValue={u.role} onChange={(e) => setRole.mutate({ userId: u.id, role: e.target.value as "user" | "pro" | "agency" | "admin" })}
                  className="bg-black border border-charcoal-mid text-gold text-xs rounded px-2 py-1 outline-none">
                  <option value="user">user</option>
                  <option value="pro">pro</option>
                  <option value="agency">agency</option>
                  <option value="admin">admin</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Audit Log Tab ── */
function AuditTab() {
  const { data: auditLog } = trpc.operator.getAuditLog.useQuery({ page: 1, pageSize: 100 });
  return (
    <div className="bg-charcoal border border-charcoal-mid rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-charcoal-mid">
          <th className="text-left px-4 py-3 text-stone text-xs uppercase tracking-wider">Action</th>
          <th className="text-left px-4 py-3 text-stone text-xs uppercase tracking-wider">Target</th>
          <th className="text-left px-4 py-3 text-stone text-xs uppercase tracking-wider">When</th>
        </tr></thead>
        <tbody>
          {auditLog?.map((entry) => (
            <tr key={entry.id} className="border-b border-charcoal-mid last:border-0">
              <td className="px-4 py-3 text-gold capitalize">{entry.action.replace(/_/g, " ")}</td>
              <td className="px-4 py-3 text-stone text-xs">{entry.targetType} {entry.targetId?.slice(0, 8)}</td>
              <td className="px-4 py-3 text-stone text-xs">{new Date(entry.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-charcoal border border-charcoal-mid rounded-lg p-4">
      <p className="text-stone text-xs mb-1">{label}</p>
      <p className="font-display text-2xl text-gold">{value.toLocaleString()}</p>
    </div>
  );
}
