# Student List & Student Profile — Design Spec

**Date:** 2026-03-27
**Status:** Approved
**Scope:** Phase 7 — pages 2 and 3 of the EduDashTool

---

## What We're Building

Two pages:

1. **Student List** at `/students` — searchable, filterable table of all students. Principal + counselor see all; teachers see only their enrolled students.
2. **Student Profile** at `/dashboard/students/[id]` — full detail view for one student, including grades, attendance, tests, graduation plan, and college prep plan.

These follow the Principal Dashboard (page 1), which is already built.

---

## Decisions

| Decision | Rationale |
|----------|-----------|
| Server-side search with URL params | Matches existing codebase patterns, no client state |
| All three roles can access | Principal + counselor see all; teachers see only enrolled students |
| Role scoping enforced server-side | Teacher access checked via enrollments → classes → teacherId join |
| FERPA audit log on every profile view | `logAuditEntry(viewerId, studentId)` called before render, fire-and-forget (try/catch) |
| Profile: vertical scroll layout | All sections stacked, no tabs |
| At-risk table names become links | `src/components/dashboard/at-risk-table.tsx` updated to link to profiles |

---

## Architecture

### File Layout

**New files:**
```
src/app/students/
  page.tsx          ← student list (server component, reads URL params)
  loading.tsx       ← skeleton
  error.tsx         ← error boundary

src/app/dashboard/students/[id]/
  page.tsx          ← student profile (server component)
  loading.tsx       ← skeleton
  error.tsx         ← error boundary

src/components/students/
  search-bar.tsx          ← "use client" — search input + grade dropdown + at-risk toggle
  students-table.tsx      ← shadcn Table with links to profiles
  profile-header.tsx      ← name, grade, counselor, at-risk badge
  grades-section.tsx      ← grades grouped by class
  attendance-section.tsx  ← summary stats + AttendanceChart (reused)
  tests-section.tsx       ← standardized tests table
  graduation-section.tsx  ← credits, on-track status
  college-prep-section.tsx ← target schools, deadlines, statuses

src/lib/students.ts       ← all query functions for both pages
```

**Modified:**
- `src/components/dashboard/at-risk-table.tsx` — student names become `<Link>` to `/dashboard/students/[id]`

Only `search-bar.tsx` is `"use client"`. Everything else is server-rendered.

### Component Tree

**Student List:**

```
Page (async server component)
  │
  ├── requireStaffProfile() → redirect if not staff
  │
  ├── getStudentList({ search, grade, atRisk, viewerId, viewerRole })
  │
  └── Renders:
        <SearchBar />        ← CLIENT component (search input, grade, at-risk toggle)
        <StudentsTable />    ← server component, shadcn Table
```

**Student Profile:**

```
Page (async server component)
  │
  ├── requireStaffProfile() → redirect if not staff
  ├── Teacher access check → redirect if not enrolled
  │
  ├── logAuditEntry(profile.userId, studentId) ← FERPA audit, fire-and-forget
  │
  ├── Promise.all([
  │     getStudentById(),
  │     getStudentGradesByClass(),
  │     getStudentAttendance(),
  │     getStudentTests(),
  │     getStudentGraduationPlan(),
  │     getStudentCollegePrepPlan()
  │   ])
  │
  └── Renders:
        <ProfileHeader />          ← server component
        <GradesSection />          ← server component
        <AttendanceSection />      ← server component (+ AttendanceChart client component)
        <TestsSection />           ← server component
        <GraduationSection />       ← server component
        <CollegePrepSection />      ← server component
```

---

## Components

### Student List

#### `<SearchBar />`

Client component. Three controls:
- **Text input** — name search (debounced 300ms)
- **Grade dropdown** — `All / 9th / 10th / 11th / 12th`
- **At-risk toggle** — `All / At-Risk Only`

On change, calls `router.push()` with updated URL params: `?search=john&grade=10&atRisk=true`

#### `<StudentsTable />`

Shadcn Table. Columns:
- **Name** — clickable link to `/dashboard/students/[id]`
- **Grade** — grade level (9–12)
- **Counselor** — assigned counselor name
- **At-Risk** — badge (`At Risk` in red) or blank

**Sort order:** Alphabetically by last name.

**Empty state:** "No students match your filters."

---

### Student Profile

#### `<ProfileHeader />`

Full-width card displaying:
- Full name (large, prominent)
- Grade level
- Assigned counselor name
- Enrollment date
- At-risk badge (if applicable)

No interactivity.

---

#### `<GradesSection />`

For each enrolled class, one shadcn Table:

| Column | Type |
|--------|------|
| Type | Assignment type (quiz, test, homework, etc.) |
| Score | Numeric score |
| Letter Grade | A / B / C / D / F |
| Date | When recorded |

