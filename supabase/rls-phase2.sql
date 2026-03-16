-- EduDash Phase 2 RLS — Role-Scoped Policies
-- Apply in Supabase SQL Editor AFTER Phase 1 rls.sql has been applied.
-- Phase 1 baseline (deny_all_anon) remains active on all tables.
--
-- IMPORTANT: Enable RLS on access_audit_log (new table added in Phase 2 migration)
-- Phase 1 only ran ALTER TABLE ... ENABLE ROW LEVEL SECURITY on the original 10 tables.

ALTER TABLE access_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_anon" ON access_audit_log FOR ALL TO anon USING (false);

-- ─── students: role-scoped SELECT policies ────────────────────────────────────
-- Counselor + Principal: unrestricted SELECT
-- NOTE: Must check role — bare USING (true) TO authenticated would leak to teachers
CREATE POLICY "counselor_principal_select_students"
ON students FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff_profiles
    WHERE id = (SELECT auth.uid())
      AND role IN ('counselor', 'principal')
  )
);

-- Teacher: scoped SELECT — only students enrolled in the teacher's classes
-- Two EXISTS checks: role guard first (short-circuits), then enrollment check
CREATE POLICY "teacher_select_own_students"
ON students FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff_profiles sp
    WHERE sp.id = (SELECT auth.uid()) AND sp.role = 'teacher'
  )
  AND
  EXISTS (
    SELECT 1 FROM enrollments e
    JOIN classes c ON e.class_id = c.id
    WHERE e.student_id = students.id
      AND c.teacher_id = (SELECT auth.uid())
  )
);

-- ─── access_audit_log: write-only for staff, read-only for principals ─────────
-- Staff can INSERT their own audit entries (viewer_id must match their auth.uid())
CREATE POLICY "staff_insert_audit_log"
ON access_audit_log FOR INSERT TO authenticated
WITH CHECK (viewer_id = (SELECT auth.uid()));

-- Principal can SELECT all audit log entries
CREATE POLICY "principal_select_audit_log"
ON access_audit_log FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff_profiles
    WHERE id = (SELECT auth.uid()) AND role = 'principal'
  )
);
