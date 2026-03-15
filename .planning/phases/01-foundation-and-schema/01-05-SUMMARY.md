---
phase: 01-foundation-and-schema
plan: "05"
subsystem: database
tags: [drizzle, postgres, supabase, rls, migration, seed]

# Dependency graph
requires:
  - phase: 01-foundation-and-schema plan 04
    provides: "src/db/schema.ts with all 10 table definitions"
provides:
  - "Drizzle migration SQL in drizzle/0000_overconfident_mantis.sql (10 tables, 6 enums)"
  - "supabase/rls.sql with ENABLE ROW LEVEL SECURITY for all 10 tables"
  - "src/db/seed.ts with sample data across all 10 tables"
  - "db:seed npm script (tsx src/db/seed.ts)"
affects:
  - Phase 2 (auth + role policies build on RLS foundation)
  - All phases (tables must exist before any feature can be built)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Drizzle migration workflow: db:generate → db:migrate (manual DB access required)"
    - "RLS baseline: deny_all_anon blocks unauthenticated access; Phase 2 adds authenticated policies"
    - "Seed script is idempotent via onConflictDoNothing() — safe to re-run"
    - "staff_profiles.id must match auth.users.id — no defaultRandom(), set explicitly from Supabase Auth"

key-files:
  created:
    - drizzle/0000_overconfident_mantis.sql
    - drizzle/meta/_journal.json
    - drizzle/meta/0000_snapshot.json
    - supabase/rls.sql
    - src/db/seed.ts
  modified:
    - package.json (added db:seed script)

key-decisions:
  - "Migration applied via Supabase SQL editor (direct DB host is IPv6-only, unreachable from dev machine) — use drizzle migration SQL manually"
  - "deny_all_anon RLS policy blocks all anon access as Phase 1 baseline — Phase 2 adds role-scoped authenticated policies"
  - "Seed uses onConflictDoNothing() for idempotent re-runs — safe to run multiple times"

patterns-established:
  - "RLS pattern: ALTER TABLE t ENABLE ROW LEVEL SECURITY + CREATE POLICY deny_all_anon FOR ALL TO anon USING (false)"
  - "Seed FK order: staff_profiles → students → classes → enrollments → attendance_records → grades → standardized_tests → graduation_plans → college_prep_plans → ai_insights"

requirements-completed:
  - FOUND-04

# Metrics
duration: 8min
completed: 2026-03-15
---

# Phase 1 Plan 05: Migration, RLS, and Seed Summary

**Drizzle migration generated for 10 Postgres tables with 6 enums, deny-all RLS SQL, and idempotent seed script with sample data across all tables**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-15T21:42:00Z
- **Completed:** 2026-03-15T21:50:22Z
- **Tasks:** 2 automated complete, 1 pending human verification
- **Files modified:** 6

## Accomplishments
- Drizzle migration SQL generated (`drizzle/0000_overconfident_mantis.sql`) covering all 10 tables, 6 enums, all FK constraints and indexes
- `supabase/rls.sql` written with `ENABLE ROW LEVEL SECURITY` + `deny_all_anon` policy for all 10 tables — ready to paste into Supabase SQL Editor
- `src/db/seed.ts` written with FK-ordered inserts across all 10 tables, `onConflictDoNothing()` for idempotent re-runs, and UUID setup instructions
- `db:seed` script added to `package.json`

## Task Commits

Each task was committed atomically:

1. **Task 1: Generate migration and create RLS SQL file** - `a18507f` (feat)
2. **Task 2: Write seed script** - `ec65400` (feat)
3. **Task 3: Human verify — tables, RLS, and seed data** - PENDING CHECKPOINT

## Files Created/Modified
- `drizzle/0000_overconfident_mantis.sql` - Full Postgres migration: 10 tables, 6 enums, FKs, indexes
- `drizzle/meta/_journal.json` - Drizzle migration journal
- `drizzle/meta/0000_snapshot.json` - Drizzle schema snapshot
- `supabase/rls.sql` - RLS enablement + deny_all_anon policy for all 10 tables
- `src/db/seed.ts` - FK-ordered seed script with 3 staff, 5 students, 2 classes, 5 enrollments, 2 attendance records, 2 grades, 1 SAT test, 1 graduation plan, 1 college prep plan, 1 ai insight
- `package.json` - Added `"db:seed": "tsx src/db/seed.ts"`

## Decisions Made
- **Migration applied manually**: The direct Supabase DB host (`db.idzfkdvwriloujgrmoky.supabase.co`) resolves only to IPv6 and is unreachable from the development machine. `npm run db:migrate` cannot connect. The migration SQL must be run manually in the Supabase SQL Editor (this is acceptable — the plan's `user_setup` already directed applying RLS via the SQL editor).
- **deny_all_anon as Phase 1 baseline**: All 10 tables get a single policy blocking all unauthenticated access. Phase 2 adds role-scoped `SELECT` policies for authenticated staff using `auth.uid()`.
- **onConflictDoNothing for idempotency**: Seed can be re-run safely after UUID replacement without foreign key errors.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written for the automated tasks.

### Issues Encountered

**Database connectivity: IPv6-only direct connection**
- The Supabase direct connection host only resolves to IPv6; Node.js `getaddrinfo` fails on this machine
- The Supabase Session pooler (`aws-0-us-east-1.pooler.supabase.com`) has IPv4 but returned "Tenant or user not found" with the pooler username format
- `npm run db:migrate` cannot be run from this machine — migration SQL must be applied via Supabase SQL Editor
- All file artifacts are complete and correct; only the `db:migrate` step requires manual execution
- This was already anticipated: the plan's `user_setup` directed applying RLS via the Supabase SQL Editor

## User Setup Required

The following manual steps are required before Task 3 (human verification) can be completed:

**Step 1 — Apply migration SQL in Supabase SQL Editor:**
1. Open Supabase Dashboard → SQL Editor
2. Paste the contents of `drizzle/0000_overconfident_mantis.sql`
3. Run — this creates all 10 tables, 6 enums, FK constraints, and indexes

**Step 2 — Apply RLS policies:**
1. In the same SQL Editor, paste the contents of `supabase/rls.sql`
2. Run — this enables RLS and adds deny_all_anon policy on each table

**Step 3 — Create test auth users:**
1. Go to Supabase Dashboard → Authentication → Users
2. Create: `teacher@edudash.test`, `counselor@edudash.test`, `principal@edudash.test` (any password)
3. Copy their UUIDs

**Step 4 — Update seed UUIDs and run:**
1. Open `src/db/seed.ts`
2. Replace `TEACHER_UUID`, `COUNSELOR_UUID`, `PRINCIPAL_UUID` with the real UUIDs
3. Fix DATABASE_URL connectivity (see below), then run `npm run db:seed`

**Step 5 — Fix DATABASE_URL for local execution:**
The current `DATABASE_URL` in `.env.local` uses the direct host which is IPv6-only. To run `db:seed` locally, update `DATABASE_URL` to use the Supabase Session pooler:
```
DATABASE_URL=postgresql://postgres.idzfkdvwriloujgrmoky:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```
Get the exact pooler URL from: Supabase Dashboard → Project Settings → Database → Connection string → Session mode

## Next Phase Readiness
- All 10-table migration SQL is ready to apply via Supabase SQL Editor
- RLS baseline SQL is ready to apply
- Seed script is ready to run after UUID replacement and DATABASE_URL fix
- Phase 2 (auth + role-scoped policies) can begin once Task 3 human verification is confirmed

---
*Phase: 01-foundation-and-schema*
*Completed: 2026-03-15*
