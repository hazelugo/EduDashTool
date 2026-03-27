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
