---
phase: 02-role-system-and-staff-profiles
plan: 01
subsystem: auth
tags: [supabase, drizzle, nextjs, vitest, typescript, ferpa, rls]

requires:
  - phase: 01-foundation-and-schema
    provides: staffProfiles table, students table, Drizzle db client, Supabase server client

provides:
  - requireStaffProfile() auth helper exported from src/lib/auth.ts
  - StaffProfile type with userId, email, fullName, role fields
  - accessAuditLog Drizzle table definition in src/db/schema.ts (Table 11)
  - logAuditEntry(viewerId, studentId) utility in src/lib/audit.ts
  - vitest test scaffolds for AUTH-02/03/04/05/06 (6 tests, all passing)

affects:
  - 02-02 (role-scoped middleware and RLS policies — depends on requireStaffProfile)
  - 02-03 (audit log viewer page — depends on accessAuditLog table and logAuditEntry)
  - All Phase 3–7 server components and server actions (use requireStaffProfile as auth entry point)

tech-stack:
  added: [vitest@4.1.0, @vitejs/plugin-react]
  patterns:
    - requireStaffProfile() uses redirect() not NextResponse — Server Component/Action pattern only
    - requireUser() retained for API route handlers that need NextResponse
    - accessAuditLog uses array-form index pattern (t) => [...] consistent with all schema tables
    - vitest.config.ts uses loadEnv to load .env.local — enables env vars in test environment

key-files:
  created:
    - src/__tests__/staff-profiles.test.ts
    - src/__tests__/role-scoping.test.ts
    - src/__tests__/audit-log.test.ts
    - src/lib/audit.ts
    - vitest.config.ts
  modified:
    - src/db/schema.ts (added accessAuditLog table — Table 11)
    - src/lib/auth.ts (added StaffProfile type and requireStaffProfile())

key-decisions:
  - "requireStaffProfile() uses redirect() from next/navigation — ONLY for Server Components and Server Actions; requireUser() preserved for API route handlers"
  - "vitest installed as devDependency with loadEnv for .env.local support — no watch mode, include pattern scoped to src/__tests__"
  - "accessAuditLog viewer_id references staffProfiles.id; student_id references students.id with onDelete cascade"

patterns-established:
  - "Pattern: Auth split — requireStaffProfile() for SC/SA (redirect), requireUser() for API routes (NextResponse)"
  - "Pattern: Test scaffolds created before implementation (Wave 0 TDD) with dynamic import() to defer module load errors"
  - "Pattern: vitest env loading via loadEnv(mode, process.cwd(), '') to pick up .env.local without process.env injection"

requirements-completed: [AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06]

duration: 25min
completed: 2026-03-16
---

# Phase 2 Plan 01: Auth Foundation Summary

**requireStaffProfile() + StaffProfile type + accessAuditLog schema + logAuditEntry() utility with 6 passing vitest tests**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-03-16T04:28:00Z
- **Completed:** 2026-03-16T04:53:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Implemented `requireStaffProfile()` — the single auth entry point for all Phase 2–7 Server Components and Server Actions
- Added `accessAuditLog` table (Table 11) to `src/db/schema.ts` with three indexes and FK references to `staff_profiles` and `students`
- Created `logAuditEntry(viewerId, studentId)` FERPA audit utility in `src/lib/audit.ts`
- Created Wave 0 vitest test scaffolds for all 6 AUTH requirements; all pass GREEN after implementation

## Task Commits

1. **Task 1: Wave 0 — Create vitest test scaffolds** - `4d631ad` (test)
2. **Task 2: Add accessAuditLog to schema + implement requireStaffProfile() and logAuditEntry()** - `77b4059` (feat)

## Files Created/Modified

- `src/db/schema.ts` — Added `accessAuditLog` table (Table 11) with id, viewer_id, student_id, viewed_at, three indexes
- `src/lib/auth.ts` — Added `StaffProfile` type and `requireStaffProfile()` function; preserved `requireUser()`
- `src/lib/audit.ts` — New file: `logAuditEntry(viewerId, studentId)` Drizzle insert to access_audit_log
- `src/__tests__/staff-profiles.test.ts` — AUTH-02 stubs: requireStaffProfile export exists
- `src/__tests__/role-scoping.test.ts` — AUTH-03/04/05 stubs: role value contract, requireStaffProfile exported
- `src/__tests__/audit-log.test.ts` — AUTH-06 stubs: logAuditEntry is a function with arity 2
- `vitest.config.ts` — New config with @-alias, include pattern, loadEnv for .env.local

## Decisions Made

- `requireStaffProfile()` uses `redirect()` from `next/navigation` (throws internally) — appropriate for Server Components and Server Actions; cannot be used in API route handlers (use `requireUser()` instead)
- vitest installed (`npm install --save-dev vitest`) and configured with `loadEnv` to pick up `.env.local` env vars, since `src/lib/supabase/server.ts` throws at module-level if `NEXT_PUBLIC_SUPABASE_URL` is missing
- `accessAuditLog.viewer_id` references `staffProfiles.id` (no cascade) — a staff member deletion does not delete audit history; `student_id` uses `onDelete: "cascade"` per plan

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed vitest — not in package.json**
- **Found during:** Task 1 (Wave 0 test scaffold creation)
- **Issue:** `npx vitest run` failed because vitest was not installed as a dependency
- **Fix:** Ran `npm install --save-dev vitest @vitejs/plugin-react`
- **Files modified:** package.json, package-lock.json
- **Verification:** `npx vitest run --reporter=verbose` outputs test results
- **Committed in:** `4d631ad` (Task 1 commit)

**2. [Rule 3 - Blocking] Added vitest.config.ts with loadEnv to fix NEXT_PUBLIC_SUPABASE_URL module-level throw**
- **Found during:** Task 2 (running vitest after implementation)
- **Issue:** `src/lib/supabase/server.ts` throws at module import time if `NEXT_PUBLIC_SUPABASE_URL` is not set; vitest does not load `.env.local` by default
- **Fix:** Created `vitest.config.ts` using `loadEnv` from vite to inject `.env.local` vars into the test environment via `test.env`
- **Files modified:** vitest.config.ts
- **Verification:** All 6 tests pass after env fix
- **Committed in:** `77b4059` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes required for vitest to run at all in this project. No scope creep.

## Issues Encountered

- Playwright `tests/phase1.spec.ts` was initially picked up by vitest (since vitest defaults to all `**/*.test.ts` and `**/*.spec.ts`). Fixed by adding `include: ["src/__tests__/**/*.test.ts"]` and `exclude: ["tests/**"]` to vitest config.

## User Setup Required

None — no external service configuration required for this plan. The `access_audit_log` table definition is added to the Drizzle schema; a migration SQL must be generated (`npm run db:generate`) and applied manually in the Supabase SQL editor when deploying Phase 2. This is handled by plan 02-02 or 02-03.

## Next Phase Readiness

- `requireStaffProfile()` is the gatekeeper for all Phase 2+ server components — ready for immediate use
- `logAuditEntry()` is ready to be called from student profile page views (Phase 3/4)
- `accessAuditLog` table schema is defined; needs migration applied before production use
- All 6 vitest tests pass; test framework is operational for future plans

---
*Phase: 02-role-system-and-staff-profiles*
*Completed: 2026-03-16*
