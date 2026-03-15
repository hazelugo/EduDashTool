# Architecture Patterns

**Domain:** Multi-role EdTech student aggregator dashboard with AI integration
**Researched:** 2026-03-15
**Confidence Note:** WebSearch and Context7 unavailable in this session. All findings are from training data (cutoff Aug 2025) cross-referenced against the existing codebase. Supabase RLS patterns and Next.js App Router server action patterns are HIGH confidence — these are well-established and stable. Gemini API integration patterns are MEDIUM confidence — verify against current `@google/generative-ai` SDK docs before implementation.

---

## Recommended Architecture

The system is a **server-driven Next.js application** with three distinct role-scoped data paths converging on a shared student profile view. All sensitive data access goes through Supabase RLS so the database itself enforces access — the application layer cannot accidentally leak data even if a route guard is bypassed.

```
Browser
  └── Next.js App Router
        ├── Middleware (src/proxy.ts)        ← auth gate + role resolution
        ├── Server Components                ← data fetch, no secrets leak
        │     └── Client Components          ← interactivity only
        ├── Server Actions (src/actions/)    ← mutations + Gemini calls
        └── API Routes (src/app/api/)        ← health check, webhooks only

        ↕ Drizzle ORM (type-safe queries)
        ↕ Supabase (Postgres + Auth + RLS)
              └── Row Level Security enforces role scope
```

---

## Database Schema Design

### Core Tables

#### `staff_profiles` (extends Supabase auth.users)
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | matches `auth.users.id` |
| `email` | text | denormalized for display |
| `full_name` | text | |
| `role` | enum('teacher','counselor','principal') | drives RLS |
| `created_at` | timestamptz | |

**Why:** Supabase auth.users cannot be extended directly. A shadow profile table keyed on `auth.users.id` is the standard pattern. Role is stored here and read by RLS policies.

#### `students`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `student_number` | text UNIQUE | school-assigned ID |
| `first_name` | text | |
| `last_name` | text | |
| `grade_level` | smallint | 9–12 |
| `graduation_year` | smallint | |
| `counselor_id` | uuid FK → staff_profiles | assigned counselor |
| `is_active` | boolean | soft delete |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `classes`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `name` | text | e.g., "AP English 11" |
| `subject` | text | |
| `teacher_id` | uuid FK → staff_profiles | |
| `school_year` | text | e.g., "2025-2026" |
| `semester` | enum('fall','spring','full_year') | |
| `period` | smallint | 1–8 |
| `created_at` | timestamptz | |

#### `enrollments` (join: student ↔ class)
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `student_id` | uuid FK → students | |
| `class_id` | uuid FK → classes | |
| `enrolled_at` | timestamptz | |
| UNIQUE | (student_id, class_id) | |

**Why this join table:** Teachers need to query "which students are in MY classes." This is the RLS pivot point for teacher-scoped access.

#### `attendance_records`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `student_id` | uuid FK → students | |
| `class_id` | uuid FK → classes | nullable (school-wide absences) |
| `date` | date | |
| `status` | enum('present','absent','tardy','excused') | |
| `notes` | text | optional |
| `recorded_by` | uuid FK → staff_profiles | |
| `created_at` | timestamptz | |

#### `grades`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `student_id` | uuid FK → students | |
| `class_id` | uuid FK → classes | |
| `grade_type` | enum('midterm','final','quarter','assignment') | |
| `score` | numeric(5,2) | raw score |
| `letter_grade` | text | A, B+, etc. |
| `school_year` | text | |
| `semester` | enum('fall','spring','full_year') | |
| `recorded_by` | uuid FK → staff_profiles | |
| `recorded_at` | timestamptz | |

#### `standardized_tests`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `student_id` | uuid FK → students | |
| `test_type` | enum('SAT','PSAT','ACT','AP','other') | |
| `test_date` | date | |
| `total_score` | smallint | |
| `math_score` | smallint | nullable |
| `reading_writing_score` | smallint | nullable (SAT/PSAT) |
| `notes` | text | |
| `recorded_by` | uuid FK → staff_profiles | |

#### `graduation_plans`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `student_id` | uuid FK → students | UNIQUE (one per student) |
| `credits_required` | numeric(4,1) | school total requirement |
| `credits_earned` | numeric(4,1) | running total |
| `on_track` | boolean | computed or manually set |
| `notes` | text | counselor notes |
| `last_reviewed_at` | timestamptz | |
| `reviewed_by` | uuid FK → staff_profiles | |

