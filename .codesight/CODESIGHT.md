# edu-dash-tool — AI Context Map

> **Stack:** next-app, hono | drizzle | react | typescript

> 1 routes | 11 models | 18 components | 11 lib files | 8 env vars | 3 middleware | 25% test coverage
> **Token savings:** this file is ~2,300 tokens. Without it, AI exploration would cost ~21,900 tokens. **Saves ~19,600 tokens per conversation.**

---

# Routes

- `GET` `/api/health` → out: { status, db, env } [db]

---

# Schema

### staff_profiles

- id: uuid (pk)
- email: text (required)
- fullName: text
- role: staffRoleEnum (required)

### students

- id: uuid (pk)
- firstName: text (required)
- lastName: text (required)
- gradeLevel: smallint (required)
- counselorId: uuid (fk)
- isActive: boolean (default, required)
- enrolledAt: date
- _relations_: counselorId -> staffProfiles.id

### classes

- id: uuid (pk)
- courseName: text (required)
- courseCode: text
- teacherId: uuid (fk, required)
- semester: semesterEnum (required)
- schoolYear: text (required)
- _relations_: teacherId -> staffProfiles.id

### enrollments

- id: uuid (pk)
- studentId: uuid (fk, required)
- classId: uuid (fk, required)
- enrolledAt: timestamp (required, default)
- _relations_: studentId -> students.id, classId -> classes.id

### attendance_records

- id: uuid (pk)
- studentId: uuid (fk, required)
- classId: uuid (fk)
- date: date (required)
- status: attendanceStatusEnum (required)
- notes: text
- recordedBy: uuid (fk)
- _relations_: studentId -> students.id, classId -> classes.id, recordedBy -> staffProfiles.id

### grades

- id: uuid (pk)
- studentId: uuid (fk, required)
- classId: uuid (fk, required)
- gradeType: gradeTypeEnum (required)
- score: numeric
- letterGrade: text
- notes: text
- gradedAt: date
- _relations_: studentId -> students.id, classId -> classes.id

### standardized_tests

- id: uuid (pk)
- studentId: uuid (fk, required)
- testType: testTypeEnum (required)
- testDate: date
- totalScore: integer
- mathScore: integer
- readingScore: integer
- writingScore: integer
- targetScore: integer
- notes: text
- _relations_: studentId -> students.id

### graduation_plans

- id: uuid (pk)
- studentId: uuid (fk, required)
- creditsEarned: numeric (default)
- creditsRequired: numeric (default)
- onTrack: boolean (default)
- planData: jsonb
- _relations_: studentId -> students.id

### college_prep_plans

- id: uuid (pk)
- studentId: uuid (fk, required)
- targetSchools: jsonb
- applicationDeadline: date
- essayStatus: text
- recommendationStatus: text
- notes: text
- _relations_: studentId -> students.id

### ai_insights

- id: uuid (pk)
- studentId: uuid (fk)
- insightType: insightTypeEnum (required)
- content: jsonb (required)
- isCurrent: boolean (default, required)
- generatedAt: timestamp (required, default)
- _relations_: studentId -> students.id

### access_audit_log

- id: uuid (pk)
- viewerId: uuid (fk, required)
- studentId: uuid (fk, required)
- viewedAt: timestamp (required, default)
- _relations_: viewerId -> staffProfiles.id, studentId -> students.id

---

# Components

- **AuditLogPage** — `src\app\dashboard\audit-log\page.tsx`
- **DashboardError** [client] — props: error, reset — `src\app\dashboard\error.tsx`
- **DashboardLoading** — `src\app\dashboard\loading.tsx`
- **DashboardPage** — `src\app\dashboard\page.tsx`
- **RootLayout** — `src\app\layout.tsx`
- **LoginPage** [client] — `src\app\login\page.tsx`
- **NoAccessPage** — `src\app\no-access\page.tsx`
- **RootPage** — `src\app\page.tsx`
- **StudentsError** [client] — props: error, reset — `src\app\students\error.tsx`
- **StudentsPage** — props: searchParams — `src\app\students\page.tsx`
- **StudentProfilePage** — props: params — `src\app\students\[id]\page.tsx`
- **StudentFilters** [client] — props: search, grade, atRisk — `src\app\students\_components\student-filters.tsx`
- **AppSidebar** [client] — `src\components\app-sidebar.tsx`
- **AtRiskTable** — props: students — `src\components\dashboard\at-risk-table.tsx`
- **AttendanceChart** [client] — props: data — `src\components\dashboard\attendance-chart.tsx`
- **GradeDistChart** [client] — props: data — `src\components\dashboard\grade-dist-chart.tsx`
- **StatCards** — props: stats — `src\components\dashboard\stat-cards.tsx`
- **ThemeProvider** [client] — `src\components\theme-provider.tsx`

