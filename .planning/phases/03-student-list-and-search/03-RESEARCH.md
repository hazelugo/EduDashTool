# Phase 3: Student List and Search - Research

**Researched:** 2026-04-09
**Domain:** Next.js 16 / Drizzle ORM / shadcn/ui — augmenting a partially-implemented student list
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Offset-based pagination — page 1, 2, 3 with Previous/Next buttons
- **D-02:** 25 students per page
- **D-03:** Page number carried in URL query param (`?page=2`) so pages are shareable/deep-linkable
- **D-04:** Pagination controls appear at the bottom of the table
- **D-05:** A "Course" dropdown lists all unique course names available to the viewer (e.g. "Algebra I", "English 10")
- **D-06:** Role-scoped options — teachers see only courses they teach; counselors and principals see all course names school-wide
- **D-07:** Filter value is the course name (not section ID) — selecting "Algebra I" shows all students enrolled in any section of that course
- **D-08:** Filter integrates with existing URL param pattern (`?course=Algebra+I`)
- **D-09:** Add a `riskLevel` field with three values: `'at-risk'` / `'watch'` / `'on-track'`
- **D-10:** Phase 3 seeds placeholder values: derive from existing `graduationPlans.onTrack` — `onTrack = false` → `'at-risk'`, `onTrack = true` → `'on-track'`, `onTrack = null` → `'watch'` (no plan yet)
- **D-11:** The filter UI (dropdown with three options) is built and functional in Phase 3 using these placeholder values
- **D-12:** Phase 6 replaces placeholder logic with real Gemini-generated risk scores — no schema migration needed if `riskLevel` is computed/stored in `ai_insights` table
- **D-13:** Keep existing columns: Name, Grade, Counselor, Status
- **D-14:** Status badge upgraded from binary (At Risk / On Track) to 3-level: At Risk (destructive), Watch (warning/yellow), On Track (secondary)
- **D-15:** Whole table row is clickable — navigates to `/students/[id]`
- **D-16:** Counselor scoping bug fix — remove `eq(students.counselorId, viewerId)` for counselor role
- **D-17:** Search debounce — replace `window` timer hack with `useDebouncedCallback` from `use-debounce` package

### Claude's Discretion
- Exact pagination control component style (Previous/Next buttons vs numbered page pills)
- Loading skeleton design for the table
- Empty state copy when no students match filters
- Whether to show total student count alongside pagination ("Showing 26–50 of 312 students")
- Error boundary content for the students page

### Deferred Ideas (OUT OF SCOPE)
- Real Gemini risk scores in the filter — Phase 6 populates `ai_insights` table with actual at-risk analysis
- Bulk actions (select multiple students) — v2 scope
- Export to CSV — v2 scope
- Column sorting (click column header to sort) — not in LIST-01 through LIST-05; could be added in Phase 7 polish
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LIST-01 | User can view a paginated list of students scoped to their role (teacher sees own students, counselor/principal sees all) | Offset pagination via Drizzle `.limit()` / `.offset()`, page param in URL, total count query needed alongside data query |
| LIST-02 | User can search students by name | Already implemented via `ilike` in `getStudentList()`; debounce bug must be fixed |
| LIST-03 | User can filter the student list by grade level | Already implemented; no changes needed |
| LIST-04 | User can filter the student list by class/course | Requires new `getCourseOptions()` helper (role-scoped distinct course names) + new `course` param in `getStudentList()` + new Select in `StudentFilters` |
| LIST-05 | User can filter the student list by Gemini-generated risk level (at-risk, watch, on-track) | Requires deriving 3-level `riskLevel` from `graduationPlans.onTrack`; replace `isAtRisk: boolean` with `riskLevel` typed field; update filter UI from binary to 3-option Select |
</phase_requirements>

---

## Summary

Phase 3 is primarily a completion and bug-fix phase, not a greenfield build. The student list page at `/students` already exists with a working server component, a client-side filter bar, and a `getStudentList()` query function. The gaps are: no pagination (LIST-01), no course filter (LIST-04), and a binary risk badge where a 3-level badge is needed (LIST-05). Two bugs also need fixing: the counselor scoping condition incorrectly restricts counselors to their own assigned students, and the search debounce uses a window-global timer hack instead of the already-installed `use-debounce` package.

