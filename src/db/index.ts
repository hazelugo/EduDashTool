import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// prepare: false is REQUIRED for Supabase Transaction pool mode (port 6543)
// max: 1 is REQUIRED for serverless (Vercel) — limits connections per function invocation
// idle_timeout: 20 closes idle connections quickly to avoid pool exhaustion
const client = postgres(process.env.DATABASE_URL!, {
  prepare: false,
  max: 1,
  idle_timeout: 20,
});
export const db = drizzle({ client, schema });
