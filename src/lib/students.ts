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

function attendanceSubquery(cutoff: string) {
  return db
    .select({
      studentId: attendanceRecords.studentId,
      total: sql<number>`count(*)`.as("total"),
      presentCount: sql<number>`sum(case when ${attendanceRecords.status} = 'present' then 1 else 0 end)`.as("present_count"),
    })
    .from(attendanceRecords)
    .where(gte(attendanceRecords.date, cutoff))
    .groupBy(attendanceRecords.studentId)
    .as("att");
}

function computeIsAtRisk(onTrack: boolean | null, attTotal: number | null, attPresent: number | null): boolean {
  if (onTrack === false) return true;
  if (attTotal && attTotal > 0 && Number(attPresent) / attTotal < 0.8) return true;
  return false;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getStudentList(
  params: GetStudentListParams
): Promise<StudentRow[]> {
  const { search, grade, atRisk, viewerId, viewerRole } = params;
  const cutoff = thirtyDaysAgo();
  const attSub = attendanceSubquery(cutoff);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conditions: any[] = [eq(students.isActive, true)];

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

  const selectedFields = {
    id: students.id,
    firstName: students.firstName,
    lastName: students.lastName,
    gradeLevel: students.gradeLevel,
    counselorName: staffProfiles.fullName,
    onTrack: graduationPlans.onTrack,
    attTotal: attSub.total,
    attPresent: attSub.presentCount,
  };

  let rows: { id: string; firstName: string; lastName: string; gradeLevel: number; counselorName: string | null; onTrack: boolean | null; attTotal: number | null; attPresent: number | null }[];

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
      .leftJoin(graduationPlans, eq(graduationPlans.studentId, students.id))
      .leftJoin(attSub, eq(attSub.studentId, students.id))
      .where(and(...conditions))
      .orderBy(students.lastName, students.firstName);
  } else {
    rows = await db
      .select(selectedFields)
      .from(students)
      .leftJoin(staffProfiles, eq(staffProfiles.id, students.counselorId))
      .leftJoin(graduationPlans, eq(graduationPlans.studentId, students.id))
      .leftJoin(attSub, eq(attSub.studentId, students.id))
      .where(and(...conditions))
      .orderBy(students.lastName, students.firstName);
  }

  const result = rows.map((row) => ({
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    gradeLevel: Number(row.gradeLevel),
    counselorName: row.counselorName ?? null,
    isAtRisk: computeIsAtRisk(row.onTrack, row.attTotal, row.attPresent),
  }));

  return atRisk !== undefined ? result.filter((s) => s.isAtRisk === atRisk) : result;
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
  const cutoff = thirtyDaysAgo();
  const attSub = attendanceSubquery(cutoff);

  const [row] = await db
    .select({
      id: students.id,
      firstName: students.firstName,
      lastName: students.lastName,
      gradeLevel: students.gradeLevel,
      enrolledAt: students.enrolledAt,
      counselorName: staffProfiles.fullName,
      isActive: students.isActive,
      onTrack: graduationPlans.onTrack,
      attTotal: attSub.total,
      attPresent: attSub.presentCount,
    })
    .from(students)
    .leftJoin(staffProfiles, eq(staffProfiles.id, students.counselorId))
    .leftJoin(graduationPlans, eq(graduationPlans.studentId, students.id))
    .leftJoin(attSub, eq(attSub.studentId, students.id))
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
    isAtRisk: computeIsAtRisk(row.onTrack, row.attTotal, row.attPresent),
  };
}

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

export async function getStudentAttendance(studentId: string): Promise<StudentAttendanceStats> {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const cutoff = ninetyDaysAgo.toISOString().slice(0, 10);

  const [totals, weeklyRows] = await Promise.all([
    db
      .select({
        status: attendanceRecords.status,
        total: count(),
      })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.studentId, studentId),
          gte(attendanceRecords.date, cutoff)
        )
      )
      .groupBy(attendanceRecords.status),
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

  const stats = { present: 0, absent: 0, tardy: 0, excused: 0 };
  for (const row of totals) {
    if (row.status === "present") stats.present = row.total;
    else if (row.status === "absent") stats.absent = row.total;
    else if (row.status === "tardy") stats.tardy = row.total;
    else if (row.status === "excused") stats.excused = row.total;
  }

  const totalDays = stats.present + stats.absent + stats.tardy + stats.excused;
  const rate = totalDays > 0 ? Math.round((stats.present / totalDays) * 100) : null;

  return {
    ...stats,
    rate,
    trend: weeklyRows.map((r) => ({
      week: r.week,
      rate: r.total > 0 ? Math.round((Number(r.present) / r.total) * 100) : 0,
    })),
  };
}

export async function getStudentTests(studentId: string): Promise<TestScore[]> {
  const rows = await db
    .select()
    .from(standardizedTests)
    .where(eq(standardizedTests.studentId, studentId))
    .orderBy(desc(standardizedTests.testDate));

  return rows.map((r) => ({
    id: r.id,
    testType: r.testType,
    testDate: r.testDate ?? null,
    totalScore: r.totalScore ?? null,
    mathScore: r.mathScore ?? null,
    readingScore: r.readingScore ?? null,
    writingScore: r.writingScore ?? null,
    targetScore: r.targetScore ?? null,
  }));
}

export async function getStudentGraduationPlan(studentId: string): Promise<GraduationPlanData> {
  const rows = await db
    .select()
    .from(graduationPlans)
    .where(eq(graduationPlans.studentId, studentId))
    .limit(1);

  const r = rows[0];
  if (!r) return null;

  return {
    creditsEarned: Number(r.creditsEarned ?? 0),
    creditsRequired: Number(r.creditsRequired ?? 24),
    onTrack: r.onTrack ?? true,
    planData: r.planData as Record<string, unknown> | null,
  };
}

export async function getStudentCollegePrepPlan(studentId: string): Promise<CollegePrepData> {
  const rows = await db
    .select()
    .from(collegePrepPlans)
    .where(eq(collegePrepPlans.studentId, studentId))
    .limit(1);

  const r = rows[0];
  if (!r) return null;

  return {
    targetSchools: (r.targetSchools as unknown[]) ?? [],
    applicationDeadline: r.applicationDeadline ?? null,
    essayStatus: r.essayStatus ?? null,
    recommendationStatus: r.recommendationStatus ?? null,
    notes: r.notes ?? null,
  };
}