#### `college_prep_plans`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `student_id` | uuid FK → students | UNIQUE (one per student) |
| `target_schools` | text[] | array of school names |
| `intended_major` | text | |
| `application_deadline` | date | earliest deadline |
| `financial_aid_status` | text | |
| `notes` | text | |
| `last_updated_at` | timestamptz | |
| `updated_by` | uuid FK → staff_profiles | |

#### `college_prep_milestones`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `plan_id` | uuid FK → college_prep_plans | |
| `title` | text | e.g., "Submit Common App" |
| `due_date` | date | |
| `completed` | boolean | |
| `completed_at` | timestamptz | nullable |
| `sort_order` | smallint | display ordering |

#### `ai_insights`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `student_id` | uuid FK → students | nullable for school-wide |
| `insight_type` | enum('at_risk','intervention','roadmap','trend') | |
| `content` | text | Gemini-generated text |
| `data_snapshot` | jsonb | input data hash/summary used |
| `generated_at` | timestamptz | |
| `generated_by` | uuid FK → staff_profiles | which staff triggered it |
| `is_current` | boolean | false when regenerated |

**Why store AI output:** Gemini calls are slow (1–3s) and costly. Cache the last result. Only regenerate when staff explicitly requests it or when underlying data changes.

### Relationship Map

```
staff_profiles
  ├── teaches → classes (teacher_id)
  ├── advises → students (counselor_id)
  └── recorded → grades, attendance_records

students
  ├── enrolled in → classes (via enrollments)
  ├── has → attendance_records
  ├── has → grades
  ├── has → standardized_tests
  ├── has → graduation_plans (1:1)
  ├── has → college_prep_plans (1:1) → college_prep_milestones
  └── has → ai_insights
```

---

## Supabase RLS Policy Patterns

### Design Principle

Store role in `staff_profiles.role`. RLS policies read the authenticated user's role using a helper function, not JWT claims (JWT claims require a custom claim setup that adds complexity). The helper function queries `staff_profiles` directly.

```sql
-- Helper function (create once, used in all policies)
CREATE OR REPLACE FUNCTION get_staff_role()
RETURNS TEXT AS $$
  SELECT role FROM staff_profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

**`SECURITY DEFINER`** is required so the function can read `staff_profiles` without triggering its own RLS. **`STABLE`** tells Postgres it can be called once per query rather than once per row.

### Policy Patterns by Role

#### Teacher: sees only students in their classes

```sql
-- On students table
CREATE POLICY "teachers_see_own_students" ON students
  FOR SELECT
  USING (
    get_staff_role() = 'teacher'
    AND id IN (
      SELECT e.student_id FROM enrollments e
      JOIN classes c ON c.id = e.class_id
      WHERE c.teacher_id = auth.uid()
    )
    OR get_staff_role() IN ('counselor', 'principal')
  );
```

#### Counselor and Principal: see all students

The `OR get_staff_role() IN ('counselor', 'principal')` branch in every policy covers these roles. They get a pass-through — all rows visible.

#### Pattern for child tables (grades, attendance, etc.)

```sql
-- Same pattern on grades — scope through student_id
CREATE POLICY "role_scoped_grades" ON grades
  FOR SELECT
  USING (
    get_staff_role() IN ('counselor', 'principal')
    OR (
      get_staff_role() = 'teacher'
      AND student_id IN (
        SELECT e.student_id FROM enrollments e
        JOIN classes c ON c.id = e.class_id
        WHERE c.teacher_id = auth.uid()
      )
    )
  );
```

#### Write policies (INSERT/UPDATE)

```sql
-- Teachers can record grades only for their classes
CREATE POLICY "teachers_insert_grades" ON grades
  FOR INSERT
  WITH CHECK (
    class_id IN (
      SELECT id FROM classes WHERE teacher_id = auth.uid()
    )
  );

-- Counselors/principals can update graduation and college prep plans
CREATE POLICY "counselors_update_grad_plan" ON graduation_plans
  FOR UPDATE
  USING (get_staff_role() IN ('counselor', 'principal'));
```

### Implementation Note for Drizzle + Supabase

Drizzle ORM bypasses RLS when using the service role key (used server-side). **Critical decision:** Use the **anon/user JWT** (from the authenticated session) when instantiating the Drizzle client for data reads so that RLS fires. Use the service role key only for admin operations (migrations, seeding).

```typescript
// src/db/index.ts — two clients
export const db = drizzle(postgres(process.env.DATABASE_URL!)); // service role, bypasses RLS
export const dbForUser = (accessToken: string) =>
  drizzle(postgres(process.env.DATABASE_URL!, {
    // pass user JWT so RLS enforces scoping
  }));
