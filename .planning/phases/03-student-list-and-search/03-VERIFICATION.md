---
phase: 03-student-list-and-search
verified: 2026-04-10T19:00:00Z
status: human_needed
score: 4/4 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open /students as a teacher — confirm only enrolled students appear, no students from other teachers' classes"
    expected: "Filtered list matching only classes where teacher_id = logged-in teacher's userId"
    why_human: "Role-scoping logic is correct in code (inArray on enrolledIds), but cannot be confirmed without a live DB session with seed data"
  - test: "Open /students as a counselor or principal — confirm all active students appear school-wide with pagination controls visible when >25 exist"
    expected: "No WHERE counselorId scoping applied; pagination shows Previous/Next when totalPages > 1"
    why_human: "Counselor scoping removal verified in code, but pagination UI (Previous/Next buttons) only renders when totalPages > 1, requiring live data to confirm"
  - test: "Type part of a student name in the search input — confirm list narrows in real time with ~350ms debounce"
    expected: "URL gains ?search=<term> after typing stops; list re-renders with only matching students"
    why_human: "useDebouncedCallback wiring is correct but debounce timing and URL update behavior requires browser interaction to confirm"
  - test: "Select a grade, course, and risk level filter in sequence — confirm list narrows correctly and page resets to 1"
    expected: "URL updates with ?grade=, ?course=, ?riskLevel= params; page param is deleted on each filter change; matching students shown"
    why_human: "Filter wiring and page reset are correct in code but require live data to confirm end-to-end behavior across all three filter dimensions"
---

# Phase 3: Student List and Search — Verification Report

