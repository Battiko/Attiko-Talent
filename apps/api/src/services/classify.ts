import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "@attiko/db/client";
import { artists, platformProfiles } from "@attiko/db/schema";
import { sql, inArray } from "drizzle-orm";
import { logger } from "../logger.js";

// Sonnet, not Haiku: "is this channel a bookable act or a lesson channel?"
// is a judgment call on thin evidence, and a wrong junk-flag hides a real
// performer from every future search.
const MODEL = "claude-sonnet-4-6";
const BATCH_SIZE = 15;

const VALID_TALENT_TYPES = new Set([
  "musician", "vocalist", "dj", "dancer", "band",
  "ensemble", "instrumentalist", "performer", "other",
]);

interface Classification {
  id: string;
  isBookableAct: boolean;
  reason: string;
  talentType: string;
  skills: string[];
  genres: string[];
}

interface ClassifyState {
  running: boolean;
  startedAt: string | null;
  completedAt: string | null;
  processed: number;
  flaggedNotPerformer: number;
  reclassified: number;
  remaining: number;
  errors: string[];
}

const state: ClassifyState = {
  running: false,
  startedAt: null,
  completedAt: null,
  processed: 0,
  flaggedNotPerformer: 0,
  reclassified: 0,
  remaining: 0,
  errors: [],
};

export function getClassificationStatus(): ClassifyState {
  return { ...state };
}

function extractJsonArray(text: string): Classification[] {
  const start = text.indexOf("[");
  if (start === -1) throw new Error("No JSON array in response");
  const slice = text.slice(start);
  let depth = 0, inStr = false, esc = false;
  for (let i = 0; i < slice.length; i++) {
    const c = slice[i];
    if (esc) { esc = false; continue; }
    if (c === "\\" && inStr) { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "[") depth++;
    if (c === "]" && --depth === 0) {
      return JSON.parse(slice.slice(0, i + 1)) as Classification[];
    }
  }
  throw new Error("Unterminated JSON array in response");
}

async function classifyBatch(
  anthropic: Anthropic,
  batch: {
    id: string;
    name: string;
    bio: string | null;
    talentType: string;
    genres: string[];
    tags: string[];
    profiles: { source: string; url: string; followerCount: number | null }[];
  }[]
): Promise<Classification[]> {
  const payload = batch.map((a) => ({
    id: a.id,
    name: a.name,
    bio: a.bio ? a.bio.slice(0, 400) : null,
    currentType: a.talentType,
    genres: a.genres,
    tags: a.tags,
    profiles: a.profiles.map((p) => ({ source: p.source, url: p.url, followers: p.followerCount })),
  }));

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: `You are the talent curator for a luxury private-event booking platform. Event planners search this database for performers to hire for weddings and high-end private events. Your job is to vet scraped profiles (mostly YouTube channels and Spotify artists).

A profile is a BOOKABLE ACT only if it plausibly represents a live performer or performing group that could be hired for an event: a singer, musician, DJ, dancer, band, ensemble, etc.

NOT bookable acts: tutorial/lesson channels, music teachers who only teach online, record labels, venues, festivals, podcasts, radio/media channels, gear/instrument review channels, backing-track or karaoke-track channels, lyric/cover-compilation channels, meditation/sleep-music channels, kids-content channels, fan pages, deceased or disbanded legacy acts, and software/sample-library brands.

Judge from name, bio, and platform signals. When evidence is thin, lean toward keeping acts that look like working performers (a bio mentioning gigs, weddings, bookings, "for hire", a repertoire, or a locale is a good sign).

Respond with ONLY a JSON array, one object per input profile:
[{"id": "...", "isBookableAct": true, "reason": "8 words max", "talentType": "musician|vocalist|dj|dancer|band|ensemble|instrumentalist|performer|other", "skills": ["specific skills like 'jazz vocalist', 'wedding band', 'salsa', 'saxophone'"], "genres": ["musical genres"]}]

skills and genres must be lowercase, specific, and only what the evidence supports (empty arrays are fine). talentType is what they primarily ARE, not what they play alongside.`,
    messages: [{ role: "user", content: JSON.stringify(payload) }],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  return extractJsonArray(text);
}

