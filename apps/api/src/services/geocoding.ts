import { z } from "zod";
import { AppError, ok, err, type Result } from "@attiko/shared/errors";
import type { GeoPoint } from "@attiko/shared/types";

const geocodeResponseSchema = z.object({
  features: z.array(
    z.object({
      center: z.tuple([z.number(), z.number()]),
      place_name: z.string(),
      context: z
        .array(
          z.object({
            id: z.string(),
            text: z.string(),
          })
        )
        .optional(),
    })
  ),
});

export async function geocodeLocation(
  location: string
): Promise<Result<GeoPoint & { label: string; city: string | null; country: string | null }, AppError>> {
  const token = process.env["MAPBOX_SECRET_TOKEN"] ?? process.env["NEXT_PUBLIC_MAPBOX_TOKEN"];
  if (!token) {
    return err(AppError.validation("Mapbox token not configured"));
  }

  const encoded = encodeURIComponent(location);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${token}&types=place,region,country&limit=1`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return err(AppError.externalApi("Mapbox", `Status ${res.status}`));
    }
    const data = geocodeResponseSchema.parse(await res.json());
    const first = data.features[0];
    if (!first) {
      return err(AppError.notFound(`Location: ${location}`));
    }

    const [lng, lat] = first.center;
    let city: string | null = null;
    let country: string | null = null;

    for (const ctx of first.context ?? []) {
      if (ctx.id.startsWith("place.")) city = ctx.text;
      if (ctx.id.startsWith("country.")) country = ctx.text;
    }

    return ok({ lat, lng: lng ?? 0, label: first.place_name, city, country });
  } catch (cause) {
    return err(AppError.externalApi("Mapbox", cause));
  }
}
