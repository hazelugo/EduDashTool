# Project Research Summary

**Project:** EduDash Student Aggregator Dashboard
**Domain:** EdTech / High school student information aggregator with AI layer
**Researched:** 2026-03-15
**Confidence:** MEDIUM-HIGH

## Executive Summary

EduDash is a brownfield Next.js 16 application being repurposed from an unrelated tool ("Song Tool") into a high school student aggregator dashboard for teachers, counselors, and principals. The product occupies a real market gap: educators currently context-switch between PowerSchool, Naviance, Infinite Campus, and spreadsheets to get a complete picture of any student. EduDash's core value is a single, fast, AI-augmented student profile that a counselor can open and act on immediately. The recommended build approach is server-driven — Server Components fetch data directly from Supabase/Drizzle in parallel, Server Actions handle all mutations and Gemini AI calls, and Supabase RLS policies enforce role scoping at the database layer as a security backstop.

The most important architectural decision is that the role system and data access layer must be built correctly before any feature work begins. Three staff roles — teacher, counselor, principal — have strictly different data visibility, and multiple research-identified pitfalls stem from treating role enforcement as a UI concern rather than a database-and-server concern. The existing codebase has live issues (post-login redirect to `/songs`, placeholder Supabase URLs, migrations running inside the build step) that must be fixed as a precondition to all new development.

Gemini AI integration is both the primary differentiator and the highest-risk component. The AI features — per-student at-risk flags, intervention suggestions, graduation roadmap generation, and school-wide trend analysis — cannot be the first thing built. They require a complete data layer beneath them to produce meaningful output, and they carry non-trivial FERPA compliance obligations around sending student PII to a third-party API. The recommended build sequence defers all Gemini work to Phase 6 of 7, after the data layer, role system, profile views, and data entry are verified working.

---

## Key Findings

### Recommended Stack

The existing stack (Next.js 16, Supabase, Drizzle ORM, shadcn/ui, TanStack Table, react-hook-form, zod) covers all core requirements. Only three additions are needed. `@google/generative-ai` is required for the Gemini AI features — it must be installed as a server-side-only dependency and accessed exclusively from Server Actions and Server Components, never from client-side code. `date-fns` v3.x is strongly recommended for the heavy date arithmetic involved in graduation timelines, attendance rate calculations, and SAT eligibility windows. `recharts` is likely needed for the principal analytics dashboard, but should be deferred until that phase since shadcn/ui's chart components install it automatically.

RBAC requires no new npm packages. It is implemented as a `staff_profiles` table with a role enum column, Supabase RLS policies using a `get_staff_role()` SQL helper function, and application-layer role checks in every server action and query builder. Verify `@google/generative-ai` package version and confirm whether Google has promoted `@google/genai` as the official package before installing — the SDK naming was in flux as of the research knowledge cutoff.

**Core technologies:**
- `@google/generative-ai`: Gemini API client — only new required package; server-side only; verify version before install
- `date-fns` v3.x: Date arithmetic — graduation dates, attendance rates, SAT windows; tree-shakeable, TypeScript-native
- `recharts`: Charts for principal dashboard — deferred; installed automatically by shadcn/ui chart component
- Supabase RLS + `staff_profiles` table: RBAC enforcement — no npm package needed; pure schema + SQL policy approach
- `gemini-1.5-flash`: Default model choice — faster and cheaper than Pro; sufficient for structured text generation from tabular student data

### Expected Features

Research cross-referenced EduDash requirements against established SIS products (PowerSchool, Infinite Campus, Naviance). The table-stakes features are non-negotiable for adoption: missing any of them causes staff to revert to their existing tools.

**Must have (table stakes):**
- Student list with name, grade, and class search/filter — educators navigate by student name daily
- Unified student profile page — the core value proposition; must load fast with no broken-looking sparse states
- Attendance display (absences, tardies, excused vs. unexcused) — #1 early-warning signal for counselors
- Current classes and grades per course — checked constantly by teachers and counselors
- Graduation credit tracker with on-track indicator — counselors' primary daily job function
- Role-based access control (teacher/counselor/principal) — schools will not deploy without it
- Manual data entry for all student data — no SIS sync in v1; staff enter everything
- SAT/PSAT score display — standard college-prep data point reviewed annually

