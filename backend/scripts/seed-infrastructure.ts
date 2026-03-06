/**
 * Seed infrastructure data from OpenStreetMap Overpass API.
 *
 * This script queries OSM for strategic infrastructure in conflict-affected
 * regions and populates the infrastructure table.
 */
import { db, schema } from "../db";
import type { NewInfrastructure, InfrastructureType } from "../db/schema";

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const OVERPASS_API = "https://overpass-api.de/api/interpreter";

// Conflict-affected regions bounding boxes [south, west, north, east]
const REGIONS: Record<string, [number, number, number, number]> = {
  Ukraine: [44.3, 22.1, 52.4, 40.2],
  Syria: [32.3, 35.7, 37.3, 42.4],
  Yemen: [12.1, 42.5, 19.0, 54.0],
  Libya: [19.5, 9.3, 33.2, 25.2],
  Iraq: [29.0, 38.8, 37.4, 48.6],
  Sudan: [3.5, 21.8, 23.1, 38.6],
  Palestine: [31.2, 34.2, 32.6, 35.6],
  Lebanon: [33.0, 35.1, 34.7, 36.6],
  Somalia: [-1.7, 40.9, 12.0, 51.4],
  Ethiopia: [3.4, 33.0, 14.9, 48.0],
};

const INFRA_QUERIES: { type: InfrastructureType; query: string }[] = [
  { type: "airport", query: '[aeroway="aerodrome"]' },
  {
    type: "seaport",
    query: '[harbour="yes"][leisure!="marina"]',
  },
  {
    type: "power_plant",
    query: '[power="plant"]',
  },
  {
    type: "oil_refinery",
    query: '["man_made"="petroleum_well"]',
  },
  {
    type: "government_building",
    query: '["office"="government"]',
  },
];

async function queryOverpass(
  overpassQuery: string
): Promise<OverpassElement[]> {
  const response = await fetch(OVERPASS_API, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(overpassQuery)}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`);
  }

  const data = (await response.json()) as { elements: OverpassElement[] };
  return data.elements;
}

async function seedRegion(
  regionName: string,
  bbox: [number, number, number, number]
): Promise<number> {
  let count = 0;
  const [south, west, north, east] = bbox;
  const bboxStr = `${south},${west},${north},${east}`;

  for (const infra of INFRA_QUERIES) {
    try {
      const query = `
        [out:json][timeout:60];
        (
          node${infra.query}(${bboxStr});
          way${infra.query}(${bboxStr});
          relation${infra.query}(${bboxStr});
        );
        out center 100;
      `;

      console.log(
        `  Querying ${infra.type} in ${regionName}...`
      );

      const elements = await queryOverpass(query);

      const records: NewInfrastructure[] = elements
        .map((el) => {
          const lat = el.lat ?? el.center?.lat;
          const lon = el.lon ?? el.center?.lon;
          if (!lat || !lon) return null;

          return {
            name:
              el.tags?.name ||
              el.tags?.["name:en"] ||
              `${infra.type}_${el.id}`,
            type: infra.type,
            latitude: lat,
            longitude: lon,
            country: regionName,
          };
        })
        .filter((r): r is NewInfrastructure => r !== null);

      if (records.length > 0) {
        await db.insert(schema.infrastructure).values(records);
        count += records.length;
        console.log(
          `  ✓ ${records.length} ${infra.type}(s) in ${regionName}`
        );
      }

      // Rate limit: 2s between Overpass queries
      await new Promise((r) => setTimeout(r, 2000));
    } catch (err) {
      console.error(
        `  ✗ Error fetching ${infra.type} in ${regionName}:`,
        err
      );
    }
  }

  return count;
}

async function main() {
  console.log("═══ ConflictScope Infrastructure Seeder ═══\n");

  let total = 0;
  for (const [region, bbox] of Object.entries(REGIONS)) {
    console.log(`\n▶ ${region}`);
    const count = await seedRegion(region, bbox);
    total += count;
  }

  console.log(`\n═══ Done. Seeded ${total} infrastructure records. ═══`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
