# Principal Dashboard — Design Spec

**Date:** 2026-03-27
**Status:** Approved
**Scope:** Phase 7 — fills in the existing `/dashboard` placeholder page

---

## What We're Building

A read-only principal dashboard at `/dashboard`. Shows school-wide metrics and surfaces at-risk students. Principal-only access. No AI insights. Data-driven.

This is page 1 of 2. Student Profile is a separate spec.

---

## Decisions

| Decision | Rationale |
|----------|-----------|
| Principal-only | Start here, expand to other roles later |
| No AI insights | Skip Gemini/AI section, focus on data-driven metrics |
| At-risk = graduation off-track OR attendance < 80% | Both conditions surfaced together |
| Recharts | User chose over plain SVG or skipping charts |
| Option A: single async server component + parallel queries | Matches existing audit log pattern, simplest approach |

---

## Architecture

**File:** `src/app/dashboard/page.tsx` — replaces the current placeholder.

Single async server component. Authenticates, fires parallel queries, renders layout.

```
Page (async server component)
  │
  ├── requireStaffProfile() → redirect if not principal
  │
  ├── Promise.all([
  │     getSchoolStats(),
  │     getAtRiskStudents(),
  │     getAttendanceTrend(),
  │     getGradeDistribution()
  │   ])
  │
  └── Renders:
        <StatCards />       ← server component
        <AtRiskTable />     ← server component, shadcn Table
        <AttendanceChart /> ← CLIENT component (Recharts)
        <GradeDistChart />  ← CLIENT component (Recharts)
```

Only the two chart components are `"use client"`. Everything else is server-rendered.

---

## File Layout

```
src/app/dashboard/
  page.tsx          ← main page (server component)
  error.tsx         ← error boundary (client component)
  loading.tsx       ← skeleton placeholders

src/components/dashboard/
  stat-cards.tsx         ← 4 summary stat cards
  at-risk-table.tsx      ← shadcn Table of at-risk students
  attendance-chart.tsx   ← Recharts line chart (client)
  grade-dist-chart.tsx   ← Recharts bar chart (client)
```

---

## Components

### `<StatCards />`

4-column responsive grid of shadcn cards.

| Card | Value | Source |
|------|-------|--------|
| Total Students | count of active students | `students.isActive = true` |
| At-Risk | count of at-risk students | reuses `getAtRiskStudents()` result |
| Attendance Rate | school-wide % last 30 days | `attendanceRecords` |
| Avg GPA | mean score across all grade records | `grades.score` |

No interactivity.

---

### `<AtRiskTable />`

Columns: **Name**, **Grade**, **Risk Reason**, **Counselor**

**At-risk criteria (either condition qualifies):**
- Graduation off-track — `creditsEarned < expectedMinimum` for their grade level (constant defined in code)
- Attendance below threshold — attendance rate < 80% over last 30 days

**Risk Reason badge values:** `Attendance` | `Graduation` | `Both`

**Sort order:** Both → Graduation → Attendance, then alphabetical within each group.

**Row click:** no-op for now (student profile page is the next spec — name is plain text, not a link).

**Empty state:** "No at-risk students right now." — rendered in the table body.

---

### `<AttendanceChart />` — client component

- Recharts `LineChart`
- X-axis: last 30 days, grouped by week (4–5 data points)
- Y-axis: % present school-wide
- Single line, tooltip on hover
- Empty state: "No attendance data for the last 30 days."

---

### `<GradeDistChart />` — client component

- Recharts `BarChart`
- X-axis: letter grades (A, B, C, D, F)
- Y-axis: count of grade records
- Single bar series, default tooltip
- Empty state: "No grade data available."

---

## Data Flow

All four queries run in parallel:

```ts
const [stats, atRisk, attendanceTrend, gradeDist] = await Promise.all([
  getSchoolStats(),
  getAtRiskStudents(),
  getAttendanceTrend(),
  getGradeDistribution(),
])
```

### `getSchoolStats()`

```ts
// Active student count grouped by grade level
db.select({ count, gradeLevel })
  .from(students)
  .where(eq(students.isActive, true))

// Average score across all grade records
db.select({ avg: avg(grades.score) }).from(grades)
```

Returns: `{ totalStudents: number, byGrade: Record<number, number>, avgGpa: number }`

---

### `getAtRiskStudents()`

Two sub-queries merged in JS:

```ts
// 1. Graduation off-track
db.select({ studentId, creditsEarned, gradeLevel, firstName, lastName, counselorName })
  .from(graduationPlans)
  .innerJoin(students, eq(graduationPlans.studentId, students.id))
  .leftJoin(staffProfiles, eq(students.counselorId, staffProfiles.id))
  .where(eq(students.isActive, true))
// Flag off-track in JS: creditsEarned < EXPECTED_CREDITS[gradeLevel]

// 2. Attendance below 80% (last 30 days)
db.select({ studentId, present: count(when status='present'), total: count() })
  .from(attendanceRecords)
  .where(gte(attendanceRecords.date, thirtyDaysAgo))
  .groupBy(attendanceRecords.studentId)
// Filter in JS: present / total < 0.80
```

Merge, deduplicate, tag each student with risk reasons, sort.

Returns: `AtRiskStudent[]`

```ts
type AtRiskStudent = {
  id: string
  firstName: string
  lastName: string
  gradeLevel: number
  counselorName: string | null
  riskReasons: ('attendance' | 'graduation')[]
}
```

---

### `getAttendanceTrend()`

```ts
db.select({ week, present, total })
  .from(attendanceRecords)
  .where(gte(attendanceRecords.date, thirtyDaysAgo))
  // grouped by date_trunc('week', date) via Drizzle sql`` helper
```

Returns: `{ week: string, rate: number }[]` — 4–5 data points

---

### `getGradeDistribution()`

```ts
db.select({ letterGrade, count: count() })
  .from(grades)
  .where(isNotNull(grades.letterGrade))
  .groupBy(grades.letterGrade)
```

Returns: `{ letterGrade: string, count: number }[]`

---

## Error Handling

### Auth
`requireStaffProfile()` handles it — matches existing pattern.
- Not authenticated → `/login`
- Not principal → `/no-access`

### Query errors
Next.js `error.tsx` catches throws. Simple message + refresh button. Client component (Next.js requirement).

### Loading state
`loading.tsx` — shadcn `<Skeleton />` matching the real page structure:
- 4 skeleton cards in a row
- 2 skeleton blocks below (table, charts)

### Empty states

| Component | Empty state text |
|-----------|-----------------|
| `<AtRiskTable />` | "No at-risk students right now." |
| `<AttendanceChart />` | "No attendance data for the last 30 days." |
| `<GradeDistChart />` | "No grade data available." |
| `<StatCards />` | Shows `0` — always renders |

---

## Out of Scope

- Student profile page (separate spec)
- Other staff roles (teacher, counselor views)
- AI/Gemini insights
- Filtering, sorting, or search on the dashboard
- Clicking through to student detail from at-risk table (no link yet)
