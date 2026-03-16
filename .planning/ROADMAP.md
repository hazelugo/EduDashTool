# Roadmap: EduDash

## Overview

EduDash is built from a working Next.js 16 shell (currently "Song Tool") that has auth, layout, and a DB connection but no tables and several live bugs. The build sequence follows a hard dependency chain: the schema must exist before any queries can be written, roles must be enforced before the student list can be scoped, the profile must render before write paths can be tested against it, data must exist before AI can produce meaningful output, and the overview dashboard requires both data and AI insights to be useful. Seven phases follow these natural delivery boundaries — each phase produces one coherent, verifiable capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation and Schema** - Fix three live blockers and define all 10 database tables (completed 2026-03-15)
- [ ] **Phase 2: Role System and Staff Profiles** - Wire staff roles to auth and enforce role-scoped data access
- [ ] **Phase 3: Student List and Search** - Paginated, searchable, role-scoped student list
- [ ] **Phase 4: Student Profile — Read** - Unified student profile page displaying all aggregated data
- [ ] **Phase 5: Data Entry — Write** - Staff forms and server actions for all student data mutations
- [ ] **Phase 6: Gemini AI Integration** - At-risk flags, intervention suggestions, roadmap generation, school-wide trends
- [ ] **Phase 7: Overview Dashboard and Polish** - Principal overview dashboard and full EduDash rebrand

## Phase Details

### Phase 1: Foundation and Schema
**Goal**: The codebase is clean and deployable, and all 10 database tables are defined, migrated, and ready for use
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, AUTH-01
**Success Criteria** (what must be TRUE):
  1. Logging in with valid credentials lands the user on `/dashboard`, not `/songs`
  2. Starting the dev server with a missing Supabase env var fails immediately with a readable error message, not a silent runtime crash
  3. Running `db:migrate` applies all migrations without touching the Next.js build step
  4. All 10 database tables exist in Postgres with Row Level Security enabled and a test seed file populates them with sample data
  5. The app title, tab favicon, and sidebar header display "EduDash" — no remaining "Song Tool" references
**Plans**: TBD

### Phase 2: Role System and Staff Profiles
**Goal**: Every staff member has an assigned role stored in the database, and every data access path enforces that role before returning any student data
**Depends on**: Phase 1
**Requirements**: AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06
**Success Criteria** (what must be TRUE):
  1. A newly created Supabase auth user can have a role (teacher, counselor, or principal) assigned via the `staff_profiles` table
  2. A server action called with a teacher's session cannot retrieve students from outside that teacher's assigned classes — role scoping is enforced at the query layer, not just the UI
  3. Counselor and principal sessions can retrieve any student in the school without restriction
  4. Every student profile page view is recorded in the access audit log with the viewer's ID, student ID, and timestamp
**Plans**: 3 plans

Plans:
- [ ] 02-01-PLAN.md — Wave 0 tests + accessAuditLog schema + requireStaffProfile() + logAuditEntry()
- [ ] 02-02-PLAN.md — Middleware + /no-access page + supabase/rls-phase2.sql
- [ ] 02-03-PLAN.md — Sidebar name+role badge + /dashboard/audit-log principal page

### Phase 3: Student List and Search
**Goal**: Any logged-in staff member can open the student list, find students by name or filter, and see only students their role permits
**Depends on**: Phase 2
**Requirements**: LIST-01, LIST-02, LIST-03, LIST-04, LIST-05
**Success Criteria** (what must be TRUE):
  1. A teacher opening the student list sees only students enrolled in their assigned classes — no other students appear
  2. A counselor or principal opening the student list sees all students school-wide with pagination
  3. Typing a student's name in the search bar filters the visible list in real time
  4. Selecting a grade level, class/course, or risk level filter narrows the list to matching students
**Plans**: TBD

### Phase 4: Student Profile — Read
**Goal**: Clicking any student opens a single page that displays their complete academic picture with no missing panels or broken layouts
**Depends on**: Phase 3
**Requirements**: PROF-01, PROF-02, PROF-03, PROF-04, PROF-05, PROF-06, PROF-07
**Success Criteria** (what must be TRUE):
  1. Opening a student profile shows all data panels on one page: classes, attendance, grades, SAT/PSAT, graduation tracker, and college prep roadmap
  2. The attendance panel shows each date with present/absent/tardy status — no raw IDs or placeholder text visible
  3. The graduation credit tracker displays credits earned vs. required per category and shows an on-track or off-track indicator
  4. The college prep roadmap panel shows milestones, target schools, and application timeline
  5. The page loads all panels without visible loading failures even when a student has sparse data (some panels gracefully show empty states)
**Plans**: TBD

### Phase 5: Data Entry — Write
**Goal**: Authorized staff can create students and enter or update all categories of student data through forms in the app
**Depends on**: Phase 4
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06
**Success Criteria** (what must be TRUE):
  1. A staff member can add a new student record (name, grade, enrollment info) and immediately see them appear in the student list
  2. Recording an attendance entry for a student saves to the database and appears in the student's attendance panel on refresh
  3. Adding or editing a grade entry reflects the updated grade in the student's grades panel on refresh
  4. Adding a SAT/PSAT score and test date saves and appears in the test scores panel
  5. Updating graduation credits or college prep milestones saves and reflects in the corresponding profile panels
  6. Submitting a form with invalid data (e.g., GPA above 4.0, attendance status missing) shows a clear inline validation error and does not save
**Plans**: TBD

### Phase 6: Gemini AI Integration
**Goal**: Each student profile displays AI-generated at-risk analysis and intervention suggestions, and the graduation/college prep roadmap can be AI-generated on demand
**Depends on**: Phase 5
**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05, AI-06
**Success Criteria** (what must be TRUE):
  1. The student profile AI panel displays an at-risk flag (at-risk / watch / on-track) with a brief severity rationale generated by Gemini
  2. For flagged students, the AI panel shows 2-3 concrete intervention suggestions
  3. Staff can trigger AI roadmap generation for a student and the resulting graduation + college prep plan appears in the profile panels
  4. AI output is served from the `ai_insights` cache on subsequent page loads — Gemini is not called on every visit; a "Regenerate" button triggers a fresh call
  5. Gemini prompts contain no student names or direct PII — only anonymized identifiers and aggregated data fields
  6. School-wide Gemini trend insights (attendance patterns, at-risk distribution, graduation on-track rate) are accessible for display on the principal dashboard
**Plans**: TBD

### Phase 7: Overview Dashboard and Polish
**Goal**: The principal can see school-wide metrics and AI trend insights on a dedicated dashboard, and the full app is branded as EduDash with no remaining legacy references
**Depends on**: Phase 6
**Requirements**: DASH-01, DASH-02
**Success Criteria** (what must be TRUE):
  1. The principal's overview dashboard shows school-wide aggregate metrics: total students, at-risk count, overall attendance rate, and graduation on-track percentage
  2. The overview dashboard displays the Gemini-generated school-wide trend insights panel with current analysis
  3. End-to-end smoke test passes for all three role personas: teacher logs in and sees only their students; counselor logs in and sees all students with full profile; principal logs in and sees all students plus the overview dashboard
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation and Schema | 5/5 | Complete   | 2026-03-15 |
| 2. Role System and Staff Profiles | 2/3 | In Progress|  |
| 3. Student List and Search | 0/TBD | Not started | - |
| 4. Student Profile — Read | 0/TBD | Not started | - |
| 5. Data Entry — Write | 0/TBD | Not started | - |
| 6. Gemini AI Integration | 0/TBD | Not started | - |
| 7. Overview Dashboard and Polish | 0/TBD | Not started | - |
