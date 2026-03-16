---
phase: 02-role-system-and-staff-profiles
verified: 2026-03-16T00:00:00Z
status: gaps_found
score: 11/12 must-haves verified
re_verification: false
gaps:
  - truth: "Every student profile page view is recorded in the access audit log with the viewer's ID, student ID, and timestamp"
    status: partial
    reason: "logAuditEntry() is implemented and wired to the accessAuditLog schema, but no student profile page exists yet to call it. The utility is ready; the call site is deferred to Phase 4. This is by design but means the end-to-end audit trail is not yet live."
    artifacts:
      - path: "src/lib/audit.ts"
        issue: "Exists and is correct, but only referenced in tests — no production call site in the app"
    missing:
      - "Phase 4 student profile page must import logAuditEntry and call it on every page load"
human_verification:
  - test: "Apply rls-phase2.sql to Supabase and verify teacher scoping at DB layer"
    expected: "A Supabase session with a teacher JWT can only SELECT students enrolled in that teacher's classes. A counselor/principal JWT can SELECT all students."
    why_human: "RLS policies are SQL-only; cannot verify live enforcement without a running Supabase instance and test JWTs"
  - test: "Log in as a non-principal (teacher or counselor) and navigate to /dashboard/audit-log"
    expected: "Browser is redirected to /no-access — the page does not render"
    why_human: "Role redirect in Server Component requires a live session; cannot verify statically"
  - test: "Log in as principal and navigate to /dashboard/audit-log"
    expected: "Page renders with the empty-state message 'No audit entries yet'"
    why_human: "Requires a live Supabase session with a principal role in staff_profiles"
  - test: "Open browser in incognito, navigate directly to /dashboard"
    expected: "Browser is redirected to /login by middleware"
    why_human: "Middleware behavior requires a running Next.js server to verify"
  - test: "Check sidebar footer after logging in with a staff_profiles row"
    expected: "Footer shows full name and a role badge (Teacher / Counselor / Principal)"
    why_human: "Visual UI behavior requiring a live session and staff_profiles row"
---

# Phase 2: Role System and Staff Profiles — Verification Report

**Phase Goal:** Every staff member has an assigned role stored in the database, and every data access path enforces that role before returning any student data
**Verified:** 2026-03-16
**Status:** gaps_found (1 partial gap — by design, deferred to Phase 4)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

Derived from ROADMAP.md Success Criteria and plan-level must_haves across all three plans.

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A newly created Supabase auth user can have a role assigned via the `staff_profiles` table | VERIFIED | `staffProfiles` table exists in schema.ts with `staffRoleEnum` (teacher/counselor/principal); `requireStaffProfile()` reads it correctly |
| 2 | `requireStaffProfile()` returns `{ userId, email, fullName, role }` for a user with a staff_profiles row | VERIFIED | `src/lib/auth.ts` lines 51-78: queries staffProfiles, returns all four fields |
| 3 | `requireStaffProfile()` calls `redirect("/no-access")` when no staff_profiles row found | VERIFIED | `src/lib/auth.ts` line 69: `if (!profile) { redirect("/no-access") }` |
| 4 | `requireStaffProfile()` calls `redirect("/login")` when no Supabase session exists | VERIFIED | `src/lib/auth.ts` line 59: `if (error \|\| !user) { redirect("/login") }` |
| 5 | `StaffProfile` type exported from `src/lib/auth.ts` has fields: userId, email, fullName, role | VERIFIED | Lines 38-43: exact shape confirmed |
| 6 | `logAuditEntry(viewerId, studentId)` inserts one row into `access_audit_log` | VERIFIED | `src/lib/audit.ts` line 14: `await db.insert(accessAuditLog).values({ viewerId, studentId })` |
| 7 | `access_audit_log` table defined in schema.ts with correct columns and three indexes | VERIFIED | Lines 297-316 of schema.ts: id, viewer_id, student_id, viewed_at + all three indexes confirmed |
| 8 | Unauthenticated requests to /dashboard are redirected to /login by middleware | VERIFIED | `middleware.ts`: `if (!user && !pathname.startsWith("/login"))` → redirect; matcher covers all routes except static/api/health |
| 9 | /no-access page renders explanation that the account exists but hasn't been configured | VERIFIED | `src/app/no-access/page.tsx`: "Account not configured" heading + "contact your school administrator" body |
| 10 | RLS SQL file contains role-scoped SELECT policies — counselor/principal unrestricted, teacher scoped via enrollments | VERIFIED | `supabase/rls-phase2.sql`: `counselor_principal_select_students` (role IN check) + `teacher_select_own_students` (role guard + enrollment EXISTS) |
| 11 | Sidebar footer shows staff member's full name and role badge | VERIFIED | `app-sidebar.tsx`: fetches staff_profiles, renders `<Badge variant="secondary">` with roleLabel mapping |
| 12 | /dashboard/audit-log is accessible only to principals and records audit entries | PARTIAL | Page exists and enforces principal-only access; `logAuditEntry()` is ready but has no production call site yet — no student profile page exists (Phase 4) |

