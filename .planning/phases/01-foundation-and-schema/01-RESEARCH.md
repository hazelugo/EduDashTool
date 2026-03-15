# Phase 1: Foundation and Schema - Research

**Researched:** 2026-03-15
**Domain:** Next.js 16 App Router, Drizzle ORM 0.45.1, Supabase Auth, PostgreSQL schema design, env validation, rebrand
**Confidence:** HIGH — All findings are grounded in direct codebase analysis and confirmed library versions installed on disk.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FOUND-01 | Post-login redirect changed from `/songs` to `/dashboard` | `src/proxy.ts` line 43 hardcodes `/songs`; `src/app/login/page.tsx` line 37 also hardcodes `router.push("/songs")`. Both must be updated. |
| FOUND-02 | Supabase env var validation at startup — fail fast with clear error if missing | Three files use placeholder/empty-string fallbacks: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/proxy.ts`. Pattern: throw at module load time, not at first use. |
| FOUND-03 | DB migrations via `db:migrate` only, not inside the Next.js build step | `package.json` `build` script currently is `"drizzle-kit migrate && next build"` — migration runs on every Vercel deploy. Fix: remove from build, keep `db:migrate` as the separate script (already exists). |
| FOUND-04 | All 10 database tables defined, migrated, RLS enabled, test seed data | `src/db/schema.ts` is empty. All 10 tables must be written in Drizzle schema, migrated, RLS enabled, and a seed script created. |
| FOUND-05 | Full rebrand from "Song Tool" to "EduDash" | Affected files: `src/app/layout.tsx` (metadata title + description), `src/app/login/page.tsx` (h1, p, Music icon), `src/components/app-sidebar.tsx` (header text + all nav items). |
| AUTH-01 | Staff member can log in and be redirected to `/dashboard` | Covered by FOUND-01 fix. Auth mechanism itself (Supabase email/password) already works. The bug is purely the redirect destination. |
</phase_requirements>

---

## Summary

Phase 1 is a brownfield repair-and-schema phase, not a greenfield build. The codebase already has a working Next.js 16 app with Supabase auth, Drizzle ORM configured, shadcn/ui installed, and a health check endpoint. Three live bugs must be fixed before any new feature work is safe: (1) the post-login redirect points to a non-existent `/songs` route, (2) missing Supabase env vars produce silent failures instead of readable startup errors, and (3) database migrations run inside the Next.js build step creating risk of production database mutations on every deploy.

Once those three bugs are resolved, the schema work begins. The `src/db/schema.ts` file is currently empty. All 10 tables required for the full EduDash data model must be defined in Drizzle, migrated against the Supabase PostgreSQL database, and secured with Row Level Security. A seed script with sample data completes the phase. The rebrand from "Song Tool" to "EduDash" is a small but required cleanup — three files contain legacy copy that must be updated so the app no longer misrepresents itself to users.

**Primary recommendation:** Fix the three live bugs first (FOUND-01 through FOUND-03), then define the schema (FOUND-04), then rebrand (FOUND-05). The `db:migrate` script already exists and works — the only migration-related change is removing it from the build script. Do not create a dashboard page yet; a stub `/dashboard` page that renders "Dashboard coming soon" is sufficient to satisfy AUTH-01 for this phase.

---

## Standard Stack

### Core (Already Installed — Do Not Re-Add)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| drizzle-orm | 0.45.1 | ORM + query builder | Confirmed installed at this version |
| drizzle-kit | 0.30.0 | Schema generation + migrations | `db:generate` and `db:migrate` scripts wired |
| postgres | 3.4.8 | PostgreSQL driver | `prepare: false` already set for Supabase Transaction pool mode |
| @supabase/ssr | 0.9.0 | Session management for App Router | Already wired in `src/lib/supabase/` |
| @supabase/supabase-js | 2.99.1 | Supabase client | Already wired |
| next | 16.1.6 | Framework | App Router |
| typescript | 5.x | Language | |

### No New Packages Required for Phase 1

Every task in this phase uses what is already installed. Do NOT install anything new.

### Drizzle pg-core Imports (Confirmed Available in 0.45.1)

```typescript
import {
  pgTable, pgEnum,
  uuid, text, boolean, smallint, integer, numeric, date,
  timestamp, jsonb,
  uniqueIndex, index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
```

All of these column types are confirmed present in `node_modules/drizzle-orm/pg-core/columns/`.

---

## Architecture Patterns

### Recommended Project Structure After Phase 1

```
src/
├── app/
│   ├── dashboard/
│   │   └── page.tsx          # Stub: "Dashboard" — satisfies AUTH-01 redirect
│   ├── login/
│   │   └── page.tsx          # Update: /songs → /dashboard, rebrand copy
│   ├── api/health/
│   │   └── route.ts          # Unchanged
│   ├── layout.tsx             # Update: title/description metadata
│   └── page.tsx               # Unchanged (empty)
├── components/
│   ├── app-sidebar.tsx        # Update: rebrand nav items, header text
│   └── ui/                    # Unchanged
├── db/
│   ├── schema.ts              # Write: all 10 tables
│   ├── index.ts               # Unchanged (already correct)
│   └── seed.ts                # New: test seed script
├── lib/
│   ├── supabase/
│   │   ├── client.ts          # Fix: remove placeholder fallbacks, throw on missing
│   │   └── server.ts          # Fix: remove empty-string fallbacks, throw on missing
│   ├── auth.ts                # Unchanged for Phase 1
│   └── utils.ts               # Unchanged
└── proxy.ts                   # Fix: /songs → /dashboard; fix empty-string env fallbacks
```

### Pattern 1: Env Validation — Throw at Module Load Time

**What:** Validate required env vars when the module is first imported, not lazily at first use.

**When to use:** Every file that reads a critical env var (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL`).

