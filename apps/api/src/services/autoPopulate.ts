import { YouTubeScraper, LastFmScraper, MusicBrainzScraper } from "@attiko/scrapers";
import { geocodeLocation } from "./geocoding.js";
import { ingestScrapeResults } from "./ingest.js";
import { logger } from "../logger.js";

const TALENT_TYPES = [
  "A Cappella Group", "Accordion", "Acoustic Bass", "Acoustic Guitar",
  "African Drumming Group", "Arabic Band", "Armenian Specialist",
  "Bagpipes", "Balalaika", "Ballroom Dancers", "Banjo", "Bass", "Bassoon",
  "Belly Dancer", "Bouzouki", "Brass Ensemble", "Brazilian Dance Troupe",
  "Caribbean Band", "Cello", "Chinese Ensemble", "Clarinet",
  "Classical Ensemble", "Classical Guitar", "Conductor", "Country Western",
  "Cuban Specialist", "Dance Instructor", "Dixieland Band", "Drums",
  "Fiddle", "Flamenco Guitar", "Flamenco Dancer", "Flute", "French Horn",
  "Gospel Choir", "Greek Band", "Greek Specialist", "Guitar",
  "Harmonica", "Harp", "Hawaiian Specialist", "India Specialist",
  "Irish Specialist", "Israeli Specialist", "Italian Opera", "Italian Pop",
  "Japanese Ensemble", "Karaoke MC", "Keyboard", "Klezmer Ensemble",
  "Korean Ensemble", "Latin Band", "Latin Dance", "Latin Percussion",
  "Mandolin", "Marching Band", "Mariachi Ensemble", "MC",
  "Middle East Specialist", "Oboe", "Opera Singer", "Organ", "Oud",
  "Pedal Steel Guitar", "Percussion", "Persian Specialist", "Piano",
  "Rapper", "Reggae Band", "Rock Band", "Rock String Quartet",
  "Russian Specialist", "Salsa Dancers", "Saxophone", "Saxophone Alto",
  "Saxophone Baritone", "Saxophone Soprano", "Saxophone Tenor",
  "Sinatra Specialist", "Sitar", "Spanish Guitar", "Square Dance",
  "Steel Pans", "String Quartet", "Tabla", "Trombone", "Trumpet", "Tuba",
  "Turkish Specialist", "Ukulele", "Vibraphone", "Viola", "Violin",
  "Vocal Male", "Vocal Female", "Vocalist", "DJ", "Band", "Ensemble",
  "Dancer", "Musician", "Instrumentalist",
  "Wedding Band", "Jazz Band", "Jazz Trio", "Jazz Quartet",
  "Soul Band", "R&B Singer", "Blues Band", "Swing Band",
  "Acoustic Duo", "String Duo", "Piano Trio", "Piano Bar",
  "Flute and Guitar", "Saxophone and Guitar", "Violin and Piano",
];

const LOCATIONS = ["New York City", "Brooklyn", "Newark"];

// Front-line types get YouTube first — singers, DJs, dancers, and the visually
// compelling instruments where video is the main selling point.
// 25 types × 3 locations = 75 YouTube searches, leaving ~20 quota for enrichment.
const YOUTUBE_PRIORITY = [
  // Vocalists & Singers
  "Vocalist", "Vocal Female", "Vocal Male",
  "R&B Singer",
  "Opera Singer", "Gospel Choir", "Rapper", "Sinatra Specialist",
  // DJs
  "DJ",
  // Visual / front-of-stage instruments
  "Saxophone", "Trumpet", "Violin", "Flamenco Guitar", "Harp", "Piano",
  // Dancers
  "Belly Dancer", "Flamenco Dancer", "Salsa Dancers", "Ballroom Dancers", "Dancer",
  // Bands where the frontperson is the draw
  "Wedding Band", "Jazz Band", "Soul Band",
];

// YouTube quota: 10,000 units/day, 100 units/search = 100 searches max.
// Priority types always get YouTube. Remaining quota goes to secondary types in shuffled order.
const YOUTUBE_DAILY_CAP = 95;

interface AutoPopulateState {
  running: boolean;
  startedAt: string | null;
  completedAt: string | null;
  currentQuery: string | null;
  currentLocation: string | null;
  totalSteps: number;
  completedSteps: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  youtubeSearchesThisRun: number;
}

