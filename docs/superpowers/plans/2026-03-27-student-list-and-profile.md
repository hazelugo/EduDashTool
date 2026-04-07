# Student List & Student Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build two pages — a searchable/filterable student list at `/students` and a full student profile at `/dashboard/students/[id]` — with role-scoped access and FERPA audit logging.

**Architecture:** All data fetching is server-side via query functions in `src/lib/students.ts`. Only `<SearchBar />` is a client component (for debounced URL param updates). Role scoping for teachers is enforced via an `enrollments → classes → teacherId` join. The profile page fires a FERPA audit entry before rendering.

**Tech Stack:** Next.js 16 App Router (server components), Drizzle ORM, Supabase Auth, shadcn/ui (Table, Badge, Card, Skeleton), Recharts (reused AttendanceChart), `use-debounce`, Vitest

---

## Schema Quick Reference

Column names that differ from what you might expect:
- `staffProfiles.fullName` (not `.name`)
- `students.enrolledAt` (not `.enrollmentDate`)
- `grades.gradeType` (not `.type`)
- `grades.gradedAt` (not `.recordedDate`)
- `classes.courseName` (not `.name`)
- `standardizedTests` — one table with `testType`, `testDate`, `totalScore`, `mathScore`, `readingScore`, `writingScore`, `targetScore` — no separate `studentTestScores` table
- `collegePrepPlans` (table name — not `collegePreps`)

---

## File Map

**New files to create:**
```
src/__tests__/students.test.ts
src/app/students/page.tsx
src/app/students/loading.tsx
src/app/students/error.tsx
src/app/dashboard/students/[id]/page.tsx
src/app/dashboard/students/[id]/loading.tsx
src/app/dashboard/students/[id]/error.tsx
src/components/students/search-bar.tsx
src/components/students/students-table.tsx
src/components/students/profile-header.tsx
src/components/students/grades-section.tsx
src/components/students/attendance-section.tsx
src/components/students/tests-section.tsx
src/components/students/graduation-section.tsx
src/components/students/college-prep-section.tsx
```

**Files to modify:**
```
src/lib/students.ts       — implement all stub functions
```

**No changes needed:**
- `src/components/app-sidebar.tsx` — Students nav link already present
- `src/components/dashboard/at-risk-table.tsx` — Links to `/dashboard/students/[id]` already present

---

## Task 1: Tests for `students.ts` module

**Files:**
- Create: `src/__tests__/students.test.ts`

- [ ] **Step 1: Write the test file**

```ts
// src/__tests__/students.test.ts
import { describe, it, expect } from "vitest";

describe("students.ts function exports", () => {
  it("exports getStudentList as a function", async () => {
    const mod = await import("../lib/students");
    expect(typeof mod.getStudentList).toBe("function");
  });

  it("exports getStudentById as a function", async () => {
    const mod = await import("../lib/students");
    expect(typeof mod.getStudentById).toBe("function");
  });

  it("exports canTeacherViewStudent as a function", async () => {
    const mod = await import("../lib/students");
    expect(typeof mod.canTeacherViewStudent).toBe("function");
  });

  it("exports getStudentGradesByClass as a function", async () => {
    const mod = await import("../lib/students");
    expect(typeof mod.getStudentGradesByClass).toBe("function");
  });

  it("exports getStudentAttendance as a function", async () => {
    const mod = await import("../lib/students");
    expect(typeof mod.getStudentAttendance).toBe("function");
  });

  it("exports getStudentTests as a function", async () => {
    const mod = await import("../lib/students");
    expect(typeof mod.getStudentTests).toBe("function");
  });

  it("exports getStudentGraduationPlan as a function", async () => {
    const mod = await import("../lib/students");
    expect(typeof mod.getStudentGraduationPlan).toBe("function");
  });

  it("exports getStudentCollegePrepPlan as a function", async () => {
    const mod = await import("../lib/students");
    expect(typeof mod.getStudentCollegePrepPlan).toBe("function");
  });
});

describe("StudentRow type shape", () => {
  it("has the expected property keys", () => {
    const sample: import("../lib/students").StudentRow = {
      id: "uuid-1",
      firstName: "Jane",
      lastName: "Doe",
      gradeLevel: 10,
      counselorName: null,
      isAtRisk: false,
    };
    expect(sample.id).toBe("uuid-1");
    expect(sample.isAtRisk).toBe(false);
    expect(sample.gradeLevel).toBe(10);
  });
});

describe("StudentDetail type shape", () => {
  it("has the expected property keys", () => {
    const sample: import("../lib/students").StudentDetail = {
      id: "uuid-2",
      firstName: "John",
      lastName: "Smith",
      gradeLevel: 11,
      counselorName: "Ms. Lee",
      enrolledAt: "2023-09-01",
      isAtRisk: true,
    };
    expect(sample.enrolledAt).toBe("2023-09-01");
    expect(sample.counselorName).toBe("Ms. Lee");
  });
});

describe("GradeEntry type shape", () => {
  it("uses gradeType field (not type)", () => {
    const sample: import("../lib/students").GradeEntry = {
      id: "uuid-3",
      gradeType: "midterm",
      score: 85.5,
      letterGrade: "B",
      gradedAt: "2024-10-15",
    };
    expect(sample.gradeType).toBe("midterm");
  });
});

describe("TestScore type shape", () => {
  it("uses testType field (not testName)", () => {
    const sample: import("../lib/students").TestScore = {
      id: "uuid-4",
      testType: "SAT",
      testDate: "2024-04-06",
      totalScore: 1400,
      mathScore: 720,
      readingScore: 680,
      writingScore: null,
      targetScore: 1500,
    };
    expect(sample.testType).toBe("SAT");
    expect(sample.targetScore).toBe(1500);
  });
});

describe("StudentAttendanceStats type shape", () => {
  it("has present/absent/tardy/excused/rate/trend fields", () => {
    const sample: import("../lib/students").StudentAttendanceStats = {
      present: 20,
      absent: 3,
      tardy: 1,
      excused: 2,
      rate: 85,
      trend: [{ week: "2024-03-04", rate: 88 }],
    };
    expect(sample.rate).toBe(85);
    expect(sample.trend).toHaveLength(1);
  });
});

describe("GraduationPlanData type shape", () => {
  it("can be null or an object with creditsEarned/creditsRequired/onTrack/planData", () => {
    const nullPlan: import("../lib/students").GraduationPlanData = null;
    expect(nullPlan).toBeNull();

    const plan: import("../lib/students").GraduationPlanData = {
      creditsEarned: 18,
      creditsRequired: 24,
      onTrack: true,
      planData: null,
    };
    expect(plan?.creditsEarned).toBe(18);
  });
});

describe("CollegePrepData type shape", () => {
  it("can be null or an object with targetSchools/applicationDeadline/etc", () => {
    const nullPlan: import("../lib/students").CollegePrepData = null;
    expect(nullPlan).toBeNull();

    const plan: import("../lib/students").CollegePrepData = {
      targetSchools: ["MIT", "Stanford"],
      applicationDeadline: "2025-01-01",
      essayStatus: "In Progress",
      recommendationStatus: "Requested",
      notes: "Strong STEM focus",
    };
    expect(plan?.targetSchools).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run tests (they will pass since stubs exist, types are structural)**

```bash
cd /Users/hector/Developer/EduDashTool/EduDashTool && npx vitest run src/__tests__/students.test.ts
```

Expected: PASS (all export checks pass, type checks are compile-time)

- [ ] **Step 3: Commit**

```bash
cd /Users/hector/Developer/EduDashTool/EduDashTool && git add src/__tests__/students.test.ts && git commit -m "test: add structural tests for students.ts module"
```

---

## Task 2: Implement `getStudentList` and `canTeacherViewStudent`

**Files:**
- Modify: `src/lib/students.ts`

- [ ] **Step 1: Replace the entire file with the full implementation**

Replace `src/lib/students.ts` with this content:

```ts
import { db } from "@/db";
import {
  students,
  staffProfiles,
  enrollments,
  classes,
  attendanceRecords,
  grades,
  standardizedTests,
  graduationPlans,
  collegePrepPlans,
} from "@/db/schema";
import {
  eq,
  and,
  or,
  ilike,
  gte,
  desc,
  count,
  inArray,
  sql,
} from "drizzle-orm";

