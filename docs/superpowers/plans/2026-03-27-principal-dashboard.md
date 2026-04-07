# Principal Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a read-only principal dashboard at `/dashboard` showing school-wide stats, at-risk students, attendance trend, and grade distribution.

**Architecture:** Single async server component fires four parallel Drizzle queries via `Promise.all`, then passes data down to server and client components. Only the two Recharts chart components use `"use client"`. Auth via existing `requireStaffProfile()`.

**Tech Stack:** Next.js 15 App Router, Drizzle ORM + PostgreSQL, shadcn/ui, Recharts, TypeScript, Vitest

**Spec:** `docs/superpowers/specs/2026-03-27-principal-dashboard-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/lib/dashboard.ts` | All four query functions + shared types |
| Modify | `src/app/dashboard/page.tsx` | Main page — auth, parallel queries, layout |
| Create | `src/app/dashboard/loading.tsx` | Skeleton placeholders |
| Create | `src/app/dashboard/error.tsx` | Error boundary with refresh button |
| Create | `src/components/dashboard/stat-cards.tsx` | 4-card summary row |
| Create | `src/components/dashboard/at-risk-table.tsx` | shadcn Table of at-risk students |
| Create | `src/components/dashboard/attendance-chart.tsx` | Recharts LineChart (client) |
| Create | `src/components/dashboard/grade-dist-chart.tsx` | Recharts BarChart (client) |
| Create | `src/__tests__/dashboard.test.ts` | Contract tests for dashboard query functions |

---

## Task 1: Install Recharts

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install recharts**

```bash
cd /Users/hector/Developer/EduDashTool/EduDashTool && npm install recharts
```

Expected: `added N packages` with no peer dependency errors.

- [ ] **Step 2: Verify installation**

```bash
node -e "require('recharts'); console.log('recharts ok')"
```

Expected output: `recharts ok`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install recharts for dashboard charts"
```

---

## Task 2: Dashboard query functions and types

**Files:**
- Create: `src/lib/dashboard.ts`

- [ ] **Step 1: Create `src/lib/dashboard.ts`**

```typescript
import { db } from "@/db";
import { students, grades, attendanceRecords, graduationPlans, staffProfiles } from "@/db/schema";
import { eq, avg, count, gte, isNotNull, and, sql } from "drizzle-orm";

// ── Types ────────────────────────────────────────────────────────────────────

export type SchoolStats = {
  totalStudents: number;
  avgGpa: number | null;
  totalAtRisk: number;
  attendanceRate: number | null;
};

export type AtRiskStudent = {
  id: string;
  firstName: string;
  lastName: string;
  gradeLevel: number;
  counselorName: string | null;
  riskReasons: ("attendance" | "graduation")[];
};

export type AttendanceDataPoint = {
  week: string;
  rate: number;
};

