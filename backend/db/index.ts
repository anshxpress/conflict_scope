import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Supabase (and most managed PostgreSQL providers) require SSL in production.
// In local dev the docker-compose postgres has no SSL, so we disable it.
const isProd = process.env.NODE_ENV === "production";

const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,           // close idle connections after 20s
  connect_timeout: 15,        // fail fast instead of hanging
  max_lifetime: 60 * 5,       // recycle connections every 5 min
  connection: { application_name: "conflictscope" },
  ssl: isProd ? { rejectUnauthorized: false } : false,
});
export const db = drizzle(client, { schema });

export { schema };
