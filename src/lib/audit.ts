import { db } from "@/db";
import { accessAuditLog } from "@/db/schema";

/** Insert one FERPA audit log entry recording a staff member viewing a student profile.
 *  This is a plain async function (not a Server Action) — it is called from within
 *  server actions and server components that are already in a server context.
 *
 *  @param viewerId - staff_profiles.id of the staff member viewing the profile
 *  @param studentId - students.id of the student being viewed */
export async function logAuditEntry(
  viewerId: string,
  studentId: string
): Promise<void> {
  await db.insert(accessAuditLog).values({ viewerId, studentId });
}
