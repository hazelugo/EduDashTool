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
