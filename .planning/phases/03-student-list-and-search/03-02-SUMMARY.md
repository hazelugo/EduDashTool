---
phase: 03-student-list-and-search
plan: "02"
subsystem: student-list-ui
tags: [react, client-component, debounce, url-params, filters]

requires:
  - phase: 03-01
    provides: RiskLevel type, getCourseOptions, updated getStudentList with riskLevel/course params
provides:
  - StudentFilters client component with 4 filter controls (search, grade, course, riskLevel)
  - useDebouncedCallback-based search (SSR-safe, no window timer hack)
  - Course dropdown driven by courseOptions prop
  - 3-level risk select (at-risk/watch/on-track) aligned with RiskLevel type
affects: [03-03-student-list-page-integration]

tech-stack:
  added: []
  patterns: [url-param-driven-filters, debounced-search, page-reset-on-filter-change]

key-files:
  created: []
  modified:
    - src/app/students/_components/student-filters.tsx

key-decisions:
  - "useDebouncedCallback from use-debounce replaces window timer hack — SSR-safe, no global state"
  - "params.delete('page') on every filter update resets pagination to page 1 on filter change"
  - "courseOptions passed as prop from server component — keeps client component dumb, role-scoping in server"
  - "riskLevel replaces atRisk prop — aligns with 3-level RiskLevel type from Plan 01"

patterns-established:
  - "Filter-to-URL pattern: every filter change calls update(key, value) which push-replaces URL params"
  - "Debounce pattern: useDebouncedCallback(fn, 350) wraps update() for text inputs"

requirements-completed: [LIST-02, LIST-04, LIST-05]

duration: 8min
completed: "2026-04-10"
---

# Phase 3 Plan 2: StudentFilters Rewrite Summary

**StudentFilters client component rewritten with useDebouncedCallback search, role-scoped course dropdown, and 3-level risk level select — all driving URL params with page reset.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-10T18:20:00Z
- **Completed:** 2026-04-10T18:28:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Fixed D-17: replaced `window["_studentSearchTimer"]` timer hack with `useDebouncedCallback` from `use-debounce` — SSR-safe and idiomatic
- Added Course dropdown that renders role-scoped course names from `courseOptions: string[]` prop
- Upgraded risk level select from binary (at-risk/on-track) to 3-level (at-risk/watch/on-track) matching `RiskLevel` type from Plan 01
- All filter changes now delete the `page` param, resetting pagination to page 1

## Task Commits

1. **Task 1: Rewrite StudentFilters with debounce fix, course dropdown, and 3-level risk select** - `4a2e46d` (feat)

## Files Created/Modified

- `src/app/students/_components/student-filters.tsx` - Rewrote with useDebouncedCallback, courseOptions prop, 3-level risk select, page-reset on filter change

## Decisions Made

- `useDebouncedCallback` from `use-debounce` (already installed at ^10.1.0) — no new dependencies needed
- Course options passed as `courseOptions: string[]` prop — server component fetches and passes them; client component stays stateless
- `riskLevel` prop replaces `atRisk` prop throughout — matches the `RiskLevel` type contract from Plan 01

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- Pre-existing vitest failures in worktree due to missing `DATABASE_URL` in `.env.local` — unrelated to this plan's changes, all 10 type-shape tests that don't require DB continue to pass.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None — the component is fully wired to props. `courseOptions` will be populated by the server component calling `getCourseOptions()` in Plan 03-03.

## Next Phase Readiness

- StudentFilters component is ready for integration into `students/page.tsx` (Plan 03-03)
- Plan 03-03 must: call `getCourseOptions()`, pass it as prop, update searchParams interface to use `riskLevel` and `course`, call `getStudentList()` with new params
- No blockers

---
*Phase: 03-student-list-and-search*
*Completed: 2026-04-10*
