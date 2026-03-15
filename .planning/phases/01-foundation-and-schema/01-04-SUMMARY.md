---
phase: 01-foundation-and-schema
plan: 04
subsystem: database
tags: [drizzle-orm, postgres, schema, pgEnum, uuid, rls]

# Dependency graph
requires:
  - phase: 01-foundation-and-schema
    provides: Drizzle ORM wired in src/db/index.ts with postgres driver and schema import
provides:
  - All 10 Drizzle pgTable definitions exported from src/db/schema.ts
  - 6 pgEnums: staff_role, attendance_status, grade_type, test_type, semester, insight_type
  - Enrollment uniqueness enforced via uniqueIndex(studentId, classId)
  - 1:1 student constraints on graduation_plans and college_prep_plans via uniqueIndex
  - Ready for drizzle-kit generate (Plan 05)
affects: [02-data-layer, 03-api-routes, 04-student-profile, 05-ai-insights, 06-analytics]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "pgTable with array-form indexes: (t) => [index(...), uniqueIndex(...)]"
    - "staff_profiles.id: uuid PK with NO defaultRandom() — must match auth.users.id"
    - "All timestamps with withTimezone: true for Supabase UTC compatibility"
    - "Foreign keys with onDelete: cascade for child tables"
    - "jsonb for flexible structured data (planData, targetSchools, content)"

key-files:
  created: []
  modified:
    - src/db/schema.ts

key-decisions:
  - "staff_profiles.id has NO defaultRandom() — id must be explicitly set to match Supabase auth.users.id; using defaultRandom() would break RLS auth.uid() matching"
  - "college_prep_plans uses a notes/essayStatus text fields rather than a child milestones table — milestones deferred per plan spec counting 10 tables"
  - "ai_insights.studentId is nullable — allows trend insights not tied to a specific student"
  - "graduation_plans and college_prep_plans enforce 1:1 with student via uniqueIndex, not unique() column constraint, per Drizzle 0.45.1 array index form"

patterns-established:
  - "Pattern 1: Array index form — all pgTable definitions use (t) => [index(...), uniqueIndex(...)] as third argument; never object form"
  - "Pattern 2: UUID PKs — all tables except staff_profiles use uuid().primaryKey().defaultRandom()"
  - "Pattern 3: Cascade deletes — all child tables (enrollments, attendance, grades, tests, plans, insights) cascade on student delete"

requirements-completed: [FOUND-04]

# Metrics
duration: 8min
completed: 2026-03-15
---

# Phase 1 Plan 04: Database Schema Summary

**Drizzle 0.45.1 schema with 10 pgTable definitions, 6 pgEnums, and critical uniqueIndexes for the full EduDash data model**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-15T21:54:34Z
- **Completed:** 2026-03-15T22:02:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Wrote all 10 table definitions in a single `src/db/schema.ts` file (291 lines)
- Exported 6 pgEnums covering all domain-specific categorical values
- Enforced critical schema constraints: no `defaultRandom()` on `staff_profiles.id`, uniqueIndex on enrollments and 1:1 plan tables
- TypeScript compiles with zero schema-related errors; schema is ready for `drizzle-kit generate`

## Task Commits

Each task was committed atomically:

1. **Task 1: Write all 10 tables in src/db/schema.ts** - `e0f417f` (feat)

**Plan metadata:** _(pending final commit)_

## Files Created/Modified

- `src/db/schema.ts` - All 10 pgTable definitions with 6 enums and critical indexes (291 lines)

## Decisions Made

- `staff_profiles.id` intentionally has no `.defaultRandom()`. This is the most critical constraint in the schema — the id must be set to the Supabase auth.users.id so that RLS `auth.uid()` matches the application-layer record.
- `ai_insights.studentId` is nullable to accommodate trend insights not tied to a single student.
- College prep milestones deferred — plan spec counts 10 tables using `college_prep_plans` as the 9th and `ai_insights` as the 10th; milestones can be added as a separate plan in a later phase.
- Used `uniqueIndex` (not `.unique()` on column) for graduation_plans and college_prep_plans student 1:1 constraint — consistent with Drizzle 0.45.1 array index form used everywhere else.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors exist in `src/lib/supabase/client.ts` and `src/lib/supabase/server.ts` (placeholder env var patterns causing type mismatches). These are out-of-scope for this plan — they were introduced before Plan 04 and are fixed by Plan 02 (env validation). No errors exist in `schema.ts` itself.

## User Setup Required

None — no external service configuration required for the schema definition itself.

## Next Phase Readiness

- `src/db/schema.ts` is complete and ready for Plan 05 (`drizzle-kit generate` + migration)
- All 10 tables defined with correct column types, foreign keys, and indexes
- `src/db/index.ts` already imports `* as schema` from `./schema` — no changes needed there
- RLS enabling (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) is Plan 05 work

## Self-Check: PASSED

- FOUND: `src/db/schema.ts` (291 lines, 10 pgTable definitions)
- FOUND: `.planning/phases/01-foundation-and-schema/01-04-SUMMARY.md`
- FOUND: commit `e0f417f`

---
*Phase: 01-foundation-and-schema*
*Completed: 2026-03-15*