**Should have (differentiators):**
- Gemini AI: per-student at-risk flag with 1-2 sentence reasoning — counselors cannot manually track 400+ students
- Gemini AI: 2-3 concrete intervention suggestions per flagged student — actionable, not just alerting
- College prep roadmap with target schools and milestone tracking — Naviance charges separately for this
- Gemini AI: graduation + college prep roadmap generation from actual student data
- Gemini AI: school-wide trend insights for principal overview dashboard
- AI-generated student snapshot narrative displayed on profile page

**Defer (v2+):**
- SIS auto-sync (PowerSchool, Infinite Campus) — school-specific, maintenance-heavy, scope explosion
- CSV bulk import — parsing edge cases are a reliability trap; manual entry enforces data quality
- Audit log / change history — important for compliance but complex; Supabase timestamps provide minimal traceability for v1
- Parent or student portal — separate product with separate auth, privacy policy, and FERPA surface
- Real-time notifications / push alerts — not part of the core counselor workflow

### Architecture Approach

The system is a server-driven Next.js App Router application. Server Components fetch all data in parallel via Drizzle ORM directly from Supabase/Postgres, then pass data as props to Client Components which handle only interactivity. All mutations and Gemini calls go through Server Actions (`src/actions/`), which validate inputs with Zod, query the database, call Gemini where needed, and call `revalidatePath()` to refresh server-rendered data. API routes are limited to health checks and webhooks — no student data flows through API routes. This architecture keeps the `GEMINI_API_KEY` entirely server-side and avoids client-side data fetching waterfalls.

The student profile page is the most data-intensive view: 7 parallel queries (student, attendance, grades, test scores, graduation plan, college prep plan, AI insight) must be fetched with `Promise.all()` in the Server Component to avoid serialized ~700ms load times. All Drizzle queries are centralized in `src/db/queries/` — no raw DB calls in page components. Prompt engineering functions are isolated in `src/lib/gemini/prompts.ts` for iterability.

**Major components:**
1. `src/db/schema.ts` + migrations — 10 tables: staff_profiles, students, classes, enrollments, attendance_records, grades, standardized_tests, graduation_plans, college_prep_plans, ai_insights
2. `src/db/queries/` — centralized query builders with role-scoped filters; single path for all student data access
3. `src/actions/` — server actions for all mutations and Gemini calls; auth-checked before any DB or API access
4. `src/app/(dashboard)/students/` — student list and `[studentId]` profile pages as Server Components
5. `src/components/profile/` — panel components (AttendancePanel, GradesPanel, GraduationPanel, AIInsightPanel, etc.)
6. `src/lib/gemini/` — client singleton, prompt builders, TypeScript types for AI output shapes
7. Supabase RLS policies — `get_staff_role()` SQL helper + policies on every student-data table

### Critical Pitfalls

1. **RLS bypassed by Drizzle's direct Postgres connection** — Supabase RLS only applies to PostgREST/SDK connections, NOT to the `DATABASE_URL` connection used by Drizzle. Every student query in `src/db/queries/` must include explicit role-scoped SQL `WHERE` clauses. Build a single `getStudentsForUser(userId, role)` function as the enforced data access path — never query students without role scoping. Add integration tests verifying teacher JWTs cannot retrieve out-of-scope students.

2. **Student PII sent to Gemini without FERPA compliance** — Sending student names, GPA, attendance, and SAT scores to Gemini constitutes a third-party disclosure under FERPA. Google Gemini's default API terms do not constitute a FERPA-compliant Data Processing Agreement. Before any live student data reaches the API: confirm DPA is in place, implement data minimization (pseudonymize identifiers in prompts), and add an AI audit log table recording who triggered each Gemini call, for which student, and when.