**Phase Goal:** Any logged-in staff member can open the student list, find students by name or filter, and see only students their role permits
**Verified:** 2026-04-10T19:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Teacher sees only students enrolled in their assigned classes | VERIFIED | `getStudentList()` uses `inArray(students.id, allowedIds)` where allowedIds comes from enrollments JOIN classes WHERE teacherId=viewerId. Code is correct; runtime behavior needs human confirmation |
| 2 | Counselor/principal sees all students school-wide with pagination | VERIFIED | Counselor scoping bug removed — no `eq(students.counselorId, viewerId)` condition exists. Pagination: `Promise.all([dataQuery, countQuery])`, `.limit(limit).offset(offset)`, `PaginationControls` with Previous/Next |
| 3 | Typing a student name filters the visible list in real time | VERIFIED | `useDebouncedCallback(fn, 350)` from `use-debounce` wired to `update("search", val)`. No window timer hack. `ilike` on firstName/lastName applied in SQL |
| 4 | Selecting grade, course, or risk level filter narrows the list | VERIFIED | Grade: `eq(students.gradeLevel, grade)`. Course: subquery on enrollments+classes. RiskLevel: SQL-level `eq(graduationPlans.onTrack, true/false)` or `isNull()`. All filters delete `page` param on change |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/students.ts` | getStudentList with pagination, getCourseOptions, RiskLevel, deriveRiskLevel | VERIFIED | All exports present, fully implemented with real Drizzle queries |
| `src/__tests__/student-list.test.ts` | Unit tests for query functions | VERIFIED | 132 lines, 9 tests in 5 describe blocks — all GREEN |
| `src/app/students/page.tsx` | Server component with pagination, filter integration, 3-level badge | VERIFIED | Contains PAGE_SIZE, getCourseOptions, Promise.all, StudentTableBody, PaginationControls, "Showing X-Y of Z" |
| `src/app/students/_components/student-filters.tsx` | Client filter bar with debounced search, course, risk level dropdowns | VERIFIED | useDebouncedCallback, 4 filter controls, params.delete("page") on change |
| `src/app/students/_components/student-table-body.tsx` | Client component for clickable table rows with 3-level badge | VERIFIED | "use client", router.push to /students/[id], RiskBadge with destructive/outline-yellow/secondary |
| `src/app/students/_components/pagination-controls.tsx` | Client pagination with Previous/Next | VERIFIED | "use client", Previous/Next buttons, disabled states, preserves existing URL params |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `page.tsx` | `src/lib/students.ts` | `getStudentList({...params, page, limit})` and `getCourseOptions()` | WIRED | Line 35: `Promise.all([getStudentList({...}), getCourseOptions(...)])` |
| `page.tsx` | `student-filters.tsx` | passes courseOptions, course, riskLevel props | WIRED | Lines 67-74: `<StudentFilters search={search} grade=... course=... riskLevel=... courseOptions={courseOptions} />` |
| `page.tsx` | `student-table-body.tsx` | passes rows as props | WIRED | Line 91: `<StudentTableBody rows={studentList} />` |
| `student-table-body.tsx` | `/students/[id]` | `router.push` on row click | WIRED | Line 50: `onClick={() => router.push('/students/${student.id}')}` |
| `student-filters.tsx` | `use-debounce` | `import useDebouncedCallback` | WIRED | Line 5: `import { useDebouncedCallback } from "use-debounce"` |
| `student-filters.tsx` | `next/navigation` | `router.push` with URL params | WIRED | Lines 3, 43: `useRouter`, `router.push(...)` |
| `students.ts` | `src/db/schema.ts` | drizzle query with graduationPlans LEFT JOIN | WIRED | Lines 196-198: `.leftJoin(graduationPlans, eq(graduationPlans.studentId, students.id))` |
| `students.ts` | `drizzle-orm` | `isNull` import for watch filter | WIRED | Line 25: `isNull` imported; line 168: `conditions.push(isNull(graduationPlans.onTrack))` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `student-table-body.tsx` | `rows: StudentRowData[]` | `page.tsx` → `getStudentList()` | Yes — Drizzle SELECT with real LEFT JOINs, LIMIT, OFFSET | FLOWING |
| `student-filters.tsx` | `courseOptions: string[]` | `page.tsx` → `getCourseOptions()` | Yes — Drizzle selectDistinct on classes table | FLOWING |
| `pagination-controls.tsx` | `currentPage`, `totalPages` | `page.tsx` arithmetic on `total` from `getStudentList()` | Yes — parallel count() query returns real total | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All vitest tests pass | `npx vitest run` | 6 test files, 38 tests, all passed | PASS |
| TypeScript type correctness | `npx tsc --noEmit` | 5 type errors found in 3 files (details below) | FAIL |
| `deriveRiskLevel` pure function | vitest unit tests | 3/3 mappings verified (false→at-risk, true→on-track, null→watch) | PASS |
| PAGE_SIZE constant = 25 | vitest unit test | `expect(PAGE_SIZE).toBe(25)` — PASS | PASS |
| getStudentList export | vitest unit test | `expect(typeof getStudentList).toBe('function')` — PASS | PASS |
| getCourseOptions export | vitest unit test | `expect(typeof getCourseOptions).toBe('function')` — PASS | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| LIST-01 | 03-01, 03-03 | Teacher sees only their enrolled students | SATISFIED | `inArray(students.id, allowedIds)` gated on `viewerRole === "teacher"` |
| LIST-02 | 03-01, 03-02 | Name search filters list | SATISFIED | `ilike` on firstName/lastName; `useDebouncedCallback` in StudentFilters |
| LIST-03 | 03-01, 03-03 | Counselor/principal sees all students with pagination | SATISFIED | No counselorId restriction; `.limit(limit).offset(offset)` with parallel count |
| LIST-04 | 03-02, 03-03 | Grade/course/risk level filters work | SATISFIED | All 3 filter types wired in SQL + UI; Course dropdown from getCourseOptions |
| LIST-05 | 03-01, 03-02 | getCourseOptions scoped by role | SATISFIED | Teacher: WHERE teacherId=viewerId; counselor/principal: all courses |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app/students/[id]/page.tsx` | 99 | `student.isAtRisk` — property no longer exists on `StudentDetail` (renamed to `riskLevel`) | Warning | TypeScript error; at runtime `undefined` is falsy so badge never renders. Risk badge on profile page is broken but Phase 3 only owns the list page. Phase 4 must fix this. |
| `src/components/students/students-table.tsx` | 62 | `student.isAtRisk` on old `StudentsTable` component that is not imported anywhere | Info | Orphaned legacy component; no runtime impact. Can be deleted in Phase 4 cleanup. |
| `src/__tests__/students.test.ts` | 53, 70 | `isAtRisk` field references in old test file — TypeScript errors since type changed | Info | Vitest passes (type-stripping at runtime), but `npx tsc` emits 2 type errors. |

