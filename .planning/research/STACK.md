# Technology Stack — EduDash Additions

**Project:** EduDash Student Aggregator Dashboard
**Researched:** 2026-03-15
**Scope:** Brownfield additions only. Next.js 16, Supabase, Drizzle ORM, and shadcn/ui are already installed. This document covers only what must be ADDED.

---

## What Is Already Installed (Do Not Re-Add)

| Package | Version | Role |
|---------|---------|------|
| next | 16.1.6 | Framework |
| @supabase/supabase-js | 2.99.1 | Auth + DB client |
| @supabase/ssr | 0.9.0 | SSR session management |
| drizzle-orm | 0.45.1 | ORM |
| drizzle-kit | 0.30.0 | Migrations |
| postgres | 3.4.8 | PostgreSQL driver |
| react-hook-form | 7.71.2 | Forms |
| zod | 4.3.6 | Validation |
| @tanstack/react-table | 8.21.3 | Tables |
| @tanstack/react-virtual | 3.13.22 | Virtualized lists |
| shadcn/ui | 4.0.2 | Component library |

---

## Additions Required

### 1. Google Gemini AI

#### Recommended Package

| Package | Version | Purpose | Why |
|---------|---------|---------|-----|
| @google/generative-ai | ^0.24.0 | Gemini API client for Node.js | Official Google SDK; supports Gemini 2.0 Flash and 1.5 Pro models; works in Node.js server contexts (Next.js API routes and server actions) |

**Confidence:** MEDIUM — Version 0.24.x was current as of August 2025 training cutoff. The package moves quickly. VERIFY with `npm info @google/generative-ai version` before installing.

**Note on the Google AI SDK rename:** Google published a second package `@google/genai` (the "new unified SDK") alongside `@google/generative-ai` starting in late 2024. As of training cutoff, `@google/generative-ai` remains the stable, well-documented choice. The `@google/genai` package is newer and less battle-tested in production Next.js contexts. Stick with `@google/generative-ai` unless Google has officially deprecated it by the time you install.

#### Installation

```bash
npm install @google/generative-ai
```

#### Environment Variable

```
GEMINI_API_KEY=your-key-here
```

This is a server-side secret. Do NOT prefix with `NEXT_PUBLIC_`. Access only from server components, server actions, and API routes.

#### Initialization Pattern (Next.js Server)

```typescript
// src/lib/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set");
}

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const geminiPro = genAI.getGenerativeModel({
  model: "gemini-1.5-pro", // use for complex reasoning: roadmap generation, at-risk analysis
});

export const geminiFlash = genAI.getGenerativeModel({
  model: "gemini-1.5-flash", // use for fast responses: trend summaries, quick flags
});
```

#### Usage in Server Actions

```typescript
// src/app/actions/generate-roadmap.ts
"use server";
import { geminiPro } from "@/lib/gemini";

export async function generateStudentRoadmap(studentData: StudentContext) {
  const prompt = buildRoadmapPrompt(studentData);
  const result = await geminiPro.generateContent(prompt);
  return result.response.text();
}
```

**Why server actions over API routes:** Server actions in Next.js 15/16 are type-safe end-to-end and don't require a separate fetch call from the client. For AI features that are triggered by user interaction (e.g., "Generate Plan" button), server actions are the correct pattern. The Gemini key never touches the client bundle.

**Why NOT use the Vercel AI SDK (`ai` package):** The Vercel AI SDK adds streaming UI patterns and multi-provider abstraction. For this project, all three Gemini use cases (at-risk analysis, roadmap generation, trend surfacing) are fire-and-read, not streaming chat. The extra abstraction layer is unnecessary complexity. Use `@google/generative-ai` directly.

---

### 2. Role-Based Access Control

No new npm packages are needed for RBAC. The pattern is implemented via:
1. A `role` column on a `profiles` or `user_roles` table (Drizzle schema)
2. Supabase Row Level Security (RLS) policies reading that role
3. Next.js middleware enforcement using the existing `requireUser()` pattern

#### RBAC Architecture

**Three roles required:** `teacher`, `counselor`, `principal`

```
teacher    → sees only students in their assigned classes
counselor  → sees all students, full data
principal  → sees all students, full data + school-wide analytics
```

