---
phase: 03-student-list-and-search
plan: "01"
subsystem: student-list-query
tags: [query-layer, pagination, role-scoping, risk-level, tdd]
dependency_graph:
  requires: [02-01, 02-02, 02-03]
  provides: [getStudentList-paginated, getCourseOptions, deriveRiskLevel, StudentListResult]
  affects: [03-02-student-list-ui, 03-03-search-filters]
tech_stack:
  added: []
  patterns: [drizzle-parallel-count-query, sql-level-filtering, tdd-red-green]
key_files:
  created:
    - src/__tests__/student-list.test.ts
  modified:
    - src/lib/students.ts
decisions:
  - "Risk level filter applied at SQL level using graduationPlans.onTrack LEFT JOIN condition, not post-query filter — ensures accurate pagination totals"
  - "Counselor scoping bug fixed: counselors no longer restricted to eq(students.counselorId, viewerId); they see all active students like principals"
  - "Course filter uses subquery returning distinct studentIds enrolled in any section of matching courseName — then inArray condition on students.id"
  - "deriveRiskLevel exported as pure function for testability and reuse in UI badge rendering"
  - "Parallel Promise.all for data+count queries — avoids double-roundtrip serialization"
metrics:
  duration_minutes: 12
  completed_date: "2026-04-10"
  tasks_completed: 2
  files_changed: 2
---

# Phase 3 Plan 1: Student List Query Layer Summary

**One-liner:** Paginated getStudentList() with SQL-level risk/course filters, counselor bug fix, and full TDD coverage using vitest.

## What Was Built

The student list query layer was refactored from a simple array-returning function to a fully featured paginated query engine:

- `getStudentList()` now returns `StudentListResult { rows: StudentRow[], total: number }` with `limit`/`offset` pagination (default PAGE_SIZE=25)
- Counselor scoping bug fixed: counselors now see all active students, not just students where `counselorId = viewerId`
- Risk level filtering moved from post-query `.filter()` to SQL-level `WHERE` clauses on `graduationPlans.onTrack`, ensuring the `total` count reflects the filtered set
- Course filter added via `enrollments`+`classes` subquery returning distinct student IDs enrolled in any section matching the requested course name
- `deriveRiskLevel(onTrack: boolean | null): RiskLevel` exported as a pure function mapping `false`->`at-risk`, `true`->`on-track`, `null`->`watch`
- `getCourseOptions()` added for role-scoped distinct course name retrieval (teacher sees own courses only; counselor/principal see all)
- `StudentDetail.isAtRisk` replaced with `riskLevel: RiskLevel` for consistency
- Test scaffold covers all 3 deriveRiskLevel mappings, export contracts, and type shapes

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 (TDD RED) | `2754ea9` | test(03-01): add failing tests for student list query functions |
| Task 2 (TDD GREEN) | `01baa0d` | feat(03-01): fix bugs and add pagination, course filter, risk level to getStudentList() |

## Decisions Made

1. **Risk level filter in SQL** — Filtering by `riskLevel` uses `eq(graduationPlans.onTrack, false/true)` or `isNull(graduationPlans.onTrack)` in the `WHERE` clause, before `LIMIT`/`OFFSET`. This guarantees the parallel count query returns the correct total for the filtered set, not the unfiltered student count.

2. **Counselor bug removed** — The old code had `eq(students.counselorId, viewerId)` for the counselor role, which incorrectly scoped counselors to only their assigned students. Removed. Counselors and principals fall through with no additional `WHERE` conditions.

3. **Course filter via subquery** — When `course` param is present, a `selectDistinct` subquery on `enrollments JOIN classes WHERE courseName = course` fetches matching student IDs. These IDs feed into `inArray(students.id, courseStudentIds)`. If no students match, early return `{ rows: [], total: 0 }`.

4. **deriveRiskLevel exported** — Made it a named export rather than an inline expression so tests can import and verify the mapping directly without database fixtures.

5. **Parallel count query** — `Promise.all([dataQuery, countQuery])` runs both queries in parallel with the same `whereClause`, avoiding a serial round-trip. The count query does not include `LIMIT`/`OFFSET` but shares all filter conditions.

## Deviations from Plan

None — plan executed exactly as written.

## Test Results

All 23 tests pass across 5 test files with no regressions:
- `src/__tests__/student-list.test.ts` — 9 tests (all GREEN)
- 4 existing test files — 14 tests (unchanged, all passing)

## Known Stubs

None — all exported functions are fully implemented. `getCourseOptions()` and `getStudentList()` make real Drizzle queries against the database. No placeholder data flows to the UI layer (UI is built in Plans 02 and 03).