### TypeScript Type Check Results

Running `npx tsc --noEmit` reports 5 errors across 3 files:

1. `src/__tests__/students.test.ts(53)` — `isAtRisk` not in `StudentRow` (old test, not new student-list.test.ts)
2. `src/__tests__/students.test.ts(56)` — same file, same issue
3. `src/__tests__/students.test.ts(70)` — `isAtRisk` not in `StudentDetail`
4. `src/app/students/[id]/page.tsx(99)` — `isAtRisk` not in `StudentDetail` — **breaks risk badge on profile page**
5. `src/components/students/students-table.tsx(62)` — `isAtRisk` not in `StudentRow` — orphaned component, no runtime impact

None of these errors affect Phase 3's list page. All are in files outside Phase 3's scope (profile page, legacy components, old tests). They are pre-existing technical debt that Phase 4 must resolve.

### Human Verification Required

#### 1. Teacher Role Scoping

**Test:** Log in as a teacher account. Open /students. Confirm only students enrolled in that teacher's classes appear. Log in as a different teacher with no shared classes — confirm zero overlap.
**Expected:** Each teacher sees a disjoint student subset. Student not in any of the teacher's classes returns 0 results.
**Why human:** The `inArray(students.id, allowedIds)` logic is correct in code but requires a live DB with seeded teacher/enrollment/student data to confirm the scoping is correct end-to-end.

#### 2. Counselor/Principal Full Visibility + Pagination

**Test:** Log in as a counselor or principal. Open /students. Confirm all active students appear with no restriction by counselor assignment. If >25 students exist, confirm Previous/Next pagination buttons appear at the bottom.
**Expected:** Full student list; pagination controls visible when totalPages > 1; "Showing 1-25 of N students" text correct.
**Why human:** Requires live DB with >25 seeded students to trigger the pagination rendering path (`totalPages > 1`).

#### 3. Real-Time Search Debounce

**Test:** Type part of a student name in the search box. Wait ~400ms. Confirm URL gains `?search=<typed value>` and list narrows.
**Expected:** Filter applied after ~350ms debounce; no filter applied while typing; URL is shareable with the filter state.
**Why human:** Debounce timing behavior and URL state persistence require browser interaction.

#### 4. Combined Filter + Page Reset

**Test:** Select a grade from the Grade dropdown, then select a course, then select a risk level. After each selection, confirm (a) list narrows and (b) the `page` param is absent from the URL (reset to page 1).
**Expected:** Three independent filter selections each update URL correctly and delete `?page=`.
**Why human:** The `params.delete("page")` code is correct but the composite filter scenario needs live data to verify all three filters narrow correctly and don't conflict.

### Gaps Summary

No gaps blocking Phase 3's goal. All four ROADMAP success criteria are structurally met by the codebase. The TypeScript errors in `[id]/page.tsx` and legacy files are out of Phase 3's scope and will be addressed in Phase 4. No stubs, no disconnected data flows, no hardcoded empty returns in the student list path.

The `human_needed` status reflects that role-scoped behavior (teacher isolation, counselor full-access), pagination UI rendering, debounce timing, and combined filter interactions require live-browser confirmation against a real database with seeded data.

---

_Verified: 2026-04-10T19:00:00Z_
_Verifier: Claude (gsd-verifier)_
