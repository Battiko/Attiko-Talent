"use client";

import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { BookmarkPlus, Check, Plus } from "lucide-react";

interface Props {
  artistId: string;
}

export function AddToShortlistButton({ artistId }: Props) {
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const { data: shortlists, refetch } = trpc.shortlists.list.useQuery(undefined, { enabled: open });
  const addArtist = trpc.shortlists.addArtist.useMutation({
    onSuccess: (_, vars) => { setAdded(vars.shortlistId); setTimeout(() => { setAdded(null); setOpen(false); }, 1000); },
  });
  const create = trpc.shortlists.create.useMutation({
    onSuccess: (data) => {
      refetch();
      if (data) { addArtist.mutate({ shortlistId: data.id, artistId }); }
      setCreatingNew(false);
      setNewName("");
    },
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v); }}
        className="flex items-center gap-1.5 border border-charcoal-mid text-gold/60 hover:border-gold hover:text-gold px-3 py-1.5 rounded text-xs transition-colors"
      >
        <BookmarkPlus className="w-3.5 h-3.5" />
        Save
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-charcoal border border-charcoal-mid rounded-lg shadow-xl z-50 overflow-hidden">
          <p className="text-stone text-xs px-3 py-2 border-b border-charcoal-mid">Add to shortlist</p>

          <div className="max-h-48 overflow-y-auto">
            {shortlists?.length === 0 && !creatingNew && (
              <p className="text-stone/50 text-xs px-3 py-3">No shortlists yet</p>
            )}
            {shortlists?.map((s) => (
              <button
                key={s.id}
                onClick={() => addArtist.mutate({ shortlistId: s.id, artistId })}
                className="w-full text-left px-3 py-2.5 text-sm text-gold hover:bg-charcoal-mid transition-colors flex items-center justify-between"
              >
                <span className="truncate">{s.name}</span>
                {added === s.id && <Check className="w-3.5 h-3.5 text-gold shrink-0" />}
              </button>
            ))}
          </div>

          <div className="border-t border-charcoal-mid">
            {creatingNew ? (
              <div className="p-2 flex gap-2">
                <input
                  autoFocus
                  type="text"
                  placeholder="Shortlist name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && newName.trim()) create.mutate({ name: newName.trim() }); if (e.key === "Escape") setCreatingNew(false); }}
                  className="flex-1 bg-black border border-charcoal-mid text-gold placeholder-stone/40 rounded px-2 py-1.5 text-xs outline-none focus:border-gold/50"
                />
                <button
                  onClick={() => { if (newName.trim()) create.mutate({ name: newName.trim() }); }}
                  disabled={!newName.trim()}
                  className="bg-gold text-black px-2 py-1.5 rounded text-xs font-medium disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCreatingNew(true)}
                className="w-full text-left px-3 py-2.5 text-xs text-gold/60 hover:text-gold hover:bg-charcoal-mid transition-colors flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                New shortlist
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
