import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

<<<<<<< HEAD
// Supabase-Vercel integration injects POSTGRES_URL; manual setup uses DATABASE_URL
// Strip query params (?pgbouncer=true, etc.) — postgres-js handles these via options, not URL
const rawConnection = process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? "";
=======
// DATABASE_URL is the canonical connection string (set in .env.local and Vercel env vars)
// Strip query params (?pgbouncer=true, etc.) — postgres-js handles these via options, not URL
const rawConnection = process.env.DATABASE_URL ?? "";

if (!rawConnection) {
  throw new Error(
    "[EduDash] Missing DATABASE_URL. Set this in .env.local (dev) or Vercel environment variables (production)."
  );
}

>>>>>>> 40a24da0522a5497431bc3fe31385f48c0c62d1f
const connectionString = rawConnection.split("?")[0];

// prepare: false is REQUIRED for Supabase Transaction pool mode (port 6543)
// max: 1 is REQUIRED for serverless (Vercel) — limits connections per function invocation
<<<<<<< HEAD
// idle_timeout: 20 closes idle connections quickly to avoid pool exhaustion
const client = postgres(connectionString!, {
  prepare: false,
  max: 1,
  idle_timeout: 20,
=======
// idle_timeout: 5 closes idle connections quickly to avoid pool exhaustion
// connect_timeout: 10 limits TCP handshake time — prevents 30s silent hang on bad/missing URL
// connection.statement_timeout kills any query that runs longer than 8s at the Postgres level,
//   preventing a single slow query from holding the only connection and starving all other requests
const client = postgres(connectionString, {
  prepare: false,
  max: 1,
  idle_timeout: 5,
  connect_timeout: 10,
  connection: {
    statement_timeout: 8000, // 8 seconds — kills runaway queries before Vercel's 10s function timeout
  },
>>>>>>> 40a24da0522a5497431bc3fe31385f48c0c62d1f
});
export const db = drizzle({ client, schema });