---

# Libraries

- `middleware.ts` — function middleware: (request) => void, const config
- `src\app\api\health\route.ts` — function GET: () => void
- `src\hooks\use-mobile.ts` — function useIsMobile: () => void
- `src\lib\audit.ts` — function logAuditEntry: (viewerId, studentId) => Promise<void>
- `src\lib\auth.ts`
  - function requireUser: () => Promise<
  - function requireStaffProfile: () => Promise<StaffProfile>
  - type StaffProfile
- `src\lib\dashboard.ts`
  - function getAtRiskStudents: () => Promise<AtRiskStudent[]>
  - function getSchoolStats: (atRiskCount) => Promise<SchoolStats>
  - function getAttendanceTrend: () => Promise<AttendanceDataPoint[]>
  - function getGradeDistribution: () => Promise<GradeDistPoint[]>
  - type SchoolStats
  - type AtRiskStudent
  - _...2 more_
- `src\lib\students.ts`
  - function deriveRiskLevel: (onTrack) => RiskLevel
  - function getStudentList: (params) => Promise<StudentListResult>
  - function getCourseOptions: (viewerId, viewerRole) => Promise<string[]>
  - function getStudentById: (studentId) => Promise<StudentDetail | null>
  - function getStudentGradesByClass: (studentId) => Promise<ClassWithGrades[]>
  - function getStudentAttendance: (studentId) => Promise<StudentAttendanceStats>
  - _...16 more_
- `src\lib\supabase\client.ts` — function createClient: () => void
- `src\lib\supabase\server.ts` — function createClient: () => void
- `src\lib\utils.ts` — function cn: (...inputs) => void
- `src\middleware.ts` — function proxy: (request) => void, const config

---

# Config

## Environment Variables

- `CI` **required** — playwright.config.ts
- `DATABASE_URL` (has default) — .env.local
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (has default) — .env.local
- `NEXT_PUBLIC_SUPABASE_URL` (has default) — .env.local
- `POSTGRES_URL` **required** — src\app\api\health\route.ts
- `POSTGRES_URL_NON_POOLING` **required** — src\app\api\health\route.ts
- `TEST_EMAIL` **required** — tests\phase1.spec.ts
- `TEST_PASSWORD` **required** — tests\phase1.spec.ts

## Config Files

- `drizzle.config.ts`
- `next.config.ts`
- `tsconfig.json`

## Key Dependencies

- @supabase/supabase-js: ^2.101.1
- drizzle-orm: ^0.45.1
- hono: ^4.12.5
- next: 16.1.6
- react: 19.2.3
- zod: ^4.3.6

---

# Middleware

## custom

- middleware — `middleware.ts`
- middleware — `src\middleware.ts`

## auth

- auth — `src\lib\auth.ts`

---

# Dependency Graph

## Most Imported Files (change these carefully)

- `src\lib\dashboard.ts` — imported by **8** files
- `src\lib\students.ts` — imported by **7** files
- `src\lib\auth.ts` — imported by **3** files
- `src\lib\audit.ts` — imported by **2** files
- `src\app\students\_components\student-filters.tsx` — imported by **1** files
- `src\db\schema.ts` — imported by **1** files
- `src\db\index.ts` — imported by **1** files

## Import Map (who imports what)

- `src\lib\dashboard.ts` ← `src\__tests__\dashboard.test.ts`, `src\__tests__\dashboard.test.ts`, `src\__tests__\dashboard.test.ts`, `src\__tests__\dashboard.test.ts`, `src\__tests__\dashboard.test.ts` +3 more
- `src\lib\students.ts` ← `src\__tests__\student-list.test.ts`, `src\__tests__\student-list.test.ts`, `src\__tests__\student-list.test.ts`, `src\__tests__\student-list.test.ts`, `src\__tests__\student-list.test.ts` +2 more
- `src\lib\auth.ts` ← `src\__tests__\role-scoping.test.ts`, `src\__tests__\staff-profiles.test.ts`, `src\__tests__\staff-profiles.test.ts`
- `src\lib\audit.ts` ← `src\__tests__\audit-log.test.ts`, `src\__tests__\audit-log.test.ts`
- `src\app\students\_components\student-filters.tsx` ← `src\app\students\page.tsx`
- `src\db\schema.ts` ← `src\db\index.ts`
- `src\db\index.ts` ← `src\db\seed.ts`

---

# Test Coverage

> **25%** of routes and models are covered by tests
> 6 test files found

## Covered Models

- staff_profiles
- students
- classes

---

_Generated by [codesight](https://github.com/Houseofmvps/codesight) — see your codebase clearly_
