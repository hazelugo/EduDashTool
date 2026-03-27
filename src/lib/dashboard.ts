import { db } from "@/db";
import { students, grades, attendanceRecords, graduationPlans, staffProfiles } from "@/db/schema";
import { eq, avg, count, gte, isNotNull, and, sql, inArray } from "drizzle-orm";

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
        inArray(students.id, attendanceOnlyIds)
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

  const [[countRow], [gpaRow], attendanceRows] = await Promise.all([
    db.select({ total: count() }).from(students).where(eq(students.isActive, true)),
    db.select({ avgGpa: avg(grades.score) }).from(grades),
    db
      .select({
        total: count(),
        present: sql<number>`sum(case when ${attendanceRecords.status} = 'present' then 1 else 0 end)`,
      })
      .from(attendanceRecords)
      .where(gte(attendanceRecords.date, cutoff)),
  ]);

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
    .groupBy(grades.letterGrade);

  // Ensure grade order A → F, fill in zeros for missing grades
  const order = ["A", "B", "C", "D", "F"];
  const map = new Map(rows.map((r) => [r.letterGrade ?? "", r.count]));
  return order.map((g) => ({ letterGrade: g, count: map.get(g) ?? 0 }));
}
