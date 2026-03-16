# Phase 2: Role System and Staff Profiles - Research

**Researched:** 2026-03-16
**Domain:** Next.js middleware, Supabase RLS, Drizzle ORM, FERPA audit logging, role-scoped query patterns
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Roles are assigned manually via the Supabase dashboard (insert row into `staff_profiles` with auth user's ID and role — no in-app UI for this). This is a deliberate v1 choice for a pilot school with a small, known staff.
- If a logged-in user has no `staff_profiles` row, redirect to a `/no-access` page explaining their account isn't configured yet. Do NOT fall back to a default role — treat missing profile as access denied.
- Sidebar footer shows the staff member's full name and a role badge (e.g., "Teacher", "Counselor", "Principal"). Requires fetching the staff profile on sidebar load. Currently shows email only — Phase 2 upgrades this to name + role badge.
- Replace/extend `requireUser()` with `requireStaffProfile()` in `src/lib/auth.ts`. Returns full staff profile: `{ userId, email, fullName, role }` or a 401/403 response. Callers are responsible for role checking — the helper does not enforce a minimum role. This contract is the single source of auth truth for all future phases (3–7).
- Phase 2 adds `access_audit_log` table via a new Drizzle migration (SQL applied in Supabase SQL editor). Columns: `id` (uuid pk), `viewer_id` (uuid → staff_profiles.id), `student_id` (uuid → students.id), `viewed_at` (timestamptz defaultNow). Minimal FERPA-compliant set — viewer ID, student ID, timestamp. Write-only for all phases except the audit log admin page. A `logAuditEntry(viewerId, studentId)` utility function handles inserts.
- Phase 2 builds a principal-only page at `/admin/audit-log` (or `/dashboard/audit-log`). Shows recent access entries: viewer name, student ID/name, timestamp. Will display empty state until Phase 4 starts logging profile views. Accessible only to principal role — other roles receive a 403.
- Add `middleware.ts` at project root. Checks for a valid Supabase session on every request. Redirects unauthenticated users to `/login`. Public routes (no redirect): `/login`, `/api/health`. Does NOT make a DB call — session check only (no `staff_profiles` lookup in middleware). The `requireStaffProfile()` helper handles the no-profile case inside server components and actions.
- Phase 2 adds authenticated SELECT policies on top of Phase 1's deny-all-anon baseline. Teacher: can select students where an enrollment exists via their classes. Counselor/Principal: unrestricted select on students. Policies live in a new `supabase/rls-phase2.sql` file (follows Phase 1 pattern).

### Claude's Discretion

- Exact `/no-access` page design and copy
- Audit log table name (e.g., `access_audit_log`)
- Whether `logAuditEntry` is a server action or plain async function
- Exact role badge visual style in sidebar
- Middleware matcher pattern

### Deferred Ideas (OUT OF SCOPE)

- Admin UI for assigning/changing staff roles — already tracked as ADMIN-01 in v2 requirements
- Audit log export (CSV) — not needed for v1
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-02 | Staff member's role (teacher, counselor, principal) is stored in a `staff_profiles` table linked to their auth user | `staff_profiles` table already migrated with `staffRoleEnum`; `requireStaffProfile()` reads it |
| AUTH-03 | Teacher can only view students enrolled in classes they are assigned to teach | RLS EXISTS subquery on `enrollments` + `classes.teacher_id`; application-layer WHERE clause joins same tables |
| AUTH-04 | Counselor can view all students school-wide | RLS `TO authenticated` unrestricted SELECT; `requireStaffProfile()` returns `role = 'counselor'` — no WHERE scoping added |
| AUTH-05 | Principal can view all students school-wide | Same as AUTH-04 but `role = 'principal'` |
| AUTH-06 | Every student profile page view is recorded in a FERPA-compliant access audit log (who viewed which student, when) | New `access_audit_log` table migration + `logAuditEntry()` utility; principal-only admin view |
</phase_requirements>

---

## Summary

Phase 2 wires the existing `staff_profiles` table (already in schema) into every data access path. The core deliverable is `requireStaffProfile()` — a server-side auth helper that returns a typed profile or redirects, becoming the single entry point for all role-aware code in future phases. Supporting deliverables are: Next.js middleware for session-level route protection, Supabase RLS policies for authenticated staff, the `access_audit_log` table for FERPA compliance, a sidebar upgrade showing name and role, a `/no-access` error page, and a principal-only audit log viewer page.

The architecture has one critical constraint from Phase 1: the Drizzle `db` client connects directly to Postgres via the `DATABASE_URL` (transaction pool) and **bypasses RLS entirely**. Every Drizzle query that touches student data MUST include explicit `WHERE` clauses for teacher scoping. RLS protects the Supabase browser/server clients only — it is a second layer, not a substitute for application-layer query scoping.

Migrations follow the established Phase 1 pattern: generate SQL via `npm run db:generate`, apply manually in the Supabase SQL editor (the database host is IPv6-only and unreachable from the dev machine via drizzle-kit push).

**Primary recommendation:** Implement `requireStaffProfile()` first and make it the gatekeeper for all other tasks in this phase — every other deliverable depends on it.

---

## Standard Stack

### Core (already installed — no new installs required)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/ssr` | ^0.9.0 | Server-side Supabase client + middleware session handling | Already in use; `createServerClient` works in both middleware and Server Components |
| `drizzle-orm` | ^0.45.1 | ORM for `access_audit_log` migration + inserts | Already established; Phase 1 pattern |
| `next` | 16.1.6 | `middleware.ts` at project root for route protection | App Router picks it up automatically |
| `shadcn/ui` | ^4.0.2 | `Badge` component for role display; `Table` for audit log viewer | Already installed; consistent with existing UI |

### No New Packages Required

Phase 2 uses only what is already installed. No `npm install` step needed.

---

## Architecture Patterns

### Recommended File Structure (new files for this phase)

```
middleware.ts                          # project root — session check, redirect to /login
supabase/rls-phase2.sql               # authenticated SELECT policies (applied manually)
src/
├── lib/
│   └── auth.ts                       # extend: add requireStaffProfile()
├── db/
│   └── schema.ts                     # add accessAuditLog table
├── app/
│   ├── no-access/
│   │   └── page.tsx                  # shown when staff_profiles row is missing
│   └── dashboard/
│       └── audit-log/
│           └── page.tsx              # principal-only audit log viewer
└── components/
    └── app-sidebar.tsx               # upgrade footer: email → fullName + role badge
```

### Pattern 1: Next.js Middleware for Session-Only Protection

Middleware runs before every request. It uses `createServerClient` from `@supabase/ssr` and calls `supabase.auth.getUser()` to validate the JWT. If no session exists, redirect to `/login`. If session exists, pass through — no DB call.

The official `@supabase/ssr` pattern requires passing `response.cookies.set` for the middleware environment (unlike server components which use `cookieStore.set`):

```typescript
// middleware.ts — Source: https://supabase.com/docs/guides/auth/server-side/creating-a-client
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|api/health).*)',
  ],
}
```

**Key detail:** The cookie API in middleware differs from server components. The middleware environment does not use `cookies()` from `next/headers` — it reads from `request.cookies` and writes to `response.cookies` directly. The existing `src/lib/supabase/server.ts` pattern does NOT work in middleware.

### Pattern 2: requireStaffProfile() — The Auth Helper

This replaces `requireUser()` as the single auth entry point. It calls the existing `createClient()` from `src/lib/supabase/server.ts`, gets the user, then does a Drizzle query for the `staff_profiles` row.

```typescript
// src/lib/auth.ts — extended pattern
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { staffProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export type StaffProfile = {
  userId: string;
  email: string;
  fullName: string | null;
  role: "teacher" | "counselor" | "principal";
};

export async function requireStaffProfile(): Promise<StaffProfile> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const [profile] = await db
    .select()
    .from(staffProfiles)
    .where(eq(staffProfiles.id, user.id))
    .limit(1);

  if (!profile) {
    redirect("/no-access");
  }

  return {
    userId: user.id,
    email: user.email ?? profile.email,
    fullName: profile.fullName,
    role: profile.role,
  };
}
```

**Important contract detail:** This function uses `redirect()` from `next/navigation` (throws internally), not `NextResponse`. It is designed for Server Components and Server Actions — callers do not need to check a return value for redirect cases. The old `requireUser()` returned `{ userId: null, error: NextResponse }` — this new contract is simpler and appropriate for the App Router pattern.

### Pattern 3: RLS Policies for Authenticated Staff

Phase 2 adds SELECT policies for authenticated users. The deny-all-anon baseline from Phase 1 remains. RLS only protects queries going through the Supabase client (browser/server) — Drizzle queries bypass RLS.

```sql
-- supabase/rls-phase2.sql

-- Counselor and Principal: unrestricted SELECT on students
CREATE POLICY "authenticated_staff_select_students"
ON students FOR SELECT TO authenticated
USING (true);

-- Teacher: can only SELECT students enrolled in their classes
-- Uses EXISTS subquery joining enrollments → classes → teacher_id
CREATE POLICY "teacher_select_own_students"
ON students FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM enrollments e
    JOIN classes c ON e.class_id = c.id
    WHERE e.student_id = students.id
      AND c.teacher_id = (SELECT auth.uid())
  )
);
```

**Critical decision:** The two policies above CONFLICT — both would apply to all authenticated users, so a teacher would also match the unrestricted policy. To scope teachers correctly, add a `staff_role` check inside the teacher policy and restrict the unrestricted policy to non-teacher roles:

```sql
-- Counselor + Principal: unrestricted SELECT
CREATE POLICY "counselor_principal_select_students"
ON students FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff_profiles
    WHERE id = (SELECT auth.uid())
      AND role IN ('counselor', 'principal')
  )
);

-- Teacher: scoped SELECT via enrollments
CREATE POLICY "teacher_select_own_students"
ON students FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff_profiles sp
    WHERE sp.id = (SELECT auth.uid()) AND sp.role = 'teacher'
  )
  AND
  EXISTS (
    SELECT 1 FROM enrollments e
    JOIN classes c ON e.class_id = c.id
    WHERE e.student_id = students.id
      AND c.teacher_id = (SELECT auth.uid())
  )
);
```

**Note:** RLS policy design requires care when multiple policies apply to the same table and role. Supabase uses OR semantics for multiple SELECT policies — all matching policies are combined with OR, meaning the least-restrictive one wins. The role-check inside each policy is the correct way to prevent leakage.

### Pattern 4: access_audit_log Drizzle Schema + Migration

```typescript
// Addition to src/db/schema.ts
export const accessAuditLog = pgTable(
  "access_audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    viewerId: uuid("viewer_id")
      .notNull()
      .references(() => staffProfiles.id),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    viewedAt: timestamp("viewed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("access_audit_log_viewer_idx").on(t.viewerId),
    index("access_audit_log_student_idx").on(t.studentId),
    index("access_audit_log_viewed_at_idx").on(t.viewedAt),
  ]
);
```

Generate SQL with `npm run db:generate`, then apply manually in Supabase SQL editor — same process as Phase 1.

### Pattern 5: logAuditEntry() Utility

This is a plain async function (not a Server Action) because it will be called from within server actions and server components that are already in a server context. Server Actions add an HTTP boundary — unnecessary here since this is internal.

```typescript
// src/lib/audit.ts (new file)
import { db } from "@/db";
import { accessAuditLog } from "@/db/schema";

export async function logAuditEntry(
  viewerId: string,
  studentId: string
): Promise<void> {
  await db.insert(accessAuditLog).values({ viewerId, studentId });
}
```

### Pattern 6: Sidebar Upgrade

The sidebar is a Client Component (`"use client"`) that currently fetches email via `supabase.auth.getUser()`. Phase 2 changes it to also fetch the `staff_profiles` row using the browser Supabase client. This stays client-side to avoid converting the sidebar to a Server Component (which would require threading profile data through layout).

```typescript
// New state in AppSidebar
const [profile, setProfile] = useState<{ fullName: string | null; role: string } | null>(null)

useEffect(() => {
  supabase.auth.getUser().then(async ({ data: { user } }) => {
    if (!user) return;
    const { data } = await supabase
      .from("staff_profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();
    if (data) setProfile({ fullName: data.full_name, role: data.role });
  });
}, []);
```

Role badge: use shadcn `<Badge>` with a variant. Map role to display text: `teacher` → "Teacher", `counselor` → "Counselor", `principal` → "Principal".

### Anti-Patterns to Avoid

- **Using `getSession()` instead of `getUser()` for auth validation**: `getSession()` reads from cookie without validating the JWT signature. Use `getUser()` which validates against Supabase's public keys. (Source: Supabase official docs)
- **Putting `staff_profiles` lookup in middleware**: The middleware decision explicitly rejects this — session check only in middleware, DB lookup only in `requireStaffProfile()`. Mixing the two makes middleware slower and breaks the separation of concerns.
- **Relying on RLS alone for teacher scoping**: Drizzle's `db` client uses `DATABASE_URL` (Postgres direct), not the Supabase client, so RLS does not apply. Every query returning student data for a teacher must add a WHERE/JOIN clause in the application layer.
- **Using `NextResponse.json({ error: "Forbidden" })` in Server Components**: Server Components use `redirect()` from `next/navigation`, not NextResponse. The new `requireStaffProfile()` uses `redirect()` — reserve NextResponse for API route handlers only.
- **Conflicting unrestricted RLS policies**: If an unrestricted `TO authenticated USING (true)` policy is added without role scoping, it matches teachers too, defeating the teacher scoping policy. Every policy on the students table needs a role check in the USING clause.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session refresh in middleware | Custom JWT parsing | `supabase.auth.getUser()` in middleware | Supabase handles token refresh and signature validation |
| Role badge display | Custom CSS pill | `<Badge>` from `@/components/ui/badge` | Already installed via shadcn; consistent styling |
| Audit log table | Custom logging service | Drizzle insert to `access_audit_log` | Simple insert pattern already established; no external service needed |
| Middleware route matching | Custom regex routing | Next.js `config.matcher` in `middleware.ts` | Built-in, processed at edge before middleware runs |

**Key insight:** The entire auth surface here is Supabase primitives + one Drizzle table. There is no complex auth library needed.

---

## Common Pitfalls

### Pitfall 1: RLS Policy Leakage via OR Semantics

**What goes wrong:** Adding `CREATE POLICY ... USING (true)` for all authenticated users means teachers can see all students, because Supabase combines multiple SELECT policies with OR. The teacher-scoped policy is irrelevant once an unrestricted policy exists for the same role target.

**Why it happens:** Developers write the counselor/principal policy first with `TO authenticated USING (true)`, then add the teacher policy thinking it overrides — it does not.

**How to avoid:** Every policy on the `students` table must include a role check in USING. The counselor/principal policy uses `IN ('counselor', 'principal')`, the teacher policy uses `AND role = 'teacher'`. Never use bare `TO authenticated USING (true)` on tables with multi-role access rules.

**Warning signs:** A teacher login can retrieve students outside their classes in a quick SQL test via the Supabase dashboard's SQL editor using `SET role = authenticated; SET request.jwt.claims = '{"sub": "<teacher-uuid>"}';`.

### Pitfall 2: Drizzle Bypasses RLS

**What goes wrong:** Developer writes RLS policies, tests them in the Supabase dashboard (which uses the Supabase client), marks them as working, then Phase 3 queries via Drizzle return all students regardless of role.

**Why it happens:** `DATABASE_URL` connects to Postgres directly as the database user, not as an authenticated Supabase user. RLS `auth.uid()` returns NULL in this context — policies that check `auth.uid()` silently allow all queries through (or block them, depending on policy default).

**How to avoid:** Application-layer WHERE clauses are mandatory for teacher scoping in Drizzle queries. RLS is a defense-in-depth measure for the browser/Supabase client path, not the primary enforcement mechanism for server actions.

**Warning signs:** If a Drizzle query for teacher-scoped students doesn't have an explicit `.where(inArray(students.id, enrolledStudentIds))` or equivalent JOIN, it's wrong.

### Pitfall 3: Middleware Cookie API vs Server Component Cookie API

**What goes wrong:** Developer copies the `createServerClient` call from `src/lib/supabase/server.ts` into `middleware.ts` — it imports `cookies` from `next/headers` and fails because `next/headers` is not available in Edge Runtime middleware.

**Why it happens:** The middleware runs in Edge Runtime where `next/headers` APIs are not available. The cookie interface must use `request.cookies.getAll()` and `response.cookies.set()` instead.

**How to avoid:** Middleware must use its own `createServerClient` call with the request/response cookie pattern shown in Pattern 1. Do NOT import from `src/lib/supabase/server.ts` in middleware.

**Warning signs:** Runtime error: "cookies is not available in the Edge runtime" or "Cannot read properties of undefined reading 'getAll'".

### Pitfall 4: requireStaffProfile() Called in API Route Handlers

**What goes wrong:** A future developer uses `requireStaffProfile()` in an API route handler expecting `NextResponse` on failure, but gets a Next.js redirect thrown instead, causing an unhandled exception.

**Why it happens:** `redirect()` from `next/navigation` throws a special Next.js error internally. In Server Components and Server Actions this is caught by the framework. In API route handlers, it is not caught properly.

**How to avoid:** Keep `requireUser()` for API route handlers that need `NextResponse`. `requireStaffProfile()` is exclusively for Server Components and Server Actions. Document this contract in `src/lib/auth.ts` with a comment.

### Pitfall 5: staff_profiles.id Must Equal auth.users.id

**What goes wrong:** A manually inserted `staff_profiles` row uses `gen_random_uuid()` as the `id` instead of the actual Supabase auth user UUID. RLS policies using `auth.uid()` then never match, and `requireStaffProfile()` returns no profile, sending the user to `/no-access`.

**Why it happens:** The schema comment (`-- id has NO defaultRandom() — must be set to match auth.users.id`) is easily missed when inserting manually via the dashboard.

**How to avoid:** Document the insert procedure in the planner's task instructions. The `id` column for `staff_profiles` MUST be the UUID from the Supabase auth dashboard's "Users" tab.

---

## Code Examples

### Checking Role in a Server Action (after requireStaffProfile)

```typescript
// Source: Pattern established in Phase 2
import { requireStaffProfile } from "@/lib/auth";

export async function someServerAction() {
  const profile = await requireStaffProfile();
  // profile.role is "teacher" | "counselor" | "principal"

  if (profile.role !== "principal") {
    throw new Error("Forbidden"); // or redirect to /no-access
  }
  // ... proceed
}
```

### Teacher-Scoped Drizzle Query (application layer enforcement)

```typescript
// For teacher: get only students in their classes
import { db } from "@/db";
import { students, enrollments, classes } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

async function getTeacherStudents(teacherId: string) {
  // Step 1: get class IDs for this teacher
  const teacherClasses = await db
    .select({ id: classes.id })
    .from(classes)
    .where(eq(classes.teacherId, teacherId));

  const classIds = teacherClasses.map(c => c.id);
  if (classIds.length === 0) return [];

  // Step 2: get student IDs enrolled in those classes
  const enrolled = await db
    .select({ studentId: enrollments.studentId })
    .from(enrollments)
    .where(inArray(enrollments.classId, classIds));

  const studentIds = [...new Set(enrolled.map(e => e.studentId))];
  if (studentIds.length === 0) return [];

  // Step 3: fetch those students
  return db
    .select()
    .from(students)
    .where(inArray(students.id, studentIds));
}
```

### RLS: Verifying staff_profiles Table Has RLS Enabled

```sql
-- Run in Supabase SQL editor to verify Phase 1 + Phase 2 RLS is active
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `getSession()` for server-side auth | `getUser()` validates JWT signature | @supabase/ssr v0.x | `getSession()` is now considered insecure for server-side checks |
| Middleware importing from `next/headers` | Middleware uses `request.cookies` + `response.cookies` directly | Next.js 13+ / @supabase/ssr | `next/headers` not available in Edge Runtime middleware |
| Global `createMiddlewareClient` (old `@supabase/auth-helpers-nextjs`) | `createServerClient` from `@supabase/ssr` with explicit cookie handlers | 2024 migration | `auth-helpers-nextjs` is deprecated; `@supabase/ssr` is the current package (already installed) |

**Deprecated:**
- `@supabase/auth-helpers-nextjs`: Replaced by `@supabase/ssr`. This project already uses `@supabase/ssr` correctly.
- `supabase.auth.getSession()` for server-side validation: Use `getUser()` instead.

---

## Open Questions

1. **Audit log RLS policy for write-only access**
   - What we know: The audit log should be write-only for all staff except principals. Phase 1 added deny-all-anon. Authenticated staff need INSERT but not SELECT.
   - What's unclear: Whether to add an INSERT-only authenticated policy, or leave it as Drizzle-only writes (bypassing RLS entirely, which means no Supabase client can read it accidentally).
   - Recommendation: Add `CREATE POLICY "staff_insert_audit_log" ON access_audit_log FOR INSERT TO authenticated WITH CHECK (viewer_id = (SELECT auth.uid()))` to ensure staff can only log their own views. Reads remain blocked for non-principals. The principal SELECT policy can be added at the same time.

2. **Audit log admin page route: `/dashboard/audit-log` vs `/admin/audit-log`**
   - What we know: CONTEXT.md lists both as options. Current app has `/dashboard/` as the main route.
   - What's unclear: Whether a separate `/admin/` segment is needed, or if nesting under `/dashboard/` suffices for v1.
   - Recommendation: Use `/dashboard/audit-log` — the app has no `/admin/` route group yet, and nesting under the existing dashboard layout avoids creating a new route group. Simpler for v1.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright ^1.58.2 |
| Config file | `playwright.config.ts` (project root) |
| Quick run command | `npx playwright test tests/phase2.spec.ts` |
| Full suite command | `npm run test:e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-02 | Authenticated user with a staff_profiles row reaches /dashboard | E2E smoke | `npx playwright test tests/phase2.spec.ts --grep "staff profile"` | ❌ Wave 0 |
| AUTH-02 | User with no staff_profiles row is redirected to /no-access | E2E smoke | `npx playwright test tests/phase2.spec.ts --grep "no-access"` | ❌ Wave 0 |
| AUTH-03 | Unauthenticated request to /dashboard redirects to /login (middleware) | E2E smoke | `npx playwright test tests/phase2.spec.ts --grep "middleware redirect"` | ❌ Wave 0 |
| AUTH-03 | Teacher role returned by requireStaffProfile has role = 'teacher' | manual | manual SQL verify in Supabase dashboard | N/A — DB state |
| AUTH-04 | Counselor role returned correctly | manual | manual SQL verify | N/A — DB state |
| AUTH-05 | Principal role returned correctly | manual | manual SQL verify | N/A — DB state |
| AUTH-06 | /dashboard/audit-log returns 403 for non-principal | E2E smoke | `npx playwright test tests/phase2.spec.ts --grep "audit-log access"` | ❌ Wave 0 |
| AUTH-06 | /dashboard/audit-log shows empty state for principal | E2E smoke | `npx playwright test tests/phase2.spec.ts --grep "audit-log empty"` | ❌ Wave 0 |

**Note on AUTH-03/04/05:** Role accuracy depends on correct manual DB inserts in Supabase dashboard. Tests verify the middleware and redirect behavior; actual role assignment is verified manually. Role-scoped query enforcement (teacher sees only own students) is Phase 3's concern — Phase 2 only establishes the `requireStaffProfile()` contract.

### Sampling Rate

- **Per task commit:** `npx playwright test tests/phase2.spec.ts`
- **Per wave merge:** `npm run test:e2e`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/phase2.spec.ts` — covers AUTH-02 (no-access redirect), AUTH-03 (middleware redirect), AUTH-06 (audit-log principal gate)
- [ ] Phase 1 `tests/phase1.spec.ts` already exists — extend with phase2 file rather than modifying phase1

---

## Sources

### Primary (HIGH confidence)

- `src/db/schema.ts` — verified existing table definitions, `staffRoleEnum`, `staffProfiles`, `enrollments`, `classes`
- `src/lib/auth.ts` — verified existing `requireUser()` contract and return type
- `src/components/app-sidebar.tsx` — verified current client-side email fetch pattern
- `supabase/rls.sql` — verified Phase 1 baseline deny-all-anon policies
- `src/lib/supabase/server.ts` — verified `createClient()` async pattern using `next/headers`
- Official Supabase docs (https://supabase.com/docs/guides/auth/server-side/creating-a-client) — middleware cookie pattern, `getUser()` vs `getSession()` guidance
- Official Supabase RLS docs (https://supabase.com/docs/guides/database/postgres/row-level-security) — EXISTS subquery patterns, auth.uid() performance notes, multiple-policy OR semantics

### Secondary (MEDIUM confidence)

- Package.json — verified `@supabase/ssr ^0.9.0`, `drizzle-orm ^0.45.1`, `next 16.1.6`, `@playwright/test ^1.58.2` are all installed
- `playwright.config.ts` — verified test runner config (testDir `./tests`, chromium only, 120s webServer timeout)

### Tertiary (LOW confidence)

- None — all critical claims verified against codebase or official docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against package.json; no new installs needed
- Architecture patterns: HIGH — verified against official Supabase docs and existing codebase patterns
- RLS policy design: HIGH — verified against official RLS docs; multi-policy OR semantics are documented behavior
- Drizzle bypass of RLS: HIGH — documented in STATE.md and `src/db/index.ts` (direct postgres connection)
- Pitfalls: HIGH — derived from official docs and verified codebase constraints

**Research date:** 2026-03-16
**Valid until:** 2026-06-16 (stable — `@supabase/ssr` and Next.js App Router patterns change slowly; RLS semantics are Postgres-level)
