# Requirements: EduDash

**Defined:** 2026-03-15
**Core Value:** Click a student, see everything — no more tab-switching between disconnected tools.

## v1 Requirements

### Foundation

- [ ] **FOUND-01**: Existing post-login redirect to `/songs` is fixed to redirect to `/dashboard`
- [ ] **FOUND-02**: Supabase environment variable validation runs at startup and fails fast with a clear error if missing
- [ ] **FOUND-03**: Database migrations run via `db:migrate` script only, not inside the Next.js build step
- [ ] **FOUND-04**: All 10 database tables are defined, migrated, and have Row Level Security enabled
- [ ] **FOUND-05**: App is fully rebranded from "Song Tool" to "EduDash" (title, sidebar, metadata, all copy)

### Authentication & Roles

- [ ] **AUTH-01**: Staff member can log in with email and password and be redirected to the dashboard
- [ ] **AUTH-02**: Staff member's role (teacher, counselor, principal) is stored in a `staff_profiles` table linked to their auth user
- [ ] **AUTH-03**: Teacher can only view students enrolled in classes they are assigned to teach
- [ ] **AUTH-04**: Counselor can view all students school-wide
- [ ] **AUTH-05**: Principal can view all students school-wide
- [ ] **AUTH-06**: Every student profile page view is recorded in a FERPA-compliant access audit log (who viewed which student, when)

### Student List

- [ ] **LIST-01**: User can view a paginated list of students scoped to their role (teacher sees own students, counselor/principal sees all)
- [ ] **LIST-02**: User can search students by name
- [ ] **LIST-03**: User can filter the student list by grade level
- [ ] **LIST-04**: User can filter the student list by class/course
- [ ] **LIST-05**: User can filter the student list by Gemini-generated risk level (at-risk, watch, on-track)

### Student Profile

- [ ] **PROF-01**: User can open a student profile page showing all aggregated student data in one view
- [ ] **PROF-02**: Student profile displays current enrolled classes and teacher names
- [ ] **PROF-03**: Student profile displays attendance record (present/absent/tardy by date)
- [ ] **PROF-04**: Student profile displays grades per class (current grade, assignment breakdown)
- [ ] **PROF-05**: Student profile displays SAT/PSAT status (test date, scores, target score)
- [ ] **PROF-06**: Student profile displays graduation credit tracker (credits earned vs. required per category, on-track indicator)
- [ ] **PROF-07**: Student profile displays college prep roadmap (milestones, target schools, application timeline)

### Data Entry

- [ ] **DATA-01**: Authorized staff can add a new student record (name, grade, enrollment info)
- [ ] **DATA-02**: Authorized staff can log an attendance record for a student (date, status)
- [ ] **DATA-03**: Authorized staff can add or update a grade entry for a student
- [ ] **DATA-04**: Authorized staff can add or update a student's SAT/PSAT score and test date
- [ ] **DATA-05**: Authorized staff can update graduation credit progress for a student
- [ ] **DATA-06**: Authorized staff can add or update college prep milestones for a student

### Gemini AI

- [ ] **AI-01**: Gemini analyzes a student's attendance, grades, and credit progress and returns structured at-risk flags with severity level (at-risk / watch / on-track)
- [ ] **AI-02**: Gemini provides specific intervention suggestions for each at-risk flag on a student profile
- [ ] **AI-03**: Gemini generates a personalized graduation + college prep roadmap plan for a student based on their current data
- [ ] **AI-04**: Gemini AI output is cached in an `ai_insights` database table and only regenerated on explicit staff request
- [ ] **AI-05**: Gemini prompts use student IDs and anonymized data — no student names or direct PII are included in API calls
- [ ] **AI-06**: Gemini surfaces school-wide trend insights (attendance patterns, at-risk distribution, graduation on-track rate) for the principal dashboard

### Overview Dashboard

- [ ] **DASH-01**: Principal can view a school-wide overview dashboard with aggregate metrics (total students, at-risk count, attendance rate, graduation on-track percentage)
- [ ] **DASH-02**: Principal overview dashboard displays Gemini-generated school-wide trend insights

## v2 Requirements

### Admin & Roles

- **ADMIN-01**: Admin UI for assigning and changing staff roles (vs. manual database update)
- **ADMIN-02**: Ability to create and manage school-year periods and class rosters in bulk

### Data Import

- **IMPORT-01**: CSV bulk import for student records
- **IMPORT-02**: Integration with PowerSchool or Infinite Campus for automated data sync

### Notifications

- **NOTIF-01**: Staff receive in-app notifications when a student's risk level changes
- **NOTIF-02**: Email digest of at-risk students sent to counselors weekly

### Teacher Dashboard

- **TEACH-01**: Teacher home view shows summary cards for their classes and flagged students

### Parent/Student Portal

- **PORTAL-01**: Parent can log in and view their child's profile (read-only)
- **PORTAL-02**: Student can log in and view their own graduation plan and roadmap

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time notifications (v1) | High complexity; polling or manual refresh sufficient for v1 |
| CSV bulk import (v1) | Scope risk; manual entry is sufficient for pilot school |
| SIS auto-sync | School-specific integration; TBD for v2+ |
| Native mobile app | Web-first; responsive design sufficient |
| Parent/student portal | Second product scope; staff-only tool for v1 |
| Video/document attachments | Not needed for student record aggregation |
| Gemini Grounding with Google Search | Additional FERPA surface area; out of scope until DPA confirmed |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Pending |
| FOUND-02 | Phase 1 | Pending |
| FOUND-03 | Phase 1 | Pending |
| FOUND-04 | Phase 1 | Pending |
| FOUND-05 | Phase 1 | Pending |
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| AUTH-04 | Phase 2 | Pending |
| AUTH-05 | Phase 2 | Pending |
| AUTH-06 | Phase 2 | Pending |
| LIST-01 | Phase 3 | Pending |
| LIST-02 | Phase 3 | Pending |
| LIST-03 | Phase 3 | Pending |
| LIST-04 | Phase 3 | Pending |
| LIST-05 | Phase 3 | Pending |
| PROF-01 | Phase 4 | Pending |
| PROF-02 | Phase 4 | Pending |
| PROF-03 | Phase 4 | Pending |
| PROF-04 | Phase 4 | Pending |
| PROF-05 | Phase 4 | Pending |
| PROF-06 | Phase 4 | Pending |
| PROF-07 | Phase 4 | Pending |
| DATA-01 | Phase 5 | Pending |
| DATA-02 | Phase 5 | Pending |
| DATA-03 | Phase 5 | Pending |
| DATA-04 | Phase 5 | Pending |
| DATA-05 | Phase 5 | Pending |
| DATA-06 | Phase 5 | Pending |
| AI-01 | Phase 6 | Pending |
| AI-02 | Phase 6 | Pending |
| AI-03 | Phase 6 | Pending |
| AI-04 | Phase 6 | Pending |
| AI-05 | Phase 6 | Pending |
| AI-06 | Phase 6 | Pending |
| DASH-01 | Phase 7 | Pending |
| DASH-02 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 34 total
- Mapped to phases: 34
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-15*
*Last updated: 2026-03-15 after initial definition*