export type GradeDistPoint = {
  letterGrade: string;
  count: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function thirtyDaysAgo(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getAtRiskStudents(): Promise<AtRiskStudent[]> {
  const cutoff = thirtyDaysAgo().toISOString().slice(0, 10);

  // Students with graduation off-track
  const gradRisk = await db
    .select({
      id: students.id,
      firstName: students.firstName,
      lastName: students.lastName,
      gradeLevel: students.gradeLevel,
      counselorName: staffProfiles.fullName,
    })
    .from(graduationPlans)
    .innerJoin(students, eq(graduationPlans.studentId, students.id))
    .leftJoin(staffProfiles, eq(students.counselorId, staffProfiles.id))
    .where(and(eq(students.isActive, true), eq(graduationPlans.onTrack, false)));

  // Students with attendance < 80% in last 30 days
  const attendanceRows = await db
    .select({
      studentId: attendanceRecords.studentId,
      total: count(),
      present: sql<number>`sum(case when ${attendanceRecords.status} = 'present' then 1 else 0 end)`,
    })
    .from(attendanceRecords)
    .where(gte(attendanceRecords.date, cutoff))
    .groupBy(attendanceRecords.studentId);

  const attendanceRisk = new Set(
    attendanceRows
      .filter((r) => r.total > 0 && Number(r.present) / r.total < 0.8)
      .map((r) => r.studentId)
  );

  const gradRiskIds = new Set(gradRisk.map((s) => s.id));

  // Merge: students in either set
  const allRiskIds = new Set([...gradRiskIds, ...attendanceRisk]);

  // For students only in attendance risk (not in gradRisk result), fetch their info
  const attendanceOnlyIds = [...attendanceRisk].filter((id) => !gradRiskIds.has(id));

  let attendanceOnlyStudents: typeof gradRisk = [];
  if (attendanceOnlyIds.length > 0) {
    attendanceOnlyStudents = await db
      .select({
        id: students.id,
        firstName: students.firstName,
        lastName: students.lastName,
        gradeLevel: students.gradeLevel,
        counselorName: staffProfiles.fullName,
      })
      .from(students)
      .leftJoin(staffProfiles, eq(students.counselorId, staffProfiles.id))
      .where(and(
        eq(students.isActive, true),
        sql`${students.id} = ANY(${attendanceOnlyIds})`
      ));
  }

  const allStudents = [...gradRisk, ...attendanceOnlyStudents];

  const result: AtRiskStudent[] = allStudents.map((s) => ({
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    gradeLevel: s.gradeLevel,
    counselorName: s.counselorName ?? null,
    riskReasons: [
      ...(gradRiskIds.has(s.id) ? (["graduation"] as const) : []),
      ...(attendanceRisk.has(s.id) ? (["attendance"] as const) : []),
    ],
  }));

  // Sort: Both first, then graduation-only, then attendance-only, then alpha
  const riskWeight = (r: AtRiskStudent) =>
    r.riskReasons.length === 2 ? 0 : r.riskReasons[0] === "graduation" ? 1 : 2;

  return result.sort((a, b) => {
    const w = riskWeight(a) - riskWeight(b);
    if (w !== 0) return w;
    return `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`);
  });
}

export async function getSchoolStats(atRiskCount: number): Promise<SchoolStats> {
  const cutoff = thirtyDaysAgo().toISOString().slice(0, 10);

  const [countRow] = await db
    .select({ total: count() })
    .from(students)
    .where(eq(students.isActive, true));

  const [gpaRow] = await db
    .select({ avgGpa: avg(grades.score) })
    .from(grades);

  const attendanceRows = await db
    .select({
      total: count(),
      present: sql<number>`sum(case when ${attendanceRecords.status} = 'present' then 1 else 0 end)`,
    })
    .from(attendanceRecords)
    .where(gte(attendanceRecords.date, cutoff));

  const attRow = attendanceRows[0];
  const attendanceRate =
    attRow && attRow.total > 0
      ? Math.round((Number(attRow.present) / attRow.total) * 100)
      : null;

  return {
    totalStudents: countRow.total,
    avgGpa: gpaRow.avgGpa !== null ? Math.round(Number(gpaRow.avgGpa) * 10) / 10 : null,
    totalAtRisk: atRiskCount,
    attendanceRate,
  };
}

export async function getAttendanceTrend(): Promise<AttendanceDataPoint[]> {
  const cutoff = thirtyDaysAgo().toISOString().slice(0, 10);

  const rows = await db
    .select({
      week: sql<string>`date_trunc('week', ${attendanceRecords.date}::timestamp)::date::text`,
      total: count(),
      present: sql<number>`sum(case when ${attendanceRecords.status} = 'present' then 1 else 0 end)`,
    })
    .from(attendanceRecords)
    .where(gte(attendanceRecords.date, cutoff))
    .groupBy(sql`date_trunc('week', ${attendanceRecords.date}::timestamp)`)
    .orderBy(sql`date_trunc('week', ${attendanceRecords.date}::timestamp)`);

  return rows.map((r) => ({
    week: r.week,
    rate: r.total > 0 ? Math.round((Number(r.present) / r.total) * 100) : 0,
  }));
}

export async function getGradeDistribution(): Promise<GradeDistPoint[]> {
  const rows = await db
    .select({
      letterGrade: grades.letterGrade,
      count: count(),
    })
    .from(grades)
    .where(isNotNull(grades.letterGrade))
    .groupBy(grades.letterGrade)
    .orderBy(grades.letterGrade);

  // Ensure grade order A → F, fill in zeros for missing grades
  const order = ["A", "B", "C", "D", "F"];
  const map = new Map(rows.map((r) => [r.letterGrade ?? "", r.count]));
  return order.map((g) => ({ letterGrade: g, count: map.get(g) ?? 0 }));
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/hector/Developer/EduDashTool/EduDashTool && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (or only pre-existing unrelated errors).

- [ ] **Step 3: Commit**

```bash
git add src/lib/dashboard.ts
git commit -m "feat: add dashboard query functions and types"
```

---

## Task 3: Contract tests for dashboard queries

**Files:**
- Create: `src/__tests__/dashboard.test.ts`

- [ ] **Step 1: Create `src/__tests__/dashboard.test.ts`**

```typescript
import { describe, it, expect } from "vitest";

describe("dashboard query exports", () => {
  it("exports getAtRiskStudents as a function", async () => {
    const mod = await import("../lib/dashboard");
    expect(typeof mod.getAtRiskStudents).toBe("function");
  });

  it("getAtRiskStudents accepts zero parameters", async () => {
    const mod = await import("../lib/dashboard");
    expect(mod.getAtRiskStudents.length).toBe(0);
  });

  it("exports getSchoolStats as a function", async () => {
    const mod = await import("../lib/dashboard");
    expect(typeof mod.getSchoolStats).toBe("function");
  });

  it("getSchoolStats accepts one parameter (atRiskCount)", async () => {
    const mod = await import("../lib/dashboard");
    expect(mod.getSchoolStats.length).toBe(1);
  });

  it("exports getAttendanceTrend as a function", async () => {
    const mod = await import("../lib/dashboard");
    expect(typeof mod.getAttendanceTrend).toBe("function");
  });

  it("exports getGradeDistribution as a function", async () => {
    const mod = await import("../lib/dashboard");
    expect(typeof mod.getGradeDistribution).toBe("function");
  });
});

describe("AtRiskStudent type shape", () => {
  it("exported type has expected property keys (structural check via sample object)", () => {
    // Compile-time check: if AtRiskStudent type changes, this assignment will error
    const sample: import("../lib/dashboard").AtRiskStudent = {
      id: "uuid",
      firstName: "Jane",
      lastName: "Doe",
      gradeLevel: 11,
      counselorName: null,
      riskReasons: ["graduation", "attendance"],
    };
    expect(sample.id).toBe("uuid");
    expect(sample.riskReasons).toContain("graduation");
  });
});

describe("SchoolStats type shape", () => {
  it("exported type has expected property keys", () => {
    const sample: import("../lib/dashboard").SchoolStats = {
      totalStudents: 150,
      avgGpa: 3.1,
      totalAtRisk: 5,
      attendanceRate: 92,
    };
    expect(sample.totalStudents).toBe(150);
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
cd /Users/hector/Developer/EduDashTool/EduDashTool && npx vitest run src/__tests__/dashboard.test.ts
```

Expected: all 8 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/dashboard.test.ts
git commit -m "test: add contract tests for dashboard query functions"
```

---

## Task 4: StatCards component

**Files:**
- Create: `src/components/dashboard/stat-cards.tsx`

- [ ] **Step 1: Create `src/components/dashboard/stat-cards.tsx`**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, AlertTriangle, CalendarCheck, GraduationCap } from "lucide-react";
import type { SchoolStats } from "@/lib/dashboard";

interface StatCardsProps {
  stats: SchoolStats;
}

export function StatCards({ stats }: StatCardsProps) {
  const cards = [
    {
      title: "Total Students",
      value: stats.totalStudents,
      icon: Users,
      suffix: "",
    },
    {
      title: "At-Risk Students",
      value: stats.totalAtRisk,
      icon: AlertTriangle,
      suffix: "",
    },
    {
      title: "Attendance Rate",
      value: stats.attendanceRate !== null ? `${stats.attendanceRate}%` : "—",
      icon: CalendarCheck,
      suffix: "",
      raw: true,
    },
    {
      title: "Avg GPA",
      value: stats.avgGpa !== null ? stats.avgGpa : "—",
      icon: GraduationCap,
      suffix: "",
      raw: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {card.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/hector/Developer/EduDashTool/EduDashTool && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/stat-cards.tsx
git commit -m "feat: add StatCards dashboard component"
```

---

## Task 5: AtRiskTable component

**Files:**
- Create: `src/components/dashboard/at-risk-table.tsx`

- [ ] **Step 1: Create `src/components/dashboard/at-risk-table.tsx`**

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { AtRiskStudent } from "@/lib/dashboard";

interface AtRiskTableProps {
  students: AtRiskStudent[];
}

const GRADE_LABEL: Record<number, string> = {
  9: "9th",
  10: "10th",
  11: "11th",
  12: "12th",
};

function RiskBadge({ reasons }: { reasons: AtRiskStudent["riskReasons"] }) {
  if (reasons.length === 2) {
    return <Badge variant="destructive">Both</Badge>;
  }
  if (reasons[0] === "graduation") {
    return <Badge variant="secondary">Graduation</Badge>;
  }
  return <Badge variant="outline">Attendance</Badge>;
}

export function AtRiskTable({ students }: AtRiskTableProps) {
  if (students.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
        No at-risk students right now.
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
            <TableHead>Risk Reason</TableHead>
            <TableHead>Counselor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => (
            <TableRow key={student.id}>
              <TableCell className="font-medium">
                {student.lastName}, {student.firstName}
              </TableCell>
              <TableCell>{GRADE_LABEL[student.gradeLevel] ?? student.gradeLevel}</TableCell>
              <TableCell>
                <RiskBadge reasons={student.riskReasons} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {student.counselorName ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/hector/Developer/EduDashTool/EduDashTool && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/at-risk-table.tsx
git commit -m "feat: add AtRiskTable dashboard component"
```

---

## Task 6: AttendanceChart component

**Files:**
- Create: `src/components/dashboard/attendance-chart.tsx`

- [ ] **Step 1: Create `src/components/dashboard/attendance-chart.tsx`**

```tsx
"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { AttendanceDataPoint } from "@/lib/dashboard";

interface AttendanceChartProps {
  data: AttendanceDataPoint[];
}

function formatWeek(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function AttendanceChart({ data }: AttendanceChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No attendance data for the last 30 days.
      </div>
    );
  }

  const formatted = data.map((d) => ({ ...d, week: formatWeek(d.week) }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={formatted} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="week" tick={{ fontSize: 12 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
        <Tooltip formatter={(value: number) => [`${value}%`, "Attendance"]} />
        <Line
          type="monotone"
          dataKey="rate"
          strokeWidth={2}
          dot={{ r: 3 }}
          className="stroke-primary"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/hector/Developer/EduDashTool/EduDashTool && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/attendance-chart.tsx
git commit -m "feat: add AttendanceChart client component (Recharts)"
```

---

## Task 7: GradeDistChart component

**Files:**
- Create: `src/components/dashboard/grade-dist-chart.tsx`

- [ ] **Step 1: Create `src/components/dashboard/grade-dist-chart.tsx`**

```tsx
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { GradeDistPoint } from "@/lib/dashboard";

interface GradeDistChartProps {
  data: GradeDistPoint[];
}

export function GradeDistChart({ data }: GradeDistChartProps) {
  const hasData = data.some((d) => d.count > 0);

  if (!hasData) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No grade data available.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="letterGrade" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(value: number) => [value, "Students"]} />
        <Bar dataKey="count" className="fill-primary" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/hector/Developer/EduDashTool/EduDashTool && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/grade-dist-chart.tsx
git commit -m "feat: add GradeDistChart client component (Recharts)"
```

---

## Task 8: Loading skeleton

**Files:**
- Create: `src/app/dashboard/loading.tsx`

- [ ] **Step 1: Create `src/app/dashboard/loading.tsx`**

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Stat cards row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>

      {/* At-risk table */}
      <Skeleton className="h-64 rounded-xl" />

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Skeleton className="h-52 rounded-xl" />
        <Skeleton className="h-52 rounded-xl" />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/hector/Developer/EduDashTool/EduDashTool && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/loading.tsx
git commit -m "feat: add dashboard loading skeleton"
```

---

## Task 9: Error boundary

**Files:**
- Create: `src/app/dashboard/error.tsx`

- [ ] **Step 1: Create `src/app/dashboard/error.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
      <p className="text-sm text-muted-foreground">
        Something went wrong loading the dashboard.
      </p>
      <Button variant="outline" size="sm" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/hector/Developer/EduDashTool/EduDashTool && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/error.tsx
git commit -m "feat: add dashboard error boundary"
```

---

## Task 10: Wire up the dashboard page

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Read current contents of `src/app/dashboard/page.tsx`**

Confirm it is the placeholder ("Overview coming in Phase 7" text) — no logic to preserve.

- [ ] **Step 2: Replace `src/app/dashboard/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { requireStaffProfile } from "@/lib/auth";
import {
  getAtRiskStudents,
  getSchoolStats,
  getAttendanceTrend,
  getGradeDistribution,
} from "@/lib/dashboard";
import { StatCards } from "@/components/dashboard/stat-cards";
import { AtRiskTable } from "@/components/dashboard/at-risk-table";
import { AttendanceChart } from "@/components/dashboard/attendance-chart";
import { GradeDistChart } from "@/components/dashboard/grade-dist-chart";

export default async function DashboardPage() {
  const profile = await requireStaffProfile();
  if (profile.role !== "principal") {
    redirect("/no-access");
  }

  const atRisk = await getAtRiskStudents();

  const [stats, attendanceTrend, gradeDist] = await Promise.all([
    getSchoolStats(atRisk.length),
    getAttendanceTrend(),
    getGradeDistribution(),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">School-wide overview</p>
      </div>

      <StatCards stats={stats} />

      <section>
        <h2 className="mb-3 text-lg font-medium">At-Risk Students</h2>
        <AtRiskTable students={atRisk} />
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-medium">Attendance (Last 30 Days)</h2>
          <AttendanceChart data={attendanceTrend} />
        </section>
        <section>
          <h2 className="mb-3 text-lg font-medium">Grade Distribution</h2>
          <GradeDistChart data={gradeDist} />
        </section>
      </div>
    </div>
  );
}
```

Note: `getAtRiskStudents()` runs first so its count can be passed to `getSchoolStats()`. The other three queries then run in parallel.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/hector/Developer/EduDashTool/EduDashTool && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 4: Run all tests**

```bash
cd /Users/hector/Developer/EduDashTool/EduDashTool && npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 5: Start dev server and smoke-test**

```bash
cd /Users/hector/Developer/EduDashTool/EduDashTool && npm run dev
```

Open `http://localhost:3000/dashboard` (log in as the principal seed user first).
Verify:
- 4 stat cards render
- At-risk table shows students or empty state
- Both charts render or show empty state message
- No console errors

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: implement principal dashboard page"
```
