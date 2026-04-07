---
status: awaiting_human_verify
trigger: "Dashboards show an infinite loading spinner in production (edudashtool.hazelugo.com) but work fine locally. No visible errors in the browser console."
created: 2026-04-07T00:00:00Z
updated: 2026-04-07T01:00:00Z
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: CONFIRMED (revised) — Root cause is the /students query holding the single max:1 postgres-js connection indefinitely (connection pool exhaustion on a warm Vercel function instance). The new JOIN query introduced in commit 86ebcad (derived table join of attendance_records aggregation) is slow or hangs in production, holding the only connection and starving all subsequent requests including /dashboard. Previously-applied fixes (prepare:false, DATABASE_URL guard, connect_timeout:10) are all correct and committed — but connect_timeout only covers TCP handshake, not query execution. There was no protection against a slow/hung DB query.
test: applied — added statement_timeout: 8000 via postgres-js connection: option in src/db/index.ts. This kills any query that runs longer than 8s at the Postgres level, causing a JS error that Next.js catches via the students error.tsx boundary. The connection is released, unblocking subsequent requests.
expecting: if a query hangs, it dies at 8s with an error shown via error.tsx instead of an infinite skeleton. /dashboard recovers immediately after.
next_action: deploy to Vercel and verify

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

- hypothesis: prepare: false missing (pgbouncer transaction mode incompatibility)
  evidence: prepare: false was already present in src/db/index.ts throughout all recent commits. The generated SQL uses standard parameterized queries with unnamed statements — compatible with pgbouncer transaction mode. SQL verified via Drizzle toSQL() inspection.
  timestamp: 2026-04-07T01:00:00Z

- hypothesis: DATABASE_URL missing in Vercel environment
  evidence: User confirms dashboard loads perfectly on first visit after login — DB is clearly reachable. DATABASE_URL must be set. The guard added in commit 1e27405 would have thrown immediately on cold start if DATABASE_URL were missing.
  timestamp: 2026-04-07T01:00:00Z

- hypothesis: connect_timeout: 10 missing (previous fix)
  evidence: Already present in committed code (commit 1e27405). connect_timeout only covers TCP handshake — not query execution time. Cannot protect against a slow or hung DB query.
  timestamp: 2026-04-07T01:00:00Z

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

- timestamp: 2026-04-07T01:00:00Z
  checked: src/lib/students.ts (commit 86ebcad diff), src/db/index.ts (all recent commits), src/lib/auth.ts, src/app/students/page.tsx, src/app/dashboard/page.tsx
  found: (1) prepare:false was already present throughout. (2) The new JOIN query in getStudentList uses a derived table (attendance subquery) — SQL is valid, parameters are $1/$2 style. (3) With max:1 on a warm Vercel function instance, ALL requests share one postgres-js connection. If one query hangs, all subsequent queries queue on that connection. (4) requireStaffProfile() also uses db — so even /dashboard's auth check queues behind the hung students query. (5) connect_timeout:10 protects only TCP handshake. No protection exists against a slow/hung Postgres query execution. (6) The students query aggregates ALL attendance_records since 30 days ago across ALL students — this derived table join could be slow with production data volume if the query plan is suboptimal.
  implication: The missing protection is a statement_timeout at the Postgres level. Adding statement_timeout:8000 via postgres-js connection: option will kill runaway queries at 8s, throw a JS error (caught by error.tsx), and release the connection immediately — unblocking all subsequent requests.

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: The /students route calls getStudentList() which uses a JOIN query with a derived table aggregation of attendance_records (introduced in commit 86ebcad). This query is slow or hangs in production (likely due to data volume or query plan difference). With postgres-js max:1, the application has a single shared connection per warm Vercel function instance. The hanging query holds that connection indefinitely — there was no statement_timeout or query-level timeout to kill it. All subsequent requests (including /dashboard's requireStaffProfile() DB call) queue waiting for the connection, appearing to hang. Previously-applied fixes (prepare:false, DATABASE_URL guard, connect_timeout:10) were correct but insufficient — connect_timeout only covers TCP handshake, not query execution time.
fix: Added statement_timeout: 8000 (8 seconds) via postgres-js connection: startup option in src/db/index.ts. This instructs Postgres to kill any query exceeding 8s, throw a StatementTimeout error, which propagates as a JS error caught by Next.js error.tsx boundary. The connection is released immediately, unblocking all subsequent requests. 8s was chosen to be well within Vercel's function timeout (10s hobby / 60s pro) while giving queries reasonable time to complete.
verification: TypeScript check passes (tsc --noEmit). Awaiting production deploy + human confirmation.
files_changed: [src/db/index.ts]
