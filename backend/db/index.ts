import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Supabase passwords often contain special characters (@, #, !, etc.) that
// break URL parsing. Parse the URL and re-encode the password to be safe.
function sanitizeDbUrl(url: string): string {
  try {
    const u = new URL(url);
    // password is already decoded by URL API; re-encode it properly
    u.password = encodeURIComponent(decodeURIComponent(u.password));
    return u.toString();
  } catch {
    // If URL() itself fails, the string is truly malformed — rethrow clearly
    throw new Error(
      `DATABASE_URL cannot be parsed. Ensure it is a valid postgresql:// URI. ` +
      `If your password contains special characters, percent-encode them ` +
      `(e.g. @ → %40, # → %23, ! → %21).`
    );
  }
}

const safeConnectionString = sanitizeDbUrl(connectionString);

// Supabase (and most managed PostgreSQL providers) require SSL in production.
// In local dev the docker-compose postgres has no SSL, so we disable it.
const isProd = process.env.NODE_ENV === "production";

const client = postgres(safeConnectionString, {
  max: 10,
  idle_timeout: 20,           // close idle connections after 20s
  connect_timeout: 15,        // fail fast instead of hanging
  max_lifetime: 60 * 5,       // recycle connections every 5 min
  connection: { application_name: "conflictscope" },
  ssl: isProd ? { rejectUnauthorized: false } : false,
});
export const db = drizzle(client, { schema });

export { schema };

