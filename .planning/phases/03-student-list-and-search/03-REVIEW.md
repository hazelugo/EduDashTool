---
phase: 03-student-list-and-search
reviewed: 2026-04-10T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - src/__tests__/student-list.test.ts
  - src/lib/students.ts
  - src/app/students/_components/student-filters.tsx
  - src/app/students/_components/student-table-body.tsx
  - src/app/students/_components/pagination-controls.tsx
  - src/app/students/page.tsx
  - src/db/index.ts
  - src/app/students/error.tsx
findings:
  critical: 2
  warning: 4
  info: 3
  total: 9
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-04-10
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

This phase implements the student list page with search/filter/pagination. The overall structure is sound: role-scoped queries, URL-driven filter state, and a clean server component/client component split. However, there are two critical issues — one security-relevant (unvalidated URL input used as a SQL predicate) and one correctness bug (a multi-row graduation plan edge case can silently double-count totals). Four warnings cover missing pagination clamping at the query layer, an unguarded `Number()` coercion that can produce `NaN`, an empty database connection string that is silently accepted, and a `console.error` left in the error boundary. Three info-level items cover magic numbers, a missing `fallback` prop on `<Suspense>`, and absent test coverage for the course filter with no enrolled students.

---

## Critical Issues

### CR-01: Unsanitized `course` filter value passed directly to SQL `eq()` predicate

**File:** `src/lib/students.ts:177`

**Issue:** The `course` parameter comes from a URL query string (`params.course` in `page.tsx`) and is passed without any validation or sanitization into `eq(classes.courseName, course)`. Drizzle ORM parameterizes the value, so classic SQL injection is blocked at the wire level. However, the value is also used in `inArray(students.id, courseStudentIds)` after a sub-query, and — critically — there is no length or character-set constraint. A sufficiently large `course` value (e.g., 10 000+ characters) will be sent to Postgres and can cause excessive memory allocation or force a sequential scan on `classes.courseName`, which has no apparent index. More importantly, `params.course` from the Next.js `searchParams` is an arbitrary user-controlled string; if the application ever switches to string-interpolated queries or logging, this path is pre-injected. The fix is to validate `course` against the known `courseOptions` before using it in the query, or enforce a max-length guard at the page layer.

**Fix:**
```typescript
// In page.tsx, before calling getStudentList:
const MAX_PARAM_LENGTH = 200;
const courseParam =
  params.course && params.course.length <= MAX_PARAM_LENGTH
    ? params.course
    : undefined;

// Or in students.ts, at the top of getStudentList:
if (course && course.length > 200) {
  return { rows: [], total: 0 };
}
```

---

### CR-02: Multiple graduation plan rows per student cause `count()` to inflate and may return wrong `riskLevel`

**File:** `src/lib/students.ts:185–207`

**Issue:** The main query joins `students` to `graduationPlans` via `leftJoin(graduationPlans, eq(graduationPlans.studentId, students.id))` with no `LIMIT 1` or deduplication. If a student has more than one row in `graduationPlans` (e.g., a re-plan scenario), the join produces multiple rows for that student. Two consequences:

1. `count()` in `countResult` counts join-product rows, not distinct students — the total reported in the UI will be inflated.
2. `dataRows` will also contain duplicates for that student; the final `rows` array will show the student multiple times on the same page.

The same join is repeated for `getStudentById`, `getStudentGradesByClass` (not at risk here), and `getStudentGraduationPlan` (uses `limit(1)` correctly).

**Fix:**
```typescript
// Add a lateral/subquery or use DISTINCT ON (students.id).
// Simplest drizzle-compatible fix: use a correlated subquery for onTrack.
// Alternatively, enforce a unique constraint on graduationPlans.studentId in the schema.
// Short-term guard in the query:
.leftJoin(
  graduationPlans,
  and(
    eq(graduationPlans.studentId, students.id),
    // pick the most recent plan only
    eq(
      graduationPlans.id,
      db
        .select({ id: graduationPlans.id })
        .from(graduationPlans)
        .where(eq(graduationPlans.studentId, students.id))
        .orderBy(desc(graduationPlans.updatedAt))
        .limit(1)
    )
  )
)
// OR add a unique constraint at the database layer:
// ALTER TABLE graduation_plans ADD CONSTRAINT uq_graduation_plans_student UNIQUE (student_id);
```

---

## Warnings

### WR-01: `gradeParam` can be `NaN` when `params.grade` is a non-numeric string

**File:** `src/app/students/page.tsx:30`

**Issue:** `const gradeParam = params.grade ? Number(params.grade) : undefined;` — if a user (or a bot) passes `?grade=abc`, `Number("abc")` produces `NaN`. This is passed directly to `getStudentList` as `grade: NaN`, which then becomes `eq(students.gradeLevel, NaN)` in the Drizzle query. Postgres will receive `WHERE grade_level = NaN`, which will never match any row, silently returning an empty list rather than the unfiltered list. This is a silent correctness failure.

**Fix:**
```typescript
const gradeRaw = params.grade ? Number(params.grade) : undefined;
const gradeParam =
  gradeRaw !== undefined && !Number.isNaN(gradeRaw) ? gradeRaw : undefined;
```

---

### WR-02: `pageParam` is clamped to `>= 1` at the page layer but not against `totalPages` before the query executes

