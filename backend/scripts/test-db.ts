import { db, schema } from "../db";

async function test() {
  try {
    const budgets = await db.select().from(schema.sourceBudget);
    console.log("SUCCESS! source_budget exists:", budgets);
  } catch (err) {
    console.error("FAILED! source_budget does not exist yet:", err);
  }
  process.exit(0);
}

test();