// ── Types ─────────────────────────────────────────────────────────────────────

export type StudentRow = {
  id: string;
  firstName: string;
  lastName: string;
  gradeLevel: number;
  counselorName: string | null;
  isAtRisk: boolean;
};

export type StudentDetail = {
  id: string;
  firstName: string;
  lastName: string;
  gradeLevel: number;
  counselorName: string | null;
  enrolledAt: string | null;
  isAtRisk: boolean;
};

export type GradeEntry = {
  id: string;
  gradeType: "midterm" | "final" | "quarter" | "assignment";
  score: number | null;
  letterGrade: string | null;
  gradedAt: string | null;
};

export type ClassWithGrades = {
  classId: string;
  courseName: string;
  courseCode: string;
  semester: string;
  schoolYear: string;
  grades: GradeEntry[];
};

export type StudentAttendanceStats = {
  present: number;
  absent: number;
  tardy: number;
  excused: number;
  rate: number | null;
  trend: { week: string; rate: number }[];
};

export type TestScore = {
  id: string;
  testType: "SAT" | "PSAT" | "ACT" | "AP" | "other";
  testDate: string | null;
  totalScore: number | null;
  mathScore: number | null;
  readingScore: number | null;
  writingScore: number | null;
  targetScore: number | null;
};

export type GraduationPlanData = {
  creditsEarned: number;
  creditsRequired: number;
  onTrack: boolean;
  planData: Record<string, unknown> | null;
} | null;

export type CollegePrepData = {
  targetSchools: unknown[];
  applicationDeadline: string | null;
  essayStatus: string | null;
  recommendationStatus: string | null;
  notes: string | null;
} | null;

