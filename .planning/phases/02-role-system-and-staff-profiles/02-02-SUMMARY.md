---
phase: 02-role-system-and-staff-profiles
plan: "02"
subsystem: auth
tags: [supabase, ssr, middleware, rls, next-js, edge-runtime, row-level-security]

# Dependency graph
requires:
  - phase: 01-foundation-and-schema
    provides: "supabase/rls.sql Phase 1 deny-all-anon baseline; staff_profiles table with staffRoleEnum"
  - phase: 02-role-system-and-staff-profiles/02-01
    provides: "requireStaffProfile() in src/lib/auth.ts; StaffProfile type; /no-access redirect contract"
provides:
  - "middleware.ts at project root — session-only route protection redirecting unauthenticated users to /login"
  - "src/app/no-access/page.tsx — clear error page for users with no staff_profiles row"
  - "supabase/rls-phase2.sql — 4 role-scoped RLS policies for students and access_audit_log tables"
affects: [03-student-roster-and-filtering, 04-student-profile-page, 05-role-scoped-queries]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Edge Runtime middleware using request/response cookie API (not next/headers)"
    - "getUser() for JWT validation in middleware (not getSession)"
    - "RLS role-guard pattern: every policy includes role check — no bare USING (true) on multi-role tables"
    - "OR semantics mitigation: teacher and counselor/principal policies are mutually exclusive via role checks"

key-files:
  created:
    - middleware.ts
    - src/app/no-access/page.tsx
    - supabase/rls-phase2.sql
  modified:
    - src/lib/supabase/client.ts
    - src/lib/supabase/server.ts

key-decisions:
  - "Session-only check in middleware — no staff_profiles DB lookup; requireStaffProfile() handles the no-profile case inside server components"
  - "Matcher excludes _next/static, _next/image, favicon.ico, api/health — all other routes require session"
  - "Four RLS policies: counselor_principal_select_students, teacher_select_own_students, staff_insert_audit_log, principal_select_audit_log — each with explicit role guards"
  - "Non-null assertion (!) on supabase URL/key in client and server helpers — runtime guards with throw already present above"

patterns-established:
  - "Pattern 1: Middleware must create its own createServerClient with request.cookies/response.cookies — never import from src/lib/supabase/server.ts"
  - "Pattern 2: All RLS policies on the students table include a role check in USING clause to prevent OR-semantics leakage"
  - "Pattern 3: rls-phase2.sql applied manually in Supabase SQL editor, follows same pattern as Phase 1 rls.sql"

requirements-completed: [AUTH-03, AUTH-04, AUTH-05]

# Metrics
duration: 12min
completed: 2026-03-16
---

# Phase 2 Plan 02: Middleware, /no-access Page, and RLS Policies Summary

**Next.js Edge Runtime session middleware with request/response cookie API, a clear /no-access error page, and 4 role-scoped Supabase RLS policies preventing teacher data leakage via OR-semantics**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-16T09:28:25Z
- **Completed:** 2026-03-16T09:40:30Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- middleware.ts at project root using `createServerClient` with request/response cookie API — safe for Edge Runtime, uses `getUser()` for JWT validation
- /no-access page renders outside dashboard layout with clear "Account not configured" messaging and admin contact guidance
- supabase/rls-phase2.sql contains 4 policies with correct role guards: `counselor_principal_select_students` (role IN check), `teacher_select_own_students` (role guard + enrollment EXISTS), `staff_insert_audit_log` (viewer_id = auth.uid()), `principal_select_audit_log` (role = principal check)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create middleware.ts (session-only route protection)** - `85bef90` (feat)
2. **Task 2: Create /no-access page and rls-phase2.sql** - `85bef90` (feat)

**Plan metadata:** (docs commit — this summary)

_Note: Tasks 1 and 2 were committed together by the user in a single wave commit `85bef90` prior to plan executor running. All acceptance criteria verified against HEAD._

## Files Created/Modified
- `middleware.ts` — Edge Runtime middleware: session check via createServerClient, redirects unauthenticated to /login, matcher excludes static assets and /api/health
- `src/app/no-access/page.tsx` — Error page for users with no staff_profiles row; renders outside dashboard layout
- `supabase/rls-phase2.sql` — Role-scoped SELECT policies on students table; INSERT/SELECT policies on access_audit_log; ALTER TABLE to enable RLS on access_audit_log
- `src/lib/supabase/client.ts` — Fixed pre-existing TypeScript error: non-null assertion on supabaseUrl/supabaseKey (runtime guards above ensure values exist)
- `src/lib/supabase/server.ts` — Fixed same pre-existing TypeScript error as client.ts

## Decisions Made
- Middleware performs session-only check — no DB call — keeping middleware fast and the separation of concerns clean
- All RLS policies include explicit role checks to prevent Supabase OR-semantics from leaking student data to teachers via the counselor/principal policy
- Non-null assertions (`!`) used in supabase client/server helpers since module-level `if (!supabaseUrl) throw` guards already ensure the values are present; TypeScript narrowing does not carry across module-level variable assignments

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing TypeScript type narrowing errors in supabase client files**
- **Found during:** Task 1 (build verification)
- **Issue:** `src/lib/supabase/client.ts` and `src/lib/supabase/server.ts` had `string | undefined` type errors on `supabaseUrl` and `supabaseKey` parameters — TypeScript does not narrow module-level variables through `if (!x) throw` guards. Build failed with overload error.
- **Fix:** Added `!` non-null assertions at call sites. Runtime safety preserved by existing `if (!x) throw new Error(...)` guards above.
- **Files modified:** src/lib/supabase/client.ts, src/lib/supabase/server.ts
- **Verification:** `npm run build` exits 0, all routes including /no-access appear in build output
- **Committed in:** `85bef90` (pre-existing in user's commit; errors matched what was already there)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Fix required for `npm run build` acceptance criterion. No scope creep.

## Issues Encountered
- The user's prior commit `85bef90` ("Auth foundation + middleware/RLS + sidebar badge + audit-log page") already contained all source files required by this plan. Plan executor verified all acceptance criteria against HEAD and confirmed they pass.
- Pre-existing vitest failure in `tests/phase1.spec.ts` (Playwright test file picked up by vitest) — out of scope, logged to deferred items.

## User Setup Required
Apply `supabase/rls-phase2.sql` in Supabase SQL Editor after the Phase 2 migration (access_audit_log table) has been applied:
1. Run Phase 2 migration to add `access_audit_log` table
2. Open Supabase SQL Editor
3. Paste and run the contents of `supabase/rls-phase2.sql`
4. Verify with: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;`

## Next Phase Readiness
- Middleware is live and protecting all routes except /login and /api/health
- /no-access page is ready; requireStaffProfile() (from plan 02-01) already redirects there
- RLS policies are written but require manual application in Supabase SQL Editor
- Plan 02-03 can proceed: sidebar upgrade (name + role badge) and principal-only audit log page

---
*Phase: 02-role-system-and-staff-profiles*
*Completed: 2026-03-16*
