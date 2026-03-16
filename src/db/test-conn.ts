import { config } from "dotenv";
config({ path: ".env.local" });

console.log("DATABASE_URL starts with:", process.env.DATABASE_URL?.slice(0, 50));

import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL as string, { prepare: false });
sql`SELECT 1 as ok`
  .then((r) => { console.log("Connected:", r); process.exit(0); })
  .catch((e) => { console.error("Failed:", e.message, e.cause); process.exit(1); });