3. **API routes unprotected by middleware** — The existing `src/proxy.ts` middleware excludes `/api/*` from its matcher, meaning every API route must call `requireUser()` itself. New routes for student data added without this check are publicly accessible. Enforce with a `withAuth(handler)` wrapper; write a test per student-facing route verifying unauthenticated requests return 401.

4. **Gemini hallucinating graduation requirements and deadlines** — Gemini has no knowledge of the school's specific credit requirements, district policies, or current-year college deadlines. Without grounding data injected from the database, AI-generated roadmaps will contain plausible-sounding but incorrect specifics. Prompts must always inject school requirements from a `graduation_requirements` config table. Add a disclaimer on all AI-generated content: "Verify against official school requirements before sharing."

5. **Role claims trusted from client payload** — Never derive role from `req.body.role` or query params. Always look up role from `staff_profiles` using the verified JWT `userId` at the start of every protected request. Build a `getAuthenticatedStaffContext()` function as the single source of truth.

---

## Implications for Roadmap

Based on the combined research, the architecture's build order and the critical-path dependency chain strongly suggest a 7-phase structure. The dependency chain is: schema → roles → student list → profile read → data entry → AI → dashboard polish. Deviating from this order produces either missing data for AI features or untestable role scoping.

### Phase 1: Foundation Fixes and Schema

**Rationale:** The existing codebase has three live blockers that will cause failures in every subsequent phase: the post-login redirect to `/songs`, placeholder Supabase URLs, and migrations running inside the build step. These must be resolved before any new development starts. Database schema is also Phase 1 because every other phase depends on it — there is no meaningful work to do without tables.

**Delivers:** Clean development baseline; all 10 database tables defined and migrated; RLS enabled on all student tables at creation time; test seed data; migration pipeline decoupled from build

**Addresses features:** RBAC schema foundation; student data model; graduation and college prep plan tables; AI insights table

**Avoids pitfalls:** Pitfall 11 (silent auth failures), Pitfall 12 (migrations in build), Pitfall 13 (dead `/songs` redirect), Pitfall 6 (RLS disabled by default on student tables)

### Phase 2: Role System and Staff Profiles

**Rationale:** Role enforcement is the second foundational layer. The student list (Phase 3) requires role-scoped queries. If roles are implemented after the list, the list will be built without scoping and must be rewritten.

**Delivers:** `staff_profiles` table wired to auth.users; `getAuthenticatedStaffContext()` server function returning userId + role + assignedClassIds; `RoleProvider` context in dashboard layout; middleware updated with role awareness; admin path for assigning roles

**Addresses features:** Role-based access control for all three roles (teacher/counselor/principal)

**Avoids pitfalls:** Pitfall 4 (client-side role claims), Pitfall 1 (unscoped student queries); the `withAuth()` wrapper pattern established here

### Phase 3: Student List and Search

**Rationale:** The student list is the entry point to the entire application. Counselors and teachers start here. It must exist before the profile page is useful. Search scoping must be enforced in SQL at this phase, not retroactively.

**Delivers:** `/students` page with role-scoped server-side query; `StudentTable` with sort/filter; `StudentSearch` bar; `RiskBadge` placeholder; teacher sees only their enrolled students, counselor/principal see all

**Addresses features:** Student list with search; role-scoped visibility

**Avoids pitfalls:** Pitfall 9 (search bypassing teacher scope filter — SQL-layer filter required here)

### Phase 4: Student Profile Page (Read)

**Rationale:** Read before write. Verifying that all data displays correctly before building mutation paths prevents debugging data entry against a broken display layer.

**Delivers:** `/students/[studentId]` Server Component with 7-table parallel fetch via `Promise.all()`; all Panel components (ProfileHeader, AttendancePanel, GradesPanel, TestScoresPanel, GraduationPanel, CollegePrepPanel, AIInsightPanel placeholder); on-track status indicator

