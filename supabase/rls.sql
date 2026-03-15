-- EduDash Phase 1 RLS Setup
-- Run this in the Supabase SQL Editor after running db:migrate
-- This enables RLS and adds a deny-all anon policy on every table.
-- Phase 2 will add role-scoped SELECT policies for authenticated staff.

ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_anon" ON staff_profiles FOR ALL TO anon USING (false);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_anon" ON students FOR ALL TO anon USING (false);

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_anon" ON classes FOR ALL TO anon USING (false);

ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_anon" ON enrollments FOR ALL TO anon USING (false);

ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_anon" ON attendance_records FOR ALL TO anon USING (false);

ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_anon" ON grades FOR ALL TO anon USING (false);

ALTER TABLE standardized_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_anon" ON standardized_tests FOR ALL TO anon USING (false);

ALTER TABLE graduation_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_anon" ON graduation_plans FOR ALL TO anon USING (false);

ALTER TABLE college_prep_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_anon" ON college_prep_plans FOR ALL TO anon USING (false);

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_anon" ON ai_insights FOR ALL TO anon USING (false);