**Score: 11/12 truths verified** (1 partial — deferred by design to Phase 4)

---

## Required Artifacts

### Plan 02-01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/db/schema.ts` | accessAuditLog table definition | VERIFIED | Lines 297-316; id, viewer_id, student_id, viewed_at; three indexes |
| `src/lib/auth.ts` | requireStaffProfile() and StaffProfile type | VERIFIED | Both exported; full implementation confirmed |
| `src/lib/audit.ts` | logAuditEntry() utility | VERIFIED | Exported; 2-param signature; inserts to accessAuditLog |
| `src/__tests__/staff-profiles.test.ts` | Wave 0 test stubs for AUTH-02 | VERIFIED | describe("requireStaffProfile") with 2 tests |
| `src/__tests__/role-scoping.test.ts` | Wave 0 test stubs for AUTH-03/04/05 | VERIFIED | describe("role scoping contract") with 2 tests |
| `src/__tests__/audit-log.test.ts` | Wave 0 test stubs for AUTH-06 | VERIFIED | describe("logAuditEntry") with 2 tests |

### Plan 02-02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `middleware.ts` | Session-only route protection at project root | VERIFIED | createServerClient, getUser(), matcher excludes static assets and api/health |
| `src/app/no-access/page.tsx` | /no-access route for missing staff_profiles | VERIFIED | "Account not configured" heading; no dashboard layout wrapper |
| `supabase/rls-phase2.sql` | Role-scoped SELECT policies | VERIFIED | 4 policies: counselor_principal_select_students, teacher_select_own_students, staff_insert_audit_log, principal_select_audit_log |

### Plan 02-03 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/app-sidebar.tsx` | Sidebar with name + role badge in footer | VERIFIED | Badge imported; staff_profiles fetch in useEffect; roleLabel mapping |
| `src/app/dashboard/audit-log/page.tsx` | Principal-only audit log viewer | VERIFIED | requireStaffProfile() called; principal role guard; Drizzle leftJoin query; empty state and table render |

---

## Key Link Verification

### Plan 02-01 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/auth.ts` | `src/db/schema.ts` | `import { staffProfiles } from '@/db/schema'` | WIRED | Line 4 of auth.ts confirmed |
| `src/lib/auth.ts` | `src/lib/supabase/server.ts` | `import { createClient } from '@/lib/supabase/server'` | WIRED | Line 1 of auth.ts confirmed |
| `src/lib/audit.ts` | `src/db/schema.ts` | `import { accessAuditLog } from '@/db/schema'` | WIRED | Line 2 of audit.ts confirmed |

### Plan 02-02 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `middleware.ts` | `@supabase/ssr` | `import { createServerClient } from '@supabase/ssr'` | WIRED | Line 1 of middleware.ts confirmed |
| `middleware.ts` | supabase.auth.getUser() | JWT validation before redirect decision | WIRED | Line 31 of middleware.ts; getUser() not getSession() |
| `supabase/rls-phase2.sql` | `staff_profiles.role` | EXISTS subquery checking role column | WIRED | Both student policies include role check in USING clause |

### Plan 02-03 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/components/app-sidebar.tsx` | `supabase.from('staff_profiles')` | browser Supabase client fetch in useEffect | WIRED | Lines 30-38; fetches full_name and role |
| `src/app/dashboard/audit-log/page.tsx` | `src/lib/auth.ts requireStaffProfile()` | server component auth check | WIRED | Line 16; result used at line 18 for role guard |
| `src/app/dashboard/audit-log/page.tsx` | `src/db/schema.ts accessAuditLog` | Drizzle query with leftJoin | WIRED | Lines 22-36; leftJoin to staffProfiles and students |

