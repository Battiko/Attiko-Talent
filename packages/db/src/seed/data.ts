// Seed data for 500 demo artists across 10 cities
// These are fictional artists used only for demo purposes.

export interface SeedArtist {
  name: string;
  talentType: "musician" | "vocalist" | "dj" | "dancer" | "band" | "ensemble" | "instrumentalist" | "performer";
  genres: string[];
  instruments: string[];
  city: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  bio?: string;
  rateMinCents?: number;
  rateMaxCents?: number;
  eventFitScore: number;
  socialProofScore: number;
  mediaQualityScore: number;
  imageUrl?: string;
}

const NEW_YORK: Pick<SeedArtist, "city" | "country" | "countryCode" | "lat" | "lng"> = {
  city: "New York",
  country: "United States",
  countryCode: "US",
  lat: 40.7128,
  lng: -74.0060,
};

const LONDON: Pick<SeedArtist, "city" | "country" | "countryCode" | "lat" | "lng"> = {
  city: "London",
  country: "United Kingdom",
  countryCode: "GB",
  lat: 51.5074,
  lng: -0.1278,
};

const PARIS: Pick<SeedArtist, "city" | "country" | "countryCode" | "lat" | "lng"> = {
  city: "Paris",
  country: "France",
  countryCode: "FR",
  lat: 48.8566,
  lng: 2.3522,
};

const MIAMI: Pick<SeedArtist, "city" | "country" | "countryCode" | "lat" | "lng"> = {
  city: "Miami",
  country: "United States",
  countryCode: "US",
  lat: 25.7617,
  lng: -80.1918,
};

const LOS_ANGELES: Pick<SeedArtist, "city" | "country" | "countryCode" | "lat" | "lng"> = {
  city: "Los Angeles",
  country: "United States",
  countryCode: "US",
  lat: 34.0522,
  lng: -118.2437,
};

const ROME: Pick<SeedArtist, "city" | "country" | "countryCode" | "lat" | "lng"> = {
  city: "Rome",
  country: "Italy",
  countryCode: "IT",
  lat: 41.9028,
  lng: 12.4964,
};

const DUBAI: Pick<SeedArtist, "city" | "country" | "countryCode" | "lat" | "lng"> = {
  city: "Dubai",
  country: "United Arab Emirates",
  countryCode: "AE",
  lat: 25.2048,
  lng: 55.2708,
};

const SYDNEY: Pick<SeedArtist, "city" | "country" | "countryCode" | "lat" | "lng"> = {
  city: "Sydney",
  country: "Australia",
  countryCode: "AU",
  lat: -33.8688,
  lng: 151.2093,
};

const BARCELONA: Pick<SeedArtist, "city" | "country" | "countryCode" | "lat" | "lng"> = {
  city: "Barcelona",
  country: "Spain",
  countryCode: "ES",
  lat: 41.3851,
  lng: 2.1734,
};

const TOKYO: Pick<SeedArtist, "city" | "country" | "countryCode" | "lat" | "lng"> = {
  city: "Tokyo",
  country: "Japan",
  countryCode: "JP",
  lat: 35.6762,
  lng: 139.6503,
};

