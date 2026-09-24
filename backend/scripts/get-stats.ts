import { db, schema } from "../db";
import { count, sum } from "drizzle-orm";

async function run() {
  try {
    const [{ totalDuplicates }] = await db.select({ totalDuplicates: sum(schema.articles.duplicateCount) }).from(schema.articles);
    const [{ storedCount }] = await db.select({ storedCount: count() }).from(schema.articles);
    const [{ eventCount }] = await db.select({ eventCount: count() }).from(schema.events);

    // Sum of duplicateCount represents the total number of articles before deduplication
    // (since a duplicateCount of 1 means it was processed once, 2 means it was processed twice, etc.)
    const rawIngested = parseInt(totalDuplicates as unknown as string, 10);
    const finalStored = storedCount;
    
    const duplicatePercent = rawIngested > 0 ? ((rawIngested - finalStored) / rawIngested) * 100 : 0;
    
    console.log(`Calculated Raw Ingested (Sum of duplicateCount): ${rawIngested}`);
    console.log(`Final Stored (Unique): ${finalStored}`);
    console.log(`Deduplication Reduced By: ${duplicatePercent.toFixed(0)}%`);
    console.log(`Geolocated Events: ${eventCount}`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