async function applyClassification(c: Classification): Promise<void> {
  const db = getDb();
  const nowIso = new Date().toISOString();

  if (!c.isBookableAct) {
    await db.execute(sql`
      UPDATE artists
      SET meta = COALESCE(meta, '{}'::jsonb)
            || jsonb_build_object('notPerformer', true, 'classifiedAt', ${nowIso}::text, 'classifyReason', ${c.reason}::text),
          updated_at = now()
      WHERE id = ${c.id}
    `);
    state.flaggedNotPerformer++;
    return;
  }

  const talentType = VALID_TALENT_TYPES.has(c.talentType) ? c.talentType : "musician";
  const skills = (c.skills ?? []).map((s) => s.toLowerCase().trim()).filter(Boolean).slice(0, 15);
  const genres = (c.genres ?? []).map((g) => g.toLowerCase().trim()).filter(Boolean).slice(0, 10);

  // postgres-js can't infer text[] from a JS array param inside || — build
  // explicit ARRAY[...] literals, and COALESCE because array_agg over an
  // empty set returns NULL (tags/genres are NOT NULL columns)
  const toArrayLiteral = (arr: string[]) =>
    arr.length > 0
      ? sql`ARRAY[${sql.join(arr.map((v) => sql`${v}`), sql`, `)}]::text[]`
      : sql`'{}'::text[]`;

  await db.execute(sql`
    UPDATE artists
    SET talent_type = ${talentType}::talent_type,
        tags = COALESCE((SELECT array_agg(DISTINCT t) FROM unnest(tags || ${toArrayLiteral(skills)}) t), '{}'::text[]),
        genres = COALESCE((SELECT array_agg(DISTINCT g) FROM unnest(genres || ${toArrayLiteral(genres)}) g), '{}'::text[]),
        meta = COALESCE(meta, '{}'::jsonb) || jsonb_build_object('classifiedAt', ${nowIso}::text),
        updated_at = now()
    WHERE id = ${c.id}
  `);
  state.reclassified++;
}

export async function runClassification(maxArtists?: number): Promise<ClassifyState> {
  if (state.running) return getClassificationStatus();

  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    state.errors.push("ANTHROPIC_API_KEY not set");
    return getClassificationStatus();
  }
  const anthropic = new Anthropic({ apiKey });
  const db = getDb();

  state.running = true;
  state.startedAt = new Date().toISOString();
  state.completedAt = null;
  state.processed = 0;
  state.flaggedNotPerformer = 0;
  state.reclassified = 0;
  state.errors = [];

  try {
    for (;;) {
      if (maxArtists !== undefined && state.processed >= maxArtists) break;

      const rows = await db
        .select({
          id: artists.id,
          name: artists.name,
          bio: artists.bio,
          talentType: artists.talentType,
          genres: artists.genres,
          tags: artists.tags,
        })
        .from(artists)
        .where(sql`meta->>'classifiedAt' IS NULL`)
        .limit(Math.min(BATCH_SIZE, maxArtists !== undefined ? maxArtists - state.processed : BATCH_SIZE));

      state.remaining = rows.length === 0 ? 0 : state.remaining;
      if (rows.length === 0) break;

      const profileRows = await db
        .select({
          artistId: platformProfiles.artistId,
          source: platformProfiles.source,
          url: platformProfiles.url,
          followerCount: platformProfiles.followerCount,
        })
        .from(platformProfiles)
        .where(inArray(platformProfiles.artistId, rows.map((r) => r.id)));

      const profilesByArtist = new Map<string, typeof profileRows>();
      for (const p of profileRows) {
        const arr = profilesByArtist.get(p.artistId) ?? [];
        arr.push(p);
        profilesByArtist.set(p.artistId, arr);
      }

      const batch = rows.map((r) => ({ ...r, profiles: profilesByArtist.get(r.id) ?? [] }));

      try {
        const classifications = await classifyBatch(anthropic, batch);
        const byId = new Map(classifications.map((c) => [c.id, c]));
        for (const row of rows) {
          const c = byId.get(row.id);
          if (c) {
            await applyClassification(c);
          } else {
            state.errors.push(`No classification returned for ${row.id} (${row.name})`);
          }
          state.processed++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        state.errors.push(`Batch failed: ${msg}`);
        // Mark the batch as attempted so a poison batch can't loop forever
        for (const row of rows) {
          await db.execute(sql`
            UPDATE artists
            SET meta = COALESCE(meta, '{}'::jsonb) || jsonb_build_object('classifyError', ${msg.slice(0, 200)}::text, 'classifiedAt', ${new Date().toISOString()}::text)
            WHERE id = ${row.id}
          `);
        }
        state.processed += rows.length;
      }

      logger.info(
        { processed: state.processed, flagged: state.flaggedNotPerformer, reclassified: state.reclassified },
        "Classification progress"
      );
      await new Promise((r) => setTimeout(r, 300));
    }
  } finally {
    state.running = false;
    state.completedAt = new Date().toISOString();
    logger.info(
      { processed: state.processed, flagged: state.flaggedNotPerformer, reclassified: state.reclassified, errors: state.errors.length },
      "Classification complete"
    );
  }

  return getClassificationStatus();
}