**File:** `src/app/students/page.tsx:33` and `src/app/students/page.tsx:50`

**Issue:** `pageParam` is clamped to `Math.max(1, ...)` before the query but `currentPage` is clamped to `Math.min(pageParam, totalPages)` only *after* the query returns. If a user passes `?page=9999` and `totalPages` is 3, the query runs with `offset = (9999 - 1) * 25 = 249 950`, returning an empty result set, then `currentPage` is corrected to 3 in the display. The displayed page counter will correctly show "Page 3 of 3" but the data section shows "No students match your filters" (because the DB returned 0 rows for that offset). This is a confusing UX inconsistency and wastes a round-trip.

**Fix:**
```typescript
// After computing totalPages from an initial count, clamp pageParam before the data query.
// Since total and page are needed together, one approach is a two-step fetch or
// clamping the offset in getStudentList when offset >= total:
const offset = Math.min((page - 1) * limit, Math.max(0, total - 1));
// Or simpler: add a guard in the page component after the query if the
// result is empty but total > 0, redirect to the last valid page.
```

---

### WR-03: Empty database connection string silently accepted; postgres client will throw at query time, not at startup

**File:** `src/db/index.ts:7–13`

**Issue:** `const rawConnection = process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? "";` — if both env vars are absent the fallback is `""`. The `connectionString.split("?")[0]` call produces `""`, and `postgres("", ...)` does not throw immediately. The error surfaces only when the first query is executed, producing a cryptic Postgres connection error rather than a clear startup-time misconfiguration message.

**Fix:**
```typescript
const rawConnection = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
if (!rawConnection) {
  throw new Error(
    "Missing database connection string. Set POSTGRES_URL or DATABASE_URL."
  );
}
const connectionString = rawConnection.split("?")[0];
const client = postgres(connectionString, { prepare: false, max: 1, idle_timeout: 20 });
```

---

### WR-04: `console.error` in error boundary leaks internal error details to browser console in production

**File:** `src/app/students/error.tsx:13`

**Issue:** `console.error("Students error:", error)` logs the full `Error` object (including stack trace) to the browser console unconditionally, including in production builds. Stack traces can expose internal file paths, library versions, or query fragments that aid attackers in fingerprinting the stack.

**Fix:**
```typescript
useEffect(() => {
  // Only log in non-production environments
  if (process.env.NODE_ENV !== "production") {
    console.error("Students error:", error);
  }
  // In production, errors are captured server-side via error.digest
}, [error]);
```

---

## Info

### IN-01: Magic number `25` used in `page.tsx` alongside `PAGE_SIZE` constant

**File:** `src/app/students/page.tsx:52–53`

**Issue:** Lines 52–53 compute `startItem` and `endItem` using `PAGE_SIZE` correctly, but the `limit: PAGE_SIZE` passed to `getStudentList` at line 42 is correct. However, the `endItem = Math.min(currentPage * PAGE_SIZE, total)` calculation at line 53 directly references `PAGE_SIZE` which is good — but the comment concern is that `PAGE_SIZE` is imported and used in the arithmetic yet the display copy hardcodes `PAGE_SIZE` via import, which is fine. No action needed here; this is informational only — the import is consistent.

Actually this is a non-issue upon re-read. Marking instead:

**Actual IN-01: `<Suspense>` used without a `fallback` prop — will show nothing during loading**

**File:** `src/app/students/page.tsx:66` and `src/app/students/page.tsx:93`

**Issue:** `<Suspense>` is used twice without a `fallback` prop. Without a fallback, React renders nothing in place of the suspended subtree during the loading state. For `StudentFilters` this means the filter bar disappears during navigation; for `PaginationControls` the pagination disappears. This can cause layout shift.

**Fix:**
```tsx
<Suspense fallback={<div className="h-10 animate-pulse rounded bg-muted" />}>
  <StudentFilters ... />
</Suspense>
```

---

### IN-02: `deriveRiskLevel` test imports the module three times in the same `describe` block

**File:** `src/__tests__/student-list.test.ts:13,18,23`

**Issue:** Each `it` block in the `deriveRiskLevel` describe calls `await import("../lib/students")` independently. While Vitest caches module imports, the dynamic import pattern in each test is redundant and harder to read. Consider a single `beforeAll` or a top-level import.

**Fix:**
```typescript
import { deriveRiskLevel } from "../lib/students";

describe("deriveRiskLevel", () => {
  it("maps onTrack=false to at-risk", () => {
    expect(deriveRiskLevel(false)).toBe("at-risk");
  });
  // ...
});
```

---

### IN-03: No test coverage for the "course with zero enrolled students" early-return path

**File:** `src/__tests__/student-list.test.ts` (absence)

**Issue:** `getStudentList` has an early return at line 179 (`if (courseStudentIds.length === 0) return { rows: [], total: 0 }`) but the test suite has no case exercising this path. This is a meaningful branch — if the course sub-query returns nothing the function short-circuits before applying other filters. A unit test with a mocked DB returning an empty course result would confirm the contract.

**Fix:** Add a test case:
```typescript
it("returns empty result when course has no enrolled students", async () => {
  // mock db to return [] for course sub-query
  const result = await getStudentList({ viewerId: "x", viewerRole: "principal", course: "Ghost Course" });
  expect(result).toEqual({ rows: [], total: 0 });
});
```

---

_Reviewed: 2026-04-10_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