```

Alternatively (simpler for v1): Enforce scoping in application-layer query builders and use RLS as a defense-in-depth backstop, not the primary gate. This avoids per-request DB connection overhead. Flag for team decision before Phase 1 DB work.

---

## Gemini API Integration Pattern

### Recommendation: Server Actions (not API routes, not Edge Functions)

**Rationale:**
- Server Actions run on the Node.js runtime, which is required for `@google/generative-ai` (it uses Node fetch/streams)
- Server Actions are co-located with the feature — easier to maintain than scattered API routes
- Server Actions can directly `revalidatePath()` to update the UI after AI generation without a client-side round-trip
- Edge Functions (Vercel Edge Runtime) do NOT support `@google/generative-ai` reliably — the SDK requires Node built-ins

### Pattern

```typescript
// src/actions/gemini.ts
"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { revalidatePath } from "next/cache";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateStudentInsight(studentId: string) {
  const { userId, error } = await requireUser();
  if (error) throw new Error("Unauthorized");

  // 1. Fetch student data (already scoped by your query logic)
  const studentData = await fetchStudentSnapshot(studentId);

  // 2. Build prompt
  const prompt = buildAtRiskPrompt(studentData);

  // 3. Call Gemini
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(prompt);
  const content = result.response.text();

  // 4. Persist result
  await db.insert(aiInsights).values({
    studentId,
    insightType: "at_risk",
    content,
    generatedBy: userId,
    generatedAt: new Date(),
    isCurrent: true,
  });

  // 5. Invalidate cached student profile page
  revalidatePath(`/students/${studentId}`);

  return { content };
}
```

### Three Gemini Functions

| Function | Input | Output | Trigger |
|----------|-------|--------|---------|
| `generateStudentInsight(studentId)` | Attendance, grades, test scores, grade level | At-risk flag + intervention suggestion | Staff clicks "Generate AI Insight" on profile |
| `generateRoadmap(studentId)` | Grade level, credits, targets, test scores | Step-by-step graduation + college prep plan | Staff clicks "Generate Roadmap" on profile |
| `generateSchoolTrends()` | Aggregated school stats (counselor/principal only) | Trend summary, at-risk cohort patterns | Dashboard load or manual refresh |

### Prompt Engineering Location

Keep prompt-building functions in `src/lib/gemini/prompts.ts`. This separates prompt logic from action orchestration and makes prompts easy to iterate.

```
src/lib/gemini/
  ├── client.ts        ← genAI singleton
  ├── prompts.ts       ← buildAtRiskPrompt(), buildRoadmapPrompt(), buildTrendsPrompt()
  └── types.ts         ← GeminiInsightResult, GeminiRoadmapResult types
```

### Model Choice

Use `gemini-1.5-flash` (not Pro) for v1. Flash is faster (< 1s typical), cheaper, and sufficient for structured text generation from tabular data. Upgrade to Pro if output quality is insufficient after testing.

---

## Component Boundaries

### Component Map

```
src/app/
  ├── (dashboard)/                    ← route group, shared authenticated layout
  │   ├── layout.tsx                  ← sidebar + role context provider
  │   ├── page.tsx                    ← Overview dashboard (school-wide for counselor/principal)
  │   ├── students/
  │   │   ├── page.tsx                ← Student list with search/filter
  │   │   └── [studentId]/
  │   │       └── page.tsx            ← Student profile (aggregated data)
  │   └── admin/
  │       ├── students/new/page.tsx   ← Add student form
  │       └── classes/page.tsx        ← Manage classes (teacher assigns)
  └── api/
      └── health/route.ts             ← existing