export type GetStudentListParams = {
  search?: string;
  grade?: number;
  atRisk?: boolean;
  viewerId: string;
  viewerRole: "principal" | "counselor" | "teacher";
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function thirtyDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

async function getAtRiskStudentIds(): Promise<Set<string>> {
  const cutoff = thirtyDaysAgo();

  const [gradRisk, attendanceRows] = await Promise.all([
    db
      .select({ studentId: graduationPlans.studentId })
      .from(graduationPlans)
      .where(eq(graduationPlans.onTrack, false)),
    db
      .select({
        studentId: attendanceRecords.studentId,
        total: count(),
        present: sql<number>`sum(case when ${attendanceRecords.status} = 'present' then 1 else 0 end)`,
      })
      .from(attendanceRecords)
      .where(gte(attendanceRecords.date, cutoff))
      .groupBy(attendanceRecords.studentId),
  ]);

  const ids = new Set<string>(gradRisk.map((r) => r.studentId!));
  for (const r of attendanceRows) {
    if (r.total > 0 && Number(r.present) / r.total < 0.8) {
      ids.add(r.studentId);
    }
  }
  return ids;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getStudentList(
  params: GetStudentListParams
): Promise<StudentRow[]> {
  const { search, grade, atRisk, viewerId, viewerRole } = params;

  const atRiskIds = await getAtRiskStudentIds();

  const conditions = [eq(students.isActive, true)];

  if (search) {
    conditions.push(
      or(
        ilike(students.firstName, `%${search}%`),
        ilike(students.lastName, `%${search}%`)
      )!
    );
  }

  if (grade != null) {
    conditions.push(eq(students.gradeLevel, grade));
  }

  if (atRisk === true) {
    if (atRiskIds.size === 0) return [];
    conditions.push(inArray(students.id, [...atRiskIds]));
  }

  const selectedFields = {
    id: students.id,
    firstName: students.firstName,
    lastName: students.lastName,
    gradeLevel: students.gradeLevel,
    counselorName: staffProfiles.fullName,
  };

  let rows: typeof selectedFields extends object
    ? { id: string; firstName: string; lastName: string; gradeLevel: number; counselorName: string | null }[]
    : never[];

  if (viewerRole === "teacher") {
    rows = await db
      .selectDistinct(selectedFields)
      .from(students)
      .innerJoin(enrollments, eq(enrollments.studentId, students.id))
      .innerJoin(
        classes,
        and(eq(classes.id, enrollments.classId), eq(classes.teacherId, viewerId))
      )
      .leftJoin(staffProfiles, eq(staffProfiles.id, students.counselorId))
      .where(and(...conditions))
      .orderBy(students.lastName, students.firstName);
  } else {
    rows = await db
      .select(selectedFields)
      .from(students)
      .leftJoin(staffProfiles, eq(staffProfiles.id, students.counselorId))
      .where(and(...conditions))
      .orderBy(students.lastName, students.firstName);
  }

  return rows.map((row) => ({
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    gradeLevel: Number(row.gradeLevel),
    counselorName: row.counselorName ?? null,
    isAtRisk: atRiskIds.has(row.id),
  }));
}

export async function canTeacherViewStudent(
  teacherId: string,
  studentId: string
): Promise<boolean> {
  const [row] = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .innerJoin(
      classes,
      and(
        eq(classes.id, enrollments.classId),
        eq(classes.teacherId, teacherId)
      )
    )
    .where(eq(enrollments.studentId, studentId))
    .limit(1);

  return row != null;
}

export async function getStudentById(
  studentId: string
): Promise<StudentDetail | null> {
  throw new Error("Not implemented");
}

export async function getStudentGradesByClass(
  studentId: string
): Promise<ClassWithGrades[]> {
  throw new Error("Not implemented");
}

export async function getStudentAttendance(
  studentId: string
): Promise<StudentAttendanceStats> {
  throw new Error("Not implemented");
}

export async function getStudentTests(studentId: string): Promise<TestScore[]> {
  throw new Error("Not implemented");
}

export async function getStudentGraduationPlan(
  studentId: string
): Promise<GraduationPlanData> {
  throw new Error("Not implemented");
}

export async function getStudentCollegePrepPlan(
  studentId: string
): Promise<CollegePrepData> {
  throw new Error("Not implemented");
}
```

- [ ] **Step 2: Run tests to verify exports and types still pass**

```bash
cd /Users/hector/Developer/EduDashTool/EduDashTool && npx vitest run src/__tests__/students.test.ts
```

Expected: All PASS

- [ ] **Step 3: Commit**

```bash
cd /Users/hector/Developer/EduDashTool/EduDashTool && git add src/lib/students.ts && git commit -m "feat: implement getStudentList and canTeacherViewStudent"
```

---

## Task 3: Implement `getStudentById`

**Files:**
- Modify: `src/lib/students.ts`

- [ ] **Step 1: Replace the `getStudentById` stub with this implementation**

In `src/lib/students.ts`, replace:
```ts
export async function getStudentById(
  studentId: string
): Promise<StudentDetail | null> {
  throw new Error("Not implemented");
}
```

With:
```ts
export async function getStudentById(
  studentId: string
): Promise<StudentDetail | null> {
  const atRiskIds = await getAtRiskStudentIds();

  const [row] = await db
    .select({
      id: students.id,
      firstName: students.firstName,
      lastName: students.lastName,
      gradeLevel: students.gradeLevel,
      enrolledAt: students.enrolledAt,
      counselorName: staffProfiles.fullName,
      isActive: students.isActive,
    })
    .from(students)
    .leftJoin(staffProfiles, eq(staffProfiles.id, students.counselorId))
    .where(eq(students.id, studentId))
    .limit(1);

  if (!row || !row.isActive) return null;

  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    gradeLevel: Number(row.gradeLevel),
    counselorName: row.counselorName ?? null,
    enrolledAt: row.enrolledAt ?? null,
    isAtRisk: atRiskIds.has(row.id),
  };
}
```

- [ ] **Step 2: Run tests**

```bash
cd /Users/hector/Developer/EduDashTool/EduDashTool && npx vitest run src/__tests__/students.test.ts
```

Expected: All PASS

- [ ] **Step 3: Commit**

```bash
cd /Users/hector/Developer/EduDashTool/EduDashTool && git add src/lib/students.ts && git commit -m "feat: implement getStudentById"
```

---

## Task 4: Implement `getStudentGradesByClass`

**Files:**
- Modify: `src/lib/students.ts`

- [ ] **Step 1: Replace the `getStudentGradesByClass` stub**

In `src/lib/students.ts`, replace:
```ts
export async function getStudentGradesByClass(
  studentId: string
): Promise<ClassWithGrades[]> {
  throw new Error("Not implemented");
}
```

With:
```ts
export async function getStudentGradesByClass(
  studentId: string
): Promise<ClassWithGrades[]> {
  const rows = await db
    .select({
      classId: classes.id,
      courseName: classes.courseName,
      courseCode: classes.courseCode,
      semester: classes.semester,
      schoolYear: classes.schoolYear,
      gradeId: grades.id,
      gradeType: grades.gradeType,
      score: grades.score,
      letterGrade: grades.letterGrade,
      gradedAt: grades.gradedAt,
    })
    .from(enrollments)
    .innerJoin(classes, eq(classes.id, enrollments.classId))
    .leftJoin(
      grades,
      and(
        eq(grades.studentId, enrollments.studentId),
        eq(grades.classId, classes.id)
      )
    )
    .where(eq(enrollments.studentId, studentId))
    .orderBy(desc(grades.gradedAt));

  // Group flat rows by class, preserving insertion order
  const classMap = new Map<string, ClassWithGrades>();
  for (const row of rows) {
    if (!classMap.has(row.classId)) {
      classMap.set(row.classId, {
        classId: row.classId,
        courseName: row.courseName,
        courseCode: row.courseCode ?? "",
        semester: row.semester,
        schoolYear: row.schoolYear,
        grades: [],
      });
    }
    if (row.gradeId != null) {
      classMap.get(row.classId)!.grades.push({
        id: row.gradeId,
        gradeType: row.gradeType!,
        score: row.score != null ? Number(row.score) : null,
        letterGrade: row.letterGrade ?? null,
        gradedAt: row.gradedAt ?? null,
      });
    }
  }

  return [...classMap.values()];
}
```

- [ ] **Step 2: Run tests**

```bash
cd /Users/hector/Developer/EduDashTool/EduDashTool && npx vitest run src/__tests__/students.test.ts
```

Expected: All PASS

- [ ] **Step 3: Commit**

```bash
cd /Users/hector/Developer/EduDashTool/EduDashTool && git add src/lib/students.ts && git commit -m "feat: implement getStudentGradesByClass"
```

---

## Task 5: Implement `getStudentAttendance`

**Files:**
- Modify: `src/lib/students.ts`

- [ ] **Step 1: Replace the `getStudentAttendance` stub**

In `src/lib/students.ts`, replace:
```ts
export async function getStudentAttendance(
  studentId: string
): Promise<StudentAttendanceStats> {
  throw new Error("Not implemented");
}
```

With:
```ts
export async function getStudentAttendance(
  studentId: string
): Promise<StudentAttendanceStats> {
  const cutoff = thirtyDaysAgo();

  const [records, weeklyRows] = await Promise.all([
    db
      .select({ status: attendanceRecords.status })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.studentId, studentId),
          gte(attendanceRecords.date, cutoff)
        )
      ),
    db
      .select({
        week: sql<string>`date_trunc('week', ${attendanceRecords.date}::timestamp)::date::text`,
        total: count(),
        present: sql<number>`sum(case when ${attendanceRecords.status} = 'present' then 1 else 0 end)`,
      })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.studentId, studentId),
          gte(attendanceRecords.date, cutoff)
        )
      )
      .groupBy(sql`date_trunc('week', ${attendanceRecords.date}::timestamp)`)
      .orderBy(sql`date_trunc('week', ${attendanceRecords.date}::timestamp)`),
  ]);

  let present = 0, absent = 0, tardy = 0, excused = 0;
  for (const r of records) {
    if (r.status === "present") present++;
    else if (r.status === "absent") absent++;
    else if (r.status === "tardy") tardy++;
    else if (r.status === "excused") excused++;
  }

  const total = records.length;
  // Rate: % present (includes excused, excludes absences)
  const rate = total > 0 ? Math.round(((present + excused) / total) * 100) : null;

  const trend = weeklyRows.map((r) => ({
    week: r.week,
    rate: r.total > 0 ? Math.round((Number(r.present) / r.total) * 100) : 0,
  }));

  return { present, absent, tardy, excused, rate, trend };
}
```

- [ ] **Step 2: Run tests**

```bash
cd /Users/hector/Developer/EduDashTool/EduDashTool && npx vitest run src/__tests__/students.test.ts
```

Expected: All PASS

- [ ] **Step 3: Commit**

```bash
cd /Users/hector/Developer/EduDashTool/EduDashTool && git add src/lib/students.ts && git commit -m "feat: implement getStudentAttendance"
```

---

## Task 6: Implement `getStudentTests`, `getStudentGraduationPlan`, `getStudentCollegePrepPlan`

**Files:**
- Modify: `src/lib/students.ts`

- [ ] **Step 1: Replace the three remaining stubs**

In `src/lib/students.ts`, replace:
```ts
export async function getStudentTests(studentId: string): Promise<TestScore[]> {
  throw new Error("Not implemented");
}