const state: AutoPopulateState = {
  running: false,
  startedAt: null,
  completedAt: null,
  currentQuery: null,
  currentLocation: null,
  totalSteps: 0,
  completedSteps: 0,
  created: 0,
  updated: 0,
  skipped: 0,
  errors: [],
  youtubeSearchesThisRun: 0,
};

export function getAutoPopulateStatus(): AutoPopulateState {
  return { ...state };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

async function scrapeOne(query: string, location: string, platform: "youtube" | "lastfm" | "musicbrainz"): Promise<void> {
  const geoResult = await geocodeLocation(location);
  if (geoResult.isErr()) {
    state.errors.push(`Geocode failed: ${location}`);
    return;
  }
  const geo = geoResult.value;

  let results;
  if (platform === "youtube") {
    const apiKey = process.env["YOUTUBE_API_KEY"];
    if (!apiKey) return;
    const scraper = new YouTubeScraper(apiKey);
    results = await scraper.search(query, location);
  } else if (platform === "lastfm") {
    const apiKey = process.env["LASTFM_API_KEY"];
    if (!apiKey) return;
    const scraper = new LastFmScraper(apiKey);
    results = await scraper.search(query, location);
  } else {
    const scraper = new MusicBrainzScraper();
    results = await scraper.search(query, location);
  }

  if (results.isErr()) {
    state.errors.push(`${platform}(${query}@${location}): ${results.error.message}`);
    return;
  }

  const summary = await ingestScrapeResults(results.value, geo, query);
  state.created += summary.created;
  state.updated += summary.updated;
  state.skipped += summary.skipped;
}

export async function runAutoPopulate(): Promise<void> {
  if (state.running) {
    logger.info("Auto-populate already running, skipping");
    return;
  }

  // Priority types first (always get YouTube), then secondary types shuffled
  // so remaining YouTube quota rotates through the full list over time
  const prioritySet = new Set(YOUTUBE_PRIORITY);
  const secondaryTypes = shuffle(TALENT_TYPES.filter((t) => !prioritySet.has(t)));
  const orderedTypes = [...YOUTUBE_PRIORITY, ...secondaryTypes];

  state.running = true;
  state.startedAt = new Date().toISOString();
  state.completedAt = null;
  state.totalSteps = orderedTypes.length * LOCATIONS.length;
  state.completedSteps = 0;
  state.created = 0;
  state.updated = 0;
  state.skipped = 0;
  state.errors = [];
  state.youtubeSearchesThisRun = 0;

  logger.info({ totalSteps: state.totalSteps, youtubeCap: YOUTUBE_DAILY_CAP, priorityTypes: YOUTUBE_PRIORITY.length }, "Auto-populate started");

  try {
    for (const talentType of orderedTypes) {
      for (const location of LOCATIONS) {
        state.currentQuery = talentType;
        state.currentLocation = location;

        // Last.fm and MusicBrainz run for every type — no quota limits
        for (const platform of ["lastfm", "musicbrainz"] as const) {
          try {
            await scrapeOne(talentType, location, platform);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            state.errors.push(`${platform}(${talentType}@${location}): ${msg}`);
          }
          await sleep(400);
        }

        // YouTube: priority types always run; secondary types use whatever quota remains
        if (state.youtubeSearchesThisRun < YOUTUBE_DAILY_CAP) {
          try {
            await scrapeOne(talentType, location, "youtube");
            state.youtubeSearchesThisRun++;
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            state.errors.push(`youtube(${talentType}@${location}): ${msg}`);
          }
          await sleep(400);
        }

        state.completedSteps++;
        if (state.completedSteps % 10 === 0) {
          logger.info(
            { completed: state.completedSteps, total: state.totalSteps, created: state.created, youtubeUsed: state.youtubeSearchesThisRun },
            "Auto-populate progress"
          );
        }
      }
    }
  } finally {
    state.running = false;
    state.completedAt = new Date().toISOString();
    state.currentQuery = null;
    state.currentLocation = null;
    logger.info(
      { created: state.created, updated: state.updated, errors: state.errors.length, youtubeUsed: state.youtubeSearchesThisRun },
      "Auto-populate complete"
    );
  }
}