src/components/
  ├── ui/                             ← existing shadcn primitives
  ├── layout/
  │   └── AppSidebar.tsx             ← existing (rename + rebrand)
  ├── students/
  │   ├── StudentTable.tsx            ← list view, sortable/filterable
  │   ├── StudentCard.tsx             ← compact summary card
  │   ├── StudentSearch.tsx           ← search + filter bar
  │   └── RiskBadge.tsx               ← at-risk status indicator
  ├── profile/
  │   ├── ProfileHeader.tsx           ← name, grade, counselor, risk badge
  │   ├── AttendancePanel.tsx         ← attendance summary + record list
  │   ├── GradesPanel.tsx             ← grades by class/semester
  │   ├── TestScoresPanel.tsx         ← SAT/PSAT/ACT history
  │   ├── GraduationPanel.tsx         ← credit tracker, on-track status
  │   ├── CollegePrepPanel.tsx        ← milestones timeline, target schools
  │   └── AIInsightPanel.tsx          ← Gemini output + "Regenerate" button
  ├── dashboard/
  │   ├── OverviewStats.tsx           ← school-wide numbers (counselor/principal)
  │   ├── AtRiskList.tsx              ← flagged students widget
  │   └── TrendsPanel.tsx             ← Gemini school trends output
  └── forms/
      ├── StudentForm.tsx             ← add/edit student fields
      ├── GradeForm.tsx               ← record grade entry
      ├── AttendanceForm.tsx          ← record attendance entry
      └── TestScoreForm.tsx           ← add test score record
```

### Component Responsibility Rules

| Component | Server or Client | Why |
|-----------|-----------------|-----|
| `students/page.tsx` | Server Component | Fetches student list directly from DB; no interactivity needed for initial render |
| `StudentTable.tsx` | Client Component | Sorting, filtering, pagination are interactive |
| `[studentId]/page.tsx` | Server Component | Aggregates data from 6+ tables; no interaction on load |
| `AttendancePanel.tsx` | Client Component | Expand/collapse, inline edit triggers |
| `AIInsightPanel.tsx` | Client Component | "Regenerate" button calls Server Action; shows loading state |
| `GraduationPanel.tsx` | Server Component | Read-only data display; no interaction |
| Forms (`StudentForm` etc.) | Client Component | All forms are interactive by definition |

### What Talks to What

```
Browser (Client Components)
  └── calls Server Actions (mutations, Gemini)
  └── calls NO direct DB — all through server boundary

Server Components
  └── query DB via Drizzle directly (import db from "@/db")
  └── pass data down as props to Client Components

Server Actions (src/actions/)
  └── called by Client Components via form actions or onClick
  └── query/mutate DB via Drizzle
  └── call Gemini API
  └── call revalidatePath() to refresh Server Component data

Middleware (src/proxy.ts)
  └── reads auth session
  └── will also read staff role for sidebar nav scoping
```

---

## Data Flow

### Student Profile Page Data Flow

The student profile is the most data-intensive page. It aggregates from 7 tables:

```
Request: GET /students/[studentId]

1. Middleware: verify auth session → allow through
2. Server Component (page.tsx):
   a. requireUser() → userId
   b. getStaffRole(userId) → role
   c. Parallel DB queries (Promise.all):
      - getStudent(studentId)
      - getAttendanceSummary(studentId)
      - getGrades(studentId)
      - getTestScores(studentId)
      - getGraduationPlan(studentId)
      - getCollegePrepPlan(studentId)
      - getLatestAIInsight(studentId)
   d. Render all Panel components with prefetched data (no waterfalls)

3. Client Components receive data as props
   - No additional fetches on mount
   - Only call Server Actions for mutations
```

**Key pattern:** Use `Promise.all()` in the Server Component to fetch all 7 queries in parallel. Do NOT nest awaits (each await would serialize, causing ~700ms total vs ~100ms parallel).

### Role-Scoped Student List Data Flow

```
Request: GET /students

1. Server Component:
   a. requireUser() → userId
   b. getStaffRole(userId) → role
   c. if role === 'teacher':
        query = db.select().from(students)
                  .innerJoin(enrollments, ...)
                  .innerJoin(classes, ...)
                  .where(eq(classes.teacherId, userId))
      else:
        query = db.select().from(students).where(eq(students.isActive, true))
   d. Pass filtered list to StudentTable (Client Component)
```

### Mutation Data Flow (e.g., Add Grade)

```
User fills GradeForm → submits
  → Server Action (addGrade in src/actions/grades.ts)
    → requireUser() check
    → validate input with Zod
    → db.insert(grades).values(...)
    → revalidatePath("/students/[studentId]")
  → Server Component re-fetches → updated UI
