# Phase 2: Role System and Staff Profiles - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire staff roles from `staff_profiles` to every data access path. This phase delivers: the `requireStaffProfile()` auth helper, RLS policies for authenticated staff, a new `access_audit_log` table, Next.js route-protection middleware, sidebar role display, a `/no-access` error page, and a principal-only audit log viewer. Phase 3 builds the student list UI that uses this role-scoped foundation.

Creating or changing role assignments is out of scope — v1 uses manual DB inserts via Supabase dashboard.

</domain>

<decisions>
## Implementation Decisions

### Role Assignment
- Roles are assigned manually via the Supabase dashboard (insert row into `staff_profiles` with auth user's ID and role — no in-app UI for this)
- This is a deliberate v1 choice for a pilot school with a small, known staff

### No-Profile Handling
- If a logged-in user has no `staff_profiles` row, redirect to a `/no-access` page explaining their account isn't configured yet
- Do NOT fall back to a default role — treat missing profile as access denied

### Sidebar
- Sidebar footer shows the staff member's full name and a role badge (e.g., "Teacher", "Counselor", "Principal")
- Requires fetching the staff profile on sidebar load
- Currently shows email only — Phase 2 upgrades this to name + role badge

### requireStaffProfile() Helper
- Replace/extend `requireUser()` with `requireStaffProfile()` in `src/lib/auth.ts`
- Returns full staff profile: `{ userId, email, fullName, role }` or a 401/403 response
- Callers are responsible for role checking — the helper does not enforce a minimum role
- This contract is the single source of auth truth for all future phases (3–7)

### Audit Log Table
- Phase 2 adds `access_audit_log` table via a new Drizzle migration (SQL applied in Supabase SQL editor)
- Columns: `id` (uuid pk), `viewer_id` (uuid → staff_profiles.id), `student_id` (uuid → students.id), `viewed_at` (timestamptz defaultNow)
- Minimal FERPA-compliant set — viewer ID, student ID, timestamp
- Write-only for all phases except the audit log admin page
- A `logAuditEntry(viewerId, studentId)` utility function handles inserts

### Audit Log Admin View
- Phase 2 builds a principal-only page at `/admin/audit-log` (or `/dashboard/audit-log`)
- Shows recent access entries: viewer name, student ID/name, timestamp
- Will display empty state until Phase 4 starts logging profile views
- Accessible only to principal role — other roles receive a 403

### Route Protection (Middleware)
- Add `middleware.ts` at project root
- Checks for a valid Supabase session on every request
- Redirects unauthenticated users to `/login`
- Public routes (no redirect): `/login`, `/api/health`
- Does NOT make a DB call — session check only (no `staff_profiles` lookup in middleware)
- The `requireStaffProfile()` helper handles the no-profile case inside server components and actions

### RLS Policies
- Phase 2 adds authenticated SELECT policies on top of Phase 1's deny-all-anon baseline
- Teacher: can select students where an enrollment exists via their classes
- Counselor/Principal: unrestricted select on students
- Policies live in a new `supabase/rls-phase2.sql` file (follows Phase 1 pattern)

### Claude's Discretion
- Exact `/no-access` page design and copy
- Audit log table name (e.g., `access_audit_log`)
- Whether `logAuditEntry` is a server action or plain async function
- Exact role badge visual style in sidebar
- Middleware matcher pattern

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and scope
- `.planning/REQUIREMENTS.md` — AUTH-02 through AUTH-06 define exactly what Phase 2 must deliver
- `.planning/ROADMAP.md` §Phase 2 — success criteria (4 verifiable conditions)

### Existing auth and schema
- `src/lib/auth.ts` — `requireUser()` to be extended into `requireStaffProfile()`
- `src/db/schema.ts` — `staffProfiles` table, `staffRoleEnum` (teacher/counselor/principal), `enrollments` and `classes` tables (used for teacher scoping)
- `supabase/rls.sql` — Phase 1 RLS baseline; Phase 2 appends role-scoped policies

### Migration constraint
- `.planning/phases/01-foundation-and-schema/01-05-SUMMARY.md` §key-decisions — migrations must be applied via Supabase SQL editor (IPv6-only DB, drizzle-kit push unreachable from dev machine). Phase 2 follows the same pattern: generate SQL with `db:generate`, apply manually.

### Existing UI integration points
- `src/components/app-sidebar.tsx` — sidebar component to update with name + role badge
- `src/app/layout.tsx` — root layout (middleware integrates at project root, not here)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/supabase/server.ts` — `createClient()` for server components and actions; Phase 2 uses this in `requireStaffProfile()` and the audit log utility
- `src/lib/supabase/client.ts` — browser client; sidebar uses this for session/email, will switch to profile fetch
- `src/components/ui/` — shadcn/ui components available (Badge for role display, Table for audit log viewer)
- `requireUser()` in `src/lib/auth.ts` — returns `{ userId, error }`; Phase 2 replaces or extends this

### Established Patterns
- Server auth check pattern: `const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser()` — Phase 2 follows this, then adds the `staff_profiles` lookup
- RLS SQL files live in `supabase/` — Phase 2 adds `supabase/rls-phase2.sql`
- Migration SQL is manually applied via Supabase SQL editor; generated by `npm run db:generate`

### Integration Points
- All future server actions (Phases 3–7) will call `requireStaffProfile()` — the contract must be stable
- `AppSidebar` currently fetches user via `supabase.auth.getUser()` on the client; Phase 2 changes this to also fetch the `staff_profiles` row for name + role
- Middleware sits at project root `middleware.ts` — Next.js picks it up automatically

</code_context>

<specifics>
## Specific Ideas

- No specific UI references given — open to standard shadcn/ui patterns for badge and table components
- The `/no-access` page should communicate clearly that the account exists but hasn't been configured, so the user knows to contact their admin

</specifics>

<deferred>
## Deferred Ideas

- Admin UI for assigning/changing staff roles — already tracked as ADMIN-01 in v2 requirements
- Audit log export (CSV) — not needed for v1

</deferred>

---

*Phase: 02-role-system-and-staff-profiles*
*Context gathered: 2026-03-16*
