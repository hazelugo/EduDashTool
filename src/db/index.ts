import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Supabase-Vercel integration injects POSTGRES_URL; manual setup uses DATABASE_URL
// Strip query params (?pgbouncer=true, etc.) — postgres-js handles these via options, not URL
const rawConnection = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
if (!rawConnection) {
  throw new Error(
    "Database connection string not configured. Set POSTGRES_URL or DATABASE_URL."
  );
}
const connectionString = rawConnection.split("?")[0];

// prepare: false is REQUIRED for Supabase Transaction pool mode (port 6543)
// max: 1 is REQUIRED for serverless (Vercel) — limits connections per function invocation
// idle_timeout: 20 closes idle connections quickly to avoid pool exhaustion
const client = postgres(connectionString, {
  prepare: false,
  max: 1,
  idle_timeout: 20,
});
export const db = drizzle({ client, schema });