export async function getStudentGraduationPlan(
  studentId: string
): Promise<GraduationPlanData> {
  throw new Error("Not implemented");
}

export async function getStudentCollegePrepPlan(
  studentId: string
): Promise<CollegePrepData> {
  throw new Error("Not implemented");
}
```

With:
```ts
export async function getStudentTests(studentId: string): Promise<TestScore[]> {
  const rows = await db
    .select({
      id: standardizedTests.id,
      testType: standardizedTests.testType,
      testDate: standardizedTests.testDate,
      totalScore: standardizedTests.totalScore,
      mathScore: standardizedTests.mathScore,
      readingScore: standardizedTests.readingScore,
      writingScore: standardizedTests.writingScore,
      targetScore: standardizedTests.targetScore,
    })
    .from(standardizedTests)
    .where(eq(standardizedTests.studentId, studentId))
    .orderBy(desc(standardizedTests.testDate));

  return rows;
}

export async function getStudentGraduationPlan(
  studentId: string
): Promise<GraduationPlanData> {
  const [plan] = await db
    .select({
      creditsEarned: graduationPlans.creditsEarned,
      creditsRequired: graduationPlans.creditsRequired,
      onTrack: graduationPlans.onTrack,
      planData: graduationPlans.planData,
    })
    .from(graduationPlans)
    .where(eq(graduationPlans.studentId, studentId))
    .limit(1);

  if (!plan) return null;

  return {
    creditsEarned: Number(plan.creditsEarned ?? 0),
    creditsRequired: Number(plan.creditsRequired ?? 24),
    onTrack: plan.onTrack ?? true,
    planData: plan.planData as Record<string, unknown> | null,
  };
}

