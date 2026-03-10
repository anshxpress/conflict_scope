import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const client = postgres(connectionString, {
  max: 5,                     // Supabase free-tier direct limit; raise if using Supavisor pooler
  idle_timeout: 20,           // close idle connections after 20s
  connect_timeout: 15,        // fail fast instead of hanging
  max_lifetime: 60 * 5,       // recycle connections every 5 min
  connection: { application_name: "conflictscope" },
  // SSL is handled via the connection string — Supabase URLs include ?sslmode=require
});
export const db = drizzle(client, { schema });

export { schema };