#### Schema Pattern (Drizzle)

```typescript
// src/db/schema.ts — profiles table
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().references(() => authUsers.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["teacher", "counselor", "principal"] }).notNull(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

// teacher_class_assignments — bridges teachers to classes for scoped visibility
export const teacherClassAssignments = pgTable("teacher_class_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  teacherId: uuid("teacher_id").references(() => profiles.id),
  classId: uuid("class_id").references(() => classes.id),
});
```

#### Supabase RLS Policies

RLS is defined in SQL migrations (not Drizzle — Drizzle does not manage RLS policies directly). Write these as raw SQL in a Drizzle migration file using `sql` template literal or as a separate `supabase/migrations` file.

```sql
-- Enable RLS on students table
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Counselors and principals see all students
CREATE POLICY "counselors_principals_see_all_students"
  ON students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('counselor', 'principal')
    )
  );

-- Teachers see only students in their classes
CREATE POLICY "teachers_see_assigned_students"
  ON students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN teacher_class_assignments tca ON tca.teacher_id = p.id
      JOIN student_enrollments se ON se.class_id = tca.class_id
      WHERE p.id = auth.uid()
      AND p.role = 'teacher'
      AND se.student_id = students.id
    )
  );
```

**Critical:** The `auth.uid()` function is a built-in Supabase/PostgreSQL function that returns the UUID of the currently authenticated user. RLS policies call it at query time. This only works when queries are made through the Supabase client (not through direct `postgres` driver connections using `DATABASE_URL`). For server-side Drizzle queries that need role enforcement, enforce role-checking in application code, not via RLS — or use the Supabase service role client only for admin operations.

**Confidence:** HIGH — This is the canonical Supabase RBAC pattern, consistent with official Supabase documentation as of August 2025.

#### Role Enforcement in Application Code

The existing `requireUser()` in `src/lib/auth.ts` returns the user ID. Extend it to also return the role:

```typescript
// src/lib/auth.ts — extend pattern
export async function requireUserWithRole() {
  const user = await requireUser(); // existing
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
  });
  if (!profile) throw new Error("No profile found");
  return { user, role: profile.role };
}
```

Use this in server actions and API route handlers before any data access.

#### No Additional npm Packages Needed

Do NOT install:
- `next-auth` — Auth is already handled by Supabase. Adding next-auth creates dual auth systems.
- `casl` — A permissions library that adds complexity. For three roles with simple visibility rules, application-level checks + RLS is sufficient.
- `@clerk/nextjs` — Clerk is an alternative to Supabase Auth. Don't mix auth providers.

---

### 3. Data Tables and Student Profile UI

The existing stack already has everything needed. No new UI packages are required:

| Already Installed | Role in Student Data |
|-------------------|---------------------|
| @tanstack/react-table 8.21.3 | Student list table with sorting, filtering, pagination |
| @tanstack/react-virtual 3.13.22 | Virtualized rendering if student count grows large |
| react-hook-form 7.71.2 | Forms for adding/editing student records |
| zod 4.3.6 | Validation schemas for all student data inputs |
| shadcn/ui 4.0.2 | Profile cards, tabs, badges for student profile view |
| use-debounce 10.1.0 | Search input debouncing in student list |

#### Optional Addition: Date Utilities

Student data involves heavy date arithmetic: graduation date calculations, SAT registration windows, attendance rate calculations, credit completion timelines.

| Package | Version | Purpose | Why |
|---------|---------|---------|-----|
| date-fns | ^3.6.0 | Date arithmetic and formatting | Lightweight, tree-shakeable, no dependencies. Used for: days-until-graduation, attendance-rate-per-period, SAT-eligibility windows. Avoid `dayjs` (smaller ecosystem) and `moment` (deprecated, heavy). |

**Confidence:** HIGH — date-fns 3.x is the dominant lightweight date library in the TypeScript/React ecosystem as of training cutoff.

```bash
npm install date-fns
```

#### Optional Addition: Chart Library (Principal Dashboard)

The principal role requires school-wide analytics. shadcn/ui ships with `recharts` as its chart primitive.