The implementation strategy is surgical: extend `getStudentList()` to accept `page` and `course` params and return a total count; add a `getCourseOptions()` helper for role-scoped distinct course names; derive `riskLevel` (`'at-risk' | 'watch' | 'on-track'`) from the existing `graduationPlans.onTrack` boolean/null column in the query; and update `StudentFilters` to add the two new controls plus fix the debounce. No schema migrations are required for this phase because `riskLevel` is computed at query time from the existing `graduation_plans` table.

The sidebar already links to `/students` (confirmed in `app-sidebar.tsx`). The `src/app/students/[id]/page.tsx` placeholder exists for Phase 4 row-click navigation. All required shadcn/ui components (Table, Badge, Select, Input, Skeleton, Button) are installed.

**Primary recommendation:** Extend existing files rather than rewriting. Touch `src/lib/students.ts`, `src/app/students/page.tsx`, and `src/app/students/_components/student-filters.tsx` — that is the complete surface area.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.45.1 | Offset pagination via `.limit().offset()`, COUNT query, `inArray` / `ilike` / `eq` | Already the project ORM; confirmed in package.json |
| next | 16.1.6 | URL searchParams as state layer; server component data fetching | Project framework |
| use-debounce | 10.1.0 | `useDebouncedCallback` for search input debounce | Already installed; replaces window timer hack |
| react | 19.2.3 | `useTransition` already used in filter bar for non-blocking nav | Project framework |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui Button | installed | Previous/Next pagination controls | Pagination row at bottom of table |
| shadcn/ui Skeleton | installed | Loading state while page transition in flight | `useTransition` isPending state |
| shadcn/ui Badge | installed | 3-level risk status (destructive / warning / secondary) | Status column — replaces binary isAtRisk |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| URL param pagination | React state pagination | URL params are shareable/bookmarkable — locked by D-03 |
| Derived riskLevel in query | Separate `risk_level` DB column | Column would require migration + seed update; derived approach requires zero schema work |
| `useDebouncedCallback` | `useDebounce` (value hook) | Callback form fits existing onChange pattern better than controlled input with debounced value |

**Installation:** No new packages required — all dependencies already installed.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/students.ts           # getStudentList() + getCourseOptions() — server-only query helpers
├── app/students/
│   ├── page.tsx              # Server component: fetch data, pass to client components
│   └── _components/
│       └── student-filters.tsx  # Client component: filter bar with debounced search
```

No new files are required. All changes land in these three existing files.

### Pattern 1: URL Params as Filter State (already established)
**What:** Server component reads all filter state from `searchParams` prop (Next.js 15+ returns Promise). Client components write filter changes by calling `router.push()` with updated URLSearchParams.
**When to use:** Always — this is the locked pattern for this page.
**Example:**
```typescript
// Server component — read page param alongside existing filters
const pageParam = params.page ? Math.max(1, Number(params.page)) : 1;
const offset = (pageParam - 1) * PAGE_SIZE;

// Pass to query
const { rows, total } = await getStudentList({
  search: search || undefined,
  grade: gradeParam,
  riskLevel: riskLevelParam,
  course: courseParam,
  viewerId: profile.userId,
  viewerRole: profile.role,
  limit: PAGE_SIZE,
  offset,
});
```

### Pattern 2: Drizzle Offset Pagination with Total Count
**What:** Two queries — one for the page of rows, one for the total count. Can be parallelized with `Promise.all`.
**When to use:** LIST-01 requires both paginated rows and total count for "Showing X–Y of Z" display.
**Example:**
```typescript
// Source: Drizzle ORM docs — select with limit/offset
const [rows, countResult] = await Promise.all([
  db.select({ ... })
    .from(students)
    .where(and(...conditions))
    .orderBy(students.lastName, students.firstName)
    .limit(limit)
    .offset(offset),
  db.select({ total: count() })
    .from(students)
    .where(and(...conditions)),
]);
const total = countResult[0]?.total ?? 0;
```

### Pattern 3: Derived riskLevel from onTrack
**What:** Map `graduationPlans.onTrack` (boolean | null) to `'at-risk' | 'watch' | 'on-track'` in the query result mapping step. No new column, no migration.
**When to use:** LIST-05 placeholder values — Phase 6 replaces this with ai_insights data.
**Example:**
```typescript
// In the rows.map() transformation step
function deriveRiskLevel(onTrack: boolean | null): 'at-risk' | 'watch' | 'on-track' {
  if (onTrack === false) return 'at-risk';
  if (onTrack === true) return 'on-track';
  return 'watch'; // null = no graduation plan yet
}
```

### Pattern 4: getCourseOptions() — Role-Scoped Distinct Course Names
**What:** New helper that returns `string[]` of unique course names visible to the viewer.
**When to use:** LIST-04 — populates the Course filter dropdown in `StudentFilters`.
**Example:**
```typescript
// Teacher: courses they teach
const teacherCourses = await db
  .selectDistinct({ courseName: classes.courseName })
  .from(classes)
  .where(eq(classes.teacherId, viewerId))
  .orderBy(classes.courseName);