export async function getStudentCollegePrepPlan(
  studentId: string
): Promise<CollegePrepData> {
  const [plan] = await db
    .select({
      targetSchools: collegePrepPlans.targetSchools,
      applicationDeadline: collegePrepPlans.applicationDeadline,
      essayStatus: collegePrepPlans.essayStatus,
      recommendationStatus: collegePrepPlans.recommendationStatus,
      notes: collegePrepPlans.notes,
    })
    .from(collegePrepPlans)
    .where(eq(collegePrepPlans.studentId, studentId))
    .limit(1);

  if (!plan) return null;

  return {
    targetSchools: (plan.targetSchools as unknown[]) ?? [],
    applicationDeadline: plan.applicationDeadline ?? null,
    essayStatus: plan.essayStatus ?? null,
    recommendationStatus: plan.recommendationStatus ?? null,
    notes: plan.notes ?? null,
  };
}
```

- [ ] **Step 2: Run all tests**

```bash
cd /Users/hector/Developer/EduDashTool/EduDashTool && npx vitest run src/__tests__/students.test.ts
```

Expected: All PASS

- [ ] **Step 3: Commit**

```bash
cd /Users/hector/Developer/EduDashTool/EduDashTool && git add src/lib/students.ts && git commit -m "feat: implement getStudentTests, getStudentGraduationPlan, getStudentCollegePrepPlan"
```

---

## Task 7: `<SearchBar />` client component

**Files:**
- Create: `src/components/students/search-bar.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/students/search-bar.tsx
"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SearchBarProps {
  defaultSearch?: string;
  defaultGrade?: string;
  defaultAtRisk?: string;
}

