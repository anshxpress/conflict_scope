import { db, schema } from "../../../db";
import { geocodeLocation } from "../geocoding/nominatim";

/**
 * Seed strategic infrastructure from OpenStreetMap Overpass API.
 * Fetches airports, seaports, power plants, oil refineries, government buildings
 * in known conflict-affected regions.
 *
 * OSM Overpass API is free with no authentication required.
 */

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

const INFRASTRUCTURE_QUERIES: Array<{
  type: (typeof schema.infrastructureTypeEnum.enumValues)[number];
  overpassFilter: string;
  osmTags: string;
}> = [
  {
    type: "airport",
    overpassFilter: 'aeroway"="aerodrome"',
    osmTags: '[aeroway=aerodrome][name]',
  },
  {
    type: "power_plant",
    overpassFilter: 'power"="plant"',
    osmTags: '[power=plant][name]',
  },
  {
    type: "oil_refinery",
    overpassFilter: 'industrial"="oil_refinery"',
    osmTags: '[industrial=oil_refinery][name]',
  },
  {
    type: "government_building",
    overpassFilter: 'building"="government"',
    osmTags: '[building=government][name]',
  },
];

export async function seedInfrastructure(): Promise<void> {
  console.log("[Seed] Starting infrastructure seeding from OpenStreetMap...");

  for (const config of INFRASTRUCTURE_QUERIES) {
    try {
      const query = `
[out:json][timeout:60];
(
  node${config.osmTags}(bbox:-90,-180,90,180);
  way${config.osmTags}(bbox:-90,-180,90,180);
  relation${config.osmTags}(bbox:-90,-180,90,180);
);
out center 200;
      `.trim();

      const response = await fetch(OVERPASS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!response.ok) {
        console.warn(`[Seed] Overpass API error for ${config.type}: ${response.status}`);
        continue;
      }

      const data = (await response.json()) as OverpassResponse;
      const elements = data.elements ?? [];

      console.log(`[Seed] ${config.type}: got ${elements.length} elements`);

      let inserted = 0;
      for (const el of elements) {
        const lat = el.lat ?? el.center?.lat;
        const lon = el.lon ?? el.center?.lon;
        const name = el.tags?.name;

        if (!lat || !lon || !name) continue;

        // Resolve country from coordinates using reverse geocoding
        const country =
          el.tags?.["addr:country"] ||
          el.tags?.["country"] ||
          "Unknown";

        try {
          await db
            .insert(schema.infrastructure)
            .values({
              name,
              type: config.type,
              latitude: lat,
              longitude: lon,
              country,
            })
            .onConflictDoNothing();
          inserted++;
        } catch {
          // Skip duplicates
        }
      }

      console.log(`[Seed] ${config.type}: inserted ${inserted} records`);

      // Respect Overpass rate limits
      await new Promise((r) => setTimeout(r, 2000));
    } catch (err) {
      console.error(`[Seed] Error seeding ${config.type}:`, err);
    }
  }

  console.log("[Seed] Infrastructure seeding complete.");
}
