import { requireStaffProfile } from "@/lib/auth";
import { getStudentList, getCourseOptions, PAGE_SIZE } from "@/lib/students";
import type { RiskLevel } from "@/lib/students";
import { StudentFilters } from "./_components/student-filters";
import { StudentTableBody } from "./_components/student-table-body";
import { PaginationControls } from "./_components/pagination-controls";
import {
  Table,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Suspense } from "react";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    grade?: string;
    riskLevel?: string;
    course?: string;
    page?: string;
  }>;
}) {
  const profile = await requireStaffProfile();
  const params = await searchParams;

  const search = params.search ?? "";
  const gradeRaw = params.grade !== undefined ? Number(params.grade) : undefined;
  const gradeParam =
    gradeRaw !== undefined && Number.isFinite(gradeRaw) ? gradeRaw : undefined;
  const riskLevelParam = (params.riskLevel as RiskLevel) || undefined;
  const courseParam = params.course || undefined;
  const pageParam = params.page ? Math.max(1, Number(params.page)) : 1;

  const [{ rows: studentList, total }, courseOptions] = await Promise.all([
    getStudentList({
      search: search || undefined,
      grade: gradeParam,
      riskLevel: riskLevelParam,
      course: courseParam,
      page: pageParam,
      limit: PAGE_SIZE,
      viewerId: profile.userId,
      viewerRole: profile.role,
    }),
    getCourseOptions(profile.userId, profile.role),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = totalPages > 0 ? Math.min(pageParam, totalPages) : 1;

  const startItem = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(currentPage * PAGE_SIZE, total);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Students</h1>
        <p className="text-sm text-muted-foreground">
          {total === 0
            ? "No students found"
            : `Showing ${startItem}\u2013${endItem} of ${total} student${total !== 1 ? "s" : ""}`}
        </p>
      </div>

      <Suspense>
        <StudentFilters
          search={search}
          grade={params.grade ?? ""}
          course={params.course ?? ""}
          riskLevel={params.riskLevel ?? ""}
          courseOptions={courseOptions}
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
            <StudentTableBody rows={studentList} />
          </Table>
          <Suspense>
            <PaginationControls currentPage={currentPage} totalPages={totalPages} />
          </Suspense>
        </div>
      )}
    </div>
  );
}
