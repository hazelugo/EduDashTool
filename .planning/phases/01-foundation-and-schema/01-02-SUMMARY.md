---
phase: 01-foundation-and-schema
plan: 02
subsystem: auth
tags: [supabase, nextjs, middleware, environment-validation]

# Dependency graph
requires:
  - phase: 01-foundation-and-schema/01-01
    provides: Initial project scaffold, Supabase integration, login page, middleware (proxy.ts)

provides:
  - stub /dashboard page as post-login redirect destination
  - proxy.ts with correct /dashboard redirect and 503 env guard for Edge Runtime
  - Supabase client.ts with named throw on missing env vars (browser-safe)
  - Supabase server.ts with named throw on missing env vars (server-safe)
  - package.json build script that does NOT run drizzle-kit migrate

affects:
  - All future phases using Supabase clients
  - Phase 2 (role-based auth) — depends on /dashboard route existing
  - Any CI/CD pipeline using npm run build

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Edge Runtime env guard pattern: guard at function body top, return 503, never throw at module level"
    - "Browser/Server env validation: throw named [EduDash] errors at module load for fast startup feedback"
    - "Separate db:migrate script — never couple database migrations to the build script"

key-files:
  created:
    - src/app/dashboard/page.tsx
  modified:
    - src/proxy.ts
    - src/app/login/page.tsx
    - src/lib/supabase/client.ts
    - src/lib/supabase/server.ts
    - package.json

key-decisions:
  - "Edge Runtime cannot throw at module level — proxy.ts uses inline 503 guard instead of module-level throw"
  - "Named [EduDash] prefix in error messages ensures startup failures are immediately identifiable in logs"
  - "db:migrate retained as standalone script; decoupled from build to prevent accidental prod DB changes on every deploy"

patterns-established:
  - "Edge Runtime env guard: check vars at top of function body, return NextResponse.json 503 before any Supabase usage"
  - "Module-level env throw pattern for browser/server clients: throw with [AppName] prefix and actionable message"
  - "Build script = next build only; migrations are explicit developer actions via npm run db:migrate"

requirements-completed: [FOUND-01, FOUND-02, FOUND-03, AUTH-01]

# Metrics
duration: 2min
completed: 2026-03-15
---

# Phase 1 Plan 02: Fix Live Blockers and Dashboard Stub Summary

**Three critical dev blockers resolved: post-login redirects to /dashboard, Supabase clients throw named errors on missing env vars, and npm run build no longer runs database migrations**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-15T15:03:39Z
- **Completed:** 2026-03-15T15:05:xx Z
- **Tasks:** 2
- **Files modified:** 6 (5 modified, 1 created)

## Accomplishments
- Created `/dashboard` stub page — provides AUTH-01 redirect destination for post-login flow
- Fixed middleware (proxy.ts) to redirect authenticated users to `/dashboard` instead of `/songs`, with 503 env guard protecting against silent misconfiguration
- Fixed Supabase browser and server clients to throw named `[EduDash]` errors on missing env vars instead of silently using placeholder/empty-string fallbacks
- Removed `drizzle-kit migrate` from npm run build — deployments no longer automatically mutate the database

## Task Commits

Each task was committed atomically:

1. **Task 1: Create dashboard stub and fix redirect targets** - `374c06b` (feat)
2. **Task 2: Fix env validation in Supabase clients and build script** - `b402b4b` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `src/app/dashboard/page.tsx` - Stub dashboard page, satisfies AUTH-01 redirect destination
- `src/proxy.ts` - Redirects to /dashboard (was /songs); adds 503 JSON response on missing Supabase env vars
- `src/app/login/page.tsx` - router.push("/dashboard") after successful sign-in (was already updated by formatter)
- `src/lib/supabase/client.ts` - Throws named [EduDash] error if NEXT_PUBLIC_SUPABASE_URL or ANON_KEY missing
- `src/lib/supabase/server.ts` - Same throw pattern; cookie handling logic preserved intact
- `package.json` - build script is now `"next build"` only; db:migrate remains as standalone script

## Decisions Made
- Edge Runtime (proxy.ts) cannot throw at module level — used inline guard returning 503 JSON response instead. Browser/server clients run in non-Edge context so module-level throw is safe there.
- Named `[EduDash]` prefix in error messages pinpoints the source immediately when multiple packages throw on startup.
- `db:migrate` kept as an explicit `npm run db:migrate` command; removed from `build` to avoid silent migration side effects on every `npm run build` or CI deploy.

## Deviations from Plan

None - plan executed exactly as written.

Note: `src/app/login/page.tsx` was already correct when re-read (a formatter had already changed `router.push("/songs")` to `router.push("/dashboard")` and updated the UI from "Song Tool" to "EduDash"). No additional change was needed; existing correct state verified.

## Issues Encountered
None - all changes were straightforward string replacements and new file creation.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- /dashboard route exists and renders without 404
- Authenticated users will land on /dashboard after login (proxy.ts + login page both point there)
- Missing env vars produce readable named errors within 1 second of dev server start
- npm run build is safe to run without a database connection
- Ready for Phase 1 Plan 03 (schema / database work)

---
*Phase: 01-foundation-and-schema*
*Completed: 2026-03-15*
