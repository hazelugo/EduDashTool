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
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-04-10T00:00:00Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Reviewed the student list and search feature end-to-end: the data layer (`students.ts`, `db/index.ts`), the server component page, three client components, the error boundary, and the unit test suite.

The overall architecture is sound. Role-scoping (teacher vs counselor/principal), pagination, and filter-to-SQL translation are structurally correct. The `graduationPlans` table enforces a unique index on `studentId` (confirmed in schema), which prevents fan-out on the join. No critical security vulnerabilities were found — Drizzle parameterizes all user input, so SQL injection is not viable through the current query paths.

Four warnings were found: a `NaN` coercion that produces silently broken SQL, a "watch" filter that conflates "no plan row" with "watch" status, an uncontrolled search input that desyncs on browser back/forward navigation, and a silent empty-string fallback in the database client. Three info items cover error object exposure in the browser console, an unsafe runtime type cast on the `riskLevel` param, and missing unit test coverage for the role-scoping logic.

---

## Warnings

### WR-01: Non-numeric `grade` param produces NaN — broken SQL predicate

**File:** `src/app/students/page.tsx:30`

**Issue:** `Number(params.grade)` returns `NaN` when the query param is a non-numeric string (e.g., `?grade=abc`). `NaN` is passed directly to `getStudentList` as `grade: NaN`, which becomes `eq(students.gradeLevel, NaN)` in Drizzle. PostgreSQL receives `WHERE grade_level = NaN`, which never matches any row, silently returning an empty list instead of the unfiltered list. Users see "No students found" with no indication that the filter is malformed.

**Fix:**
```ts
// page.tsx line 30
const gradeRaw = params.grade !== undefined ? Number(params.grade) : undefined;
const gradeParam =
  gradeRaw !== undefined && Number.isFinite(gradeRaw) ? gradeRaw : undefined;
```

---

### WR-02: "Watch" risk filter also matches students with no graduation plan row

**File:** `src/lib/students.ts:167-169`

**Issue:** The query uses `leftJoin(graduationPlans, eq(graduationPlans.studentId, students.id))`. Students without any graduation plan row produce all-NULL columns from that join. The condition `isNull(graduationPlans.onTrack)` is satisfied both by rows where a plan exists with `on_track = NULL` **and** by rows where no plan exists at all (because the full joined row is NULL). This means the "watch" filter bucket silently includes students who have never had a graduation plan created, inflating the count and mixing semantically different states.

The schema enforces uniqueness on `graduationPlans.studentId` so there is no fan-out risk, but the plan row is not guaranteed to exist for every student.

**Fix:** Distinguish "no plan" from "plan exists but on_track is null" by requiring the plan row to exist:
```ts
} else if (riskLevel === "watch") {
  conditions.push(
    and(
      isNotNull(graduationPlans.id),   // plan row exists
      isNull(graduationPlans.onTrack)  // but on_track is null
    )!
  );
}
```
If intentionally including plan-less students in the "watch" bucket, document this explicitly and add a test case.

---

### WR-03: Uncontrolled search input desyncs from URL on browser back/forward navigation

**File:** `src/app/students/_components/student-filters.tsx:53-58`

**Issue:** The `Input` uses `defaultValue={search}` (uncontrolled) with a debounced `onChange`. `defaultValue` only sets the DOM value at mount; it does not react to prop changes. When the user navigates back (which re-renders the server component with a different `search` prop), the input still displays the old text while the table reflects the reverted filter. The user sees mismatched state between the text field and the results.

**Fix:** Force remount when the search param changes using a `key` prop (simplest fix), or convert to a controlled input:
```tsx
// Option A: force remount — simplest, minor UX tradeoff on back/forward
<Input
  key={search}
  defaultValue={search}
  className="max-w-xs"
  onChange={(e) => debouncedSearch(e.target.value)}
/>

// Option B: controlled input
const [inputValue, setInputValue] = React.useState(search);
React.useEffect(() => { setInputValue(search); }, [search]);
<Input
  value={inputValue}
  onChange={(e) => {
    setInputValue(e.target.value);
    debouncedSearch(e.target.value);
  }}
/>
```

---

### WR-04: Empty connection string silently accepted — database client fails at query time, not startup

**File:** `src/db/index.ts:7-13`

**Issue:** `process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? ""` falls back to an empty string when both vars are absent. `postgres("", ...)` does not throw at construction time — it creates a client that throws a cryptic socket/connection error only when the first query executes. In CI, a fresh deployment, or a misconfigured local environment, this produces a confusing and hard-to-diagnose error instead of a clear startup failure.

**Fix:** Fail fast at module load time:
```ts
const rawConnection = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
if (!rawConnection) {
  throw new Error(
    "Database connection string not configured. Set POSTGRES_URL or DATABASE_URL."
  );
}
const connectionString = rawConnection.split("?")[0];
const client = postgres(connectionString, { prepare: false, max: 1, idle_timeout: 20 });
```

---

## Info

### IN-01: Unsafe runtime cast on `riskLevel` query param — invalid values silently ignored

**File:** `src/app/students/page.tsx:31`

**Issue:** `(params.riskLevel as RiskLevel)` is a TypeScript-only cast with no runtime validation. An invalid value (e.g., `?riskLevel=invalid`) passes through all `if/else if` branches in `getStudentList` without matching, silently applying no filter and returning all students. The user gets results that don't match what they requested with no feedback.

**Fix:**
```ts
const VALID_RISK_LEVELS: RiskLevel[] = ["at-risk", "watch", "on-track"];
const riskLevelParam: RiskLevel | undefined =
  VALID_RISK_LEVELS.includes(params.riskLevel as RiskLevel)
    ? (params.riskLevel as RiskLevel)
    : undefined;
```

---

### IN-02: `console.error` in error boundary exposes stack traces to browser console in production

**File:** `src/app/students/error.tsx:13`

**Issue:** `console.error("Students error:", error)` logs the full `Error` object including stack trace to the browser console unconditionally, including in production. Stack traces can expose internal file paths, ORM query patterns, and library versions. In a FERPA-regulated educational app this is worth addressing before production launch.

**Fix:**
```ts
useEffect(() => {
  if (process.env.NODE_ENV !== "production") {
    console.error("Students error:", error);
  }
  // In production, rely on error.digest for server-side error correlation
}, [error]);
```

---

### IN-03: Test suite does not cover role-scoping logic — only pure function and export contract tests exist

**File:** `src/__tests__/student-list.test.ts:30-47`

**Issue:** The tests verify that `getStudentList` and `getCourseOptions` are exported and that `PAGE_SIZE` equals 25. No test exercises the teacher scoping path (early return when `allowedIds` is empty), the counselor/principal path (no `inArray` restriction), or the course-filter early return (line 179: `if (courseStudentIds.length === 0) return { rows: [], total: 0 }`). These are the most critical logic branches in the module (one is an authorization boundary) and they are entirely uncovered.

**Fix:** Add mocked DB tests using Vitest's module mocking:
```ts
// Example: teacher with no enrolled students
vi.mock("@/db", () => ({ db: mockDb }));

it("returns empty for teacher with no enrolled students", async () => {
  mockDb.selectDistinct.mockResolvedValueOnce([]);
  const result = await getStudentList({ viewerId: "t1", viewerRole: "teacher" });
  expect(result).toEqual({ rows: [], total: 0 });
});
```

---

_Reviewed: 2026-04-10T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
