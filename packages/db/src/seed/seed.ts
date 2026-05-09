import { getDb } from "../client.js";
import { artists, platformProfiles } from "../schema/index.js";
import { generateSeedData } from "./data.js";
import { sql } from "drizzle-orm";

function slugify(name: string, id: number): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) + `-${id}`;
}

async function seed(): Promise<void> {
  console.log("🌱 Seeding demo data...");
  const db = getDb();

  await db.execute(sql`TRUNCATE TABLE platform_profiles, artists CASCADE`);

  const seedData = generateSeedData();
  console.log(`  Inserting ${seedData.length} artists...`);

  for (let i = 0; i < seedData.length; i++) {
    const data = seedData[i];
    if (!data) continue;

    const slug = slugify(data.name, i);

    const [artist] = await db
      .insert(artists)
      .values({
        slug,
        name: data.name,
        talentType: data.talentType,
        bio: data.bio ?? null,
        city: data.city,
        country: data.country,
        countryCode: data.countryCode,
        locationLabel: `${data.city}, ${data.country}`,
        lat: data.lat,
        lng: data.lng,
        // PostGIS point — set via raw SQL
        genres: data.genres,
        instruments: data.instruments,
        languages: ["English"],
        tags: data.genres,
        rateMinCents: data.rateMinCents ?? null,
        rateMaxCents: data.rateMaxCents ?? null,
        rateCurrency: "USD",
        eventFitScore: data.eventFitScore,
        socialProofScore: data.socialProofScore,
        mediaQualityScore: data.mediaQualityScore,
        overallScore: Math.round(
          data.eventFitScore * 0.35 +
          data.socialProofScore * 0.35 +
          data.mediaQualityScore * 0.30
        ),
      })
      .returning({ id: artists.id });

    if (!artist) continue;

    await db.execute(
      sql`UPDATE artists SET geo_point = ST_SetSRID(ST_MakePoint(${data.lng}, ${data.lat}), 4326) WHERE id = ${artist.id}`
    );

    // Insert a Spotify demo profile for each artist
    await db.insert(platformProfiles).values({
      artistId: artist.id,
      source: "spotify",
      externalId: `demo-spotify-${i}`,
      url: `https://open.spotify.com/artist/demo-${i}`,
      name: data.name,
      followerCount: Math.floor(Math.random() * 50000) + 500,
      verifiedBadge: data.socialProofScore > 85,
    });
  }

  console.log(`✅ Seeded ${seedData.length} artists with platform profiles.`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
