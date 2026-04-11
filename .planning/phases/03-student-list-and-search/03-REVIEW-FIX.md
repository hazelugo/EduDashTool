---
phase: 03-student-list-and-search
fixed_at: 2026-04-10T00:00:00Z
review_path: .planning/phases/03-student-list-and-search/03-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 03: Code Review Fix Report

**Fixed at:** 2026-04-10T00:00:00Z
**Source review:** .planning/phases/03-student-list-and-search/03-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7
- Fixed: 7
- Skipped: 0

## Fixed Issues

### WR-01: Non-numeric `grade` param produces NaN — broken SQL predicate

**Files modified:** `src/app/students/page.tsx`
**Commit:** a247c7d
**Applied fix:** Replaced `params.grade ? Number(params.grade) : undefined` with a two-step guard: compute `gradeRaw` from the param, then only assign `gradeParam` when `Number.isFinite(gradeRaw)` is true. Non-numeric strings (e.g. `?grade=abc`) now produce `undefined`, which skips the grade filter entirely rather than passing `NaN` to Drizzle.

---

### WR-02: "Watch" risk filter also matches students with no graduation plan row

**Files modified:** `src/lib/students.ts`
**Commit:** 32beaf2
**Applied fix:** Added `isNotNull` to the drizzle-orm import and updated the `riskLevel === "watch"` branch to use `and(isNotNull(graduationPlans.id), isNull(graduationPlans.onTrack))`. This requires the plan row to exist before checking `onTrack`, so plan-less students (all-NULL join rows) are no longer included in the "watch" bucket.

---

### WR-03: Uncontrolled search input desyncs from URL on browser back/forward navigation

**Files modified:** `src/app/students/_components/student-filters.tsx`
**Commit:** 7c2b5fc
**Applied fix:** Added `key={search}` to the `Input` component. React treats a changed `key` as a new element and remounts it, so when the `search` prop changes (e.g. on browser back/forward), the input DOM node is recreated with the current `defaultValue`, keeping the visible text in sync with the URL-driven results.

---

### WR-04: Empty connection string silently accepted — database client fails at query time, not startup

**Files modified:** `src/db/index.ts`
**Commit:** 8f1ec95
**Applied fix:** Removed the `?? ""` fallback so `rawConnection` is `string | undefined`. Added an explicit guard that throws a descriptive `Error` at module load time when neither `POSTGRES_URL` nor `DATABASE_URL` is set. TypeScript's control-flow narrowing then guarantees `rawConnection` is a `string` for the `split("?")[0]` call.

---

### IN-01: Unsafe runtime cast on `riskLevel` query param — invalid values silently ignored

**Files modified:** `src/app/students/page.tsx`
**Commit:** 288e663
**Applied fix:** Replaced the bare `(params.riskLevel as RiskLevel)` cast with a `VALID_RISK_LEVELS` allowlist check. Invalid values (e.g. `?riskLevel=invalid`) now produce `undefined` instead of passing through silently to `getStudentList`. Uses `VALID_RISK_LEVELS.includes()` guard before casting, matching the reviewer's suggested pattern exactly.

---

### IN-02: `console.error` in error boundary exposes stack traces in production

**Files modified:** `src/app/students/error.tsx`
**Commit:** 7332fb6
**Applied fix:** Wrapped `console.error("Students error:", error)` in a `process.env.NODE_ENV !== "production"` guard inside the `useEffect`. Added a comment directing production environments to use `error.digest` for server-side error correlation.

---

### IN-03: Test suite does not cover role-scoping logic

**Files modified:** `src/__tests__/student-list.test.ts`
**Commit:** 6eb2ee9
**Applied fix:** Added a `"getStudentList role-scoping"` describe block with three tests using `vi.doMock("@/db", ...)` and `vi.resetModules()` per test:
1. Teacher with no enrolled students — verifies early return `{ rows: [], total: 0 }` (covers the authorization boundary at line 141).
2. Course filter with no matching students — verifies early return `{ rows: [], total: 0 }` (covers the short-circuit at line 185).
3. Counselor role — verifies `selectDistinct` is never called, confirming no `inArray` scoping is applied.
Also updated the import line to include `vi`, `beforeEach`, and `afterEach` from vitest. A `makeQueryMock` helper produces a Drizzle-style chainable query builder that resolves at `.where()`.

---

_Fixed: 2026-04-10T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
