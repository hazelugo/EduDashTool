import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// DATABASE_URL is the canonical connection string (set in .env.local and Vercel env vars)
// Strip query params (?pgbouncer=true, etc.) — postgres-js handles these via options, not URL
const rawConnection = process.env.DATABASE_URL ?? "";

if (!rawConnection) {
  throw new Error(
    "[EduDash] Missing DATABASE_URL. Set this in .env.local (dev) or Vercel environment variables (production)."
  );
}

const connectionString = rawConnection.split("?")[0];

// prepare: false is REQUIRED for Supabase Transaction pool mode (port 6543)
// max: 1 is REQUIRED for serverless (Vercel) — limits connections per function invocation
// idle_timeout: 5 closes idle connections quickly to avoid pool exhaustion
// connect_timeout: 10 limits TCP handshake time — prevents 30s silent hang on bad/missing URL
const client = postgres(connectionString, {
  prepare: false,
  max: 1,
  idle_timeout: 5,
  connect_timeout: 10,
});
export const db = drizzle({ client, schema });