```

---

## Patterns to Follow

### Pattern 1: Parallel Data Fetching in Server Components

**What:** Wrap all DB queries in `Promise.all()` at the top of a Server Component page.

**When:** Any page that needs data from more than one table.

```typescript
// src/app/(dashboard)/students/[studentId]/page.tsx
export default async function StudentProfilePage({ params }) {
  const { userId } = await requireUser();

  const [student, attendance, grades, tests, gradPlan, collegePlan, insight] =
    await Promise.all([
      getStudent(params.studentId),
      getAttendanceSummary(params.studentId),
      getGrades(params.studentId),
      getTestScores(params.studentId),
      getGraduationPlan(params.studentId),
      getCollegePrepPlan(params.studentId),
      getLatestAIInsight(params.studentId),
    ]);

  return (
    <>
      <ProfileHeader student={student} />
      <AttendancePanel data={attendance} />
      <GradesPanel data={grades} />
      {/* ... */}
    </>
  );
}
```

### Pattern 2: Query Builders in `src/db/queries/`

**What:** Move all Drizzle queries out of page components into dedicated query files.

**When:** Every DB query — pages should never contain raw Drizzle calls.

```
src/db/
  ├── schema.ts
  ├── index.ts
  └── queries/
      ├── students.ts    ← getStudent(), getStudentList(), searchStudents()
      ├── grades.ts      ← getGrades(), addGrade()
      ├── attendance.ts  ← getAttendanceSummary(), recordAttendance()
      ├── tests.ts       ← getTestScores(), addTestScore()
      ├── plans.ts       ← getGraduationPlan(), getCollegePrepPlan()
      └── insights.ts    ← getLatestAIInsight(), saveInsight()
```

**Why:** Pages become thin orchestrators. Query logic is reusable across pages and server actions. Easier to test and iterate schema changes.

### Pattern 3: Server Actions in `src/actions/`

**What:** All mutations (insert/update) and Gemini calls live in `src/actions/`.

**When:** Any data write or AI call triggered by user interaction.

```
src/actions/
  ├── students.ts    ← createStudent(), updateStudent()
  ├── grades.ts      ← addGrade(), updateGrade()
  ├── attendance.ts  ← recordAttendance()
  ├── plans.ts       ← updateGraduationPlan(), updateCollegePrepPlan()
  └── gemini.ts      ← generateStudentInsight(), generateRoadmap(), generateTrends()
```

### Pattern 4: Role Context via Server-Read Profile

**What:** Read staff role once per layout render, pass to client via a context provider.

**When:** Any client component needs to conditionally render based on role.

```typescript
// src/app/(dashboard)/layout.tsx (Server Component)
const profile = await getStaffProfile(userId);

return (
  <RoleProvider role={profile.role}>
    <AppSidebar />
    {children}
  </RoleProvider>
);
```

```typescript
// src/components/RoleProvider.tsx ("use client")
const RoleContext = createContext<Role>("teacher");
export const useRole = () => useContext(RoleContext);
```

Client components use `useRole()` to show/hide counselor-only UI sections.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Fetching Data in Client Components with useEffect

**What:** `useEffect(() => { fetch("/api/students") }, [])` pattern in Client Components.

**Why bad:** Creates request waterfalls, requires loading state management, exposes API endpoints that need separate auth checks, makes Server Component data fetching irrelevant.

**Instead:** Fetch in Server Components, pass as props. Use Server Actions for mutations only.

### Anti-Pattern 2: One Giant Student Profile API Route

**What:** A single `/api/students/[id]/profile` route that joins all 7 tables and returns one large JSON object.

**Why bad:** Any field change forces re-fetching all data. Slow to build. Hard to cache selectively. Unnecessary for App Router.

**Instead:** Server Component fetches directly from DB in parallel, renders individual Panel components. Each panel is independently refetchable via `revalidatePath`.

### Anti-Pattern 3: Calling Gemini from Client Components

**What:** `fetch("https://generativelanguage.googleapis.com/...")` directly in browser code.

**Why bad:** Exposes your `GEMINI_API_KEY` to the browser. Anyone can extract it from network inspector and use your API quota.

**Instead:** Always call Gemini through Server Actions. The key stays server-side.

### Anti-Pattern 4: Skipping Zod Validation in Server Actions

**What:** Directly inserting form data into DB without validation.

**Why bad:** Server Actions receive raw FormData or objects from the client. Malformed or malicious input hits the DB.

**Instead:** Validate all Server Action inputs with Zod before any DB operation. Zod is already installed.

### Anti-Pattern 5: Using Service Role Key for User Data Reads

**What:** Always using `DATABASE_URL` (service role) for all Drizzle queries.

**Why bad:** Bypasses RLS entirely. A bug in application-layer role checking leaks cross-role data.

**Instead:** For read operations on student data, use the user's JWT token to initialize the Postgres connection so RLS policies enforce scoping. (See RLS implementation note above.) This is belt-and-suspenders security.

---

## Scalability Considerations

| Concern | At 500 students (v1) | At 5K students | At 50K students |
|---------|---------------------|----------------|-----------------|
| Student list query | Full table scan is fine | Add index on `grade_level`, `is_active` | Pagination required (cursor-based) |
| Profile page (7 parallel queries) | ~50–100ms total | ~100–200ms, add indexes | Consider materialized view for profile snapshot |
| Gemini calls | On-demand, cached in `ai_insights` | Batch generation nightly | Rate limit queue needed |
| RLS policy performance | Minimal overhead | Add index on `enrollments(teacher_id)` | Consider denormalized `teacher_students` table |
| Server Actions concurrency | Vercel serverless, auto-scales | — | — |

**Indexes to add at schema creation time:**
- `enrollments(student_id)`, `enrollments(class_id)` — foreign key traversal
- `classes(teacher_id)` — teacher RLS policy
- `students(counselor_id)`, `students(grade_level)`, `students(graduation_year)`
- `grades(student_id, school_year)`
- `attendance_records(student_id, date)`
- `ai_insights(student_id, is_current)` — fast "latest insight" lookup

---

## Suggested Build Order

Build order is driven by dependency chains. Lower layers must exist before upper layers.

```
Phase 1: Database Foundation
  1. Define Drizzle schema (all tables above)
  2. Write and run migrations
  3. Create RLS policies in Supabase dashboard
  4. Seed test data (2–3 staff, 10 students, sample grades/attendance)

