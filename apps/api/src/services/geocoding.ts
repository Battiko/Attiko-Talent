import { z } from "zod";
import { AppError, ok, err, type Result } from "@attiko/shared/errors";
import type { GeoPoint } from "@attiko/shared/types";

const nominatimSchema = z.array(
  z.object({
    lat: z.string(),
    lon: z.string(),
    display_name: z.string(),
    address: z
      .object({
        city: z.string().optional(),
        town: z.string().optional(),
        village: z.string().optional(),
        country: z.string().optional(),
      })
      .optional(),
  })
);

type GeocodeValue = GeoPoint & { label: string; city: string | null; country: string | null };

// Nominatim's usage policy is 1 req/sec — and searches repeat the same cities
// constantly. Cache hits skip the network entirely (also caches "not found").
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 1000;
const geocodeCache = new Map<string, { value: GeocodeValue | null; expiresAt: number }>();

export async function geocodeLocation(
  location: string
): Promise<Result<GeocodeValue, AppError>> {
  const cacheKey = location.toLowerCase().trim();
  const cached = geocodeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
      ? ok(cached.value)
      : err(AppError.notFound(`Location: ${location}`));
  }

  const encoded = encodeURIComponent(location);
  const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&addressdetails=1`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Attiko/1.0 (bobbyattiko@me.com)" },
    });
    if (!res.ok) {
      return err(AppError.externalApi("Nominatim", `Status ${res.status}`));
    }
    const data = nominatimSchema.parse(await res.json());
    const first = data[0];
    if (!first) {
      cacheSet(cacheKey, null);
      return err(AppError.notFound(`Location: ${location}`));
    }

    const lat = parseFloat(first.lat);
    const lng = parseFloat(first.lon);
    const city = first.address?.city ?? first.address?.town ?? first.address?.village ?? null;
    const country = first.address?.country ?? null;

    const value = { lat, lng, label: first.display_name, city, country };
    cacheSet(cacheKey, value);
    return ok(value);
  } catch (cause) {
    // Transient errors (network, 5xx) are deliberately NOT cached
    return err(AppError.externalApi("Nominatim", cause));
  }
}

function cacheSet(key: string, value: GeocodeValue | null): void {
  if (geocodeCache.size >= CACHE_MAX) {
    const oldest = geocodeCache.keys().next().value;
    if (oldest !== undefined) geocodeCache.delete(oldest);
  }
  geocodeCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}
