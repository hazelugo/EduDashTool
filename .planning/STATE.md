---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: planning
stopped_at: Completed 02-01-PLAN.md
last_updated: "2026-03-16T09:35:04.141Z"
last_activity: 2026-03-15 — Roadmap created, 34 requirements mapped across 7 phases
progress:
  total_phases: 7
  completed_phases: 1
  total_plans: 8
  completed_plans: 7
  percent: 40
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-14)

**Core value:** Click a student, see everything — no more tab-switching between disconnected tools.
**Current focus:** Phase 1 — Foundation and Schema

## Current Position

Phase: 1 of 7 (Foundation and Schema)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-03-15 — Roadmap created, 34 requirements mapped across 7 phases

Progress: [████░░░░░░] 40%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 01-foundation-and-schema P03 | 1 | 2 tasks | 3 files |
| Phase 01-foundation-and-schema P01 | 1 | 2 tasks | 2 files |
| Phase 01-foundation-and-schema P02 | 2 | 2 tasks | 6 files |
| Phase 01-foundation-and-schema P04 | 4 | 1 tasks | 1 files |
| Phase 01-foundation-and-schema P05 | 8 | 2 tasks | 6 files |
| Phase 02-role-system-and-staff-profiles P02 | 12 | 2 tasks | 5 files |
| Phase 02-role-system-and-staff-profiles P01 | 25 | 2 tasks | 7 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Pre-work]: Manual data entry for v1 — SIS sync deferred; keeps scope tight for pilot school
- [Pre-work]: Gemini as AI engine — explicitly chosen; server-side only via Server Actions
- [Pre-work]: Role-based access via Supabase + application-layer query scoping — RLS alone does NOT protect Drizzle's direct Postgres connection; every query must include explicit role WHERE clauses
- [Phase 01-foundation-and-schema]: GraduationCap chosen as login page icon — education-appropriate replacement for Music icon
- [Phase 01-foundation-and-schema]: Nav items reduced from 5 music routes to 2 EduDash routes (Dashboard, Students)
- [Phase 01-foundation-and-schema]: Single chromium project for Phase 1 E2E — sufficient for verification, avoids cross-browser complexity
- [Phase 01-foundation-and-schema]: No fullyParallel in Playwright — tests share login state and must run sequentially within file
- [Phase 01-foundation-and-schema]: webServer.timeout 120s for Playwright — accommodates Next.js cold start exceeding default 60s
- [Phase 01-foundation-and-schema]: Edge Runtime cannot throw at module level — proxy.ts uses inline 503 guard; browser/server clients use module-level throw with [EduDash] prefix
- [Phase 01-foundation-and-schema]: npm run build = next build only; db:migrate is an explicit developer action via npm run db:migrate
- [Phase 01-foundation-and-schema]: staff_profiles.id has NO defaultRandom() — must match auth.users.id for RLS auth.uid() compatibility
- [Phase 01-foundation-and-schema]: All 10 schema tables use array-form indexes (t) => [...] per Drizzle 0.45.1; uniqueIndex enforces 1:1 on graduation_plans and college_prep_plans
- [Phase 01-foundation-and-schema]: Migration applied manually via Supabase SQL Editor — direct DB host is IPv6-only, unreachable from dev machine
- [Phase 01-foundation-and-schema]: deny_all_anon RLS policy as Phase 1 baseline on all 10 tables; Phase 2 adds role-scoped authenticated SELECT policies
- [Phase 02-role-system-and-staff-profiles]: Session-only check in middleware — no staff_profiles DB lookup; requireStaffProfile() handles the no-profile case inside server components
- [Phase 02-role-system-and-staff-profiles]: All RLS policies on students table include explicit role checks in USING clause — prevents OR-semantics leakage where teachers could match the counselor/principal unrestricted policy
- [Phase 02-role-system-and-staff-profiles]: Non-null assertion on supabase URL/key in client/server helpers — runtime throw guards above ensure values exist; TypeScript narrowing does not carry across module-level variable assignments
- [Phase 02-role-system-and-staff-profiles]: requireStaffProfile() uses redirect() from next/navigation for SC/SA; requireUser() retained for API route handlers using NextResponse
- [Phase 02-role-system-and-staff-profiles]: vitest installed with loadEnv config to pick up .env.local — required since supabase/server.ts throws at module level without NEXT_PUBLIC_SUPABASE_URL

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 6 — pre-work]: Gemini package name uncertain (`@google/generative-ai` vs `@google/genai`). Run `npm info` on both before Phase 6 planning to confirm current official package.
- [Phase 6 — pre-work]: FERPA/DPA status with school must be confirmed before any live student data reaches Gemini API.
- [Phase 1 — pre-work]: Confirm `recharts` version installed by `npx shadcn@latest add chart` before explicitly adding it to dependencies.

## Session Continuity

Last session: 2026-03-16T09:35:04.138Z
Stopped at: Completed 02-01-PLAN.md
Resume file: None