### Notable Unresolved Wiring (Expected — Phase 4)

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| Student profile page (future) | `src/lib/audit.ts logAuditEntry()` | call on page load | NOT YET WIRED | No student profile page exists; Phase 4 must add this call |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| AUTH-02 | 02-01, 02-03 | Staff member's role stored in staff_profiles linked to auth user | SATISFIED | staffProfiles table in schema; requireStaffProfile() reads role; sidebar Badge displays it |
| AUTH-03 | 02-01, 02-02 | Teacher can only view students in assigned classes | SATISFIED (DB layer) | teacher_select_own_students RLS policy in rls-phase2.sql with enrollment EXISTS check + role guard |
| AUTH-04 | 02-01, 02-02 | Counselor can view all students school-wide | SATISFIED (DB layer) | counselor_principal_select_students policy with role IN ('counselor', 'principal') |
| AUTH-05 | 02-01, 02-02 | Principal can view all students school-wide | SATISFIED (DB layer) | Same policy as AUTH-04 |
| AUTH-06 | 02-01, 02-03 | Every student profile view recorded in FERPA audit log | PARTIAL | logAuditEntry() ready and wired to schema; /dashboard/audit-log page reads the table; no caller exists yet — Phase 4 student profile page must add the call |

Note: AUTH-03, AUTH-04, AUTH-05 enforcement at the RLS layer requires manual application of `supabase/rls-phase2.sql` in Supabase SQL Editor. The SQL is correct but the human step has not been confirmed automated.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/app-sidebar.tsx` | 27 | `const supabase = createClient()` called in component body outside useEffect/useMemo | Warning | Creates a new Supabase client instance on every render cycle. Does not break correctness but wastes memory. Should be wrapped in `useMemo(() => createClient(), [])` or moved into the useEffect. |
| `middleware.ts` | 35 | Comment says "Allow unauthenticated access only to /login and /api/health" but redirect condition only checks `/login` | Info | api/health is excluded via the matcher regex (never reaches middleware), so the behavior is correct. The comment is slightly misleading but harmless. |

---

## Human Verification Required

### 1. RLS Policy Enforcement

**Test:** Apply `supabase/rls-phase2.sql` in Supabase SQL Editor. In Supabase Studio SQL Editor, simulate a teacher JWT by setting `request.jwt.claims` to a known teacher UUID and run `SELECT * FROM students`. Then repeat with a counselor/principal JWT.
**Expected:** Teacher session returns only students enrolled in that teacher's classes. Counselor/principal session returns all students.
**Why human:** Live RLS enforcement requires a running Supabase instance with test data and role-specific JWTs.

### 2. Audit Log — Principal Access

**Test:** Log in as a principal (a staff_profiles row with role = 'principal'). Navigate to `/dashboard/audit-log`.
**Expected:** Page renders with empty-state message "No audit entries yet."
**Why human:** Requires a live session with a principal role row in staff_profiles.

### 3. Audit Log — Non-Principal Redirect

**Test:** Log in as a teacher or counselor. Navigate to `/dashboard/audit-log`.
**Expected:** Browser is redirected to `/no-access`. The audit log table does not render.
**Why human:** Server Component redirect behavior requires a live session.

### 4. Middleware Redirect — Unauthenticated

**Test:** Open an incognito browser window with no session cookies. Navigate directly to `http://localhost:3000/dashboard`.
**Expected:** Browser is immediately redirected to `/login`.
**Why human:** Middleware execution requires a running Next.js dev or production server.

### 5. Sidebar Name and Role Badge

**Test:** Log in with a user that has a row in staff_profiles with fullName set. Observe the sidebar footer.
**Expected:** Footer shows the staff member's full name and a badge reading "Teacher", "Counselor", or "Principal" in the secondary variant style.
**Why human:** Visual UI rendering requires a live session and a staff_profiles row with a name value.

---

## Gaps Summary

**One partial gap identified — AUTH-06 end-to-end wiring is incomplete by design.**

`logAuditEntry()` is fully implemented and correctly wired to the `accessAuditLog` schema table. The `/dashboard/audit-log` principal page reads from the table correctly. However, the function has no production call site in the app: no student profile page exists yet. The Phase 2 plan documents explicitly note that `logAuditEntry()` "is ready to be called from student profile page views (Phase 3/4)."

This gap is architectural staging — not a bug or an omission. The utility is built; Phase 4 must call it when building the student profile page. The phase goal states "every data access path enforces that role before returning any student data" — since no student data access paths exist in the app yet (student list and profile pages are Phases 3 and 4), the role enforcement infrastructure is fully in place and ready for those paths to be built against.

The five human verification items above are confirmations of correct behavior that cannot be asserted statically. All automated checks pass.

**No blocker gaps. Phase 2 infrastructure is complete. Phase 3 (Student List) can proceed.**

---

_Verified: 2026-03-16_
_Verifier: Claude (gsd-verifier)_
