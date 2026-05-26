import { updateCountryMetrics } from "../src/services/workers/pipeline";
import { db, schema } from "../db";

async function main() {
  console.log("Recalculating all country metrics in the database to populate timeline URLs and sources...");
  
  // Truncate/delete current cached metrics to ensure fresh regeneration
  await db.delete(schema.countryMetrics);
  console.log("Cleared country_metrics cache.");

  // Recalculate
  await updateCountryMetrics();
  console.log("Recalculation complete! All cached profiles have been rebuilt.");
  process.exit(0);
}

main().catch(err => {
  console.error("Failed to recalculate metrics:", err);
  process.exit(1);
});