// Template generator for varied artists per city
function makeArtists(
  location: Pick<SeedArtist, "city" | "country" | "countryCode" | "lat" | "lng">,
  offset = 0
): SeedArtist[] {
  const templates: Omit<SeedArtist, "city" | "country" | "countryCode" | "lat" | "lng">[] = [
    { name: `The ${location.city} Jazz Quartet`, talentType: "band", genres: ["jazz", "swing"], instruments: ["piano", "bass", "drums", "saxophone"], bio: `Sophisticated jazz ensemble based in ${location.city}, specializing in wedding and corporate events.`, rateMinCents: 300000, rateMaxCents: 800000, eventFitScore: 95, socialProofScore: 82, mediaQualityScore: 88 },
    { name: `Sofia ${["Vega", "Laurent", "Chen", "Reyes", "Kim", "Russo", "Al-Hassan", "Nakamura", "Garcia", "Müller"][offset % 10]} — Soprano`, talentType: "vocalist", genres: ["classical", "opera", "wedding"], instruments: ["voice"], bio: `Award-winning soprano performing at private events and luxury weddings worldwide.`, rateMinCents: 150000, rateMaxCents: 500000, eventFitScore: 92, socialProofScore: 78, mediaQualityScore: 85 },
    { name: `DJ Cosmic ${["Nova", "Eclipse", "Zenith", "Apex", "Flux", "Echo", "Pulse", "Orbit", "Solstice", "Meridian"][offset % 10]}`, talentType: "dj", genres: ["deep house", "nu-disco", "elegant electronic"], instruments: [], bio: `Curating soundscapes for upscale events — from pre-ceremony to late-night reception.`, rateMinCents: 200000, rateMaxCents: 600000, eventFitScore: 88, socialProofScore: 74, mediaQualityScore: 80 },
    { name: `${location.city} String Ensemble`, talentType: "ensemble", genres: ["classical", "contemporary", "crossover"], instruments: ["violin", "viola", "cello", "double bass"], bio: `Four-piece string ensemble adaptable from ceremony processionals to dinner background music.`, rateMinCents: 400000, rateMaxCents: 1000000, eventFitScore: 97, socialProofScore: 86, mediaQualityScore: 91 },
    { name: `Marco ${["Bellini", "Fontaine", "Rivera", "Tanaka", "Okafor", "Petrov", "Adebayo", "Nakagawa", "Estrada", "Brandão"][offset % 10]} — Guitarist`, talentType: "instrumentalist", genres: ["classical guitar", "bossa nova", "flamenco"], instruments: ["guitar"], bio: `Solo guitarist creating intimate acoustic atmospheres for ceremonies and cocktail hours.`, rateMinCents: 80000, rateMaxCents: 300000, eventFitScore: 90, socialProofScore: 71, mediaQualityScore: 76 },
    { name: `Aisha ${["Mensah", "Dupont", "Valencia", "Kobayashi", "Osei", "Volkov", "Amara", "Watanabe", "Flores", "Costa"][offset % 10]} Dance`, talentType: "dancer", genres: ["contemporary", "salsa", "ballroom"], instruments: [], bio: `Professional dance duo performing choreographed routines and teaching guests at receptions.`, rateMinCents: 120000, rateMaxCents: 400000, eventFitScore: 85, socialProofScore: 68, mediaQualityScore: 83 },
    { name: `${["Golden", "Silver", "Azure", "Amber", "Ivory", "Cobalt", "Saffron", "Crimson", "Jade", "Pearl"][offset % 10]} Keys — Piano & Vocals`, talentType: "vocalist", genres: ["jazz", "pop standards", "musical theatre"], instruments: ["piano", "voice"], bio: `Elegant piano-vocal duo performing jazz standards and contemporary hits for cocktail hours and dinners.`, rateMinCents: 175000, rateMaxCents: 450000, eventFitScore: 93, socialProofScore: 79, mediaQualityScore: 87 },
    { name: `The ${location.city} Brass Band`, talentType: "band", genres: ["jazz", "brass", "New Orleans"], instruments: ["trumpet", "trombone", "tuba", "saxophone", "drums"], bio: `High-energy brass band bringing a New Orleans second-line feel to any celebration.`, rateMinCents: 350000, rateMaxCents: 900000, eventFitScore: 89, socialProofScore: 83, mediaQualityScore: 79 },
    { name: `Elena ${["Volkov", "Moreau", "Santos", "Yamada", "Obi", "Petersen", "Rashid", "Kato", "Vidal", "Melo"][offset % 10]} — Harpist`, talentType: "instrumentalist", genres: ["classical", "celtic", "contemporary"], instruments: ["harp"], bio: `Classically trained harpist with extensive wedding experience across luxury venues.`, rateMinCents: 100000, rateMaxCents: 350000, eventFitScore: 96, socialProofScore: 75, mediaQualityScore: 82 },
    { name: `${["Velvet", "Noir", "Bespoke", "Magnolia", "Cerulean", "Onyx", "Alabaster", "Opaline", "Topaz", "Sienna"][offset % 10]} Beats`, talentType: "dj", genres: ["afrobeats", "latin", "global fusion"], instruments: [], bio: `International DJ blending world music styles for multicultural celebrations and luxury weddings.`, rateMinCents: 250000, rateMaxCents: 700000, eventFitScore: 87, socialProofScore: 76, mediaQualityScore: 84 },
  ];

  return templates.map((t) => ({ ...t, ...location }));
}

// Generate 10 artists × 10 cities × 5 variations = 500 artists
export function generateSeedData(): SeedArtist[] {
  const locations = [
    NEW_YORK, LONDON, PARIS, MIAMI, LOS_ANGELES,
    ROME, DUBAI, SYDNEY, BARCELONA, TOKYO,
  ];

  const all: SeedArtist[] = [];
  for (let variation = 0; variation < 5; variation++) {
    for (const location of locations) {
      const artists = makeArtists(location, variation);
      for (let i = 0; i < artists.length; i++) {
        const artist = artists[i];
        if (!artist) continue;
        // Add slight geo variation so pins don't stack
        all.push({
          ...artist,
          name: variation === 0 ? artist.name : `${artist.name} ${["II", "Duo", "Trio", "Ensemble", "Collective"][variation - 1]}`,
          lat: artist.lat + (Math.random() - 0.5) * 0.3,
          lng: artist.lng + (Math.random() - 0.5) * 0.3,
        });
      }
    }
  }
  return all;
}