// Counselor/Principal: all course names
const allCourses = await db
  .selectDistinct({ courseName: classes.courseName })
  .from(classes)
  .orderBy(classes.courseName);
```

### Pattern 5: Course Filter Join in getStudentList()
**What:** When `course` param is set, join `enrollments` → `classes` and add `eq(classes.courseName, course)` to conditions.
**When to use:** LIST-04 filter application in the data query.
**Example:**
```typescript
// Add to getStudentList() when course param is present
if (course) {
  const enrolledInCourse = await db
    .selectDistinct({ studentId: enrollments.studentId })
    .from(enrollments)
    .innerJoin(classes, eq(classes.id, enrollments.classId))
    .where(eq(classes.courseName, course));
  const courseStudentIds = enrolledInCourse.map(r => r.studentId);
  if (courseStudentIds.length === 0) return { rows: [], total: 0 };
  conditions.push(inArray(students.id, courseStudentIds));
}
```

### Pattern 6: useDebouncedCallback (replaces window timer hack)
**What:** Import `useDebouncedCallback` from `use-debounce` — returns a stable debounced function reference safe for React components.
**When to use:** D-17 — replace the `window["_studentSearchTimer"]` pattern in `student-filters.tsx`.
**Example:**
```typescript
import { useDebouncedCallback } from 'use-debounce';

const debouncedSearch = useDebouncedCallback((val: string) => {
  update("search", val);
}, 350);

// In JSX:
<Input
  placeholder="Search by name…"
  defaultValue={search}
  className="max-w-xs"
  onChange={(e) => debouncedSearch(e.target.value)}
/>
```

### Pattern 7: Clickable Table Row (D-15)
**What:** Wrap `TableRow` with an `onClick` handler calling `router.push()`, or nest a full-row anchor. The project pattern uses `next/link` for navigation — consistent to keep using it but on a wrapper div or via CSS stretch trick.
**When to use:** D-15 — whole row navigates to `/students/[id]`.
**Example:**
```typescript
// Simple approach: onClick on TableRow with useRouter
import { useRouter } from "next/navigation";
// In a Client component wrapper, or inline in server component via a client row component:
<TableRow
  key={student.id}
  className="cursor-pointer hover:bg-muted/50"
  onClick={() => router.push(`/students/${student.id}`)}
