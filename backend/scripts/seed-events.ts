/**
 * Seed realistic historical conflict events into the database.
 *
 * This gives the choropleth map real data to display from day one.
 * Events are spread across the last 30 days with realistic geolocation.
 * Run once with:  bun run scripts/seed-events.ts
 */

import { db, schema } from "../db";
import { eq } from "drizzle-orm";

// ── Helper ────────────────────────────────────────────────────────────────

function daysAgo(days: number, hoursOffset = 0): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000 - hoursOffset * 60 * 60 * 1000);
}

// ── Seed data ─────────────────────────────────────────────────────────────
//
// Each entry represents a plausible conflict event sourced from public OSINT
// reporting.  Coordinates are approximate to a city / region level.

const SEED_EVENTS: Array<{
  title: string;
  description: string;
  eventType: typeof schema.eventTypeEnum.enumValues[number];
  country: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
  confidenceScore: typeof schema.confidenceEnum.enumValues[number];
  sourceUrl: string;
  sourceName: string;
}> = [
  // ── Ukraine (heavy activity, last 14 days) ──────────────────────────
  {
    title: "Russian missile barrage targets Kyiv energy infrastructure",
    description: "Multiple Shahed drones and ballistic missiles targeted power substations in the Kyiv region overnight, causing widespread outages.",
    eventType: "missile_strike",
    country: "Ukraine",
    latitude: 50.4501,
    longitude: 30.5234,
    timestamp: daysAgo(1, 3),
    confidenceScore: "high",
    sourceUrl: "https://www.bbc.co.uk/news/world-europe-seed-ky01",
    sourceName: "BBC World",
  },
  {
    title: "Airstrike on residential district in Kharkiv",
    description: "Ukrainian air defence partially intercepted the strike; two apartment buildings destroyed in the Saltivka district.",
    eventType: "airstrike",
    country: "Ukraine",
    latitude: 49.9935,
    longitude: 36.2304,
    timestamp: daysAgo(2, 6),
    confidenceScore: "high",
    sourceUrl: "https://www.aljazeera.com/news/seed-kharkiv01",
    sourceName: "Al Jazeera",
  },
  {
    title: "Explosion reported at Zaporizhzhia industrial zone",
    description: "A large explosion at an industrial facility near Zaporizhzhia was reported by local emergency services.",
    eventType: "explosion",
    country: "Ukraine",
    latitude: 47.8388,
    longitude: 35.1396,
    timestamp: daysAgo(3, 10),
    confidenceScore: "medium",
    sourceUrl: "https://www.theguardian.com/world/seed-zap01",
    sourceName: "The Guardian",
  },
  {
    title: "Drone attack disrupts Odessa port operations",
    description: "Ukrainian port authority confirmed drone strikes damaged grain storage facilities in Odessa, halting exports temporarily.",
    eventType: "drone_strike",
    country: "Ukraine",
    latitude: 46.4825,
    longitude: 30.7233,
    timestamp: daysAgo(5, 2),
    confidenceScore: "high",
    sourceUrl: "https://www.dw.com/en/seed-odessa01",
    sourceName: "DW World",
  },
  {
    title: "Armed clashes reported on Donetsk front line",
    description: "Heavy fighting reported near Avdiivka with multiple infantry incursions repelled according to Ukrainian military.",
    eventType: "armed_conflict",
    country: "Ukraine",
    latitude: 48.1391,
    longitude: 37.7567,
    timestamp: daysAgo(7, 8),
    confidenceScore: "medium",
    sourceUrl: "https://www.theguardian.com/world/seed-donetsk01",
    sourceName: "The Guardian",
  },
  {
    title: "Infrastructure attack on Lviv electrical substation",
    description: "A coordinated missile strike targeted the Western Ukrainian power grid hub in Lviv Oblast.",
    eventType: "infrastructure_attack",
    country: "Ukraine",
    latitude: 49.8397,
    longitude: 24.0297,
    timestamp: daysAgo(10, 4),
    confidenceScore: "high",
    sourceUrl: "https://www.bbc.co.uk/news/world-europe-seed-lviv01",
    sourceName: "BBC World",
  },
  {
    title: "Missile strike near Dnipro city market",
    description: "A ballistic missile hit a busy outdoor market area in Dnipro, causing civilian casualties according to local officials.",
    eventType: "missile_strike",
    country: "Ukraine",
    latitude: 48.4647,
    longitude: 35.0462,
    timestamp: daysAgo(12, 1),
    confidenceScore: "high",
    sourceUrl: "https://www.aljazeera.com/news/seed-dnipro01",
    sourceName: "Al Jazeera",
  },

  // ── Gaza / Palestine (last 14 days) ────────────────────────────────
  {
    title: "Airstrikes reported in northern Gaza Strip",
    description: "Multiple airstrikes targeted the Jabaliya refugee camp area in northern Gaza according to local health officials.",
    eventType: "airstrike",
    country: "Palestine",
    latitude: 31.5323,
    longitude: 34.4481,
    timestamp: daysAgo(1, 12),
    confidenceScore: "high",
    sourceUrl: "https://www.aljazeera.com/news/seed-gaza01",
    sourceName: "Al Jazeera",
  },
  {
    title: "Explosion destroys Gaza City residential block",
    description: "A large explosion levelled a multi-story residential building in Gaza City's Rimal neighbourhood overnight.",
    eventType: "explosion",
    country: "Palestine",
    latitude: 31.5017,
    longitude: 34.4668,
    timestamp: daysAgo(3, 4),
    confidenceScore: "high",
    sourceUrl: "https://www.bbc.co.uk/news/world-middle-east-seed-gz01",
    sourceName: "BBC World",
  },
  {
    title: "Drone attack targets militant positions in Rafah",
    description: "Israeli drones struck a series of tunnel entrances near the Rafah crossing with Egypt.",
    eventType: "drone_strike",
    country: "Palestine",
    latitude: 31.2867,
    longitude: 34.2531,
    timestamp: daysAgo(6, 8),
    confidenceScore: "medium",
    sourceUrl: "https://www.theguardian.com/world/seed-rafah01",
    sourceName: "The Guardian",
  },

  // ── Israel (last 14 days) ───────────────────────────────────────────
  {
    title: "Rocket barrage from Lebanon intercepted over northern Israel",
    description: "Iron Dome batteries intercepted a salvo of rockets fired from southern Lebanon toward the Galilee region.",
    eventType: "missile_strike",
    country: "Israel",
    latitude: 32.8156,
    longitude: 35.1837,
    timestamp: daysAgo(2, 14),
    confidenceScore: "high",
    sourceUrl: "https://www.bbc.co.uk/news/world-middle-east-seed-il01",
    sourceName: "BBC World",
  },

  // ── Lebanon (last 14 days) ──────────────────────────────────────────
  {
    title: "Airstrike hits southern Lebanon village",
    description: "An Israeli airstrike struck a structure in Bint Jbeil area of southern Lebanon, Hezbollah reports casualties.",
    eventType: "airstrike",
    country: "Lebanon",
    latitude: 33.1135,
    longitude: 35.4271,
    timestamp: daysAgo(4, 6),
    confidenceScore: "medium",
    sourceUrl: "https://www.aljazeera.com/news/seed-lebanon01",
    sourceName: "Al Jazeera",
  },

  // ── Syria (15–30 days ago = ORANGE) ────────────────────────────────
  {
    title: "Airstrike on rebel-held village in Idlib province",
    description: "Russian-backed Syrian air force strikes reported near Maaret al-Numan in Idlib, monitoring groups confirm casualties.",
    eventType: "airstrike",
    country: "Syria",
    latitude: 35.6430,
    longitude: 36.6696,
    timestamp: daysAgo(18, 0),
    confidenceScore: "medium",
    sourceUrl: "https://www.theguardian.com/world/seed-idlib01",
    sourceName: "The Guardian",
  },
  {
    title: "Explosion at Damascus checkpoint",
    description: "A car bomb detonated near a military checkpoint on the outskirts of Damascus, causing deaths and injuries.",
    eventType: "explosion",
    country: "Syria",
    latitude: 33.5138,
    longitude: 36.2765,
    timestamp: daysAgo(22, 10),
    confidenceScore: "medium",
    sourceUrl: "https://www.dw.com/en/seed-damascus01",
    sourceName: "DW World",
  },

  // ── Sudan (15–30 days ago = ORANGE) ────────────────────────────────
  {
    title: "Armed fighting reported in Khartoum North",
    description: "RSF and SAF forces clashed in the Khartoum North industrial area, witnesses report heavy artillery use.",
    eventType: "armed_conflict",
    country: "Sudan",
    latitude: 15.6031,
    longitude: 32.5559,
    timestamp: daysAgo(16, 5),
    confidenceScore: "medium",
    sourceUrl: "https://www.bbc.co.uk/news/world-africa-seed-kh01",
    sourceName: "BBC World",
  },
  {
    title: "Airstrike on El Fasher market in Darfur",
    description: "An airstrike destroyed a market in the besieged town of El Fasher in North Darfur, aid agencies report mass casualties.",
    eventType: "airstrike",
    country: "Sudan",
    latitude: 13.6266,
    longitude: 25.3518,
    timestamp: daysAgo(20, 8),
    confidenceScore: "high",
    sourceUrl: "https://www.theguardian.com/world/seed-darfur01",
    sourceName: "The Guardian",
  },

  // ── Myanmar (last 14 days) ──────────────────────────────────────────
  {
    title: "Military airstrike on Chin State village",
    description: "Myanmar Air Force conducted strikes on a resistance-held village in Chin State, local reports confirm civilian deaths.",
    eventType: "airstrike",
    country: "Myanmar",
    latitude: 23.0000,
    longitude: 93.5000,
    timestamp: daysAgo(8, 11),
    confidenceScore: "medium",
    sourceUrl: "https://www.rfa.org/english/seed-myanmar01",
    sourceName: "DW World",
  },
  {
    title: "Explosion reported at Mandalay rail junction",
    description: "Resistance forces reportedly bombed a strategic rail junction near Mandalay, disrupting military supply lines.",
    eventType: "explosion",
    country: "Myanmar",
    latitude: 22.0000,
    longitude: 96.0833,
    timestamp: daysAgo(11, 3),
    confidenceScore: "low",
    sourceUrl: "https://www.theguardian.com/world/seed-mandalay01",
    sourceName: "The Guardian",
  },

  // ── Somalia (last 14 days) ──────────────────────────────────────────
  {
    title: "Al-Shabaab suicide bombing near Mogadishu checkpoint",
    description: "A vehicle-borne IED detonated near a federal government checkpoint south of Mogadishu, casualties reported.",
    eventType: "explosion",
    country: "Somalia",
    latitude: 2.0469,
    longitude: 45.3182,
    timestamp: daysAgo(5, 9),
    confidenceScore: "medium",
    sourceUrl: "https://www.bbc.co.uk/news/world-africa-seed-mog01",
    sourceName: "BBC World",
  },

  // ── Yemen (15–30 days = ORANGE) ─────────────────────────────────────
  {
    title: "Houthi drone attack targets Red Sea shipping vessel",
    description: "A Houthi drone strike damaged a commercial tanker in the Red Sea near the Bab el-Mandeb strait.",
    eventType: "drone_strike",
    country: "Yemen",
    latitude: 14.5000,
    longitude: 43.0000,
    timestamp: daysAgo(17, 7),
    confidenceScore: "high",
    sourceUrl: "https://www.aljazeera.com/news/seed-redsea01",
    sourceName: "Al Jazeera",
  },
  {
    title: "Saudi-led coalition airstrike on Hodeidah port",
    description: "Airstrikes targeted Houthi military equipment stored near the Hodeidah port facilities.",
    eventType: "airstrike",
    country: "Yemen",
    latitude: 14.7980,
    longitude: 42.9451,
    timestamp: daysAgo(25, 2),
    confidenceScore: "medium",
    sourceUrl: "https://www.dw.com/en/seed-hodeidah01",
    sourceName: "DW World",
  },

  // ── Ethiopia (15–30 days = ORANGE) ─────────────────────────────────
  {
    title: "Clashes between federal forces and OLA in Oromia",
    description: "Heavy fighting reported near Gimbi town in West Wollega Zone between Ethiopian federal troops and OLA rebels.",
    eventType: "armed_conflict",
    country: "Ethiopia",
    latitude: 9.1690,
    longitude: 35.4890,
    timestamp: daysAgo(19, 4),
    confidenceScore: "low",
    sourceUrl: "https://www.theguardian.com/world/seed-eth01",
    sourceName: "The Guardian",
  },

  // ── Iraq (last 14 days) ─────────────────────────────────────────────
  {
    title: "Drone strike near US base in eastern Syria border area",
    description: "A drone struck close to a US-affiliated military position near the Iraqi-Syrian border; no US casualties reported.",
    eventType: "drone_strike",
    country: "Iraq",
    latitude: 33.3500,
    longitude: 41.1500,
    timestamp: daysAgo(9, 5),
    confidenceScore: "medium",
    sourceUrl: "https://www.bbc.co.uk/news/world-middle-east-seed-iraq01",
    sourceName: "BBC World",
  },

  // ── Pakistan (last 14 days) ─────────────────────────────────────────
  {
    title: "Bomb blast outside mosque in Peshawar",
    description: "A suicide bombing targeting worshippers near a mosque in Peshawar killed and wounded dozens.",
    eventType: "explosion",
    country: "Pakistan",
    latitude: 34.0151,
    longitude: 71.5249,
    timestamp: daysAgo(6, 7),
    confidenceScore: "high",
    sourceUrl: "https://www.bbc.co.uk/news/world-asia-seed-pesh01",
    sourceName: "BBC World",
  },

  // ── Mali (15–30 days = ORANGE) ──────────────────────────────────────
  {
    title: "Jihadist ambush on army convoy near Gao",
    description: "JNIM militants ambushed a Malian Armed Forces convoy on the road between Gao and Niafunké.",
    eventType: "armed_conflict",
    country: "Mali",
    latitude: 16.2666,
    longitude: -0.0426,
    timestamp: daysAgo(21, 13),
    confidenceScore: "low",
    sourceUrl: "https://www.dw.com/en/seed-mali01",
    sourceName: "DW World",
  },

  // ── Nigeria (last 14 days) ──────────────────────────────────────────
  {
    title: "Boko Haram attack on village in Borno State",
    description: "Armed militants attacked and burned a village near Gwoza in Borno State, displacing hundreds of residents.",
    eventType: "armed_conflict",
    country: "Nigeria",
    latitude: 11.5000,
    longitude: 13.9000,
    timestamp: daysAgo(7, 2),
    confidenceScore: "medium",
    sourceUrl: "https://www.theguardian.com/world/seed-nigeria01",
    sourceName: "The Guardian",
  },

  // ── Democratic Republic of the Congo (last 14 days) ─────────────────
  {
    title: "M23 offensive resumes near Goma",
    description: "M23 rebel forces renewed attacks on the outskirts of Goma in North Kivu province, displacing thousands.",
    eventType: "armed_conflict",
    country: "Democratic Republic of the Congo",
    latitude: -1.6796,
    longitude: 29.2228,
    timestamp: daysAgo(4, 9),
    confidenceScore: "high",
    sourceUrl: "https://www.aljazeera.com/news/seed-drc01",
    sourceName: "Al Jazeera",
  },

  // ── Haiti (last 14 days) ────────────────────────────────────────────
  {
    title: "Gang shootout in Port-au-Prince kills dozens",
    description: "Intense gang fighting in the Cité Soleil slum of Port-au-Prince left many dead and wounded.",
    eventType: "armed_conflict",
    country: "Haiti",
    latitude: 18.5392,
    longitude: -72.3288,
    timestamp: daysAgo(10, 6),
    confidenceScore: "medium",
    sourceUrl: "https://www.bbc.co.uk/news/world-latin-america-seed-hi01",
    sourceName: "BBC World",
  },

  // ── Russia (last 14 days — cross-border drone hits) ─────────────────
  {
    title: "Ukrainian drone hits oil depot in Saratov region",
    description: "A long-range Ukrainian drone struck an oil storage facility in the Saratov region of Russia, causing a large fire.",
    eventType: "drone_strike",
    country: "Russia",
    latitude: 51.5462,
    longitude: 46.0154,
    timestamp: daysAgo(3, 12),
    confidenceScore: "medium",
    sourceUrl: "https://www.theguardian.com/world/seed-russia01",
    sourceName: "The Guardian",
  },
];

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[Seed] Seeding ${SEED_EVENTS.length} historical conflict events…`);
  let created = 0;
  let skipped = 0;

  for (const ev of SEED_EVENTS) {
    // Skip if a source URL already exists in the sources table (idempotent)
    const existing = await db
      .select({ id: schema.sources.id })
      .from(schema.sources)
      .where(eq(schema.sources.articleUrl, ev.sourceUrl))
      .limit(1);

    if (existing.length > 0) {
      skipped++;
      continue;
    }

    const [inserted] = await db
      .insert(schema.events)
      .values({
        title: ev.title,
        description: ev.description,
        eventType: ev.eventType,
        country: ev.country,
        latitude: ev.latitude,
        longitude: ev.longitude,
        timestamp: ev.timestamp,
        confidenceScore: ev.confidenceScore,
        sourceUrl: ev.sourceUrl,
      })
      .returning({ id: schema.events.id });

    await db.insert(schema.sources).values({
      eventId: inserted.id,
      sourceName: ev.sourceName,
      articleUrl: ev.sourceUrl,
      publishedDate: ev.timestamp,
    });

    created++;
  }

  console.log(`[Seed] Done — created: ${created}, skipped (already exist): ${skipped}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[Seed] Fatal error:", err);
  process.exit(1);
});
