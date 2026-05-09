"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { SiteNav } from "@/components/layout/SiteNav";
import { Plus, Trash2, Calendar, MapPin, Users } from "lucide-react";

export default function ShortlistsPage() {
  const { data: shortlists, refetch } = trpc.shortlists.list.useQuery();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");

  const create = trpc.shortlists.create.useMutation({
    onSuccess: () => { refetch(); setCreating(false); setName(""); setEventName(""); setEventDate(""); setEventLocation(""); },
  });

  const del = trpc.shortlists.delete.useMutation({ onSuccess: refetch });

  return (
    <div className="min-h-screen bg-black">
      <SiteNav />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl text-gold">Shortlists</h1>
            <p className="text-stone text-sm mt-1">Organize artists for your events</p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 bg-gold text-black px-4 py-2 rounded text-sm font-medium hover:bg-gold-light transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Shortlist
          </button>
        </div>

        {creating && (
          <div className="bg-charcoal border border-charcoal-mid rounded-lg p-6 mb-6">
            <h2 className="font-display text-lg text-gold mb-4">Create Shortlist</h2>
            <div className="space-y-3">
              <input
                autoFocus
                type="text"
                placeholder="Shortlist name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-black border border-charcoal-mid text-gold placeholder-stone/40 rounded px-3 py-2.5 text-sm outline-none focus:border-gold/50"
              />
              <input
                type="text"
                placeholder="Event name (optional)"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="w-full bg-black border border-charcoal-mid text-gold placeholder-stone/40 rounded px-3 py-2.5 text-sm outline-none focus:border-gold/50"
              />
              <div className="flex gap-3">
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="flex-1 bg-black border border-charcoal-mid text-gold rounded px-3 py-2.5 text-sm outline-none focus:border-gold/50"
                />
                <input
                  type="text"
                  placeholder="Event location"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  className="flex-1 bg-black border border-charcoal-mid text-gold placeholder-stone/40 rounded px-3 py-2.5 text-sm outline-none focus:border-gold/50"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { if (name.trim()) create.mutate({ name: name.trim(), eventName: eventName || undefined, eventDate: eventDate || undefined, eventLocation: eventLocation || undefined }); }}
                disabled={!name.trim() || create.isPending}
                className="bg-gold text-black px-5 py-2 rounded text-sm font-medium hover:bg-gold-light transition-colors disabled:opacity-40"
              >
                {create.isPending ? "Creating…" : "Create"}
              </button>
              <button onClick={() => setCreating(false)} className="text-stone hover:text-gold text-sm transition-colors px-3">
                Cancel
              </button>
            </div>
          </div>
        )}

        {!shortlists?.length && !creating ? (
          <div className="text-center py-24 border border-charcoal-mid rounded-lg">
            <p className="font-display text-2xl text-gold mb-2">No shortlists yet</p>
            <p className="text-stone text-sm mb-6">Create your first shortlist to start saving artists for an event.</p>
            <button
              onClick={() => setCreating(true)}
              className="bg-gold text-black px-6 py-2.5 rounded text-sm font-medium hover:bg-gold-light transition-colors"
            >
              Create shortlist
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {shortlists?.map((s) => (
              <div key={s.id} className="bg-charcoal border border-charcoal-mid rounded-lg hover:border-gold/30 transition-colors">
                <Link href={`/shortlists/${s.id}`} className="block p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-lg text-gold mb-1">{s.name}</h3>
                      <div className="flex flex-wrap gap-4 text-xs text-stone">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {s.artistCount} {s.artistCount === 1 ? "artist" : "artists"}
                        </span>
                        {s.eventName && <span>{s.eventName}</span>}
                        {s.eventDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(s.eventDate).toLocaleDateString()}
                          </span>
                        )}
                        {s.eventLocation && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {s.eventLocation}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
                <div className="px-5 pb-4 flex justify-end">
                  <button
                    onClick={() => { if (confirm("Delete this shortlist?")) del.mutate({ id: s.id }); }}
                    className="text-stone/40 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
