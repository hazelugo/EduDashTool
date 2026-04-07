import { requireStaffProfile } from "@/lib/auth";
import { getStudentList } from "@/lib/students";
import { StudentFilters } from "./_components/student-filters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Suspense } from "react";

const GRADE_LABEL: Record<number, string> = {
  9: "9th",
  10: "10th",
  11: "11th",
  12: "12th",
};

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; grade?: string; atRisk?: string }>;
}) {
  const profile = await requireStaffProfile();
  const params = await searchParams;

  const search = params.search ?? "";
  const gradeParam = params.grade ? Number(params.grade) : undefined;
  const atRiskParam =
    params.atRisk === "true" ? true : params.atRisk === "false" ? false : undefined;

  const studentList = await getStudentList({
    search: search || undefined,
    grade: gradeParam,
    atRisk: atRiskParam,
    viewerId: profile.userId,
    viewerRole: profile.role,
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Students</h1>
        <p className="text-sm text-muted-foreground">
          {studentList.length} student{studentList.length !== 1 ? "s" : ""}
        </p>
      </div>

      <Suspense>
        <StudentFilters
          search={search}
          grade={params.grade ?? ""}
          atRisk={params.atRisk ?? ""}
        />
      </Suspense>

      {studentList.length === 0 ? (
        <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
          No students match your filters.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Counselor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentList.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/students/${student.id}`}
                      className="hover:underline"
                    >
                      {student.lastName}, {student.firstName}
                    </Link>
                  </TableCell>
                  <TableCell>{GRADE_LABEL[student.gradeLevel] ?? student.gradeLevel}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {student.counselorName ?? "—"}
                  </TableCell>
                  <TableCell>
                    {student.isAtRisk ? (
                      <Badge variant="destructive">At Risk</Badge>
                    ) : (
                      <Badge variant="secondary">On Track</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