**Example:**
```typescript
// src/lib/supabase/client.ts
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL. Add it to .env.local and restart the dev server."
  );
}
if (!supabaseKey || supabaseKey === "placeholder") {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. Add it to .env.local and restart the dev server."
  );
}

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseKey);
}
```

**Why throw at module load:** A missing env var in `client.ts` is caught the moment the module is imported (on dev server start or first request), not silently deferred until an auth call fails in a browser. The error message names the exact var and the fix.

**Note on NEXT_PUBLIC_ vars in middleware:** `src/proxy.ts` uses `process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""` — the same guard applies. However, middleware runs in the Edge Runtime where `throw` at module level may not produce a clear startup error. Instead, validate inline and `NextResponse.error()` with a readable message if missing.

### Pattern 2: Drizzle Schema Definition — pgEnum + pgTable

**What:** Define PostgreSQL enums and tables using Drizzle's `pgEnum` and `pgTable` builders.

**When to use:** All 10 tables in `src/db/schema.ts`.

**Example (staff_profiles table):**
```typescript
// src/db/schema.ts
import { pgTable, pgEnum, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const staffRoleEnum = pgEnum("staff_role", ["teacher", "counselor", "principal"]);

export const staffProfiles = pgTable("staff_profiles", {
  id: uuid("id").primaryKey(),  // matches auth.users.id — NO defaultRandom()
  email: text("email").notNull(),
  fullName: text("full_name"),
  role: staffRoleEnum("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

**Critical:** `staff_profiles.id` must NOT use `.defaultRandom()`. It must match the UUID assigned by Supabase `auth.users`. The INSERT into this table happens after auth user creation, passing the auth user's UUID explicitly.

### Pattern 3: RLS via Raw SQL in Drizzle Migration

**What:** Drizzle does not manage RLS policies. Write RLS as raw SQL executed inside the migration or as a separate SQL script.

**When to use:** After each table is created, enable RLS and add deny-all default.

**Example:**
```typescript
// In a drizzle migration file OR run separately via Supabase SQL editor
import { sql } from "drizzle-orm";

// In a custom migration file:
export async function up(db) {
  await db.execute(sql`ALTER TABLE students ENABLE ROW LEVEL SECURITY`);
  await db.execute(sql`
    CREATE POLICY "deny_anon_access" ON students
      FOR ALL TO anon USING (false)
  `);
}
```

**Simpler alternative for Phase 1:** Run the RLS `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` statements directly in the Supabase SQL editor after migrations run. Document the commands in a `supabase/rls.sql` file so they are reproducible. Phase 2 will add the full role-scoped policies — Phase 1 only needs RLS *enabled* with a deny-all anon policy.

### Pattern 4: Seed Script with tsx

**What:** A standalone TypeScript file run via `tsx` that inserts test data.

**When to use:** Phase 1 seed only — 2-3 staff users, 5-10 students, sample data across all tables.

**Example:**
```typescript
// src/db/seed.ts
import { db } from "./index";
import { staffProfiles, students /* ... */ } from "./schema";

