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
const PLATFORMS = ["youtube", "lastfm", "musicbrainz"] as const;
type Platform = typeof PLATFORMS[number];

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
};

export function getAutoPopulateStatus(): AutoPopulateState {
  return { ...state };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scrapeOne(query: string, location: string, platform: Platform): Promise<void> {
  const apiKey = platform === "youtube" ? process.env["YOUTUBE_API_KEY"] : platform === "lastfm" ? process.env["LASTFM_API_KEY"] : null;
  if ((platform === "youtube" || platform === "lastfm") && !apiKey) return;

  const geoResult = await geocodeLocation(location);
  if (geoResult.isErr()) {
    state.errors.push(`Geocode failed: ${location}`);
    return;
  }
  const geo = geoResult.value;

  let results;
  if (platform === "youtube") {
    const scraper = new YouTubeScraper(apiKey!);
    results = await scraper.search(query, location);
  } else if (platform === "lastfm") {
    const scraper = new LastFmScraper(apiKey!);
    results = await scraper.search(query, location);
  } else {
    const scraper = new MusicBrainzScraper();
    results = await scraper.search(query, location);
  }

  if (results.isErr()) {
    state.errors.push(`${platform}(${query}@${location}): ${results.error.message}`);
    return;
  }

  const summary = await ingestScrapeResults(results.value, geo);
  state.created += summary.created;
  state.updated += summary.updated;
  state.skipped += summary.skipped;
}

export async function runAutoPopulate(): Promise<void> {
  if (state.running) {
    logger.info("Auto-populate already running, skipping");
    return;
  }

  state.running = true;
  state.startedAt = new Date().toISOString();
  state.completedAt = null;
  state.totalSteps = TALENT_TYPES.length * LOCATIONS.length;
  state.completedSteps = 0;
  state.created = 0;
  state.updated = 0;
  state.skipped = 0;
  state.errors = [];

  logger.info({ totalSteps: state.totalSteps }, "Auto-populate started");

  try {
    for (const talentType of TALENT_TYPES) {
      for (const location of LOCATIONS) {
        state.currentQuery = talentType;
        state.currentLocation = location;

        for (const platform of PLATFORMS) {
          try {
            await scrapeOne(talentType, location, platform);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            state.errors.push(`${platform}(${talentType}@${location}): ${msg}`);
          }
          await sleep(400);
        }

        state.completedSteps++;
        if (state.completedSteps % 10 === 0) {
          logger.info({ completed: state.completedSteps, total: state.totalSteps, created: state.created }, "Auto-populate progress");
        }
      }
    }
  } finally {
    state.running = false;
    state.completedAt = new Date().toISOString();
    state.currentQuery = null;
    state.currentLocation = null;
    logger.info({ created: state.created, updated: state.updated, errors: state.errors.length }, "Auto-populate complete");
  }
}
