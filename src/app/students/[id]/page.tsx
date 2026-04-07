import { requireStaffProfile } from "@/lib/auth";
import {
  getStudentById,
  getStudentGradesByClass,
  getStudentAttendance,
  getStudentTests,
  getStudentGraduationPlan,
  canTeacherViewStudent,
} from "@/lib/students";
import { logAuditEntry } from "@/lib/audit";
import { db } from "@/db";
import { students } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const GRADE_LABEL: Record<number, string> = {
  9: "9th grade",
  10: "10th grade",
  11: "11th grade",
  12: "12th grade",
};

const SEMESTER_LABEL: Record<string, string> = {
  fall: "Fall",
  spring: "Spring",
  full_year: "Full Year",
};

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireStaffProfile();
  const { id: studentId } = await params;

  // Teachers can only view students in their classes
  if (profile.role === "teacher") {
    const allowed = await canTeacherViewStudent(profile.userId, studentId);
    if (!allowed) redirect("/no-access");
  }

  const student = await getStudentById(studentId);
  if (!student) notFound();

  // Counselors can only view their assigned students
  if (profile.role === "counselor") {
    const rows = await db
      .select({ id: students.id })
      .from(students)
      .where(and(eq(students.id, studentId), eq(students.counselorId, profile.userId)))
      .limit(1);
    if (rows.length === 0) redirect("/no-access");
  }

  // FERPA audit log
  await logAuditEntry(profile.userId, studentId);

  const [classesList, attendance, tests, graduationPlan] = await Promise.all([
    getStudentGradesByClass(studentId),
    getStudentAttendance(studentId),
    getStudentTests(studentId),
    getStudentGraduationPlan(studentId),
  ]);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      <div>
        <Link
          href="/students"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Students
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {student.firstName} {student.lastName}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {GRADE_LABEL[student.gradeLevel] ?? `Grade ${student.gradeLevel}`}
              {student.counselorName && ` · Counselor: ${student.counselorName}`}
              {student.enrolledAt && ` · Enrolled ${student.enrolledAt}`}
            </p>
          </div>
          {student.isAtRisk && (
            <Badge variant="destructive" className="shrink-0">
              At Risk
            </Badge>
          )}
        </div>
      </div>

      {/* Attendance */}
      <section>
        <h2 className="text-lg font-medium mb-3">Attendance (Last 90 Days)</h2>
        {attendance.rate === null ? (
          <p className="text-sm text-muted-foreground">No attendance records.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "Rate", value: `${attendance.rate}%` },
              { label: "Present", value: attendance.present },
              { label: "Absent", value: attendance.absent },
              { label: "Tardy", value: attendance.tardy },
              { label: "Excused", value: attendance.excused },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-md border p-3 text-center">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-semibold mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Graduation Plan */}
      {graduationPlan && (
        <section>
          <h2 className="text-lg font-medium mb-3">Graduation Plan</h2>
          <div className="rounded-md border p-4 flex flex-wrap gap-6 items-center">
            <div>
              <p className="text-xs text-muted-foreground">Credits Earned</p>
              <p className="text-2xl font-semibold">{graduationPlan.creditsEarned}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Credits Required</p>
              <p className="text-2xl font-semibold">{graduationPlan.creditsRequired}</p>
            </div>
            <Badge variant={graduationPlan.onTrack ? "secondary" : "destructive"}>
              {graduationPlan.onTrack ? "On Track" : "Off Track"}
            </Badge>
          </div>
        </section>
      )}

      {/* Grades by Class */}
      <section>
        <h2 className="text-lg font-medium mb-3">Grades by Class</h2>
        {classesList.length === 0 ? (
          <p className="text-sm text-muted-foreground">No enrollment records.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {classesList.map((cls) => (
              <div key={cls.classId} className="rounded-md border">
                <div className="px-4 py-2.5 border-b bg-muted/40 flex items-center justify-between">
                  <span className="font-medium text-sm">
                    {cls.courseName}
                    {cls.courseCode && (
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        ({cls.courseCode})
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {SEMESTER_LABEL[cls.semester] ?? cls.semester} {cls.schoolYear}
                  </span>
                </div>
                {cls.grades.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">No grades recorded.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Letter</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cls.grades.map((g) => (
                        <TableRow key={g.id}>
                          <TableCell className="capitalize">{g.gradeType}</TableCell>
                          <TableCell>{g.score ?? "—"}</TableCell>
                          <TableCell>{g.letterGrade ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{g.gradedAt ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Standardized Tests */}
      {tests.length > 0 && (
        <section>
          <h2 className="text-lg font-medium mb-3">Standardized Tests</h2>
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
                {tests.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.testType}</TableCell>
                    <TableCell className="text-muted-foreground">{t.testDate ?? "—"}</TableCell>
                    <TableCell>{t.totalScore ?? "—"}</TableCell>
                    <TableCell>{t.mathScore ?? "—"}</TableCell>
                    <TableCell>{t.readingScore ?? "—"}</TableCell>
                    <TableCell>{t.writingScore ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{t.targetScore ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
    </div>
  );
}
