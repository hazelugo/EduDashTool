import { requireStaffProfile } from "@/lib/auth";
import { db } from "@/db";
import { accessAuditLog, staffProfiles, students } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AuditLogPage() {
  const profile = await requireStaffProfile();

  if (profile.role !== "principal") {
    redirect("/no-access");
  }

  const entries = await db
    .select({
      id: accessAuditLog.id,
      viewedAt: accessAuditLog.viewedAt,
      viewerName: staffProfiles.fullName,
      viewerEmail: staffProfiles.email,
      studentFirst: students.firstName,
      studentLast: students.lastName,
      studentId: accessAuditLog.studentId,
    })
    .from(accessAuditLog)
    .leftJoin(staffProfiles, eq(accessAuditLog.viewerId, staffProfiles.id))
    .leftJoin(students, eq(accessAuditLog.studentId, students.id))
    .orderBy(accessAuditLog.viewedAt)
    .limit(200);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Access Audit Log</h1>
        <p className="text-sm text-muted-foreground mt-1">
          FERPA-compliant record of student profile views. Visible to principals only.
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No audit entries yet. Entries will appear here once staff members
            begin viewing student profiles (Phase 4).
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Viewer</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Student ID</TableHead>
              <TableHead>Viewed At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  {entry.viewerName ?? entry.viewerEmail ?? "Unknown"}
                </TableCell>
                <TableCell>
                  {entry.studentFirst && entry.studentLast
                    ? `${entry.studentFirst} ${entry.studentLast}`
                    : entry.studentId}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {entry.studentId}
                </TableCell>
                <TableCell>
                  {entry.viewedAt
                    ? new Date(entry.viewedAt).toLocaleString()
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