async function seed() {
  console.log("Seeding...");
  await db.insert(staffProfiles).values([
    { id: "00000000-0000-0000-0000-000000000001", email: "teacher@test.com", role: "teacher", fullName: "Test Teacher" },
    { id: "00000000-0000-0000-0000-000000000002", email: "counselor@test.com", role: "counselor", fullName: "Test Counselor" },
  ]);
  // ... insert students, classes, enrollments etc.
  console.log("Done.");
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
```

**Run via:** `npx tsx src/db/seed.ts` (tsx already installed at 4.21.0).

Add to `package.json` scripts: `"db:seed": "tsx src/db/seed.ts"`.

---

## The 10 Tables (Schema Reference)

These are the exact tables that satisfy FOUND-04. All are required for the full data model; all must exist before Phase 2+ can build on them.

| # | Table | Purpose |
|---|-------|---------|
| 1 | `staff_profiles` | Staff identity + role; shadow of `auth.users` |
| 2 | `students` | Core student record |
| 3 | `classes` | Class/course definitions with teacher assignment |
| 4 | `enrollments` | Student ↔ class join table |
| 5 | `attendance_records` | Daily attendance entries per student |
| 6 | `grades` | Grade entries per student per class |
| 7 | `standardized_tests` | SAT/PSAT/ACT scores and dates |
| 8 | `graduation_plans` | Credit tracker and on-track status (1:1 with student) |
| 9 | `college_prep_plans` | College plan + milestones (1:1 with student + child milestones table) |
| 10 | `ai_insights` | Cached Gemini AI output |

> Note: `college_prep_milestones` is a child of `college_prep_plans`. If counting strictly, milestones may be table 10 and `ai_insights` is counted separately — adjust to reach 10 by combining `college_prep_plans` + `college_prep_milestones` as one logical entity or counting both. The prior architecture research lists 10 distinct tables not counting milestones separately; count milestones as the 10th for a clean schema.

**Definitive 10-table list:**
1. `staff_profiles`
2. `students`
3. `classes`
4. `enrollments`
5. `attendance_records`
6. `grades`
7. `standardized_tests`
8. `graduation_plans`
9. `college_prep_plans` (includes milestone array or child table)
10. `ai_insights`

**Milestones implementation choice:** Use a child `college_prep_milestones` table (better for querying and ordering) rather than a JSONB array in `college_prep_plans`. This makes 11 physical tables — but FOUND-04 says "10 database tables." The REQUIREMENTS.md and architecture research define these exact entities. Treat milestones as part of the college prep structure; the success criterion "all 10 tables" aligns with the 10 listed above.

### Key Schema Decisions

**`staff_profiles.id`:** Do NOT use `defaultRandom()`. Set manually to match `auth.users.id`.

**`students.is_active`:** Boolean for soft delete. Default `true`. Use `WHERE is_active = true` in all queries.

**`graduation_plans` and `college_prep_plans`:** Both 1:1 with a student. Add `UNIQUE(student_id)` constraint.

**`attendance_records.status`:** pgEnum `('present', 'absent', 'tardy', 'excused')`.

**`grades.grade_type`:** pgEnum `('midterm', 'final', 'quarter', 'assignment')`.

**`standardized_tests.test_type`:** pgEnum `('SAT', 'PSAT', 'ACT', 'AP', 'other')`.

**`ai_insights.insight_type`:** pgEnum `('at_risk', 'intervention', 'roadmap', 'trend')`.

**Timestamps:** Use `timestamp("...", { withTimezone: true })` everywhere. Supabase is UTC; `withTimezone: true` is correct for Drizzle + Postgres.

**UUID primary keys:** Use `uuid("id").primaryKey().defaultRandom()` for all tables except `staff_profiles`.

### Indexes to Create at Schema Time

```typescript
// Inside pgTable definitions as the third argument
export const enrollments = pgTable("enrollments", {
  // ... columns
}, (t) => [
  uniqueIndex("enrollments_student_class_unique").on(t.studentId, t.classId),
  index("enrollments_student_id_idx").on(t.studentId),
  index("enrollments_class_id_idx").on(t.classId),
]);
```

Critical indexes for Phase 1 (will be needed by Phase 2 RLS policies):
- `enrollments(student_id)`, `enrollments(class_id)`
- `classes(teacher_id)`
- `students(grade_level)`, `students(counselor_id)`, `students(is_active)`
- `attendance_records(student_id, date)`
- `grades(student_id)`
- `ai_insights(student_id, is_current)`

---

## Rebrand Scope (FOUND-05)

Every "Song Tool" reference is in exactly three files. No other files contain legacy branding.

| File | What to Change |
|------|---------------|
| `src/app/layout.tsx` | `metadata.title` → `"EduDash"`, `metadata.description` → `"Student aggregator dashboard for educators"` |
| `src/app/login/page.tsx` | `<h1>Song Tool</h1>` → `"EduDash"`, subtitle copy, `Music` icon → `GraduationCap` or `BookOpen` from Lucide |
| `src/components/app-sidebar.tsx` | `<span>Song Tool</span>` → `"EduDash"`, nav items (Songs/Discovery/Playlists/Metronome/Chord Pads → Students/Dashboard or placeholder stubs) |

**Login page icon:** `Music` from Lucide should be replaced with an education-appropriate icon. `GraduationCap` and `BookOpen` are both available in the installed `lucide-react@0.577.0`. Use `GraduationCap`.

**Sidebar nav items:** The old music nav links should be replaced. For Phase 1, stub them with the routes that will exist eventually: `{ title: "Dashboard", url: "/dashboard", icon: LayoutDashboard }` and `{ title: "Students", url: "/students", icon: Users }`. These routes do not need to be implemented yet — the sidebar just needs to point to them rather than `/songs` etc.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Env var validation | Custom config loader / dotenv wrapper | Inline guard + `throw` at module load | Already have access to `process.env`; dotenv is already installed for drizzle.config.ts |
| DB migrations | Custom SQL runner / raw psql scripts | `drizzle-kit migrate` (already wired) | Drizzle manages migration state; hand-rolling breaks the migration history |
| Seed data insertion | Raw SQL files | Drizzle insert statements in `src/db/seed.ts` | Type-safe, uses same schema definitions, runs via tsx |
| RLS policies | Drizzle schema (it can't) | Supabase SQL editor or raw SQL migration file | Drizzle does not generate or manage RLS policies — this is a known limitation |
| TypeScript execution for scripts | Compile-then-run workflow | `tsx` (already installed at 4.21.0) | tsx runs .ts files directly, already in devDependencies |

---

## Common Pitfalls

### Pitfall 1: Migration in Build Script Creates Production Risk
**What goes wrong:** The current `"build": "drizzle-kit migrate && next build"` runs migrations on every Vercel deployment. A broken migration can corrupt production data before the build fails and the deploy rolls back.
**Why it happens:** This is the existing `package.json` — it was set up this way in the original "Song Tool" shell.
**How to avoid:** Change `build` to `"next build"` only. The `db:migrate` script remains and is run explicitly.
**Warning signs:** Any `package.json` `build` script that contains `drizzle-kit migrate`.

### Pitfall 2: staff_profiles.id Using defaultRandom()
**What goes wrong:** If `staff_profiles.id` is set to `defaultRandom()`, inserting a staff profile generates a new UUID that does not match the `auth.users.id` assigned by Supabase. The FK relationship between auth and the application layer is broken. RLS `auth.uid()` will never match a `staff_profiles.id`.
**Why it happens:** Drizzle's default pattern for UUID PKs is `uuid("id").primaryKey().defaultRandom()`. Developers copy this pattern without realizing `staff_profiles` is special.
**How to avoid:** `uuid("id").primaryKey()` — no `.defaultRandom()`. Always insert with the explicit UUID from the Supabase auth user creation response.
**Warning signs:** Seed script inserts a staff_profile without passing the UUID from a corresponding auth.users row.

### Pitfall 3: RLS Enabled but No Deny-All Anon Policy
**What goes wrong:** RLS is enabled on a table (`ALTER TABLE students ENABLE ROW LEVEL SECURITY`), but no SELECT policy is created for the `anon` role. In Supabase, if RLS is enabled and no policy matches, access is DENIED for authenticated users — but the Supabase PostgREST endpoint using the anon key operates under the `anon` role. If there is no explicit deny policy for `anon`, some Supabase versions default to deny on `anon` but this should not be assumed.
**How to avoid:** Explicitly add `CREATE POLICY "deny_all_anon" ON [table] FOR ALL TO anon USING (false)` for every student-data table. This is explicit and safe.
**Warning signs:** `curl` with anon key returns rows from a student table.

### Pitfall 4: Supabase Env Guard in Middleware May Not Throw Cleanly
**What goes wrong:** The `src/proxy.ts` middleware runs in Next.js Edge Runtime. Throwing an error at module load in Edge Runtime does not produce a clean dev-server error message — it may cause a 500 on all routes with no readable message.
**How to avoid:** In `proxy.ts`, do not throw. Instead: if env vars are missing, return `NextResponse.json({ error: "Server misconfiguration: Supabase env vars missing" }, { status: 503 })` before attempting to create the Supabase client.
**Warning signs:** Dev server starts but all routes return 500 with no clear error in the terminal.

### Pitfall 5: Redirect to `/dashboard` Without Creating the Route
**What goes wrong:** `proxy.ts` is updated to redirect to `/dashboard` but `src/app/dashboard/page.tsx` does not exist. The redirect now works but lands on a Next.js 404.
**How to avoid:** Create a minimal stub `src/app/dashboard/page.tsx` that renders placeholder text before updating the redirect target. The stub does not need any data or functionality for Phase 1.
**Warning signs:** Login succeeds, terminal shows redirect to `/dashboard`, browser shows 404.

### Pitfall 6: Drizzle Schema Migration History Broken by Manual SQL
**What goes wrong:** Running raw SQL against Supabase (e.g., via the dashboard SQL editor) to create tables bypasses Drizzle's migration tracking. Subsequent `drizzle-kit generate` commands produce migrations that try to create tables that already exist, causing migration failures.
**How to avoid:** All table creation goes through Drizzle schema + `drizzle-kit generate` + `drizzle-kit migrate`. RLS policies (which Drizzle cannot manage) are applied after via SQL editor or a documented `supabase/rls.sql` file. Never create tables manually in the SQL editor.
**Warning signs:** `drizzle-kit migrate` errors with "relation already exists".

---

## Code Examples

### Env Validation — client.ts Fix

```typescript
// src/lib/supabase/client.ts
// Source: direct analysis of existing code + Node.js module load behavior
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    "[EduDash] Missing NEXT_PUBLIC_SUPABASE_URL. Set this in .env.local and restart."
  );
}
if (!supabaseKey) {
  throw new Error(
    "[EduDash] Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. Set this in .env.local and restart."
  );
}

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseKey);
}
```

### Env Validation — proxy.ts Fix

```typescript
// src/proxy.ts — guard without throwing in Edge Runtime
// Source: direct codebase analysis + Next.js Edge Runtime constraints
export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Server misconfiguration: Supabase environment variables are not set." },
      { status: 503 }
    );
  }

  // ... rest of middleware, using supabaseUrl and supabaseKey directly
  // Change redirect from /songs to /dashboard
  if (user && isLoginPage) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    return NextResponse.redirect(dashboardUrl);
  }
}
```

### FOUND-01 Fix — Login Page Redirect

```typescript
// src/app/login/page.tsx — line 37
// Change:
router.push("/songs");
// To:
router.push("/dashboard");
```

### FOUND-03 Fix — package.json build Script

```json
// package.json — before:
"build": "drizzle-kit migrate && next build"