| Package | Version | Purpose | Why |
|---------|---------|---------|-----|
| recharts | ^2.12.0 | School-wide trend charts | shadcn/ui's chart components are built on recharts. Using recharts directly keeps the library count down and ensures visual consistency with the shadcn design system. |

**Confidence:** MEDIUM — shadcn/ui's charting components depend on recharts. Verify the exact version required by running `npx shadcn@latest add chart` and checking what it installs.

```bash
npm install recharts
```

**Why NOT use Tremor, Victory, or nivo:** These introduce additional design systems or heavy dependencies. Since shadcn/ui is already installed and wraps recharts natively, recharts is the right choice.

---

## Summary of Packages to Add

### Required

| Package | Install Command | Purpose | Confidence |
|---------|----------------|---------|------------|
| @google/generative-ai | `npm install @google/generative-ai` | Gemini AI client | MEDIUM — verify version |

### Strongly Recommended

| Package | Install Command | Purpose | Confidence |
|---------|----------------|---------|------------|
| date-fns | `npm install date-fns` | Date arithmetic for graduation/attendance | HIGH |

### Likely Needed (defer until building principal dashboard)

| Package | Install Command | Purpose | Confidence |
|---------|----------------|---------|------------|
| recharts | `npm install recharts` | School-wide analytics charts | MEDIUM — verify against shadcn/ui chart component |

### No Package Needed (architecture-only)

| Capability | Approach |
|------------|---------|
| Role-based access control | Drizzle schema + Supabase RLS policies + app-code role guards |
| Student data schema | Drizzle ORM schema additions to `src/db/schema.ts` |
| Student profile views | shadcn/ui components (tabs, cards, badges) — already installed |
| Complex data tables | TanStack Table — already installed |

---

## Environment Variables to Add

| Variable | Where Used | Server-Only | Notes |
|----------|-----------|-------------|-------|
| `GEMINI_API_KEY` | `src/lib/gemini.ts` | YES — never `NEXT_PUBLIC_` | Get from Google AI Studio (aistudio.google.com) |

Add to `.env.local` for development. Add to Vercel dashboard for production.

---

## Alternatives Considered and Rejected

| Category | Recommended | Rejected | Why Rejected |
|----------|-------------|---------|--------------|
| AI SDK abstraction | `@google/generative-ai` direct | `ai` (Vercel AI SDK) | Streaming UI not needed; adds indirection; fire-and-read pattern is simpler |
| AI provider | Gemini (`@google/generative-ai`) | OpenAI, Anthropic | Explicitly requested by client |
| AI unified SDK | `@google/generative-ai` | `@google/genai` | `@google/genai` is newer and less established in Next.js contexts as of training cutoff; verify status before switching |
| RBAC library | RLS + app-code checks | `casl`, `next-auth` | Overengineering for three static roles; Supabase Auth already installed |
| Date library | `date-fns` | `dayjs`, `moment`, `luxon` | `date-fns` is tree-shakeable, TypeScript-native, zero dependencies; moment is deprecated; dayjs lacks some TypeScript ergonomics; luxon is heavier |
| Charts | `recharts` (via shadcn) | Tremor, nivo, Victory | recharts is shadcn/ui's native chart backend; avoids second design system |

---

## Version Verification Before Install

**FLAG:** The research environment had no external network access. The following versions are from training knowledge (cutoff August 2025) and MUST be verified before install:

```bash
# Run these before npm install to confirm current stable versions
npm info @google/generative-ai version
npm info date-fns version
npm info recharts version
```

If `@google/generative-ai` has been superseded by `@google/genai` as the official package, use whichever Google officially designates as current. The initialization pattern is nearly identical between the two.

---

## Sources

- Training knowledge: `@google/generative-ai` Node.js SDK patterns (HIGH for patterns, MEDIUM for version numbers)
- Training knowledge: Supabase RLS `auth.uid()` pattern — documented canonical approach (HIGH)
- Training knowledge: TanStack Table, date-fns, recharts ecosystem status (HIGH)
- Codebase analysis: `.planning/codebase/STACK.md`, `.planning/codebase/INTEGRATIONS.md`, `.planning/PROJECT.md`
- **Note:** No external web fetching was available during this research session. Version numbers carry MEDIUM confidence. All architecture patterns carry HIGH confidence.