**Addresses features:** Unified student profile view; attendance display; grades and classes; graduation credit tracker; on-track indicator; SAT/PSAT display

**Avoids pitfalls:** Pitfall 1 (RLS bypass) — query builders in `src/db/queries/` with role scoping verified here against real data shape

### Phase 5: Data Entry (Write)

**Rationale:** Manual data entry is what makes the tool usable. Without it, there is no data to display or analyze. This phase unlocks the AI features in Phase 6 by populating the database with real student records.

**Delivers:** Server Actions for all mutations (createStudent, addGrade, recordAttendance, addTestScore, updateGraduationPlan, updateCollegePrepPlan); all form components with Zod validation; add/edit flows wired to `revalidatePath()`; graduation plan and college prep plan edit UI

**Addresses features:** Manual data entry for staff; CRUD for all student data types

**Avoids pitfalls:** Pitfall 4 (role checked in every server action before DB write), Pitfall 8 (Zod schemas with domain constraints: GPA 0.0–4.0, attendance 0–100, SAT 400–1600), Pitfall 3 (`withAuth` on any API routes introduced here)

### Phase 6: Gemini AI Integration

**Rationale:** AI features require complete student data to produce meaningful output — incomplete or seeded-only data generates misleading AI insights that undermine trust in the feature. This phase also has the highest compliance risk and must be addressed deliberately.

**Delivers:** `src/lib/gemini/` module (client singleton, prompt builders, output types); `generateStudentInsight()` server action (at-risk flag + intervention suggestions); `AIInsightPanel` with loading state and regenerate button; `generateRoadmap()` server action; `generateSchoolTrends()` for principal/counselor; AI insights cached in `ai_insights` table; per-student regeneration cooldown; `record_access_log` table for AI audit trail

**Addresses features:** Gemini at-risk flagging; intervention suggestions; graduation + college prep roadmap generation; student snapshot narrative; school-wide trend insights

**Avoids pitfalls:** Pitfall 2 (FERPA — DPA confirmed, data minimization in prompts, AI audit log), Pitfall 5 (school requirements injected from DB as grounding context, AI disclaimer UI), Pitfall 7 (AI results cached in DB with TTL, not regenerated on every page load)

**Research flag:** This phase needs deeper research before implementation. Verify: current Gemini model names (gemini-1.5-flash may be superseded), `@google/generative-ai` vs `@google/genai` package status, JSON output mode API, and Google's current DPA terms for K-12 EdTech.

### Phase 7: Overview Dashboard and Polish

**Rationale:** The overview dashboard requires sufficient real student data to be meaningful. It is the principal's primary view and surfaces the school-wide AI trend insights generated in Phase 6.

**Delivers:** Overview dashboard page with school-wide stats (OverviewStats, AtRiskList widget, TrendsPanel); full rebrand from "Song Tool" to "EduDash" (nav labels, metadata, page titles, logos); responsive layout testing at 768px (tablet/iPad); end-to-end smoke tests across all three role personas

**Addresses features:** School-wide analytics for principal; unified dashboard replacing tab-switching; responsive layout for counselor iPad use

**Avoids pitfalls:** Pitfall 10 (access logging table confirmed operational before any school-wide data aggregation)

### Phase Ordering Rationale

- Schema must precede all feature work — no tables means no queries, no forms, no AI
- Role system must precede student list — role-scoped queries cannot be written without the role infrastructure
- Profile read before write — display layer verified before mutation paths are built against it
- Data entry before AI — Gemini produces poor output on empty or sparse data; worse, it hallucinates when context is thin
- Overview dashboard last — requires both real data volume and functional AI insights to be meaningful
- Codebase cleanup in Phase 1, not a separate track — the three existing blockers (redirect, placeholder URLs, migration-in-build) are cheap to fix and expensive to debug around

### Research Flags

