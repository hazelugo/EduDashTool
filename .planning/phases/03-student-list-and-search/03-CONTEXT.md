# Phase 3: Student List and Search - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a fully functional student list at `/students`: paginated (25/page, offset), searchable by name, filterable by grade, class/course, and risk level, and role-scoped so teachers see only their students while counselors and principals see all.

A significant amount of Phase 3 code already exists (see Existing Code Insights below). Phase 3's job is to complete what's missing and fix known bugs — not rewrite what works.

Out of scope: student profile detail page (Phase 4), data entry forms (Phase 5), real Gemini risk scores (Phase 6).

</domain>

<decisions>
## Implementation Decisions

### Pagination
- **D-01:** Offset-based pagination — page 1, 2, 3 with Previous/Next buttons
- **D-02:** 25 students per page
- **D-03:** Page number carried in URL query param (`?page=2`) so pages are shareable/deep-linkable
- **D-04:** Pagination controls appear at the bottom of the table

### Class/Course Filter (LIST-04)
- **D-05:** A "Course" dropdown lists all unique course names available to the viewer (e.g. "Algebra I", "English 10")
- **D-06:** Role-scoped options — teachers see only courses they teach; counselors and principals see all course names school-wide
- **D-07:** Filter value is the course **name** (not section ID) — selecting "Algebra I" shows all students enrolled in any section of that course
- **D-08:** Filter integrates with existing URL param pattern (`?course=Algebra+I`)

### Risk Level — 3-Level Enum (LIST-05)
- **D-09:** Add a `riskLevel` field with three values: `'at-risk'` / `'watch'` / `'on-track'`
- **D-10:** Phase 3 seeds placeholder values: derive from existing `graduationPlans.onTrack` — `onTrack = false` → `'at-risk'`, `onTrack = true` → `'on-track'`, `onTrack = null` → `'watch'` (no plan yet)
- **D-11:** The filter UI (dropdown with three options) is built and functional in Phase 3 using these placeholder values
- **D-12:** Phase 6 replaces placeholder logic with real Gemini-generated risk scores — no schema migration needed if `riskLevel` is computed/stored in `ai_insights` table

### Row Layout
- **D-13:** Keep existing columns: Name, Grade, Counselor, Status
- **D-14:** Status badge upgraded from binary (At Risk / On Track) to 3-level: At Risk (destructive), Watch (warning/yellow), On Track (secondary)
- **D-15:** Whole table row is clickable — navigates to `/students/[id]`

### Bug Fixes (identified from code review)
- **D-16:** Counselor scoping bug — `getStudentList()` currently adds `eq(students.counselorId, viewerId)` for counselor role, which is wrong. Counselors must see ALL active students, not just those they're assigned to. Fix: remove that condition for counselor role (same as principal).
- **D-17:** Search debounce — current implementation uses a `window` timer hack. Should switch to the installed `use-debounce` package (`useDebounce` hook or `useDebouncedCallback`).

### Claude's Discretion
- Exact pagination control component style (Previous/Next buttons vs numbered page pills)
- Loading skeleton design for the table
- Empty state copy when no students match filters
- Whether to show total student count alongside pagination ("Showing 26–50 of 312 students")
- Error boundary content for the students page

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and scope
- `.planning/REQUIREMENTS.md` — LIST-01 through LIST-05 define Phase 3 acceptance criteria
- `.planning/ROADMAP.md` §Phase 3 — success criteria (4 verifiable conditions)

### Existing student list implementation (partially done — read before modifying)
- `src/app/students/page.tsx` — existing list page with table, search, grade, and at-risk filter
- `src/app/students/_components/student-filters.tsx` — client-side filter bar (Input + Select components)
- `src/lib/students.ts` — `getStudentList()` query (role scoping, search, grade, atRisk params)

### Schema and auth contracts
- `src/db/schema.ts` — `students`, `enrollments`, `classes`, `staffProfiles`, `graduationPlans` tables
- `src/lib/auth.ts` — `requireStaffProfile()` returns `{ userId, email, fullName, role }`

### UI components available (shadcn/ui)
- `src/components/ui/` — Table, Badge, Select, Input, Skeleton, Button all installed

### Migration constraint
- `.planning/phases/01-foundation-and-schema/01-05-SUMMARY.md` §key-decisions — migrations must be applied via Supabase SQL editor (IPv6-only DB). If Phase 3 adds any schema fields, same pattern applies.

</canonical_refs>

<code_context>
## Existing Code Insights

### What's Already Built (do not rewrite)
- `src/app/students/page.tsx` — Server component; calls `requireStaffProfile()`, calls `getStudentList()`, renders a shadcn Table with search and filter state from URL params
- `src/app/students/_components/student-filters.tsx` — Client component; Input (search with 350ms debounce via window timer), two Select dropdowns (grade, at-risk), all updating URL params via `router.push`
- `src/lib/students.ts` — `getStudentList()` handles teacher/counselor/principal scoping, `ilike` name search, grade filter, atRisk filter; returns `StudentRow[]`

### Known Bugs to Fix
- **Counselor scoping bug** in `getStudentList()` (line ~108): `conditions.push(eq(students.counselorId, viewerId))` — should be removed. Counselors see ALL students, not just those assigned to them.
- **Search debounce hack**: `student-filters.tsx` uses `window["_studentSearchTimer"]` — replace with `useDebouncedCallback` from `use-debounce` package (already installed: `use-debounce@10.1.0`).

### What's Missing
- Pagination (no `LIMIT`/`OFFSET` in query, no page controls in UI) — LIST-01
- Class/course filter dropdown — LIST-04 (new Select in filter bar + `course` param in `getStudentList`)
- 3-level risk badge (currently binary `isAtRisk: boolean`) — LIST-05
- Nav link to `/students` (verify it exists in `src/components/app-sidebar.tsx`)

### Established Patterns
- Server components fetch data, pass to client components as props (no client-side fetching)
- URL search params are the state layer for filters — `router.push` on change, read from `searchParams` prop in server component
- shadcn/ui Table + Badge + Select + Input — use these, don't introduce new component libraries

### Integration Points
- `src/app/students/[id]/page.tsx` exists (Phase 4's placeholder) — row clicks must route here
- `src/components/app-sidebar.tsx` — verify "Students" nav item links to `/students`

</code_context>

<specifics>
## Specific Ideas

- Whole-row click (not just name link) for navigating to student profile
- Risk badge: 3-level visual — At Risk (red/destructive), Watch (yellow/warning), On Track (gray/secondary)
- "Showing X–Y of Z students" count line above or below the table (Claude's discretion on exact placement)

</specifics>

<deferred>
## Deferred Ideas

- Real Gemini risk scores in the filter — Phase 6 populates `ai_insights` table with actual at-risk analysis
- Bulk actions (select multiple students) — v2 scope
- Export to CSV — v2 scope
- Column sorting (click column header to sort) — not in LIST-01 through LIST-05; could be added in Phase 7 polish

</deferred>

---

*Phase: 03-student-list-and-search*
*Context gathered: 2026-04-09*
