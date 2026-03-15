# EduDash — Student Aggregator Dashboard

## What This Is

A centralized student dashboard for high school educators (teachers, counselors, and principals) that aggregates everything about a student into one clean view — attendance, grades, current classes, SAT/PSAT status, graduation plan, and college prep roadmap. Powered by Google Gemini AI for intelligent insights, at-risk detection, and AI-generated planning. Role-based access controls what each staff member can see.

## Core Value

Click a student, see everything — no more tab-switching between disconnected tools.

## Requirements

### Validated

<!-- Inferred from existing codebase -->

- ✓ Email/password authentication with Supabase (login, signup, session persistence, redirect) — existing
- ✓ Next.js 16 App Router with sidebar layout shell — existing
- ✓ PostgreSQL database via Supabase + Drizzle ORM (schema empty, ready to define) — existing
- ✓ Light/dark theme toggle — existing
- ✓ Health check endpoint (`/api/health`) — existing
- ✓ Vercel deployment configuration (analytics wired) — existing

### Active

<!-- Current scope — building toward these -->

- [ ] User can be assigned a role: teacher, counselor, or principal
- [ ] Teacher can see only students enrolled in their classes
- [ ] Counselor and principal can see all students school-wide
- [ ] User can search and filter the student list (by name, grade, class, risk level)
- [ ] User can open a student profile page showing all aggregated data
- [ ] Student profile shows: attendance record, current classes, grades, SAT/PSAT status
- [ ] Student profile shows: graduation plan (credits earned vs. required, on-track status)
- [ ] Student profile shows: college prep roadmap (milestones, target schools, timeline)
- [ ] Staff can manually add/update student records and data
- [ ] Gemini AI generates at-risk flags and intervention suggestions per student
- [ ] Gemini AI generates a graduation + college prep roadmap plan per student
- [ ] Gemini AI surfaces school-wide trends and insights on an overview dashboard

### Out of Scope

- Auto-sync with PowerSchool / Infinite Campus — data integration strategy TBD, manual entry for v1
- Parent or student portal — staff-only tool for v1
- Native mobile app — web-first, responsive design sufficient
- Real-time notifications — not needed for v1
- Video or document attachments — out of scope for student records

## Context

**Origin:** Feedback from a high school principal and teachers who are frustrated switching between multiple web apps to find student information. The primary workflow is: look up a student, quickly understand their full picture, take action.

**Existing codebase:** The project shell exists as a "Song Tool" (music app). The auth, sidebar, layout, DB connection, and component library are all in place. The database schema (`src/db/schema.ts`) is empty — all tables must be designed. The app must be rebranded and repurposed entirely.

**Gemini AI role:** Google Gemini (`@google/generative-ai`) is the AI backbone for three functions:
1. **Research** — analyze individual student data patterns and history
2. **Plan** — generate personalized graduation and college prep roadmaps
3. **Monitor** — flag at-risk students, surface trends, recommend interventions

**Data entry:** Since the school uses a mix of SIS, manual tracking, and other tools, v1 will use manual data entry by staff. Integrations are out of scope for v1.

**Roles:**
- **Teacher** — sees only students in their assigned classes
- **Counselor** — sees all students, full data access
- **Principal** — sees all students, full data access + school-wide analytics

## Constraints

- **Tech Stack**: Next.js 16 + Supabase + Drizzle ORM + shadcn/ui — already installed, must be used
- **AI Model**: Google Gemini API — explicitly requested by user for all AI features
- **Database**: Schema is currently empty — all tables need to be defined and migrated
- **Auth**: Supabase Auth already wired — role system must be built on top of it
- **Deployment**: Vercel (analytics already integrated)
- **Rebrand**: App is currently titled "Song Tool" — all references must be updated to EduDash

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Manual data entry for v1 | Data integration strategy is TBD; SIS sync is complex and school-specific | — Pending |
| Gemini as AI engine | Explicitly requested by user for research, planning, and monitoring | — Pending |
| Role-based access via Supabase RLS | Auth already uses Supabase — row-level security is natural fit for role scoping | — Pending |
| Staff-only tool for v1 | Parent/student portal is a second product; keep v1 focused | — Pending |

---
*Last updated: 2026-03-14 after initialization*