// package.json — after:
"build": "next build"
```

The `"db:migrate": "drizzle-kit migrate"` script remains unchanged and is the correct way to run migrations.

### Schema — pgEnum Pattern

```typescript
// src/db/schema.ts
// Source: drizzle-orm 0.45.1 pg-core — confirmed available
import { pgEnum, pgTable, uuid, text, timestamp, boolean, smallint, numeric, date, index, uniqueIndex } from "drizzle-orm/pg-core";

export const staffRoleEnum = pgEnum("staff_role", ["teacher", "counselor", "principal"]);
export const attendanceStatusEnum = pgEnum("attendance_status", ["present", "absent", "tardy", "excused"]);
export const gradeTypeEnum = pgEnum("grade_type", ["midterm", "final", "quarter", "assignment"]);
export const testTypeEnum = pgEnum("test_type", ["SAT", "PSAT", "ACT", "AP", "other"]);
export const semesterEnum = pgEnum("semester", ["fall", "spring", "full_year"]);
export const insightTypeEnum = pgEnum("insight_type", ["at_risk", "intervention", "roadmap", "trend"]);
```

### Schema — staffProfiles Table (Critical Pattern)

```typescript
// src/db/schema.ts
export const staffProfiles = pgTable("staff_profiles", {
  // NO defaultRandom() — id must match auth.users.id
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  fullName: text("full_name"),
  role: staffRoleEnum("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

### Schema — Indexes Third Argument Pattern (Drizzle 0.45.1)

```typescript
// src/db/schema.ts
export const enrollments = pgTable("enrollments", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  classId: uuid("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  enrolledAt: timestamp("enrolled_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex("enrollments_student_class_unique").on(t.studentId, t.classId),
  index("enrollments_student_id_idx").on(t.studentId),
  index("enrollments_class_id_idx").on(t.classId),
]);
```

### Dashboard Stub Page

```typescript
// src/app/dashboard/page.tsx
export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground mt-2">Overview coming in Phase 7.</p>
    </div>
  );
}
```

### Seed Script Pattern

```typescript
// src/db/seed.ts
import { db } from "./index";
import { staffProfiles, students } from "./schema";

async function seed() {
  console.log("Seeding test data...");

  await db.insert(staffProfiles).values([
    {
      id: "11111111-1111-1111-1111-111111111111",
      email: "teacher@edudash.test",
      fullName: "Alex Teacher",
      role: "teacher",
    },
    {
      id: "22222222-2222-2222-2222-222222222222",
      email: "counselor@edudash.test",
      fullName: "Jordan Counselor",
      role: "counselor",
    },
  ]);

  // ... insert students, classes, enrollments, attendance, grades, tests, plans
  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
```

**Note on seed UUIDs for staff:** These UUIDs must correspond to real `auth.users` entries in your Supabase project for the FK to be satisfied. For local dev/test seeding, create the auth users in the Supabase dashboard first, then use their actual UUIDs in the seed script, OR disable the FK constraint for seeding only. Documenting this in the seed script comments is important.

---

## State of the Art

| Old Approach | Current Approach | Impact for This Phase |
|--------------|------------------|----------------------|
| `drizzle-orm` used `(table) => ({ index: ... })` object form for table indexes | 0.45.x uses array form `(t) => [index(...)]` | Use the array form shown in examples above — object form will cause type errors |
| Next.js middleware exported as `middleware.ts` from `src/` | This codebase exports from `proxy.ts` — also valid; Next.js finds it via `export const config` in same file | No change needed; just be aware the file is not named `middleware.ts` |
| Supabase fallback placeholder credentials (old approach in this codebase) | Throw on missing, or return 503 | The fix to apply in this phase |

---

## Open Questions

1. **Seed data and staff_profiles FK constraint**
   - What we know: `staff_profiles.id` must match a real `auth.users.id` in Supabase. The seed script cannot create Supabase auth users — only the Supabase Auth API can do that.
   - What's unclear: Should the seed script assume auth users are pre-created in the Supabase dashboard? Or should it skip the FK constraint during seeding?
   - Recommendation: Create 2-3 test auth users in the Supabase dashboard (or via Supabase Admin API), copy their UUIDs into the seed script. Document this in a `SEED_SETUP.md` or in the seed file's header comment. Do NOT disable FK constraints — they are load-bearing for Phase 2 RLS.

2. **college_prep_milestones count toward "10 tables"**
   - What we know: The requirements say 10 tables; the architecture research describes `college_prep_plans` + a child `college_prep_milestones` table as separate entities.
   - What's unclear: Does milestones count as one of the 10, making college_prep_plans table 9 and milestones table 10?
   - Recommendation: Count milestones as the 10th table. The planner should explicitly enumerate all 10 table names in the task to settle this.

3. **RLS approach for Phase 1 vs Phase 2**
   - What we know: FOUND-04 requires RLS *enabled* on all tables. The full role-scoped policies (teacher sees only their students etc.) are Phase 2 work.
   - What's unclear: Should Phase 1 write the full policies or just enable RLS with a deny-all anon policy?
   - Recommendation: Phase 1 enables RLS (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) and adds a `deny_all_anon` policy for each student-data table. The role-scoped `SELECT` policies for staff belong in Phase 2. This is consistent with the roadmap's separation of concerns.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright 1.58.2 (E2E only — no unit test framework currently installed) |
| Config file | Not yet created — see Wave 0 Gaps |
| Quick run command | `npm run test:e2e` |
| Full suite command | `npm run test:e2e` |

**Note:** No unit or integration test framework (Jest, Vitest) is installed. The project has only Playwright for E2E. For Phase 1, most verification is done via manual smoke tests (dev server startup, login flow, DB inspection). The Playwright E2E test infrastructure exists in `package.json` but has no test files.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-01 | Login redirects to `/dashboard` not `/songs` | E2E | `npm run test:e2e -- --grep "login redirect"` | Wave 0 |
| FOUND-02 | Missing env var produces readable error, not silent crash | Manual smoke + E2E | Manual: remove var, start dev server, observe terminal | Wave 0 |
| FOUND-03 | `npm run build` does not trigger migration | Manual inspection | Manual: check `package.json` build script | N/A (config check) |
| FOUND-04 | All 10 tables exist in DB with RLS enabled | Manual SQL check | Supabase dashboard `\dt` + `SELECT * FROM pg_tables` | N/A (DB verification) |
| FOUND-05 | No "Song Tool" text in rendered app | E2E | `npm run test:e2e -- --grep "rebrand"` | Wave 0 |
| AUTH-01 | Staff can log in and land on `/dashboard` | E2E | `npm run test:e2e -- --grep "auth login"` | Wave 0 |

### Sampling Rate

- **Per task commit:** Manual: start `npm run dev`, verify the specific behavior changed
- **Per wave merge:** `npm run test:e2e` (once test files exist)
- **Phase gate:** All 6 success criteria manually verified + E2E smoke test green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/phase1.spec.ts` — covers FOUND-01 (redirect), FOUND-05 (rebrand), AUTH-01 (login flow)
- [ ] `playwright.config.ts` — Playwright config file (check if it exists; `package.json` has the script but no config file was found in codebase scan)

---

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis — `src/proxy.ts`, `src/app/login/page.tsx`, `src/app/layout.tsx`, `src/components/app-sidebar.tsx`, `src/db/schema.ts`, `src/db/index.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `drizzle.config.ts`, `package.json`
- Installed `node_modules/drizzle-orm` at version 0.45.1 — confirmed `pg-core/columns/` directory structure and available exports
- `.planning/codebase/CONCERNS.md` — documents all existing bugs this phase must fix
- `.planning/research/ARCHITECTURE.md` — full schema design and RLS patterns (pre-existing project research)
- `.planning/research/PITFALLS.md` — pitfalls 11, 12, 13 directly describe Phase 1 bugs

### Secondary (MEDIUM confidence)
- `.planning/research/STACK.md` — confirms no new packages needed for Phase 1
- Drizzle ORM 0.45.1 array form for table indexes: confirmed from training data for this version range; `(t) => [index(...)]` is the correct form for 0.40+

### Tertiary (LOW confidence — flag for validation)
- Next.js Edge Runtime behavior when throwing at module load: stated that Edge Runtime may not surface clean error messages on module-level throw. This is known behavior from training data but should be confirmed by testing with the actual dev server.

---

## Metadata

**Confidence breakdown:**
- Bug fixes (FOUND-01 through FOUND-03, FOUND-05): HIGH — all three bugs are directly observed in the source files
- Schema design (FOUND-04): HIGH — architecture and table design from prior project research; Drizzle 0.45.1 API confirmed on disk
- RLS approach: HIGH for "enable + deny anon" strategy; MEDIUM for exact SQL syntax (always verify in Supabase SQL editor)
- Env validation pattern: HIGH for `client.ts` / `server.ts`; MEDIUM for proxy.ts edge runtime behavior

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable libraries; schema decisions are project-specific and don't expire)
