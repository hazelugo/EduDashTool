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

  let rows: { id: string; firstName: string; lastName: string; gradeLevel: number; counselorName: string | null }[];

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
  _studentId: string
): Promise<StudentDetail | null> {
  throw new Error("Not implemented");
}

export async function getStudentGradesByClass(
  _studentId: string
): Promise<ClassWithGrades[]> {
  throw new Error("Not implemented");
}

export async function getStudentAttendance(
  _studentId: string
): Promise<StudentAttendanceStats> {
  throw new Error("Not implemented");
}

export async function getStudentTests(_studentId: string): Promise<TestScore[]> {
  throw new Error("Not implemented");
}

export async function getStudentGraduationPlan(
  _studentId: string
): Promise<GraduationPlanData> {
  throw new Error("Not implemented");
}

export async function getStudentCollegePrepPlan(
  _studentId: string
): Promise<CollegePrepData> {
  throw new Error("Not implemented");
}