**Class name as heading** above each table.

**Empty state per class:** "No grades recorded."

**Sort order per class:** Date descending (most recent first).

---

#### `<AttendanceSection />`

Four stat numbers:
- **Present** — count of present days (last 30 days)
- **Absent** — count of absent days (last 30 days)
- **Tardy** — count of tardy days (last 30 days)
- **Excused** — count of excused days (last 30 days)
- **Overall Rate** — % present (includes excused, excludes absences)

Below stats, reuse `<AttendanceChart />` (from dashboard) scoped to this student's data.

**Empty state:** Reuses AttendanceChart empty state ("No attendance data for the last 30 days.").

---

#### `<TestsSection />`

Shadcn Table. Columns:
- **Test** — standardized test name (SAT, ACT, etc.)
- **Date** — when taken
- **Total** — composite score
- **Math** — math subscore
- **Reading** — reading/ELA subscore
- **Writing** — writing subscore (if applicable)
- **Target** — target score (if set in college prep plan)

**Sort order:** Date descending (most recent first).

**Empty state:** "No test scores recorded."

---

#### `<GraduationSection />`

Card layout with:
- **Credits earned** — numeric, visually prominent
- **Credits required** — numeric
- **On-track badge** — green `On Track` or red `Off Track`
- **Graduation plan data** — if `planData` exists, display as key/value list (e.g., "Projected graduation: 2027-06-01")

**Empty state:** "No graduation plan on file."

---

#### `<CollegePrepSection />`

Card layout with:
- **Target schools** — bulleted list of school names
- **Application deadline** — if set
- **Essay status** — (e.g., "Completed", "In Progress", "Not Started")
- **Recommendation status** — (e.g., "Requested", "Completed")
- **Notes** — free-text if present

**Empty state:** "No college prep plan on file."

---

## Data Flow

### Student List Page

Single query with role-aware filtering:

```ts
getStudentList({
  search: string | null,
  grade: number | null,
  atRisk: boolean | null,
  viewerId: string,
  viewerRole: 'principal' | 'counselor' | 'teacher'
})
```

**Filtering logic:**

1. **Principal / Counselor:** All active students
2. **Teacher:** Only students enrolled in their classes
   - Join: `enrollments.studentId` → `students.id` → `classes.id` → `classes.teacherId`
   - Filter: `classes.teacherId = viewerId`

3. **Text search** (all roles): match first name OR last name (case-insensitive)
4. **Grade filter:** `students.gradeLevel = grade` (if provided)
5. **At-risk filter:** Include only students where `isAtRisk = true` (if provided)

**`isAtRisk` computed:**
- `onTrack === false` (from `graduationPlans`) OR
- Attendance rate < 80% over last 30 days

**Returns:** `StudentRow[]` where each row is:

```ts
type StudentRow = {
  id: string
  firstName: string
  lastName: string
  gradeLevel: number
  counselorName: string | null
  isAtRisk: boolean
}
```

---

### Student Profile Page

1. **Auth** — `requireStaffProfile()` — redirect if not principal, counselor, or teacher
2. **Teacher access check** — if teacher, verify student is in one of their classes; redirect `/no-access` if not
3. **FERPA audit** — `logAuditEntry(profile.userId, studentId)` wrapped in try/catch (non-blocking)
4. **Not found** — `notFound()` if student ID doesn't exist or is inactive
5. **Parallel queries** — all six queries run in Promise.all:

```ts
const [student, grades, attendance, tests, graduation, collegePrepPlan] = await Promise.all([
  getStudentById(studentId),
  getStudentGradesByClass(studentId),
  getStudentAttendance(studentId),
  getStudentTests(studentId),
  getStudentGraduationPlan(studentId),
  getStudentCollegePrepPlan(studentId)
])
```

All query functions live in `src/lib/students.ts`.

---

## Query Functions

All in `src/lib/students.ts`.

### `getStudentList()`

See above. Returns `StudentRow[]` filtered by role, search, grade, at-risk status.

---

### `getStudentById(studentId)`

```ts
db.select({
  id: students.id,
  firstName: students.firstName,
  lastName: students.lastName,
  gradeLevel: students.gradeLevel,
  enrollmentDate: students.enrollmentDate,
  counselorName: staffProfiles.name,
  isActive: students.isActive
})
  .from(students)
  .leftJoin(staffProfiles, eq(students.counselorId, staffProfiles.id))
  .where(eq(students.id, studentId))
  .limit(1)
```

Returns: `Student` object or throws `NotFoundError` if not found.

---

### `getStudentGradesByClass(studentId)`

