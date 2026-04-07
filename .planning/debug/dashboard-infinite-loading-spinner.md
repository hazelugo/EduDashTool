---
status: awaiting_human_verify
trigger: "Dashboards show an infinite loading spinner in production (edudashtool.hazelugo.com) but work fine locally. No visible errors in the browser console."
created: 2026-04-07T00:00:00Z
updated: 2026-04-07T00:01:00Z
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: CONFIRMED — Two compounding issues in src/db/index.ts:
  (1) No guard on empty DATABASE_URL: when env var is missing in Vercel, postgres("") silently targets localhost:5432, connection hangs until Vercel function timeout.
  (2) connect_timeout was removed (commit ce8633e), so postgres-js uses its 30s default — far exceeding Vercel's 10s function limit. The RSC streaming response has already sent headers/loading skeleton; when Vercel kills the hung function, the browser stream closes with no content, leaving the loading.tsx skeleton rendered forever with no error boundary triggered.
test: applied — guard + connect_timeout added to src/db/index.ts
expecting: if DATABASE_URL is not set in Vercel, error throws immediately (surfacing the real config issue); if set, connect_timeout:10 ensures fast failure instead of 30s hang
next_action: verify fix and request human verification

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: Dashboards load and display student/class data
actual: Infinite loading spinner — page never resolves
errors: No visible browser console or server errors
reproduction: Visit any dashboard route in production
started: Only in production; works fine locally

## Eliminated
<!-- APPEND only - prevents re-investigating -->

- hypothesis: Client-side JS loading state that never resolves (useEffect/useState pattern)
  evidence: All dashboard and student pages are async Server Components — no client-side loading state. Loading is driven entirely by Next.js Suspense streaming (loading.tsx files). No API routes involved for the main data.
  timestamp: 2026-04-07T00:01:00Z

- hypothesis: Supabase auth hanging (NEXT_PUBLIC_SUPABASE_URL or KEY missing)
  evidence: These are NEXT_PUBLIC_* vars baked in at build time. server.ts throws an explicit synchronous error if missing — this would cause an error boundary (error.tsx), not an infinite skeleton. User reports no error page.
  timestamp: 2026-04-07T00:01:00Z

- hypothesis: idle_timeout: 5 causing connection drops between sequential queries
  evidence: idle_timeout starts only when a connection has no pending queries. Within a single serverless invocation all queries queue against the single connection (max:1). No idle gap long enough to close the connection mid-request.
  timestamp: 2026-04-07T00:01:00Z

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-04-07T00:01:00Z
  checked: src/app/dashboard/page.tsx, src/app/students/page.tsx
  found: Both are pure async Server Components. Data fetched directly via DB helper functions (no API routes, no client fetch). loading.tsx Suspense boundaries show skeleton while server component resolves.
  implication: The infinite spinner IS the loading.tsx skeleton — it means the server component RSC stream never completes (hangs or abruptly closes).

- timestamp: 2026-04-07T00:01:00Z
  checked: src/db/index.ts (current HEAD after all recent commits)
  found: const rawConnection = process.env.DATABASE_URL ?? ""; — no guard on empty string. If DATABASE_URL is not set in Vercel, rawConnection="" and connectionString="". postgres("") falls back to localhost:5432 with OS username. connect_timeout is not set, so postgres-js default of 30s applies.
  implication: Missing DATABASE_URL in Vercel env → silent 30s hang → Vercel kills function → stream closes mid-flight → browser stuck on skeleton forever. No error thrown because postgres-js doesn't throw on construction, only on first query execution — but even then with no connect_timeout guard the wait exceeds Vercel limits.

- timestamp: 2026-04-07T00:01:00Z
  checked: commit history (4fa39f2, ce8633e)
  found: 4fa39f2 dropped POSTGRES_URL fallback (which Supabase-Vercel native integration injects automatically). ce8633e removed connect_timeout claiming pgbouncer incompatibility — but connect_timeout governs TCP handshake time only, not transaction semantics. postgres-js source confirms connect_timeout is handled purely at socket connection level (connection.js:261 connectTimedOut, connection.js:343 connectTimer.start()).
  implication: (1) If Vercel was using POSTGRES_URL from the native integration, that env var is now ignored. (2) Removing connect_timeout makes any connection failure silent and slow (30s default).

- timestamp: 2026-04-07T00:01:00Z
  checked: .env.local (local dev)
  found: DATABASE_URL=postgresql://...pooler.supabase.com:6543/postgres — uses port 6543 (pgbouncer transaction pool). Local works because the env var IS set.
  implication: Production fails because DATABASE_URL may NOT be set in Vercel env vars (if setup used the native Supabase-Vercel integration that provides POSTGRES_URL, not DATABASE_URL).

- timestamp: 2026-04-07T00:01:00Z
  checked: src/app/api/health/route.ts
  found: Health endpoint checks DATABASE_URL presence and runs SELECT 1 against the DB. env.DATABASE_URL boolean is included in response.
  implication: Hitting /api/health in production will reveal whether DATABASE_URL is set and whether DB is reachable. This is the fastest way to confirm the hypothesis without code changes.

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: Two issues in src/db/index.ts: (1) No validation of DATABASE_URL — empty string silently connects to localhost:5432 in production (Vercel) where no Postgres server exists. (2) connect_timeout was removed, leaving postgres-js default of 30s which exceeds Vercel's function timeout. RSC streaming sends the loading.tsx skeleton before the DB query completes; when Vercel kills the timed-out function, the stream closes without resolving the Suspense boundary, leaving the skeleton visible forever with no error surfaced.
fix: Add explicit guard that throws if DATABASE_URL is missing/empty. Re-add connect_timeout:10 (this is TCP connect timeout only — not incompatible with pgbouncer). User must also verify DATABASE_URL is set in Vercel env vars.
verification: TypeScript check passes (tsc --noEmit). Awaiting production deploy + human confirmation.
files_changed: [src/db/index.ts]