Phase 2: Role System + Staff Profiles
  1. staff_profiles table wired to auth.users
  2. Role assignment UI (admin-only or Supabase dashboard for v1)
  3. getStaffRole() helper in src/lib/auth.ts
  4. RoleProvider context in dashboard layout
  5. Middleware updated to pass role to layout

Phase 3: Student List + Search
  1. Query builders in src/db/queries/students.ts
  2. /students page (Server Component, role-scoped query)
  3. StudentTable (Client Component, sort/filter)
  4. StudentSearch bar

Phase 4: Student Profile Page (Read)
  1. Remaining query builders (grades, attendance, tests, plans)
  2. /students/[studentId] page with parallel fetch
  3. All Panel components (AttendancePanel, GradesPanel, etc.)
  4. ProfileHeader with at-risk badge placeholder

Phase 5: Data Entry (Write)
  1. Server Actions for all mutations
  2. Form components (StudentForm, GradeForm, AttendanceForm, TestScoreForm)
  3. Add/edit flows wired to actions + revalidation
  4. Graduation plan and college prep plan edit UI

Phase 6: Gemini AI Integration
  1. src/lib/gemini/ module (client, prompts, types)
  2. generateStudentInsight() server action
  3. AIInsightPanel with loading state + regenerate button
  4. generateRoadmap() server action wired to CollegePrepPanel
  5. generateSchoolTrends() for principal/counselor overview dashboard

Phase 7: Overview Dashboard + Polish
  1. Overview dashboard page (school-wide stats)
  2. AtRiskList widget (students with is_current AI insight flagging risk)
  3. TrendsPanel
  4. Rebrand from "Song Tool" to "EduDash" (nav, metadata, page titles)
```

**Dependency rationale:**
- Phase 1 must come first — nothing works without schema
- Phase 2 must precede Phase 3 — student list queries require role scoping
- Phase 4 (read) before Phase 5 (write) — verify data displays correctly before building mutation paths
- Phase 6 last among feature work — Gemini needs complete student data to generate meaningful output; incomplete data produces poor AI results that could undermine confidence in the feature
- Phase 7 last — overview dashboard needs all underlying data populated to be meaningful

---

## Sources

- Supabase RLS documentation patterns (training data, HIGH confidence for stable patterns)
- Next.js App Router Server Actions documentation (training data, HIGH confidence — stable since Next.js 13.4)
- `@google/generative-ai` SDK Node.js usage (training data, MEDIUM confidence — verify current SDK version and model names against https://ai.google.dev/gemini-api/docs)
- Drizzle ORM + Supabase integration patterns (training data, HIGH confidence)
- Existing codebase analysis: `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/STRUCTURE.md`

**Verification recommended before Phase 6:**
- Confirm current Gemini model names (`gemini-1.5-flash` vs newer models) at https://ai.google.dev/gemini-api/docs/models/gemini
- Confirm `@google/generative-ai` npm package vs `@google/genai` (SDK was renamed in early 2025)
- Confirm Edge Runtime support status if Vercel Edge Functions are considered