>
```
**Note:** The current `page.tsx` is a server component. To add `onClick`, either (a) extract a `StudentTableRow` client component, or (b) keep the existing `<Link>` on the name cell and add a CSS stretch class (`after:absolute after:inset-0`) to make it cover the row. Option (a) is cleaner.

### Anti-Patterns to Avoid
- **Filtering in JS after fetching all rows:** The current `atRisk` filter does this (`result.filter(...)`). For the 3-level `riskLevel` filter, push the condition into the SQL query the same way grade filtering is done. Avoids loading all students when only a subset is needed post-pagination.
- **Separate page/total count queries without Promise.all:** Always run them in parallel.
- **Re-deriving teacher's allowed course list inside the course filter query separately from the student list query:** These share the same teacher-scoping logic — keep it consistent, don't duplicate.
- **Adding a riskLevel enum to Postgres schema in Phase 3:** Decision D-12 explicitly defers schema changes. Derive the value at query time from `graduationPlans.onTrack`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Input debounce in React | Custom setTimeout/clearTimeout in component | `useDebouncedCallback` from `use-debounce` | SSR-safe, cleanup handled, already installed |
| Offset pagination math | Custom page calculation | Drizzle `.limit(N).offset((page-1)*N)` | One-liner; no off-by-one risk |
| Distinct course names query | Manual dedup in JS | `.selectDistinct()` in Drizzle | Database-level dedup, correct ordering |
| Total count | Counting rows in JS after full fetch | `db.select({ total: count() }).from(students).where(same conditions)` | Avoids loading full result set to count it |

**Key insight:** The existing `getStudentList()` already handles the hardest part (teacher scoping via `inArray`). The pagination and course filter follow the same `conditions` array pattern — incremental additions, not rewrites.

---

## Common Pitfalls

### Pitfall 1: Counselor Scoping Bug (Already Identified)
**What goes wrong:** `conditions.push(eq(students.counselorId, viewerId))` for counselor role means counselors only see students assigned to them, not all students.
**Why it happens:** The condition was accidentally left in — counselors should behave like principals (unrestricted).
**How to avoid:** Remove the `if (viewerRole === "counselor")` branch entirely. Both counselor and principal fall through to no scoping condition (other than `isActive = true`).
**Warning signs:** A counselor with no assigned students sees an empty list.

### Pitfall 2: atRisk Post-Query Filter Breaks Pagination
**What goes wrong:** The current `atRisk` filter works by fetching ALL students then `result.filter(s => s.isAtRisk === atRisk)`. With pagination, this would filter after slicing, giving incorrect page sizes.
**Why it happens:** The filter was written before pagination existed.
**How to avoid:** Move the risk level filter into the SQL `conditions` array. Derive riskLevel from `graduationPlans.onTrack` directly in a `CASE`-style SQL expression, or use the pre-computed `onTrack` column in a condition.

Correct approach:
```typescript
// In conditions array, not post-filter:
if (riskLevel === 'at-risk') {
  conditions.push(eq(graduationPlans.onTrack, false));
} else if (riskLevel === 'on-track') {
  conditions.push(eq(graduationPlans.onTrack, true));
} else if (riskLevel === 'watch') {
  conditions.push(isNull(graduationPlans.onTrack));
}
```
**Warning signs:** Page 2 shows fewer than 25 students when a risk filter is active.

### Pitfall 3: graduationPlans LEFT JOIN Multiplies Rows
**What goes wrong:** If a student somehow has multiple graduation_plans rows (schema has a `uniqueIndex` preventing this, but worth noting), the LEFT JOIN would duplicate that student in results.
**Why it doesn't apply here:** `graduation_plans_student_id_unique` uniqueIndex enforces exactly one plan per student. Confirmed in schema.ts. No dedup needed.
**Warning signs:** Same student appears twice in the list.

### Pitfall 4: COUNT Query Must Use Same Conditions as Data Query
**What goes wrong:** If the count query doesn't include the teacher `inArray` scoping condition, teachers see incorrect total counts (showing school-wide total).
**How to avoid:** Extract a `buildConditions()` helper that both the data query and count query consume.

### Pitfall 5: Course Filter + Teacher Scoping Double-Restricts Correctly
**What goes wrong:** A teacher filtering by "Algebra I" should see only their students enrolled in Algebra I — not all students in Algebra I. The `inArray(students.id, allowedIds)` and the course enrollment subquery must both apply.
**How to avoid:** Both conditions go into the same `conditions` array — they AND together naturally.

### Pitfall 6: Page Param Out of Range
**What goes wrong:** If `?page=999` is in the URL but only 2 pages exist, the table renders empty with no explanation.
**How to avoid:** Clamp page to valid range after fetching total. If `offset >= total`, redirect to page 1 or show empty state with "No students on this page."

### Pitfall 7: TableRow onClick Requires Client Component
**What goes wrong:** `students/page.tsx` is a server component. `onClick` handlers cannot be attached in server components — TypeScript will error.
**How to avoid:** Extract a `StudentTableBody` client component that receives the row data as props and handles row clicks.

---

## Code Examples

Verified patterns from official sources and confirmed against installed packages:

### Updated GetStudentListParams type
```typescript
// src/lib/students.ts
export type RiskLevel = 'at-risk' | 'watch' | 'on-track';