```ts
// For each class the student is enrolled in:
db.select({
  classId: classes.id,
  className: classes.name,
  gradeId: grades.id,
  type: grades.type,
  score: grades.score,
  letterGrade: grades.letterGrade,
  recordedDate: grades.recordedDate
})
  .from(enrollments)
  .innerJoin(classes, eq(enrollments.classId, classes.id))
  .leftJoin(grades, eq(enrollments.studentId, grades.studentId)
                    and eq(classes.id, grades.classId))
  .where(eq(enrollments.studentId, studentId))
  .orderBy(desc(grades.recordedDate))
```

Returns: `GradesByClass[]` where each entry is `{ classId, className, grades: [...] }`

---

### `getStudentAttendance(studentId)`

```ts
db.select({
  date: attendanceRecords.date,
  status: attendanceRecords.status
})
  .from(attendanceRecords)
  .where(eq(attendanceRecords.studentId, studentId)
         and gte(attendanceRecords.date, thirtyDaysAgo))
  .orderBy(desc(attendanceRecords.date))
```

Returns: `AttendanceRecord[]`

**In component:** Calculate counts (present, absent, tardy, excused) and overall rate.

---

### `getStudentTests(studentId)`

```ts
db.select({
  testId: standardizedTests.id,
  testName: standardizedTests.name,
  dateTaken: studentTestScores.dateTaken,
  totalScore: studentTestScores.totalScore,
  mathScore: studentTestScores.mathScore,
  readingScore: studentTestScores.readingScore,
  writingScore: studentTestScores.writingScore
})
  .from(studentTestScores)
  .innerJoin(standardizedTests, eq(studentTestScores.testId, standardizedTests.id))
  .where(eq(studentTestScores.studentId, studentId))
  .orderBy(desc(studentTestScores.dateTaken))
```

Returns: `StudentTest[]`

---

### `getStudentGraduationPlan(studentId)`

```ts
db.select({
  planId: graduationPlans.id,
  creditsEarned: graduationPlans.creditsEarned,
  creditsRequired: graduationPlans.creditsRequired,
  onTrack: graduationPlans.onTrack,
  planData: graduationPlans.planData
})
  .from(graduationPlans)
  .where(eq(graduationPlans.studentId, studentId))
  .limit(1)
```

Returns: `GraduationPlan | null`

---

### `getStudentCollegePrepPlan(studentId)`

```ts
db.select({
  planId: collegePreps.id,
  targetSchools: collegePreps.targetSchools,
  applicationDeadline: collegePreps.applicationDeadline,
  essayStatus: collegePreps.essayStatus,
  recommendationStatus: collegePreps.recommendationStatus,
  notes: collegePreps.notes
})
  .from(collegePreps)
  .where(eq(collegePreps.studentId, studentId))
  .limit(1)
```

Returns: `CollegePrepPlan | null`

---

## Error Handling

### Auth & Access

- Not authenticated → `requireStaffProfile()` redirects to `/login`
- Not staff role (principal, counselor, teacher) → `requireStaffProfile()` redirects to `/no-access`
- **Teacher accessing unauthorized student** → Check enrollment, redirect to `/no-access` if not found

### Student Not Found

- Invalid student ID or inactive student → call `notFound()` → displays Next.js 404 page

### Query Errors

- All query errors caught by `error.tsx` (next.js error boundary)
- Simple error message: "Something went wrong. Try again." with refresh button
- `error.tsx` is a client component (Next.js requirement)

### FERPA Audit

- `logAuditEntry(profile.userId, studentId)` wrapped in try/catch
- Failure logs server-side, does NOT block page render
- Non-blocking, fire-and-forget

### Loading State

**Student List:**
- `loading.tsx` — skeleton of search bar + table placeholder (5–10 rows)

**Student Profile:**
- `loading.tsx` — skeleton matching page structure: header, grades table(s), attendance card, tests table, graduation card, college prep card

### Empty States

| Section | Empty state text |
|---------|-----------------|
| Students list | "No students match your filters." |
| Grades (per class) | "No grades recorded." |
| Attendance | Reuses AttendanceChart empty state: "No attendance data for the last 30 days." |
| Tests | "No test scores recorded." |
| Graduation plan | "No graduation plan on file." |
| College prep plan | "No college prep plan on file." |

---

## Out of Scope

- Student list pagination (show all active students, reasonable server-side limit enforced)
- Editing any student data
- Teacher view of other teachers' classes or students
- AI/Gemini insights on student profile
- Student-facing views (student dashboard, etc.)
- Exporting or bulk operations

---

## Integration Notes

- `<AttendanceChart />` reused from dashboard; scoped to one student instead of school-wide
- `<SearchBar />` only client component on student list; all search logic server-side
- At-risk badge definition consistent with Principal Dashboard: `onTrack === false` OR attendance < 80%
- Teacher access enforced at the database query level via `enrollments` join
- FERPA audit fires before any component renders, allowing audit to fail without blocking user experience