Phases needing deeper research during planning:
- **Phase 6 (Gemini AI):** Verify current model names, confirm `@google/generative-ai` vs `@google/genai` package status, validate JSON output mode API surface, confirm Google's DPA terms for K-12 EdTech compliance — all of these were flagged MEDIUM confidence due to no network access during research
- **Phase 1 (Schema):** Confirm `recharts` version installed by `npx shadcn@latest add chart` before adding it explicitly — avoid version conflicts

Phases with standard patterns (skip research-phase):
- **Phase 2 (Role System):** Canonical Supabase `staff_profiles` + RLS pattern is well-documented and HIGH confidence
- **Phase 3 (Student List):** TanStack Table with server-side data is a standard pattern in the existing stack
- **Phase 4 (Profile Read):** `Promise.all()` parallel fetch in Server Components is a documented Next.js App Router pattern
- **Phase 5 (Data Entry):** Server Actions + Zod + react-hook-form is the established pattern in this codebase
- **Phase 7 (Dashboard/Polish):** Standard shadcn/ui component assembly; no novel patterns

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | Architecture patterns HIGH; version numbers MEDIUM — no network access during research; verify `@google/generative-ai` version and package name before install |
| Features | HIGH | Table stakes derived from well-established SIS product norms (PowerSchool, Naviance, Infinite Campus); anti-features are validated scope traps; Gemini feature design MEDIUM |
| Architecture | HIGH | Supabase RLS patterns, Next.js App Router Server Actions, Drizzle ORM integration — all stable, well-documented patterns verified against existing codebase |
| Pitfalls | HIGH | Critical pitfalls 1–4 directly observed in codebase or confirmed from official Supabase/FERPA documentation; Pitfall 5 is MEDIUM (LLM hallucination patterns) |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Gemini package name:** `@google/generative-ai` vs `@google/genai` — Google was in the process of unifying SDKs as of August 2025. Run `npm info @google/generative-ai` and `npm info @google/genai` to determine current official recommendation before Phase 6 planning.
- **Gemini model names:** `gemini-1.5-flash` and `gemini-1.5-pro` may be superseded by newer models. Verify at https://ai.google.dev/gemini-api/docs/models before prompt engineering begins.
- **FERPA/DPA status:** Research identified the compliance requirement but cannot confirm whether a Google Workspace for Education agreement is in place at the target school. This must be confirmed with the school before live student data is entered into any system connected to Gemini.
- **RLS enforcement strategy decision:** Research identified two valid approaches (application-layer query scoping vs. per-request JWT-based Drizzle client for RLS enforcement). The team needs to decide which primary enforcement model to use in Phase 1 before writing any queries. Both approaches are documented in ARCHITECTURE.md.
- **`recharts` version:** Verify the exact version installed by `npx shadcn@latest add chart` to avoid conflicts before explicitly adding `recharts` to dependencies.

---

## Sources

### Primary (HIGH confidence)
- Supabase RLS documentation — `auth.uid()` function, service role bypass behavior, `SECURITY DEFINER` function pattern
- Next.js App Router documentation — Server Actions, Server Components, `revalidatePath()` pattern
- FERPA regulation text (34 CFR Part 99, sections 99.30, 99.31, 99.32) — disclosure consent, school official exception, recordkeeping requirements
- Existing codebase analysis — `src/proxy.ts`, `src/lib/supabase/client.ts`, `src/lib/auth.ts`, `src/db/index.ts`, `package.json`, `CONCERNS.md`

### Secondary (MEDIUM confidence)
- `@google/generative-ai` SDK Node.js patterns — training data through August 2025; verify before Phase 6
- Gemini model availability and JSON output mode — verify current model names at https://ai.google.dev/gemini-api/docs/models
- EdTech product feature research (PowerSchool, Naviance, Infinite Campus, Schoology, Illuminate) — training data through August 2025

### Tertiary (LOW confidence)
- Google `@google/genai` unified SDK status — package was newly published as of training cutoff; current official recommendation unknown; verify before Phase 6

---
*Research completed: 2026-03-15*
*Ready for roadmap: yes*