export type StudentRow = {
  id: string;
  firstName: string;
  lastName: string;
  gradeLevel: number;
  counselorName: string | null;
  riskLevel: RiskLevel;  // replaces isAtRisk: boolean
};

export type GetStudentListParams = {
  search?: string;
  grade?: number;
  riskLevel?: RiskLevel;   // replaces atRisk?: boolean
  course?: string;
  page?: number;           // 1-based, defaults to 1
  limit?: number;          // defaults to 25
  viewerId: string;
  viewerRole: "principal" | "counselor" | "teacher";
};

export type StudentListResult = {
  rows: StudentRow[];
  total: number;
};
```

### useDebouncedCallback usage
```typescript
// Source: use-debounce@10.1.0 README (confirmed installed)
import { useDebouncedCallback } from 'use-debounce';

const debouncedSearch = useDebouncedCallback((val: string) => {
  update("search", val);
}, 350);
```

### Pagination controls (Claude's discretion — Previous/Next)
```typescript
// Client component receiving totalPages, currentPage props
function PaginationControls({ page, totalPages }: { page: number; totalPages: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
          Previous
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
```

### 3-level Badge rendering
```typescript
// Replaces binary isAtRisk badge in page.tsx
function RiskBadge({ riskLevel }: { riskLevel: RiskLevel }) {
  if (riskLevel === 'at-risk') return <Badge variant="destructive">At Risk</Badge>;
  if (riskLevel === 'watch') return <Badge variant="outline" className="border-yellow-500 text-yellow-700 dark:text-yellow-400">Watch</Badge>;
  return <Badge variant="secondary">On Track</Badge>;
}
```
Note: shadcn/ui Badge does not have a built-in "warning" variant. The yellow watch badge requires either `variant="outline"` with Tailwind color classes, or a custom variant. Claude's discretion on exact style.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `window["_studentSearchTimer"]` hack | `useDebouncedCallback` from use-debounce | SSR-safe, no global state leak, proper cleanup |
| `isAtRisk: boolean` in StudentRow | `riskLevel: 'at-risk' \| 'watch' \| 'on-track'` | Enables 3-level badge and filter; backward-compatible with onTrack source data |
| Post-query JavaScript filter for atRisk | SQL-level condition using `eq(graduationPlans.onTrack, ...)` / `isNull` | Required for correct pagination; filter before LIMIT/OFFSET |
| No pagination (fetches all students) | LIMIT 25 OFFSET N with total count | LIST-01 compliance; essential for schools with 500+ students |

---

## Open Questions

1. **Warning badge color for shadcn/ui**
   - What we know: shadcn Badge has variants `default`, `secondary`, `destructive`, `outline`. No `warning` variant.
   - What's unclear: Project may have a custom `warning` variant already registered via `cva` in `badge.tsx`, or it may need to be added.
   - Recommendation: Read `src/components/ui/badge.tsx` before implementing. If no warning variant, use `variant="outline"` with Tailwind yellow classes — or add a `warning` variant to the Badge component as part of this phase.

2. **isNull import from drizzle-orm**
   - What we know: The `riskLevel === 'watch'` filter requires matching students with `graduationPlans.onTrack IS NULL` (no graduation plan row, due to LEFT JOIN). This needs either Drizzle's `isNull()` function or a raw SQL condition.
   - What's unclear: Whether `isNull` is exported from drizzle-orm 0.45.1. The import list in `students.ts` shows `eq, and, or, ilike, sql, count, gte, inArray, desc` — `isNull` is not currently imported.
   - Recommendation: Add `isNull` to the drizzle-orm import. It is a standard Drizzle function available in all recent versions.

3. **StudentTableBody client component split**
   - What we know: Row `onClick` navigation requires a client component. The current `page.tsx` is a server component.
   - What's unclear: Whether to extract just the `<tbody>` rows into a client component, or the full table.
   - Recommendation: Extract a `StudentTableBody` client component that accepts `rows: StudentRow[]` as props and renders `TableRow` elements with `onClick`. Keep the `Table`, `TableHeader`, and pagination in `page.tsx` as server-rendered markup.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 3 is code-only changes to existing files. No external tools, services, or CLI utilities beyond the existing Next.js/Drizzle stack are required. The Supabase DB connection is already verified working from Phases 1–2.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.2 (unit) + Playwright 1.58.2 (E2E) |
| Config file | `vitest.config.ts` (unit), `playwright.config.ts` (E2E) |
| Quick run command | `npm run test` (vitest, unit only) |
| Full suite command | `npm run test && npm run test:e2e` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LIST-01 | `getStudentList()` returns max 25 rows and correct total | unit | `npm run test -- --reporter=verbose src/__tests__/student-list.test.ts` | ❌ Wave 0 |
| LIST-01 | Teacher sees only their students (role scoping enforced) | unit | `npm run test -- src/__tests__/student-list.test.ts` | ❌ Wave 0 |
| LIST-01 | Counselor sees all students (counselor bug fixed) | unit | `npm run test -- src/__tests__/student-list.test.ts` | ❌ Wave 0 |
| LIST-02 | Search by name returns matching students | unit | `npm run test -- src/__tests__/student-list.test.ts` | ❌ Wave 0 |
| LIST-03 | Grade filter narrows results | unit | `npm run test -- src/__tests__/student-list.test.ts` | ❌ Wave 0 |
| LIST-04 | Course filter returns students enrolled in that course | unit | `npm run test -- src/__tests__/student-list.test.ts` | ❌ Wave 0 |
| LIST-04 | `getCourseOptions()` returns only teacher's courses for teacher role | unit | `npm run test -- src/__tests__/student-list.test.ts` | ❌ Wave 0 |
| LIST-05 | `riskLevel` derives correctly from `onTrack` boolean/null | unit | `npm run test -- src/__tests__/student-list.test.ts` | ❌ Wave 0 |
| LIST-05 | Risk level filter correctly filters by at-risk/watch/on-track | unit | `npm run test -- src/__tests__/student-list.test.ts` | ❌ Wave 0 |

Note: Full E2E tests for the students page require authenticated test users with seeded data. The existing `tests/phase1.spec.ts` pattern (skip if TEST_EMAIL not set) should be followed.

### Sampling Rate
- **Per task commit:** `npm run test` (vitest unit suite)
- **Per wave merge:** `npm run test`
- **Phase gate:** `npm run test` green before `/gsd:verify-work` (E2E requires live Supabase credentials)

### Wave 0 Gaps
- [ ] `src/__tests__/student-list.test.ts` — covers LIST-01 through LIST-05 (new file needed)
- The existing `src/__tests__/role-scoping.test.ts` tests the auth contract only; student list query logic needs separate test coverage

*(Existing test infrastructure: vitest configured with `loadEnv`, `src/__tests__/` directory exists with 4 test files — framework is fully operational. Only the student-list test file is missing.)*

---

## Sources

### Primary (HIGH confidence)
- `src/lib/students.ts` — direct code inspection, identified counselor bug at line ~123 and post-query atRisk filter at line ~164
- `src/app/students/page.tsx` — confirmed server component structure, existing columns, binary badge
- `src/app/students/_components/student-filters.tsx` — confirmed window timer hack at lines 48–49
- `src/db/schema.ts` — confirmed `graduationPlans.onTrack` is `boolean | null` (Drizzle `.default(true)` but nullable), no `riskLevel` column exists
- `src/components/app-sidebar.tsx` — confirmed "Students" nav item links to `/students` (line 19)
- `node_modules/use-debounce/README.md` — confirmed `useDebouncedCallback` API, version 10.1.0
- `package.json` — confirmed all dependency versions

### Secondary (MEDIUM confidence)
- Drizzle ORM `.limit().offset()` pagination pattern — standard documented API, confirmed consistent with existing `.where(and(...conditions))` usage in `getStudentList()`
- `isNull` availability in drizzle-orm — standard export from drizzle-orm/pg-core family; not imported in `students.ts` today but is a core function

### Tertiary (LOW confidence)
- shadcn/ui Badge `warning` variant — not verified by inspecting `badge.tsx` directly; may or may not exist in this project's installation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages confirmed via package.json and node_modules inspection
- Architecture: HIGH — patterns derived from reading existing production code, not hypothetical
- Pitfalls: HIGH — counselor bug and atRisk post-filter issue are confirmed by reading source; pagination breakage with post-filter is logical consequence
- riskLevel derivation: HIGH — schema confirmed, mapping logic is deterministic from existing `onTrack` column

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (stable stack; no fast-moving dependencies)
