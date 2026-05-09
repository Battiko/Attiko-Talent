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

export async function geocodeLocation(
  location: string
): Promise<Result<GeoPoint & { label: string; city: string | null; country: string | null }, AppError>> {
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
      return err(AppError.notFound(`Location: ${location}`));
    }

    const lat = parseFloat(first.lat);
    const lng = parseFloat(first.lon);
    const city = first.address?.city ?? first.address?.town ?? first.address?.village ?? null;
    const country = first.address?.country ?? null;

    return ok({ lat, lng, label: first.display_name, city, country });
  } catch (cause) {
    return err(AppError.externalApi("Nominatim", cause));
  }
}