export function SearchBar({
  defaultSearch = "",
  defaultGrade = "",
  defaultAtRisk = "",
}: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const handleSearch = useDebouncedCallback((value: string) => {
    updateParams({ search: value });
  }, 300);

  const handleGrade = (value: string) => {
    updateParams({ grade: value === "all" ? "" : value });
  };

  const handleAtRisk = (value: string) => {
    updateParams({ atRisk: value === "all" ? "" : value });
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Input
        placeholder="Search by name…"
        defaultValue={defaultSearch}
        onChange={(e) => handleSearch(e.target.value)}
        className="max-w-xs"
      />
      <Select defaultValue={defaultGrade || "all"} onValueChange={handleGrade}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Grade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Grades</SelectItem>
          <SelectItem value="9">9th</SelectItem>
          <SelectItem value="10">10th</SelectItem>
          <SelectItem value="11">11th</SelectItem>
          <SelectItem value="12">12th</SelectItem>
        </SelectContent>
      </Select>
      <Select defaultValue={defaultAtRisk || "all"} onValueChange={handleAtRisk}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Students</SelectItem>
          <SelectItem value="true">At-Risk Only</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/hector/Developer/EduDashTool/EduDashTool && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/hector/Developer/EduDashTool/EduDashTool && git add src/components/students/search-bar.tsx && git commit -m "feat: add SearchBar client component"
```

---

## Task 8: `<StudentsTable />` + Student List page

**Files:**
- Create: `src/components/students/students-table.tsx`
- Create: `src/app/students/page.tsx`
- Create: `src/app/students/loading.tsx`
- Create: `src/app/students/error.tsx`

- [ ] **Step 1: Create `<StudentsTable />`**

```tsx
// src/components/students/students-table.tsx
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { StudentRow } from "@/lib/students";

interface StudentsTableProps {
  students: StudentRow[];
}

const GRADE_LABEL: Record<number, string> = {
  9: "9th",
  10: "10th",
  11: "11th",
  12: "12th",
};

export function StudentsTable({ students }: StudentsTableProps) {
  if (students.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
        No students match your filters.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Grade</TableHead>
            <TableHead>Counselor</TableHead>
            <TableHead>At-Risk</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => (
            <TableRow key={student.id}>
              <TableCell className="font-medium">
                <Link
                  href={`/dashboard/students/${student.id}`}
                  className="hover:underline"
                >
                  {student.lastName}, {student.firstName}
                </Link>
              </TableCell>
              <TableCell>
                {GRADE_LABEL[student.gradeLevel] ?? student.gradeLevel}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {student.counselorName ?? "—"}
              </TableCell>
              <TableCell>
                {student.isAtRisk && (
                  <Badge variant="destructive">At Risk</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 2: Create the student list page**

```tsx
// src/app/students/page.tsx
import { requireStaffProfile } from "@/lib/auth";
import { getStudentList } from "@/lib/students";
import { SearchBar } from "@/components/students/search-bar";
import { StudentsTable } from "@/components/students/students-table";

interface StudentsPageProps {
  searchParams: Promise<{
    search?: string;
    grade?: string;
    atRisk?: string;
  }>;
}

export default async function StudentsPage({ searchParams }: StudentsPageProps) {
  const profile = await requireStaffProfile();
  const params = await searchParams;

  const grade = params.grade ? parseInt(params.grade, 10) : undefined;
  const atRisk = params.atRisk === "true" ? true : undefined;

  const studentList = await getStudentList({
    search: params.search,
    grade: isNaN(grade ?? NaN) ? undefined : grade,
    atRisk,
    viewerId: profile.userId,
    viewerRole: profile.role,
  });

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Students</h1>
        <p className="text-sm text-muted-foreground">
          {profile.role === "teacher"
            ? "Students enrolled in your classes"
            : "All active students"}
        </p>
      </div>

      <SearchBar
        defaultSearch={params.search ?? ""}
        defaultGrade={params.grade ?? ""}
        defaultAtRisk={params.atRisk ?? ""}
      />

      <StudentsTable students={studentList} />
    </div>
  );
}
```

- [ ] **Step 3: Create loading skeleton**

```tsx
// src/app/students/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function StudentsLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="space-y-1">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-44" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-36" />
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}
```

- [ ] **Step 4: Create error boundary**

```tsx
// src/app/students/error.tsx
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function StudentsError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Students page error:", error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
      <p className="text-sm text-muted-foreground">
        Something went wrong. Try again.
      </p>
      <Button variant="outline" size="sm" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/hector/Developer/EduDashTool/EduDashTool && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 6: Commit**

```bash
cd /Users/hector/Developer/EduDashTool/EduDashTool && git add src/components/students/students-table.tsx src/app/students/page.tsx src/app/students/loading.tsx src/app/students/error.tsx && git commit -m "feat: add student list page with SearchBar and StudentsTable"
```

---

## Task 9: Student Profile page + `<ProfileHeader />`

**Files:**
- Create: `src/app/dashboard/students/[id]/page.tsx`
- Create: `src/components/students/profile-header.tsx`

- [ ] **Step 1: Create `<ProfileHeader />`**

```tsx
// src/components/students/profile-header.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { StudentDetail } from "@/lib/students";

interface ProfileHeaderProps {
  student: StudentDetail;
}

const GRADE_LABEL: Record<number, string> = {
  9: "9th Grade",
  10: "10th Grade",
  11: "11th Grade",
  12: "12th Grade",
};

export function ProfileHeader({ student }: ProfileHeaderProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {student.firstName} {student.lastName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {GRADE_LABEL[student.gradeLevel] ?? `Grade ${student.gradeLevel}`}
            </p>
          </div>
          {student.isAtRisk && (
            <Badge variant="destructive" className="mt-1 sm:mt-0">
              At Risk
            </Badge>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Counselor</p>
            <p className="font-medium">{student.counselorName ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Enrolled</p>
            <p className="font-medium">{student.enrolledAt ?? "—"}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create the profile page (imports only; section components filled in Tasks 10–13)**

```tsx
// src/app/dashboard/students/[id]/page.tsx
import { notFound, redirect } from "next/navigation";
import { requireStaffProfile } from "@/lib/auth";
import { logAuditEntry } from "@/lib/audit";
import {
  getStudentById,
  getStudentGradesByClass,
  getStudentAttendance,
  getStudentTests,
  getStudentGraduationPlan,
  getStudentCollegePrepPlan,
  canTeacherViewStudent,
} from "@/lib/students";
import { ProfileHeader } from "@/components/students/profile-header";
import { GradesSection } from "@/components/students/grades-section";
import { AttendanceSection } from "@/components/students/attendance-section";
import { TestsSection } from "@/components/students/tests-section";
import { GraduationSection } from "@/components/students/graduation-section";
import { CollegePrepSection } from "@/components/students/college-prep-section";

interface StudentProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function StudentProfilePage({
  params,
}: StudentProfilePageProps) {
  const { id: studentId } = await params;
  const profile = await requireStaffProfile();

  // Teacher access check
  if (profile.role === "teacher") {
    const canView = await canTeacherViewStudent(profile.userId, studentId);
    if (!canView) redirect("/no-access");
  }

  const student = await getStudentById(studentId);
  if (!student) notFound();

  // FERPA audit — fire-and-forget
  logAuditEntry(profile.userId, studentId).catch((err) =>
    console.error("FERPA audit failed:", err)
  );

  const [grades, attendance, tests, graduation, collegePrep] = await Promise.all([
    getStudentGradesByClass(studentId),
    getStudentAttendance(studentId),
    getStudentTests(studentId),
    getStudentGraduationPlan(studentId),
    getStudentCollegePrepPlan(studentId),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <ProfileHeader student={student} />
      <GradesSection gradesByClass={grades} />
      <AttendanceSection stats={attendance} />
      <TestsSection tests={tests} />
      <GraduationSection plan={graduation} />
      <CollegePrepSection plan={collegePrep} />
    </div>
  );
}
```

- [ ] **Step 3: Commit (profile page + header; remaining sections implemented in tasks 10–13)**

```bash
cd /Users/hector/Developer/EduDashTool/EduDashTool && git add src/app/dashboard/students/\[id\]/page.tsx src/components/students/profile-header.tsx && git commit -m "feat: add student profile page and ProfileHeader component"
```

---

## Task 10: `<GradesSection />`

**Files:**
- Create: `src/components/students/grades-section.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/students/grades-section.tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ClassWithGrades } from "@/lib/students";

interface GradesSectionProps {
  gradesByClass: ClassWithGrades[];
}

const GRADE_TYPE_LABEL: Record<string, string> = {
  midterm: "Midterm",
  final: "Final",
  quarter: "Quarter",
  assignment: "Assignment",
};

export function GradesSection({ gradesByClass }: GradesSectionProps) {
  if (gradesByClass.length === 0) {
    return (
      <section>
        <h2 className="mb-3 text-lg font-medium">Grades</h2>
        <p className="text-sm text-muted-foreground">No grades recorded.</p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-lg font-medium">Grades</h2>
      {gradesByClass.map((cls) => (
        <div key={cls.classId}>
          <h3 className="mb-2 text-base font-medium">
            {cls.courseName}
            {cls.courseCode ? ` (${cls.courseCode})` : ""}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {cls.semester} · {cls.schoolYear}
            </span>
          </h3>
          {cls.grades.length === 0 ? (
            <p className="text-sm text-muted-foreground">No grades recorded.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Letter Grade</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cls.grades.map((grade) => (
                    <TableRow key={grade.id}>
                      <TableCell>
                        {GRADE_TYPE_LABEL[grade.gradeType] ?? grade.gradeType}
                      </TableCell>
                      <TableCell>
                        {grade.score != null ? grade.score : "—"}
                      </TableCell>
                      <TableCell>{grade.letterGrade ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {grade.gradedAt ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/hector/Developer/EduDashTool/EduDashTool && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/hector/Developer/EduDashTool/EduDashTool && git add src/components/students/grades-section.tsx && git commit -m "feat: add GradesSection component"
```

---

## Task 11: `<AttendanceSection />`

**Files:**
- Create: `src/components/students/attendance-section.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/students/attendance-section.tsx
import { Card, CardContent } from "@/components/ui/card";
import { AttendanceChart } from "@/components/dashboard/attendance-chart";
import type { StudentAttendanceStats } from "@/lib/students";

interface AttendanceSectionProps {
  stats: StudentAttendanceStats;
}

export function AttendanceSection({ stats }: AttendanceSectionProps) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-medium">Attendance (Last 30 Days)</h2>
      <Card>
        <CardContent className="pt-6">
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
            <div>
              <p className="text-xs text-muted-foreground">Present</p>
              <p className="text-2xl font-semibold">{stats.present}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Absent</p>
              <p className="text-2xl font-semibold">{stats.absent}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tardy</p>
              <p className="text-2xl font-semibold">{stats.tardy}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Excused</p>
              <p className="text-2xl font-semibold">{stats.excused}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Overall Rate</p>
              <p className="text-2xl font-semibold">
                {stats.rate != null ? `${stats.rate}%` : "—"}
              </p>
            </div>
          </div>
          <AttendanceChart data={stats.trend} />
        </CardContent>
      </Card>
    </section>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/hector/Developer/EduDashTool/EduDashTool && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/hector/Developer/EduDashTool/EduDashTool && git add src/components/students/attendance-section.tsx && git commit -m "feat: add AttendanceSection component"
```

---

## Task 12: `<TestsSection />`

**Files:**
- Create: `src/components/students/tests-section.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/students/tests-section.tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TestScore } from "@/lib/students";

interface TestsSectionProps {
  tests: TestScore[];
}

export function TestsSection({ tests }: TestsSectionProps) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-medium">Standardized Tests</h2>
      {tests.length === 0 ? (
        <p className="text-sm text-muted-foreground">No test scores recorded.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Math</TableHead>
                <TableHead>Reading</TableHead>
                <TableHead>Writing</TableHead>
                <TableHead>Target</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests.map((test) => (
                <TableRow key={test.id}>
                  <TableCell className="font-medium">{test.testType}</TableCell>
                  <TableCell>{test.testDate ?? "—"}</TableCell>
                  <TableCell>{test.totalScore ?? "—"}</TableCell>
                  <TableCell>{test.mathScore ?? "—"}</TableCell>
                  <TableCell>{test.readingScore ?? "—"}</TableCell>
                  <TableCell>{test.writingScore ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {test.targetScore ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/hector/Developer/EduDashTool/EduDashTool && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/hector/Developer/EduDashTool/EduDashTool && git add src/components/students/tests-section.tsx && git commit -m "feat: add TestsSection component"
```

---

## Task 13: `<GraduationSection />` and `<CollegePrepSection />`

**Files:**
- Create: `src/components/students/graduation-section.tsx`
- Create: `src/components/students/college-prep-section.tsx`

- [ ] **Step 1: Create `<GraduationSection />`**

```tsx
// src/components/students/graduation-section.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { GraduationPlanData } from "@/lib/students";

interface GraduationSectionProps {
  plan: GraduationPlanData;
}

export function GraduationSection({ plan }: GraduationSectionProps) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-medium">Graduation Plan</h2>
      {plan == null ? (
        <p className="text-sm text-muted-foreground">
          No graduation plan on file.
        </p>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-8">
                <div>
                  <p className="text-xs text-muted-foreground">Credits Earned</p>
                  <p className="text-3xl font-semibold">{plan.creditsEarned}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Credits Required</p>
                  <p className="text-3xl font-semibold">{plan.creditsRequired}</p>
                </div>
              </div>
              <Badge variant={plan.onTrack ? "default" : "destructive"}>
                {plan.onTrack ? "On Track" : "Off Track"}
              </Badge>
            </div>
            {plan.planData && (
              <div className="mt-4 space-y-1 text-sm">
                {Object.entries(plan.planData).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <span className="text-muted-foreground capitalize">
                      {key.replace(/_/g, " ")}:
                    </span>
                    <span>{String(value)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Create `<CollegePrepSection />`**

```tsx
// src/components/students/college-prep-section.tsx
import { Card, CardContent } from "@/components/ui/card";
import type { CollegePrepData } from "@/lib/students";

interface CollegePrepSectionProps {
  plan: CollegePrepData;
}

export function CollegePrepSection({ plan }: CollegePrepSectionProps) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-medium">College Prep Plan</h2>
      {plan == null ? (
        <p className="text-sm text-muted-foreground">
          No college prep plan on file.
        </p>
      ) : (
        <Card>
          <CardContent className="pt-6 space-y-4">
            {plan.targetSchools.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Target Schools</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {plan.targetSchools.map((school, i) => (
                    <li key={i}>{String(school)}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Application Deadline</p>
                <p className="font-medium">{plan.applicationDeadline ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Essay Status</p>
                <p className="font-medium">{plan.essayStatus ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Recommendation Status</p>
                <p className="font-medium">{plan.recommendationStatus ?? "—"}</p>
              </div>
            </div>
            {plan.notes && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{plan.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/hector/Developer/EduDashTool/EduDashTool && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
cd /Users/hector/Developer/EduDashTool/EduDashTool && git add src/components/students/graduation-section.tsx src/components/students/college-prep-section.tsx && git commit -m "feat: add GraduationSection and CollegePrepSection components"
```

---

## Task 14: Profile page `loading.tsx` and `error.tsx`

**Files:**
- Create: `src/app/dashboard/students/[id]/loading.tsx`
- Create: `src/app/dashboard/students/[id]/error.tsx`

- [ ] **Step 1: Create loading skeleton**

```tsx
// src/app/dashboard/students/[id]/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function StudentProfileLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Profile header */}
      <Skeleton className="h-36 rounded-xl" />

      {/* Grades section */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-48 rounded-xl" />
      </div>

      {/* Attendance section */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-52 rounded-xl" />
      </div>

      {/* Tests section */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-32 rounded-xl" />
      </div>

      {/* Graduation + college prep cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create error boundary**

```tsx
// src/app/dashboard/students/[id]/error.tsx
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function StudentProfileError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Student profile error:", error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
      <p className="text-sm text-muted-foreground">
        Something went wrong. Try again.
      </p>
      <Button variant="outline" size="sm" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles cleanly across all new files**

```bash
cd /Users/hector/Developer/EduDashTool/EduDashTool && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 4: Run full test suite**

```bash
cd /Users/hector/Developer/EduDashTool/EduDashTool && npx vitest run
```

Expected: All PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/hector/Developer/EduDashTool/EduDashTool && git add src/app/dashboard/students/\[id\]/loading.tsx src/app/dashboard/students/\[id\]/error.tsx && git commit -m "feat: add student profile loading and error boundaries"
```

---

## Self-Review Checklist

### Spec Coverage

| Requirement | Covered in task |
|---|---|
| Student list at `/students` | Task 8 |
| Profile at `/dashboard/students/[id]` | Task 9 |
| Principal + counselor see all students | Task 2 (`getStudentList`) |
| Teachers see only enrolled students | Task 2 (`canTeacherViewStudent` + `getStudentList` teacher branch) |
| Server-side search via URL params | Task 7 (`SearchBar`) + Task 8 (page reads params) |
| Search by name (case-insensitive) | Task 2 (`ilike`) |
| Grade filter | Task 2, 8 |
| At-risk filter | Task 2, 8 |
| isAtRisk = off-track OR attendance < 80% | Task 2 (`getAtRiskStudentIds`) |
| FERPA audit on profile view | Task 9 (page.tsx, fire-and-forget) |
| Teacher access check on profile | Task 9 (redirect to `/no-access`) |
| `notFound()` for missing/inactive student | Task 9 |
| ProfileHeader | Task 9 |
| GradesSection (per-class tables, date desc) | Task 10 |
| AttendanceSection (stats + chart) | Task 11 |
| TestsSection | Task 12 |
| GraduationSection | Task 13 |
| CollegePrepSection | Task 13 |
| Loading skeletons (list + profile) | Tasks 8, 14 |
| Error boundaries (list + profile) | Tasks 8, 14 |
| Empty states per section | All component tasks |
| At-risk names in dashboard link to profiles | Already done (at-risk-table.tsx untouched) |
| Students nav in sidebar | Already done (app-sidebar.tsx untouched) |

### Schema alignment verified
- `staffProfiles.fullName` used ✓
- `students.enrolledAt` used ✓
- `grades.gradeType` used ✓
- `grades.gradedAt` used ✓
- `classes.courseName` used ✓
- `standardizedTests` (no separate join table) used ✓
- `collegePrepPlans` used ✓
