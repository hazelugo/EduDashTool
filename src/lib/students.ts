// Student list and profile query functions

import { db } from "@/db";
import {
  students,
  staffProfiles,
  classes,
  enrollments,
  graduationPlans,
  attendanceRecords,
  grades,
  standardizedTests,
  collegePrepPlans,
} from "@/db/schema";
import {
  eq,
  and,
  or,
  ilike,
  sql,
  count,
  gte,
  inArray,
  desc,
  isNull,
  isNotNull,
} from "drizzle-orm";

export const PAGE_SIZE = 25;

export type RiskLevel = "at-risk" | "watch" | "on-track";

export type StudentRow = {
  id: string;
  firstName: string;
  lastName: string;
  gradeLevel: number;
  counselorName: string | null;
  riskLevel: RiskLevel;
};

export type StudentListResult = {
  rows: StudentRow[];
  total: number;
};

export type StudentDetail = {
  id: string;
  firstName: string;
  lastName: string;
  gradeLevel: number;
  counselorName: string | null;
  enrolledAt: string | null;
  riskLevel: RiskLevel;
};

export function deriveRiskLevel(onTrack: boolean | null): RiskLevel {
  if (onTrack === false) return "at-risk";
  if (onTrack === true) return "on-track";
  return "watch";
}

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
  riskLevel?: RiskLevel;
  course?: string;
  page?: number;
  limit?: number;
  viewerId: string;
  viewerRole: "principal" | "counselor" | "teacher";
};

export async function getStudentList(params: GetStudentListParams): Promise<StudentListResult> {
  const { search, grade, riskLevel, course, viewerId, viewerRole } = params;
  const page = params.page ?? 1;
  const limit = params.limit ?? PAGE_SIZE;
  const offset = (page - 1) * limit;

  // Role scoping: teachers can only see students in their classes
  let allowedIds: string[] | null = null;
  if (viewerRole === "teacher") {
    const rows = await db
      .selectDistinct({ studentId: enrollments.studentId })
      .from(enrollments)
      .innerJoin(classes, eq(classes.id, enrollments.classId))
      .where(eq(classes.teacherId, viewerId));
    allowedIds = rows.map((r) => r.studentId);
    if (allowedIds.length === 0) return { rows: [], total: 0 };
  }

  const conditions = [eq(students.isActive, true)];

  if (allowedIds !== null) {
    // Teacher: only their enrolled students
    conditions.push(inArray(students.id, allowedIds));
  }
  // Counselor and principal: no additional scoping — see all active students

  if (grade !== undefined) {
    conditions.push(eq(students.gradeLevel, grade));
  }

  if (search) {
    const term = `%${search}%`;
    conditions.push(
      or(ilike(students.firstName, term), ilike(students.lastName, term))!
    );
  }

  // Risk level filter applied at SQL level (not post-query) using graduationPlans.onTrack
  if (riskLevel === "at-risk") {
    conditions.push(eq(graduationPlans.onTrack, false));
  } else if (riskLevel === "on-track") {
    conditions.push(eq(graduationPlans.onTrack, true));
  } else if (riskLevel === "watch") {
    conditions.push(
      and(
        isNotNull(graduationPlans.id),   // plan row exists
        isNull(graduationPlans.onTrack)  // but on_track is null
      )!
    );
  }

  // Course filter: find students enrolled in any section of that course
  if (course) {
    const enrolledInCourse = await db
      .selectDistinct({ studentId: enrollments.studentId })
      .from(enrollments)
      .innerJoin(classes, eq(classes.id, enrollments.classId))
      .where(eq(classes.courseName, course));
    const courseStudentIds = enrolledInCourse.map((r) => r.studentId);
    if (courseStudentIds.length === 0) return { rows: [], total: 0 };
    conditions.push(inArray(students.id, courseStudentIds));
  }

  const whereClause = and(...conditions);

  const [dataRows, countResult] = await Promise.all([
    db
      .select({
        id: students.id,
        firstName: students.firstName,
        lastName: students.lastName,
        gradeLevel: students.gradeLevel,
        counselorName: staffProfiles.fullName,
        onTrack: graduationPlans.onTrack,
      })
      .from(students)
      .leftJoin(staffProfiles, eq(students.counselorId, staffProfiles.id))
      .leftJoin(graduationPlans, eq(graduationPlans.studentId, students.id))
      .where(whereClause)
      .orderBy(students.lastName, students.firstName)
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(students)
      .leftJoin(graduationPlans, eq(graduationPlans.studentId, students.id))
      .where(whereClause),
  ]);

  const total = countResult[0]?.total ?? 0;

  const rows: StudentRow[] = dataRows.map((r) => ({
    id: r.id,
    firstName: r.firstName,
    lastName: r.lastName,
    gradeLevel: r.gradeLevel,
    counselorName: r.counselorName ?? null,
    riskLevel: deriveRiskLevel(r.onTrack ?? null),
  }));

  return { rows, total };
}

export async function getCourseOptions(
  viewerId: string,
  viewerRole: "principal" | "counselor" | "teacher"
): Promise<string[]> {
  if (viewerRole === "teacher") {
    const rows = await db
      .selectDistinct({ courseName: classes.courseName })
      .from(classes)
      .where(eq(classes.teacherId, viewerId))
      .orderBy(classes.courseName);
    return rows.map((r) => r.courseName);
  }
  // Counselor and principal see all courses
  const rows = await db
    .selectDistinct({ courseName: classes.courseName })
    .from(classes)
    .orderBy(classes.courseName);
  return rows.map((r) => r.courseName);
}

export async function getStudentById(studentId: string): Promise<StudentDetail | null> {
  const rows = await db
    .select({
      id: students.id,
      firstName: students.firstName,
      lastName: students.lastName,
      gradeLevel: students.gradeLevel,
      counselorName: staffProfiles.fullName,
      enrolledAt: students.enrolledAt,
      onTrack: graduationPlans.onTrack,
    })
    .from(students)
    .leftJoin(staffProfiles, eq(students.counselorId, staffProfiles.id))
    .leftJoin(graduationPlans, eq(graduationPlans.studentId, students.id))
    .where(eq(students.id, studentId))
    .limit(1);

  const r = rows[0];
  if (!r) return null;

  return {
    id: r.id,
    firstName: r.firstName,
    lastName: r.lastName,
    gradeLevel: r.gradeLevel,
    counselorName: r.counselorName ?? null,
    enrolledAt: r.enrolledAt ?? null,
    riskLevel: deriveRiskLevel(r.onTrack ?? null),
  };
}

export async function getStudentGradesByClass(studentId: string): Promise<ClassWithGrades[]> {
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
      and(eq(grades.classId, classes.id), eq(grades.studentId, studentId))
    )
    .where(eq(enrollments.studentId, studentId))
    .orderBy(classes.schoolYear, classes.semester, classes.courseName);

  // Group by class
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
    if (row.gradeId) {
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

export async function canTeacherViewStudent(
  teacherId: string,
  studentId: string
): Promise<boolean> {
  const rows = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .innerJoin(classes, eq(classes.id, enrollments.classId))
    .where(
      and(
        eq(enrollments.studentId, studentId),
        eq(classes.teacherId, teacherId)
      )
    )
    .limit(1);

  return rows.length > 0;
}
