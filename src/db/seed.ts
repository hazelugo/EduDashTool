// SETUP REQUIRED before running:
// 1. Go to Supabase Dashboard → Authentication → Users
// 2. Create test users: teacher@edudash.test, counselor@edudash.test, principal@edudash.test
// 3. Copy their UUIDs and replace the placeholder UUIDs below
// 4. Run: npm run db:seed

import { db } from "./index";
import {
  staffProfiles,
  students,
  classes,
  enrollments,
  attendanceRecords,
  grades,
  standardizedTests,
  graduationPlans,
  collegePrepPlans,
  aiInsights,
} from "./schema";

// ── Placeholder UUIDs — replace with real auth.users UUIDs ──────────────────
const TEACHER_UUID = "8750c2f7-c8b6-46cc-972c-c509952edccd";
const COUNSELOR_UUID = "a17d3af9-3ffd-4a71-bb47-ad176725be61";
const PRINCIPAL_UUID = "46f51c38-26db-41a3-9c1c-c857156f872e";

// ── Helpers ──────────────────────────────────────────────────────────────────

function lg(score: number): string {
  if (score >= 93) return "A";
  if (score >= 90) return "A-";
  if (score >= 87) return "B+";
  if (score >= 83) return "B";
  if (score >= 80) return "B-";
  if (score >= 77) return "C+";
  if (score >= 73) return "C";
  if (score >= 70) return "C-";
  if (score >= 60) return "D";
  return "F";
}

function g(
  studentId: string,
  classId: string,
  gradeType: "midterm" | "final" | "quarter" | "assignment",
  score: number,
  gradedAt: string,
  notes?: string,
) {
  return {
    studentId,
    classId,
    gradeType,
    score: score.toFixed(2),
    letterGrade: lg(score),
    gradedAt,
    notes,
  };
}

function att(
  studentId: string,
  classId: string,
  date: string,
  status: "present" | "absent" | "tardy" | "excused",
  notes?: string,
) {
  return { studentId, classId, date, status, notes, recordedBy: TEACHER_UUID };
}

// ── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("Seeding demo data...\n");

  // ── Clear existing data (reverse FK order, cascades handle children) ───────
  console.log("  Clearing old data...");
  await db.delete(aiInsights);
  await db.delete(collegePrepPlans);
  await db.delete(graduationPlans);
  await db.delete(standardizedTests);
  await db.delete(grades);
  await db.delete(attendanceRecords);
  await db.delete(enrollments);
  await db.delete(classes);
  await db.delete(students);

  // ── 1. Staff profiles ─────────────────────────────────────────────────────
  await db
    .insert(staffProfiles)
    .values([
      {
        id: TEACHER_UUID,
        email: "teacher@edudash.test",
        fullName: "Alex Rivera",
        role: "teacher",
      },
      {
        id: COUNSELOR_UUID,
        email: "counselor@edudash.test",
        fullName: "Jordan Kim",
        role: "counselor",
      },
      {
        id: PRINCIPAL_UUID,
        email: "principal@edudash.test",
        fullName: "Dr. Sam Washington",
        role: "principal",
      },
    ])
    .onConflictDoNothing();
  console.log("  staff_profiles:       3 rows");

  // ── 2. Students ───────────────────────────────────────────────────────────
  // Stories:
  //  Connor Murphy  (9)  — chronic absenteeism, failing 2 classes, critical
  //  Tyler Rodriguez(9)  — below-average, declining grades, needs support
  //  Aisha Patel    (9)  — star freshman, perfect attendance, near-perfect grades
  //  Sofia Garcia   (9)  — average, steady, on track
  //  Emma Johnson  (10)  — improving trend, B → B+/A-
  //  Ava Brown     (10)  — solid, above average
  //  Jordan Williams(10) — average, math credit gap
  //  Priya Sharma  (10)  — high achiever, accelerated pace
  //  Marcus Williams(11) — at-risk, declining attendance + grades, family stress
  //  Isabella Martinez(11)— strong AP student, college-ready
  //  Devon Thompson(11)  — average, needs to start college prep
  //  Zoe Kim       (11)  — AP overachiever, targeting STEM schools
  //  James Chen    (12)  — star senior, 1540 SAT, MIT + Stanford accepted
  //  Olivia Davis  (12)  — strong senior, 2 acceptances
  //  Brandon Lee   (12)  — off-track senior, 5 credits short, critical
  //  Samantha Torres(12) — solid senior, 2 acceptances

  const studentRows = await db
    .insert(students)
    .values([
      // Grade 9
      {
        firstName: "Sofia",
        lastName: "Garcia",
        gradeLevel: 9,
        counselorId: COUNSELOR_UUID,
        isActive: true,
        enrolledAt: "2025-08-28",
      },
      {
        firstName: "Tyler",
        lastName: "Rodriguez",
        gradeLevel: 9,
        counselorId: COUNSELOR_UUID,
        isActive: true,
        enrolledAt: "2025-08-28",
      },
      {
        firstName: "Aisha",
        lastName: "Patel",
        gradeLevel: 9,
        counselorId: COUNSELOR_UUID,
        isActive: true,
        enrolledAt: "2025-08-28",
      },
      {
        firstName: "Connor",
        lastName: "Murphy",
        gradeLevel: 9,
        counselorId: COUNSELOR_UUID,
        isActive: true,
        enrolledAt: "2025-08-28",
      },
      // Grade 10
      {
        firstName: "Emma",
        lastName: "Johnson",
        gradeLevel: 10,
        counselorId: COUNSELOR_UUID,
        isActive: true,
        enrolledAt: "2024-08-29",
      },
      {
        firstName: "Ava",
        lastName: "Brown",
        gradeLevel: 10,
        counselorId: COUNSELOR_UUID,
        isActive: true,
        enrolledAt: "2024-08-29",
      },
      {
        firstName: "Jordan",
        lastName: "Williams",
        gradeLevel: 10,
        counselorId: COUNSELOR_UUID,
        isActive: true,
        enrolledAt: "2024-08-29",
      },
      {
        firstName: "Priya",
        lastName: "Sharma",
        gradeLevel: 10,
        counselorId: COUNSELOR_UUID,
        isActive: true,
        enrolledAt: "2024-08-29",
      },
      // Grade 11
      {
        firstName: "Marcus",
        lastName: "Williams",
        gradeLevel: 11,
        counselorId: COUNSELOR_UUID,
        isActive: true,
        enrolledAt: "2023-08-31",
      },
      {
        firstName: "Isabella",
        lastName: "Martinez",
        gradeLevel: 11,
        counselorId: COUNSELOR_UUID,
        isActive: true,
        enrolledAt: "2023-08-31",
      },
      {
        firstName: "Devon",
        lastName: "Thompson",
        gradeLevel: 11,
        counselorId: COUNSELOR_UUID,
        isActive: true,
        enrolledAt: "2023-08-31",
      },
      {
        firstName: "Zoe",
        lastName: "Kim",
        gradeLevel: 11,
        counselorId: COUNSELOR_UUID,
        isActive: true,
        enrolledAt: "2023-08-31",
      },
      // Grade 12
      {
        firstName: "James",
        lastName: "Chen",
        gradeLevel: 12,
        counselorId: COUNSELOR_UUID,
        isActive: true,
        enrolledAt: "2022-09-01",
      },
      {
        firstName: "Olivia",
        lastName: "Davis",
        gradeLevel: 12,
        counselorId: COUNSELOR_UUID,
        isActive: true,
        enrolledAt: "2022-09-01",
      },
      {
        firstName: "Brandon",
        lastName: "Lee",
        gradeLevel: 12,
        counselorId: COUNSELOR_UUID,
        isActive: true,
        enrolledAt: "2022-09-01",
      },
      {
        firstName: "Samantha",
        lastName: "Torres",
        gradeLevel: 12,
        counselorId: COUNSELOR_UUID,
        isActive: true,
        enrolledAt: "2022-09-01",
      },
    ])
    .returning({ id: students.id });

  const [
    sofia,
    tyler,
    aisha,
    connor,
    emma,
    ava,
    jordan,
    priya,
    marcus,
    isabella,
    devon,
    zoe,
    james,
    olivia,
    brandon,
    samantha,
  ] = studentRows.map((r) => r.id);

  console.log(`  students:             ${studentRows.length} rows`);

  // ── 3. Classes ────────────────────────────────────────────────────────────
  const classRows = await db
    .insert(classes)
    .values([
      {
        courseName: "Algebra II",
        courseCode: "MATH201",
        teacherId: TEACHER_UUID,
        semester: "fall",
        schoolYear: "2025-2026",
      },
      {
        courseName: "English Literature",
        courseCode: "ENG301",
        teacherId: TEACHER_UUID,
        semester: "fall",
        schoolYear: "2025-2026",
      },
      {
        courseName: "U.S. History",
        courseCode: "HIST201",
        teacherId: TEACHER_UUID,
        semester: "fall",
        schoolYear: "2025-2026",
      },
      {
        courseName: "Biology",
        courseCode: "SCI201",
        teacherId: TEACHER_UUID,
        semester: "fall",
        schoolYear: "2025-2026",
      },
      {
        courseName: "AP Calculus AB",
        courseCode: "MATH401",
        teacherId: TEACHER_UUID,
        semester: "full_year",
        schoolYear: "2025-2026",
      },
      {
        courseName: "AP English Language & Comp",
        courseCode: "ENG401",
        teacherId: TEACHER_UUID,
        semester: "full_year",
        schoolYear: "2025-2026",
      },
    ])
    .returning({ id: classes.id });

  const [cAlg2, cEngLit, cHistory, cBio, cAPCalc, cAPEng] = classRows.map(
    (r) => r.id,
  );
  console.log(`  classes:              ${classRows.length} rows`);

  // ── 4. Enrollments ────────────────────────────────────────────────────────
  // Algebra II  — Grade 9 students + two Grade 10 students
  // English Lit — Grade 10 + two Grade 11 students
  // US History  — Grade 10 + all Grade 11 students
  // Biology     — Grade 9 + three Grade 10 students
  // AP Calculus — strong Grade 11 + all Grade 12 students
  // AP English  — Grade 11 + all Grade 12 students
  const enrollmentData = [
    { studentId: sofia, classId: cAlg2 },
    { studentId: tyler, classId: cAlg2 },
    { studentId: aisha, classId: cAlg2 },
    { studentId: connor, classId: cAlg2 },
    { studentId: emma, classId: cAlg2 },
    { studentId: jordan, classId: cAlg2 },

    { studentId: emma, classId: cEngLit },
    { studentId: ava, classId: cEngLit },
    { studentId: jordan, classId: cEngLit },
    { studentId: priya, classId: cEngLit },
    { studentId: marcus, classId: cEngLit },
    { studentId: devon, classId: cEngLit },

    { studentId: ava, classId: cHistory },
    { studentId: priya, classId: cHistory },
    { studentId: marcus, classId: cHistory },
    { studentId: isabella, classId: cHistory },
    { studentId: devon, classId: cHistory },
    { studentId: zoe, classId: cHistory },

    { studentId: sofia, classId: cBio },
    { studentId: tyler, classId: cBio },
    { studentId: aisha, classId: cBio },
    { studentId: ava, classId: cBio },
    { studentId: priya, classId: cBio },

    { studentId: zoe, classId: cAPCalc },
    { studentId: isabella, classId: cAPCalc },
    { studentId: james, classId: cAPCalc },
    { studentId: olivia, classId: cAPCalc },
    { studentId: samantha, classId: cAPCalc },

    { studentId: marcus, classId: cAPEng },
    { studentId: zoe, classId: cAPEng },
    { studentId: james, classId: cAPEng },
    { studentId: olivia, classId: cAPEng },
    { studentId: brandon, classId: cAPEng },
    { studentId: samantha, classId: cAPEng },
  ];
  await db.insert(enrollments).values(enrollmentData).onConflictDoNothing();
  console.log(`  enrollments:          ${enrollmentData.length} rows`);

  // ── 5. Attendance Records ─────────────────────────────────────────────────
  // Dates are fall semester 2025-2026 (September – November)
  // Patterns:
  //   Aisha   — perfect attendance (exemplary)
  //   Sofia   — mostly present, one absence
  //   Connor  — chronic absenteeism (~42%) — critical
  //   Tyler   — spotty, tardies, ~75% attendance
  //   Emma    — one sick day, otherwise present
  //   Ava     — excellent
  //   Priya   — perfect
  //   Marcus  — started strong, collapsed mid-October (~58%) — at-risk
  //   Isabella— excellent
  //   Devon   — solid
  //   Zoe     — excellent (one excused sick day)
  //   James   — excellent (two excused college visits)
  //   Olivia  — solid
  //   Brandon — declining (~60%)
  //   Samantha— good

  const attendanceData = [
    // ── AISHA PATEL — perfect attendance ──
    att(aisha, cAlg2, "2025-09-03", "present"),
    att(aisha, cAlg2, "2025-09-10", "present"),
    att(aisha, cAlg2, "2025-09-17", "present"),
    att(aisha, cAlg2, "2025-09-24", "present"),
    att(aisha, cAlg2, "2025-10-01", "present"),
    att(aisha, cAlg2, "2025-10-08", "present"),
    att(aisha, cAlg2, "2025-10-15", "present"),
    att(aisha, cAlg2, "2025-10-22", "present"),
    att(aisha, cAlg2, "2025-10-29", "present"),
    att(aisha, cAlg2, "2025-11-05", "present"),
    att(aisha, cAlg2, "2025-11-12", "present"),
    att(aisha, cBio, "2025-09-04", "present"),
    att(aisha, cBio, "2025-09-11", "present"),
    att(aisha, cBio, "2025-09-18", "present"),
    att(aisha, cBio, "2025-09-25", "present"),
    att(aisha, cBio, "2025-10-02", "present"),
    att(aisha, cBio, "2025-10-09", "present"),
    att(aisha, cBio, "2025-10-16", "present"),
    att(aisha, cBio, "2025-10-23", "present"),
    att(aisha, cBio, "2025-10-30", "present"),
    att(aisha, cBio, "2025-11-06", "present"),

    // ── SOFIA GARCIA — mostly present ──
    att(sofia, cAlg2, "2025-09-03", "present"),
    att(sofia, cAlg2, "2025-09-10", "present"),
    att(sofia, cAlg2, "2025-09-17", "absent", "Sick — parent called"),
    att(sofia, cAlg2, "2025-09-24", "present"),
    att(sofia, cAlg2, "2025-10-01", "present"),
    att(sofia, cAlg2, "2025-10-08", "present"),
    att(sofia, cAlg2, "2025-10-15", "present"),
    att(sofia, cAlg2, "2025-10-22", "present"),
    att(sofia, cAlg2, "2025-10-29", "present"),
    att(sofia, cAlg2, "2025-11-05", "present"),
    att(sofia, cBio, "2025-09-04", "present"),
    att(sofia, cBio, "2025-09-11", "present"),
    att(sofia, cBio, "2025-09-18", "tardy", "5 minutes late"),
    att(sofia, cBio, "2025-09-25", "present"),
    att(sofia, cBio, "2025-10-02", "present"),
    att(sofia, cBio, "2025-10-09", "present"),
    att(sofia, cBio, "2025-10-16", "present"),
    att(sofia, cBio, "2025-10-23", "present"),
    att(sofia, cBio, "2025-10-30", "present"),

    // ── TYLER RODRIGUEZ — spotty, tardies, ~75% ──
    att(tyler, cAlg2, "2025-09-03", "present"),
    att(tyler, cAlg2, "2025-09-10", "tardy", "10 min late — bus delay"),
    att(tyler, cAlg2, "2025-09-17", "present"),
    att(tyler, cAlg2, "2025-09-24", "absent", "Unexcused"),
    att(tyler, cAlg2, "2025-10-01", "present"),
    att(tyler, cAlg2, "2025-10-08", "tardy", "15 min late"),
    att(tyler, cAlg2, "2025-10-15", "absent"),
    att(tyler, cAlg2, "2025-10-22", "present"),
    att(tyler, cAlg2, "2025-10-29", "absent", "No contact"),
    att(tyler, cAlg2, "2025-11-05", "present"),
    att(tyler, cBio, "2025-09-04", "present"),
    att(tyler, cBio, "2025-09-11", "tardy"),
    att(tyler, cBio, "2025-09-18", "present"),
    att(tyler, cBio, "2025-09-25", "absent"),
    att(tyler, cBio, "2025-10-02", "present"),
    att(tyler, cBio, "2025-10-09", "present"),
    att(tyler, cBio, "2025-10-16", "absent"),
    att(tyler, cBio, "2025-10-23", "present"),
    att(tyler, cBio, "2025-10-30", "tardy", "20 min late"),

    // ── CONNOR MURPHY — chronic absenteeism (~42%) — CRITICAL ──
    att(connor, cAlg2, "2025-09-03", "present"),
    att(connor, cAlg2, "2025-09-10", "absent", "No contact from family"),
    att(connor, cAlg2, "2025-09-17", "absent", "No contact from family"),
    att(connor, cAlg2, "2025-09-24", "tardy", "40 min late — unexcused"),
    att(connor, cAlg2, "2025-10-01", "absent"),
    att(connor, cAlg2, "2025-10-08", "present"),
    att(
      connor,
      cAlg2,
      "2025-10-15",
      "absent",
      "Parent contacted — illness cited",
    ),
    att(connor, cAlg2, "2025-10-22", "absent"),
    att(connor, cAlg2, "2025-10-29", "tardy", "30 min late"),
    att(connor, cAlg2, "2025-11-05", "absent", "3rd unexcused this month"),
    att(connor, cAlg2, "2025-11-12", "present"),
    att(connor, cBio, "2025-09-04", "absent"),
    att(connor, cBio, "2025-09-11", "present"),
    att(connor, cBio, "2025-09-18", "absent"),
    att(connor, cBio, "2025-09-25", "absent"),
    att(connor, cBio, "2025-10-02", "present"),
    att(connor, cBio, "2025-10-09", "absent", "Unexcused"),
    att(connor, cBio, "2025-10-16", "absent"),
    att(connor, cBio, "2025-10-23", "present"),
    att(connor, cBio, "2025-10-30", "absent"),
    att(connor, cBio, "2025-11-06", "absent", "4th unexcused absence"),

    // ── EMMA JOHNSON — one sick day, otherwise present ──
    att(emma, cAlg2, "2025-09-03", "present"),
    att(emma, cAlg2, "2025-09-10", "present"),
    att(emma, cAlg2, "2025-09-17", "absent", "Sick — doctor note"),
    att(emma, cAlg2, "2025-09-24", "present"),
    att(emma, cAlg2, "2025-10-01", "present"),
    att(emma, cAlg2, "2025-10-08", "present"),
    att(emma, cAlg2, "2025-10-15", "present"),
    att(emma, cAlg2, "2025-10-22", "present"),
    att(emma, cAlg2, "2025-10-29", "present"),
    att(emma, cAlg2, "2025-11-05", "present"),
    att(emma, cEngLit, "2025-09-04", "present"),
    att(emma, cEngLit, "2025-09-11", "present"),
    att(emma, cEngLit, "2025-09-18", "present"),
    att(emma, cEngLit, "2025-09-25", "present"),
    att(emma, cEngLit, "2025-10-02", "present"),
    att(emma, cEngLit, "2025-10-09", "tardy", "Traffic"),
    att(emma, cEngLit, "2025-10-16", "present"),
    att(emma, cEngLit, "2025-10-23", "present"),
    att(emma, cEngLit, "2025-10-30", "present"),
    att(emma, cEngLit, "2025-11-06", "present"),

    // ── AVA BROWN — excellent ──
    att(ava, cEngLit, "2025-09-04", "present"),
    att(ava, cEngLit, "2025-09-11", "present"),
    att(ava, cEngLit, "2025-09-18", "present"),
    att(ava, cEngLit, "2025-09-25", "present"),
    att(ava, cEngLit, "2025-10-02", "present"),
    att(ava, cEngLit, "2025-10-09", "present"),
    att(ava, cEngLit, "2025-10-16", "present"),
    att(ava, cEngLit, "2025-10-23", "present"),
    att(ava, cEngLit, "2025-10-30", "present"),
    att(ava, cEngLit, "2025-11-06", "present"),
    att(ava, cBio, "2025-09-04", "present"),
    att(ava, cBio, "2025-09-11", "present"),
    att(ava, cBio, "2025-09-18", "absent", "Sick — excused"),
    att(ava, cBio, "2025-09-25", "present"),
    att(ava, cBio, "2025-10-02", "present"),
    att(ava, cBio, "2025-10-09", "present"),
    att(ava, cBio, "2025-10-16", "present"),
    att(ava, cBio, "2025-10-23", "present"),
    att(ava, cBio, "2025-10-30", "present"),

    // ── PRIYA SHARMA — perfect ──
    att(priya, cEngLit, "2025-09-04", "present"),
    att(priya, cEngLit, "2025-09-11", "present"),
    att(priya, cEngLit, "2025-09-18", "present"),
    att(priya, cEngLit, "2025-09-25", "present"),
    att(priya, cEngLit, "2025-10-02", "present"),
    att(priya, cEngLit, "2025-10-09", "present"),
    att(priya, cEngLit, "2025-10-16", "present"),
    att(priya, cEngLit, "2025-10-23", "present"),
    att(priya, cEngLit, "2025-10-30", "present"),
    att(priya, cEngLit, "2025-11-06", "present"),
    att(priya, cHistory, "2025-09-05", "present"),
    att(priya, cHistory, "2025-09-12", "present"),
    att(priya, cHistory, "2025-09-19", "present"),
    att(priya, cHistory, "2025-09-26", "present"),
    att(priya, cHistory, "2025-10-03", "present"),
    att(priya, cHistory, "2025-10-10", "present"),
    att(priya, cHistory, "2025-10-17", "present"),
    att(priya, cHistory, "2025-10-24", "present"),
    att(priya, cHistory, "2025-10-31", "present"),
    att(priya, cHistory, "2025-11-07", "present"),

    // ── MARCUS WILLIAMS — started strong, collapsed mid-October (~58%) — AT-RISK ──
    att(marcus, cEngLit, "2025-09-04", "present"),
    att(marcus, cEngLit, "2025-09-11", "present"),
    att(marcus, cEngLit, "2025-09-18", "present"),
    att(marcus, cEngLit, "2025-09-25", "tardy", "20 min late"),
    att(marcus, cEngLit, "2025-10-02", "absent"),
    att(marcus, cEngLit, "2025-10-09", "absent"),
    att(marcus, cEngLit, "2025-10-16", "present"),
    att(marcus, cEngLit, "2025-10-23", "absent", "3rd unexcused this month"),
    att(marcus, cEngLit, "2025-10-30", "absent"),
    att(marcus, cEngLit, "2025-11-06", "tardy"),
    att(marcus, cEngLit, "2025-11-13", "absent"),
    att(marcus, cHistory, "2025-09-05", "present"),
    att(marcus, cHistory, "2025-09-12", "present"),
    att(marcus, cHistory, "2025-09-19", "present"),
    att(marcus, cHistory, "2025-09-26", "absent"),
    att(marcus, cHistory, "2025-10-03", "present"),
    att(marcus, cHistory, "2025-10-10", "absent"),
    att(marcus, cHistory, "2025-10-17", "absent"),
    att(marcus, cHistory, "2025-10-24", "present"),
    att(marcus, cHistory, "2025-10-31", "absent"),
    att(marcus, cHistory, "2025-11-07", "absent"),
    att(marcus, cAPEng, "2025-09-03", "present"),
    att(marcus, cAPEng, "2025-09-10", "present"),
    att(marcus, cAPEng, "2025-09-17", "absent"),
    att(marcus, cAPEng, "2025-09-24", "present"),
    att(marcus, cAPEng, "2025-10-01", "absent"),
    att(marcus, cAPEng, "2025-10-08", "absent"),
    att(marcus, cAPEng, "2025-10-15", "tardy"),
    att(marcus, cAPEng, "2025-10-22", "absent"),
    att(marcus, cAPEng, "2025-10-29", "present"),
    att(marcus, cAPEng, "2025-11-05", "absent"),

    // ── ISABELLA MARTINEZ — excellent ──
    att(isabella, cHistory, "2025-09-05", "present"),
    att(isabella, cHistory, "2025-09-12", "present"),
    att(isabella, cHistory, "2025-09-19", "present"),
    att(isabella, cHistory, "2025-09-26", "present"),
    att(isabella, cHistory, "2025-10-03", "present"),
    att(isabella, cHistory, "2025-10-10", "present"),
    att(isabella, cHistory, "2025-10-17", "present"),
    att(isabella, cHistory, "2025-10-24", "present"),
    att(isabella, cHistory, "2025-10-31", "present"),
    att(isabella, cHistory, "2025-11-07", "present"),
    att(isabella, cAPCalc, "2025-09-03", "present"),
    att(isabella, cAPCalc, "2025-09-10", "present"),
    att(isabella, cAPCalc, "2025-09-17", "present"),
    att(isabella, cAPCalc, "2025-09-24", "present"),
    att(isabella, cAPCalc, "2025-10-01", "present"),
    att(isabella, cAPCalc, "2025-10-08", "present"),
    att(isabella, cAPCalc, "2025-10-15", "present"),
    att(isabella, cAPCalc, "2025-10-22", "present"),
    att(isabella, cAPCalc, "2025-10-29", "absent", "Excused — medical"),
    att(isabella, cAPCalc, "2025-11-05", "present"),

    // ── ZOE KIM — excellent, one excused sick day ──
    att(zoe, cHistory, "2025-09-05", "present"),
    att(zoe, cHistory, "2025-09-12", "present"),
    att(zoe, cHistory, "2025-09-19", "present"),
    att(zoe, cHistory, "2025-09-26", "present"),
    att(zoe, cHistory, "2025-10-03", "present"),
    att(zoe, cHistory, "2025-10-10", "present"),
    att(zoe, cHistory, "2025-10-17", "present"),
    att(zoe, cHistory, "2025-10-24", "present"),
    att(zoe, cHistory, "2025-10-31", "present"),
    att(zoe, cHistory, "2025-11-07", "present"),
    att(zoe, cAPCalc, "2025-09-03", "present"),
    att(zoe, cAPCalc, "2025-09-10", "present"),
    att(zoe, cAPCalc, "2025-09-17", "present"),
    att(zoe, cAPCalc, "2025-09-24", "present"),
    att(zoe, cAPCalc, "2025-10-01", "present"),
    att(zoe, cAPCalc, "2025-10-08", "present"),
    att(zoe, cAPCalc, "2025-10-15", "tardy", "5 min — train delay"),
    att(zoe, cAPCalc, "2025-10-22", "present"),
    att(zoe, cAPCalc, "2025-10-29", "present"),
    att(zoe, cAPCalc, "2025-11-05", "present"),
    att(zoe, cAPEng, "2025-09-04", "present"),
    att(zoe, cAPEng, "2025-09-11", "present"),
    att(zoe, cAPEng, "2025-09-18", "present"),
    att(zoe, cAPEng, "2025-09-25", "present"),
    att(zoe, cAPEng, "2025-10-02", "present"),
    att(zoe, cAPEng, "2025-10-09", "absent", "Sick — doctor note"),
    att(zoe, cAPEng, "2025-10-16", "present"),
    att(zoe, cAPEng, "2025-10-23", "present"),
    att(zoe, cAPEng, "2025-10-30", "present"),
    att(zoe, cAPEng, "2025-11-06", "present"),

    // ── JAMES CHEN — exemplary, two excused college visits ──
    att(james, cAPCalc, "2025-09-03", "present"),
    att(james, cAPCalc, "2025-09-10", "present"),
    att(james, cAPCalc, "2025-09-17", "present"),
    att(james, cAPCalc, "2025-09-24", "present"),
    att(james, cAPCalc, "2025-10-01", "present"),
    att(james, cAPCalc, "2025-10-08", "present"),
    att(james, cAPCalc, "2025-10-15", "present"),
    att(james, cAPCalc, "2025-10-22", "present"),
    att(james, cAPCalc, "2025-10-29", "excused", "College visit — MIT"),
    att(james, cAPCalc, "2025-11-05", "present"),
    att(james, cAPCalc, "2025-11-12", "present"),
    att(james, cAPEng, "2025-09-04", "present"),
    att(james, cAPEng, "2025-09-11", "present"),
    att(james, cAPEng, "2025-09-18", "present"),
    att(james, cAPEng, "2025-09-25", "present"),
    att(james, cAPEng, "2025-10-02", "present"),
    att(james, cAPEng, "2025-10-09", "present"),
    att(james, cAPEng, "2025-10-16", "present"),
    att(james, cAPEng, "2025-10-23", "present"),
    att(james, cAPEng, "2025-10-30", "excused", "College visit — Stanford"),
    att(james, cAPEng, "2025-11-06", "present"),
    att(james, cAPEng, "2025-11-13", "present"),

    // ── OLIVIA DAVIS — solid attendance ──
    att(olivia, cAPCalc, "2025-09-03", "present"),
    att(olivia, cAPCalc, "2025-09-10", "present"),
    att(olivia, cAPCalc, "2025-09-17", "present"),
    att(olivia, cAPCalc, "2025-09-24", "present"),
    att(olivia, cAPCalc, "2025-10-01", "absent", "Sick — excused"),
    att(olivia, cAPCalc, "2025-10-08", "present"),
    att(olivia, cAPCalc, "2025-10-15", "present"),
    att(olivia, cAPCalc, "2025-10-22", "present"),
    att(olivia, cAPCalc, "2025-10-29", "present"),
    att(olivia, cAPCalc, "2025-11-05", "present"),
    att(olivia, cAPEng, "2025-09-04", "present"),
    att(olivia, cAPEng, "2025-09-11", "present"),
    att(olivia, cAPEng, "2025-09-18", "present"),
    att(olivia, cAPEng, "2025-09-25", "present"),
    att(olivia, cAPEng, "2025-10-02", "present"),
    att(olivia, cAPEng, "2025-10-09", "present"),
    att(olivia, cAPEng, "2025-10-16", "tardy", "Traffic — 10 min"),
    att(olivia, cAPEng, "2025-10-23", "present"),
    att(olivia, cAPEng, "2025-10-30", "present"),
    att(olivia, cAPEng, "2025-11-06", "present"),

    // ── BRANDON LEE — declining senior (~60%) ──
    att(brandon, cAPEng, "2025-09-04", "present"),
    att(brandon, cAPEng, "2025-09-11", "absent"),
    att(brandon, cAPEng, "2025-09-18", "present"),
    att(brandon, cAPEng, "2025-09-25", "tardy", "20 min late — unexcused"),
    att(brandon, cAPEng, "2025-10-02", "absent", "Unexcused"),
    att(brandon, cAPEng, "2025-10-09", "present"),
    att(brandon, cAPEng, "2025-10-16", "absent"),
    att(brandon, cAPEng, "2025-10-23", "present"),
    att(brandon, cAPEng, "2025-10-30", "absent"),
    att(
      brandon,
      cAPEng,
      "2025-11-06",
      "absent",
      "4th unexcused — senior at risk",
    ),

    // ── SAMANTHA TORRES — good attendance ──
    att(samantha, cAPCalc, "2025-09-03", "present"),
    att(samantha, cAPCalc, "2025-09-10", "present"),
    att(samantha, cAPCalc, "2025-09-17", "present"),
    att(samantha, cAPCalc, "2025-09-24", "present"),
    att(samantha, cAPCalc, "2025-10-01", "present"),
    att(samantha, cAPCalc, "2025-10-08", "present"),
    att(samantha, cAPCalc, "2025-10-15", "absent", "Sick"),
    att(samantha, cAPCalc, "2025-10-22", "present"),
    att(samantha, cAPCalc, "2025-10-29", "present"),
    att(samantha, cAPCalc, "2025-11-05", "present"),
    att(samantha, cAPEng, "2025-09-04", "present"),
    att(samantha, cAPEng, "2025-09-11", "present"),
    att(samantha, cAPEng, "2025-09-18", "present"),
    att(samantha, cAPEng, "2025-09-25", "present"),
    att(samantha, cAPEng, "2025-10-02", "present"),
    att(samantha, cAPEng, "2025-10-09", "present"),
    att(samantha, cAPEng, "2025-10-16", "present"),
    att(samantha, cAPEng, "2025-10-23", "present"),
    att(samantha, cAPEng, "2025-10-30", "present"),
    att(samantha, cAPEng, "2025-11-06", "present"),
  ];

  await db.insert(attendanceRecords).values(attendanceData);
  console.log(`  attendance_records:   ${attendanceData.length} rows`);

  // ── 6. Grades ─────────────────────────────────────────────────────────────
  const gradesData = [
    // AISHA PATEL — high achiever (A range)
    g(aisha, cAlg2, "assignment", 97, "2025-09-20"),
    g(aisha, cAlg2, "midterm", 95, "2025-10-15"),
    g(aisha, cAlg2, "quarter", 96, "2025-11-15"),
    g(aisha, cBio, "assignment", 98, "2025-09-22"),
    g(aisha, cBio, "midterm", 94, "2025-10-16"),
    g(aisha, cBio, "quarter", 96, "2025-11-16"),

    // SOFIA GARCIA — average, steady (B range)
    g(sofia, cAlg2, "assignment", 82, "2025-09-20"),
    g(sofia, cAlg2, "midterm", 79, "2025-10-15"),
    g(sofia, cAlg2, "quarter", 84, "2025-11-15"),
    g(sofia, cBio, "assignment", 78, "2025-09-22"),
    g(sofia, cBio, "midterm", 81, "2025-10-16"),
    g(sofia, cBio, "quarter", 83, "2025-11-16"),

    // TYLER RODRIGUEZ — declining (C → D, needs intervention)
    g(tyler, cAlg2, "assignment", 74, "2025-09-20"),
    g(
      tyler,
      cAlg2,
      "midterm",
      68,
      "2025-10-15",
      "Below expected — extra support recommended",
    ),
    g(
      tyler,
      cAlg2,
      "quarter",
      65,
      "2025-11-15",
      "Significant decline — intervention needed",
    ),
    g(tyler, cBio, "assignment", 72, "2025-09-22"),
    g(tyler, cBio, "midterm", 70, "2025-10-16"),
    g(tyler, cBio, "quarter", 67, "2025-11-16"),

    // CONNOR MURPHY — failing (linked to absences)
    g(
      connor,
      cAlg2,
      "assignment",
      55,
      "2025-09-20",
      "Missing work due to absences",
    ),
    g(
      connor,
      cAlg2,
      "midterm",
      48,
      "2025-10-15",
      "Failed — did not complete 3 sections",
    ),
    g(
      connor,
      cAlg2,
      "quarter",
      52,
      "2025-11-15",
      "At risk of failing the course",
    ),
    g(connor, cBio, "assignment", 60, "2025-09-22"),
    g(connor, cBio, "midterm", 54, "2025-10-16"),
    g(
      connor,
      cBio,
      "quarter",
      49,
      "2025-11-16",
      "Failing — immediate intervention required",
    ),

    // EMMA JOHNSON — improving trend (B → B+/A-)
    g(emma, cAlg2, "assignment", 80, "2025-09-20"),
    g(emma, cAlg2, "midterm", 83, "2025-10-15"),
    g(
      emma,
      cAlg2,
      "quarter",
      87,
      "2025-11-15",
      "Great improvement this quarter!",
    ),
    g(emma, cEngLit, "assignment", 85, "2025-09-19"),
    g(emma, cEngLit, "midterm", 88, "2025-10-14"),
    g(emma, cEngLit, "quarter", 91, "2025-11-14"),

    // AVA BROWN — solid, above average (B+/A-)
    g(ava, cEngLit, "assignment", 89, "2025-09-19"),
    g(ava, cEngLit, "midterm", 91, "2025-10-14"),
    g(ava, cEngLit, "quarter", 92, "2025-11-14"),
    g(ava, cBio, "assignment", 87, "2025-09-22"),
    g(ava, cBio, "midterm", 88, "2025-10-16"),
    g(ava, cBio, "quarter", 91, "2025-11-16"),

    // PRIYA SHARMA — high achiever (A range)
    g(priya, cEngLit, "assignment", 94, "2025-09-19"),
    g(priya, cEngLit, "midterm", 91, "2025-10-14"),
    g(priya, cEngLit, "quarter", 94, "2025-11-14"),
    g(priya, cHistory, "assignment", 92, "2025-09-23"),
    g(priya, cHistory, "midterm", 90, "2025-10-17"),
    g(priya, cHistory, "quarter", 93, "2025-11-17"),
    g(priya, cBio, "assignment", 96, "2025-09-22"),
    g(priya, cBio, "midterm", 93, "2025-10-16"),
    g(priya, cBio, "quarter", 95, "2025-11-16"),

    // MARCUS WILLIAMS — at-risk, declining (B → D)
    g(marcus, cEngLit, "assignment", 78, "2025-09-19"),
    g(
      marcus,
      cEngLit,
      "midterm",
      70,
      "2025-10-14",
      "Missing assignments from absences",
    ),
    g(
      marcus,
      cEngLit,
      "quarter",
      63,
      "2025-11-14",
      "At risk of failing — counselor alerted",
    ),
    g(marcus, cHistory, "assignment", 75, "2025-09-23"),
    g(marcus, cHistory, "midterm", 68, "2025-10-17"),
    g(
      marcus,
      cHistory,
      "quarter",
      61,
      "2025-11-17",
      "Borderline pass — credit at risk",
    ),
    g(marcus, cAPEng, "assignment", 72, "2025-09-22"),
    g(
      marcus,
      cAPEng,
      "midterm",
      65,
      "2025-10-21",
      "Struggling with AP workload",
    ),
    g(
      marcus,
      cAPEng,
      "quarter",
      60,
      "2025-11-21",
      "Consider dropping to standard English",
    ),

    // ISABELLA MARTINEZ — strong AP student (B+/A-)
    g(isabella, cHistory, "assignment", 90, "2025-09-23"),
    g(isabella, cHistory, "midterm", 88, "2025-10-17"),
    g(isabella, cHistory, "quarter", 91, "2025-11-17"),
    g(isabella, cAPCalc, "assignment", 87, "2025-09-24"),
    g(isabella, cAPCalc, "midterm", 85, "2025-10-20"),
    g(isabella, cAPCalc, "quarter", 89, "2025-11-20"),

    // DEVON THOMPSON — average (B range)
    g(devon, cEngLit, "assignment", 76, "2025-09-19"),
    g(devon, cEngLit, "midterm", 79, "2025-10-14"),
    g(devon, cEngLit, "quarter", 81, "2025-11-14"),
    g(devon, cHistory, "assignment", 78, "2025-09-23"),
    g(devon, cHistory, "midterm", 80, "2025-10-17"),
    g(devon, cHistory, "quarter", 82, "2025-11-17"),

    // ZOE KIM — AP overachiever (A range)
    g(zoe, cHistory, "assignment", 98, "2025-09-23"),
    g(zoe, cHistory, "midterm", 95, "2025-10-17"),
    g(zoe, cHistory, "quarter", 97, "2025-11-17"),
    g(zoe, cAPCalc, "assignment", 96, "2025-09-24"),
    g(zoe, cAPCalc, "midterm", 94, "2025-10-20"),
    g(zoe, cAPCalc, "quarter", 97, "2025-11-20"),
    g(zoe, cAPEng, "assignment", 94, "2025-09-22"),
    g(zoe, cAPEng, "midterm", 92, "2025-10-21"),
    g(zoe, cAPEng, "quarter", 95, "2025-11-21"),

    // JAMES CHEN — star student (A+ range)
    g(james, cAPCalc, "assignment", 99, "2025-09-24"),
    g(james, cAPCalc, "midterm", 98, "2025-10-20"),
    g(james, cAPCalc, "quarter", 99, "2025-11-20"),
    g(james, cAPEng, "assignment", 97, "2025-09-22"),
    g(james, cAPEng, "midterm", 95, "2025-10-21"),
    g(james, cAPEng, "quarter", 98, "2025-11-21"),

    // OLIVIA DAVIS — strong senior (A-/B+ range)
    g(olivia, cAPCalc, "assignment", 88, "2025-09-24"),
    g(olivia, cAPCalc, "midterm", 86, "2025-10-20"),
    g(olivia, cAPCalc, "quarter", 90, "2025-11-20"),
    g(olivia, cAPEng, "assignment", 91, "2025-09-22"),
    g(olivia, cAPEng, "midterm", 89, "2025-10-21"),
    g(olivia, cAPEng, "quarter", 92, "2025-11-21"),

    // BRANDON LEE — struggling senior (D/F range in AP)
    g(brandon, cAPEng, "assignment", 65, "2025-09-22", "Incomplete submission"),
    g(
      brandon,
      cAPEng,
      "midterm",
      60,
      "2025-10-21",
      "Multiple missing assignments",
    ),
    g(
      brandon,
      cAPEng,
      "quarter",
      55,
      "2025-11-21",
      "Failing AP English — urgent action required",
    ),

    // SAMANTHA TORRES — solid senior (B+/A- range)
    g(samantha, cAPCalc, "assignment", 84, "2025-09-24"),
    g(samantha, cAPCalc, "midterm", 86, "2025-10-20"),
    g(samantha, cAPCalc, "quarter", 89, "2025-11-20"),
    g(samantha, cAPEng, "assignment", 82, "2025-09-22"),
    g(samantha, cAPEng, "midterm", 85, "2025-10-21"),
    g(samantha, cAPEng, "quarter", 87, "2025-11-21"),
  ];
  await db.insert(grades).values(gradesData);
  console.log(`  grades:               ${gradesData.length} rows`);

  // ── 7. Standardized Tests ─────────────────────────────────────────────────
  const testData = [
    // Grade 11 — PSAT + first SAT attempt
    {
      studentId: marcus,
      testType: "PSAT" as const,
      testDate: "2025-10-15",
      totalScore: 920,
      mathScore: 440,
      readingScore: 480,
      targetScore: 1100,
    },
    {
      studentId: isabella,
      testType: "PSAT" as const,
      testDate: "2025-10-15",
      totalScore: 1180,
      mathScore: 580,
      readingScore: 600,
      targetScore: 1300,
    },
    {
      studentId: devon,
      testType: "PSAT" as const,
      testDate: "2025-10-15",
      totalScore: 1050,
      mathScore: 510,
      readingScore: 540,
      targetScore: 1200,
    },
    {
      studentId: zoe,
      testType: "PSAT" as const,
      testDate: "2025-10-15",
      totalScore: 1360,
      mathScore: 700,
      readingScore: 660,
      targetScore: 1500,
    },
    {
      studentId: zoe,
      testType: "SAT" as const,
      testDate: "2025-08-23",
      totalScore: 1430,
      mathScore: 740,
      readingScore: 690,
      targetScore: 1500,
      notes: "First attempt — strong result",
    },
    // Grade 12 — SAT / ACT / AP
    {
      studentId: james,
      testType: "SAT" as const,
      testDate: "2025-03-08",
      totalScore: 1540,
      mathScore: 790,
      readingScore: 750,
      targetScore: 1550,
      notes: "National Merit Semifinalist qualifying score",
    },
    {
      studentId: james,
      testType: "ACT" as const,
      testDate: "2025-04-12",
      totalScore: 35,
      mathScore: 36,
      readingScore: 34,
      writingScore: 35,
      targetScore: 36,
    },
    {
      studentId: james,
      testType: "AP" as const,
      testDate: "2025-05-09",
      totalScore: 5,
      notes: "AP Calculus BC — Score: 5",
    },
    {
      studentId: james,
      testType: "AP" as const,
      testDate: "2025-05-14",
      totalScore: 5,
      notes: "AP English Language — Score: 5",
    },
    {
      studentId: olivia,
      testType: "SAT" as const,
      testDate: "2025-03-08",
      totalScore: 1380,
      mathScore: 680,
      readingScore: 700,
      targetScore: 1420,
    },
    {
      studentId: olivia,
      testType: "SAT" as const,
      testDate: "2025-08-23",
      totalScore: 1410,
      mathScore: 700,
      readingScore: 710,
      targetScore: 1420,
      notes: "Improved 30 points — above target",
    },
    {
      studentId: brandon,
      testType: "SAT" as const,
      testDate: "2025-03-08",
      totalScore: 980,
      mathScore: 470,
      readingScore: 510,
      targetScore: 1200,
      notes: "Below target — retake recommended",
    },
    {
      studentId: brandon,
      testType: "SAT" as const,
      testDate: "2025-08-23",
      totalScore: 1020,
      mathScore: 490,
      readingScore: 530,
      targetScore: 1200,
      notes: "Small improvement, still well below target",
    },
    {
      studentId: samantha,
      testType: "SAT" as const,
      testDate: "2025-03-08",
      totalScore: 1280,
      mathScore: 630,
      readingScore: 650,
      targetScore: 1320,
    },
    {
      studentId: samantha,
      testType: "ACT" as const,
      testDate: "2025-04-12",
      totalScore: 28,
      mathScore: 29,
      readingScore: 27,
      writingScore: 28,
      targetScore: 30,
    },
  ];
  await db.insert(standardizedTests).values(testData);
  console.log(`  standardized_tests:   ${testData.length} rows`);

  // ── 8. Graduation Plans ───────────────────────────────────────────────────
  const gradPlanData = [
    // Grade 9 — expected ~7 credits
    {
      studentId: sofia,
      creditsEarned: "7.0",
      creditsRequired: "24.0",
      onTrack: true,
      planData: {
        categories: {
          english: { required: 4, earned: 1 },
          math: { required: 3, earned: 1 },
          science: { required: 3, earned: 1 },
          social_studies: { required: 3, earned: 1 },
          pe: { required: 1, earned: 0.5 },
          electives: { required: 6, earned: 1 },
          foreign_language: { required: 2, earned: 0 },
          arts: { required: 1, earned: 0.5 },
        },
        notes: "On track — expected pace for Grade 9",
      },
    },
    {
      studentId: tyler,
      creditsEarned: "5.5",
      creditsRequired: "24.0",
      onTrack: false,
      planData: {
        categories: {
          english: { required: 4, earned: 1 },
          math: { required: 3, earned: 0.5 },
          science: { required: 3, earned: 1 },
          social_studies: { required: 3, earned: 0.5 },
          pe: { required: 1, earned: 0.5 },
          electives: { required: 6, earned: 1 },
          foreign_language: { required: 2, earned: 0 },
          arts: { required: 1, earned: 0 },
        },
        notes:
          "Below expected credit pace — monitor closely. Math credit at risk.",
      },
    },
    {
      studentId: aisha,
      creditsEarned: "7.5",
      creditsRequired: "24.0",
      onTrack: true,
      planData: {
        categories: {
          english: { required: 4, earned: 1 },
          math: { required: 3, earned: 1 },
          science: { required: 3, earned: 1 },
          social_studies: { required: 3, earned: 1 },
          pe: { required: 1, earned: 0.5 },
          electives: { required: 6, earned: 1.5 },
          foreign_language: { required: 2, earned: 0.5 },
          arts: { required: 1, earned: 0 },
        },
        notes:
          "Above pace — candidate for honors track and early AP enrollment",
      },
    },
    {
      studentId: connor,
      creditsEarned: "4.0",
      creditsRequired: "24.0",
      onTrack: false,
      planData: {
        categories: {
          english: { required: 4, earned: 0.5 },
          math: { required: 3, earned: 0.5 },
          science: { required: 3, earned: 0.5 },
          social_studies: { required: 3, earned: 0.5 },
          pe: { required: 1, earned: 0.5 },
          electives: { required: 6, earned: 0.5 },
          foreign_language: { required: 2, earned: 0 },
          arts: { required: 1, earned: 0 },
        },
        notes:
          "CRITICALLY BEHIND — attendance intervention required immediately. Will not graduate on time without major change.",
      },
    },
    // Grade 10 — expected ~13 credits
    {
      studentId: emma,
      creditsEarned: "13.5",
      creditsRequired: "24.0",
      onTrack: true,
      planData: {
        categories: {
          english: { required: 4, earned: 2 },
          math: { required: 3, earned: 2 },
          science: { required: 3, earned: 1.5 },
          social_studies: { required: 3, earned: 2 },
          pe: { required: 1, earned: 1 },
          electives: { required: 6, earned: 3 },
          foreign_language: { required: 2, earned: 1 },
          arts: { required: 1, earned: 1 },
        },
        notes: "Well-rounded and on pace — improving trajectory",
      },
    },
    {
      studentId: ava,
      creditsEarned: "14.5",
      creditsRequired: "24.0",
      onTrack: true,
      planData: {
        categories: {
          english: { required: 4, earned: 2 },
          math: { required: 3, earned: 2 },
          science: { required: 3, earned: 2 },
          social_studies: { required: 3, earned: 2 },
          pe: { required: 1, earned: 1 },
          electives: { required: 6, earned: 3 },
          foreign_language: { required: 2, earned: 1.5 },
          arts: { required: 1, earned: 1 },
        },
        notes: "Above expected pace — strong trajectory",
      },
    },
    {
      studentId: jordan,
      creditsEarned: "12.0",
      creditsRequired: "24.0",
      onTrack: true,
      planData: {
        categories: {
          english: { required: 4, earned: 2 },
          math: { required: 3, earned: 1.5 },
          science: { required: 3, earned: 1.5 },
          social_studies: { required: 3, earned: 2 },
          pe: { required: 1, earned: 1 },
          electives: { required: 6, earned: 2.5 },
          foreign_language: { required: 2, earned: 1 },
          arts: { required: 1, earned: 0.5 },
        },
        notes: "On track but math credit gap — needs attention",
      },
    },
    {
      studentId: priya,
      creditsEarned: "15.0",
      creditsRequired: "24.0",
      onTrack: true,
      planData: {
        categories: {
          english: { required: 4, earned: 2 },
          math: { required: 3, earned: 2.5 },
          science: { required: 3, earned: 2 },
          social_studies: { required: 3, earned: 2 },
          pe: { required: 1, earned: 1 },
          electives: { required: 6, earned: 3 },
          foreign_language: { required: 2, earned: 1.5 },
          arts: { required: 1, earned: 1 },
        },
        notes: "Accelerated pace — explore dual enrollment or early AP access",
      },
    },
    // Grade 11 — expected ~18 credits
    {
      studentId: marcus,
      creditsEarned: "16.0",
      creditsRequired: "24.0",
      onTrack: false,
      planData: {
        categories: {
          english: { required: 4, earned: 2.5 },
          math: { required: 3, earned: 2 },
          science: { required: 3, earned: 2 },
          social_studies: { required: 3, earned: 2.5 },
          pe: { required: 1, earned: 1 },
          electives: { required: 6, earned: 4 },
          foreign_language: { required: 2, earned: 1 },
          arts: { required: 1, earned: 1 },
        },
        notes:
          "2 credits below expected pace — at risk of not graduating on time without intervention",
      },
    },
    {
      studentId: isabella,
      creditsEarned: "19.5",
      creditsRequired: "24.0",
      onTrack: true,
      planData: {
        categories: {
          english: { required: 4, earned: 3 },
          math: { required: 3, earned: 3 },
          science: { required: 3, earned: 2.5 },
          social_studies: { required: 3, earned: 3 },
          pe: { required: 1, earned: 1 },
          electives: { required: 6, earned: 5 },
          foreign_language: { required: 2, earned: 1 },
          arts: { required: 1, earned: 1 },
        },
        notes:
          "On track — 4.5 credits needed senior year. College-ready trajectory.",
      },
    },
    {
      studentId: devon,
      creditsEarned: "18.0",
      creditsRequired: "24.0",
      onTrack: true,
      planData: {
        categories: {
          english: { required: 4, earned: 3 },
          math: { required: 3, earned: 2 },
          science: { required: 3, earned: 2 },
          social_studies: { required: 3, earned: 2.5 },
          pe: { required: 1, earned: 1 },
          electives: { required: 6, earned: 5 },
          foreign_language: { required: 2, earned: 1.5 },
          arts: { required: 1, earned: 1 },
        },
        notes: "On track — needs 1 more math credit in senior year",
      },
    },
    {
      studentId: zoe,
      creditsEarned: "21.0",
      creditsRequired: "24.0",
      onTrack: true,
      planData: {
        categories: {
          english: { required: 4, earned: 3.5 },
          math: { required: 3, earned: 3 },
          science: { required: 3, earned: 3 },
          social_studies: { required: 3, earned: 3 },
          pe: { required: 1, earned: 1 },
          electives: { required: 6, earned: 5.5 },
          foreign_language: { required: 2, earned: 2 },
          arts: { required: 1, earned: 0 },
        },
        notes:
          "Well ahead of pace — could graduate early. Missing arts credit — plan for senior year.",
      },
    },
    // Grade 12 — expected ~22-24 credits
    {
      studentId: james,
      creditsEarned: "23.0",
      creditsRequired: "24.0",
      onTrack: true,
      planData: {
        categories: {
          english: { required: 4, earned: 4 },
          math: { required: 3, earned: 3 },
          science: { required: 3, earned: 3 },
          social_studies: { required: 3, earned: 3 },
          pe: { required: 1, earned: 1 },
          electives: { required: 6, earned: 6 },
          foreign_language: { required: 2, earned: 2 },
          arts: { required: 1, earned: 1 },
        },
        notes:
          "1 credit remaining — on track for June 2026 graduation. College destination confirmed.",
      },
    },
    {
      studentId: olivia,
      creditsEarned: "22.5",
      creditsRequired: "24.0",
      onTrack: true,
      planData: {
        categories: {
          english: { required: 4, earned: 4 },
          math: { required: 3, earned: 3 },
          science: { required: 3, earned: 2.5 },
          social_studies: { required: 3, earned: 3 },
          pe: { required: 1, earned: 1 },
          electives: { required: 6, earned: 6 },
          foreign_language: { required: 2, earned: 2 },
          arts: { required: 1, earned: 1 },
        },
        notes: "On track — completing final science credit this semester",
      },
    },
    {
      studentId: brandon,
      creditsEarned: "19.0",
      creditsRequired: "24.0",
      onTrack: false,
      planData: {
        categories: {
          english: { required: 4, earned: 3 },
          math: { required: 3, earned: 2 },
          science: { required: 3, earned: 2.5 },
          social_studies: { required: 3, earned: 2.5 },
          pe: { required: 1, earned: 1 },
          electives: { required: 6, earned: 5 },
          foreign_language: { required: 2, earned: 1.5 },
          arts: { required: 1, earned: 1.5 },
        },
        notes:
          "CRITICAL: Needs 5 credits in final semester. Must take additional courses or attend summer school. Graduation at risk.",
      },
    },
    {
      studentId: samantha,
      creditsEarned: "22.0",
      creditsRequired: "24.0",
      onTrack: true,
      planData: {
        categories: {
          english: { required: 4, earned: 4 },
          math: { required: 3, earned: 3 },
          science: { required: 3, earned: 2.5 },
          social_studies: { required: 3, earned: 3 },
          pe: { required: 1, earned: 1 },
          electives: { required: 6, earned: 5.5 },
          foreign_language: { required: 2, earned: 2 },
          arts: { required: 1, earned: 1 },
        },
        notes:
          "2 credits needed — completing this semester. On track for June graduation.",
      },
    },
  ];
  await db
    .insert(graduationPlans)
    .values(
      gradPlanData as Parameters<typeof db.insert>["0"] extends never
        ? never
        : any[],
    );
  console.log(`  graduation_plans:     ${gradPlanData.length} rows`);

  // ── 9. College Prep Plans ─────────────────────────────────────────────────
  const collegePrepData = [
    // Grade 11 — early planning stage
    {
      studentId: marcus,
      targetSchools: [
        { name: "State Community College", type: "safety", applied: false },
        { name: "City University", type: "safety", applied: false },
      ],
      applicationDeadline: "2026-02-01",
      essayStatus: "not_started",
      recommendationStatus: "not_started",
      notes:
        "Needs to stabilize grades before applications. Community college pathway recommended given current trajectory.",
    },
    {
      studentId: isabella,
      targetSchools: [
        { name: "State University", type: "safety", applied: false },
        { name: "University of Michigan", type: "target", applied: false },
        { name: "UCLA", type: "target", applied: false },
        { name: "Georgetown University", type: "reach", applied: false },
      ],
      applicationDeadline: "2026-11-01",
      essayStatus: "brainstorming",
      recommendationStatus: "in_progress",
      notes:
        "Strong candidate — encourage early action applications. GPA and AP scores support reach schools.",
    },
    {
      studentId: devon,
      targetSchools: [
        { name: "Local State University", type: "safety", applied: false },
        { name: "State University", type: "target", applied: false },
        { name: "University of Colorado", type: "target", applied: false },
      ],
      applicationDeadline: "2026-01-01",
      essayStatus: "not_started",
      recommendationStatus: "not_requested",
      notes:
        "Needs to begin college prep process — schedule counselor meeting to discuss goals.",
    },
    {
      studentId: zoe,
      targetSchools: [
        { name: "University of Michigan", type: "safety", applied: false },
        { name: "Carnegie Mellon University", type: "target", applied: false },
        { name: "MIT", type: "reach", applied: false },
        { name: "Caltech", type: "reach", applied: false },
        { name: "Stanford University", type: "reach", applied: false },
      ],
      applicationDeadline: "2026-11-01",
      essayStatus: "drafting",
      recommendationStatus: "secured",
      notes:
        "Exceptional STEM candidate — SAT 1430, targeting 1500+. Strong AP performance expected. Recommendation letters secured from AP teachers.",
    },
    // Grade 12 — active applications / decisions
    {
      studentId: james,
      targetSchools: [
        {
          name: "UCLA",
          type: "safety",
          applied: true,
          status: "accepted",
          scholarship: "$12,000/year",
        },
        {
          name: "MIT",
          type: "target",
          applied: true,
          status: "accepted",
          scholarship: "Full financial aid",
        },
        {
          name: "Stanford University",
          type: "reach",
          applied: true,
          status: "accepted",
          scholarship: "Full scholarship",
        },
        {
          name: "Harvard University",
          type: "reach",
          applied: true,
          status: "waitlisted",
        },
        {
          name: "Princeton University",
          type: "reach",
          applied: true,
          status: "pending",
        },
      ],
      applicationDeadline: "2025-11-01",
      essayStatus: "submitted",
      recommendationStatus: "submitted",
      notes:
        "National Merit Finalist. Accepted to MIT and Stanford with full funding — deciding between them by May 1. Harvard waitlisted. Congratulations!",
    },
    {
      studentId: olivia,
      targetSchools: [
        {
          name: "University of Washington",
          type: "safety",
          applied: true,
          status: "accepted",
        },
        {
          name: "Boston University",
          type: "target",
          applied: true,
          status: "accepted",
          scholarship: "$8,000/year",
        },
        { name: "NYU", type: "target", applied: true, status: "pending" },
        {
          name: "Northwestern University",
          type: "reach",
          applied: true,
          status: "rejected",
        },
      ],
      applicationDeadline: "2026-01-01",
      essayStatus: "submitted",
      recommendationStatus: "submitted",
      notes:
        "Accepted to 2 schools — awaiting NYU decision. Northwestern rejected. BU is strong option with merit aid.",
    },
    {
      studentId: brandon,
      targetSchools: [
        {
          name: "Community College",
          type: "safety",
          applied: true,
          status: "accepted",
        },
        { name: "State University", type: "target", applied: false },
      ],
      applicationDeadline: "2026-03-01",
      essayStatus: "not_started",
      recommendationStatus: "not_requested",
      notes:
        "URGENT: Academic situation must be resolved before applications. Community college pathway recommended. Credit recovery needed to graduate on time.",
    },
    {
      studentId: samantha,
      targetSchools: [
        {
          name: "State University",
          type: "safety",
          applied: true,
          status: "accepted",
        },
        {
          name: "University of Arizona",
          type: "target",
          applied: true,
          status: "accepted",
          scholarship: "$5,000/year",
        },
        {
          name: "University of Southern California",
          type: "reach",
          applied: true,
          status: "pending",
        },
      ],
      applicationDeadline: "2026-01-15",
      essayStatus: "submitted",
      recommendationStatus: "submitted",
      notes:
        "Accepted to 2 schools — awaiting USC decision. Strong candidate — U of A merit award confirmed.",
    },
  ];
  await db.insert(collegePrepPlans).values(collegePrepData as any[]);
  console.log(`  college_prep_plans:   ${collegePrepData.length} rows`);

  // ── 10. AI Insights ───────────────────────────────────────────────────────
  const insightsData = [
    // ── AT_RISK ──
    {
      studentId: connor,
      insightType: "at_risk" as const,
      isCurrent: true,
      content: {
        severity: "critical",
        summary: "Chronic absenteeism — attendance rate 42% this semester",
        details:
          "Connor has missed 13 of 22 recorded class sessions across Algebra II and Biology. Current grades: F in Algebra II (52%), F in Biology (49%). Zero parent contact on record for unexcused absences. Immediate intervention required.",
        triggers: [
          "attendance_below_50_pct",
          "two_failing_grades",
          "no_parent_contact_response",
        ],
        recommendedActions: [
          "Schedule parent/guardian conference this week",
          "Refer to student support services team",
          "Evaluate for attendance intervention contract",
          "Consider referral to social services",
          "Assess need for credit recovery plan",
        ],
        generatedDate: "2025-11-12",
      },
    },
    {
      studentId: marcus,
      insightType: "at_risk" as const,
      isCurrent: true,
      content: {
        severity: "high",
        summary:
          "Declining attendance and academic performance since mid-October",
        details:
          "Marcus started the semester on track but attendance has dropped to 58% since October. Quarter grades show significant decline: English Lit (63% D), U.S. History (61% D), AP English (60% D). At risk of failing AP English and potentially not meeting graduation credit requirements.",
        triggers: [
          "grade_decline_over_30_days",
          "attendance_below_65_pct",
          "ap_course_failure_risk",
          "graduation_credit_gap",
        ],
        recommendedActions: [
          "Immediate counselor check-in to identify root cause",
          "Consider dropping AP English to standard English",
          "Connect with tutoring resources for English and History",
          "Parent contact — discuss home situation",
          "Monitor weekly for next 6 weeks",
        ],
        generatedDate: "2025-11-14",
      },
    },
    {
      studentId: tyler,
      insightType: "at_risk" as const,
      isCurrent: true,
      content: {
        severity: "watch",
        summary:
          "Below-average grades with downward trend — Grade 9 early warning",
        details:
          "Tyler's Algebra II scores have declined from 74% to 65% over the quarter. Biology follows a similar pattern. Irregular attendance with tardies correlates with missed instruction. Not yet failing but trajectory is concerning for a 9th grader.",
        triggers: [
          "grade_decline_across_quarter",
          "attendance_irregular_pattern",
        ],
        recommendedActions: [
          "Teacher check-in this week",
          "Refer to after-school tutoring program",
          "Monitor attendance pattern for next 4 weeks",
          "Consider learning support assessment",
        ],
        generatedDate: "2025-11-15",
      },
    },
    {
      studentId: brandon,
      insightType: "at_risk" as const,
      isCurrent: true,
      content: {
        severity: "critical",
        summary: "Off-track for graduation — needs 5 credits in final semester",
        details:
          "Brandon has only 19 of the required 24 credits with one semester remaining. Current AP English performance (55%) risks no credit for this course. SAT scores (1020) are significantly below stated targets. Without immediate intervention, Brandon will not graduate on time in June 2026.",
        triggers: [
          "graduation_off_track",
          "senior_credit_deficit_5plus",
          "course_failure_risk",
          "standardized_test_below_target",
        ],
        recommendedActions: [
          "Emergency counseling session — graduation plan review immediately",
          "Enroll in credit recovery program",
          "Explore summer school options",
          "Notify parents/guardians of graduation risk",
          "Review AP English options — drop to standard or intensive tutoring",
        ],
        generatedDate: "2025-11-20",
      },
    },

    // ── INTERVENTION ──
    {
      studentId: marcus,
      insightType: "intervention" as const,
      isCurrent: true,
      content: {
        type: "academic_and_attendance",
        summary: "Multi-pronged intervention plan initiated — Marcus Williams",
        interventionSteps: [
          {
            step: "Counselor meeting",
            date: "2025-11-18",
            status: "completed",
          },
          {
            step: "Parent contact made",
            date: "2025-11-19",
            status: "completed",
          },
          {
            step: "AP English course review",
            date: "2025-11-25",
            status: "pending",
          },
          { step: "Tutoring referral", date: "2025-11-25", status: "pending" },
          {
            step: "Social worker referral",
            date: "2025-11-20",
            status: "completed",
          },
          {
            step: "Follow-up meeting",
            date: "2025-12-05",
            status: "scheduled",
          },
        ],
        counselorNotes:
          "Marcus disclosed stress at home — father recently lost job, family experiencing financial hardship. Referred to school social worker. Exploring financial aid and free tutoring resources. Father expressed willingness to engage. Optimistic about improvement with support.",
        generatedDate: "2025-11-19",
      },
    },
    {
      studentId: tyler,
      insightType: "intervention" as const,
      isCurrent: true,
      content: {
        type: "academic_support",
        summary: "Early academic intervention — Tyler Rodriguez (Grade 9)",
        interventionSteps: [
          {
            step: "Teacher conference",
            date: "2025-11-22",
            status: "scheduled",
          },
          {
            step: "Study skills workshop referral",
            date: "2025-11-29",
            status: "pending",
          },
          {
            step: "Peer tutoring match",
            date: "2025-12-01",
            status: "pending",
          },
        ],
        counselorNotes:
          "First-generation college student. Strong motivation but struggling with high school workload transition. Bus delays contribute to tardies — exploring transportation solutions.",
        generatedDate: "2025-11-20",
      },
    },

    // ── ROADMAP ──
    {
      studentId: james,
      insightType: "roadmap" as const,
      isCurrent: true,
      content: {
        summary: "James Chen — Senior Year College Decision Roadmap",
        collegeOutcomes: {
          applied: 5,
          accepted: 3,
          waitlisted: 1,
          pending: 1,
          topChoices: ["MIT (Full Aid)", "Stanford (Full Scholarship)"],
          decidingBy: "2026-05-01",
        },
        keyMilestones: [
          {
            milestone: "Submit applications",
            date: "2025-11-01",
            status: "completed",
          },
          {
            milestone: "National Merit Finalist notified",
            date: "2026-02-15",
            status: "completed",
          },
          {
            milestone: "MIT EA acceptance",
            date: "2026-01-10",
            status: "completed",
            outcome: "Accepted — Full financial aid",
          },
          {
            milestone: "Stanford acceptance",
            date: "2026-04-01",
            status: "completed",
            outcome: "Accepted — Full scholarship",
          },
          {
            milestone: "Final college decision",
            date: "2026-05-01",
            status: "pending",
          },
          { milestone: "Graduation", date: "2026-06-12", status: "on_track" },
        ],
        recommendations: [
          "Compare MIT vs Stanford financial aid packages in detail",
          "Schedule campus visits at both schools before May 1",
          "Maintain senior spring GPA — colleges monitor final grades",
        ],
        generatedDate: "2025-11-21",
      },
    },
    {
      studentId: zoe,
      insightType: "roadmap" as const,
      isCurrent: true,
      content: {
        summary: "Zoe Kim — Junior Year STEM College Prep Roadmap",
        currentStatus: "Exceptional trajectory — targeting top STEM programs",
        upcomingMilestones: [
          {
            milestone: "SAT retake (target 1500+)",
            date: "2026-03-14",
            status: "registered",
          },
          {
            milestone: "AP Calculus AB exam",
            date: "2026-05-08",
            status: "upcoming",
          },
          {
            milestone: "AP English Language exam",
            date: "2026-05-12",
            status: "upcoming",
          },
          {
            milestone: "Summer STEM research application",
            date: "2026-01-15",
            status: "submitted",
          },
          {
            milestone: "Begin college essays",
            date: "2026-06-01",
            status: "upcoming",
          },
        ],
        recommendations: [
          "Target SAT score of 1520+ to strengthen MIT/Caltech applications",
          "Apply to MIT PRIMES or Stanford SUMAC summer research programs",
          "Request AP teacher recommendation letters now (best before end of semester)",
          "Explore Science Olympiad or math competition for extracurricular depth",
          "Start essay brainstorming — STEM narrative aligned with research interests",
        ],
        projectedGPA: 4.1,
        generatedDate: "2025-11-21",
      },
    },
    {
      studentId: aisha,
      insightType: "roadmap" as const,
      isCurrent: true,
      content: {
        summary: "Aisha Patel — Freshman Excellence & Acceleration Roadmap",
        currentStatus:
          "Top performer in Grade 9 — accelerated track recommended",
        highlights: [
          "96% average in Algebra II (A)",
          "96% average in Biology (A)",
          "Perfect attendance this semester",
        ],
        recommendations: [
          "Enroll in Honors English and Honors Chemistry for sophomore year",
          "Join STEM club, debate team, or academic decathlon",
          "Plan for 2–3 AP courses in junior year",
          "Consider dual enrollment at community college in Grade 11",
          "Begin building extracurricular profile with focus on leadership",
        ],
        projectedGPA: 3.95,
        expectedGraduationYear: 2029,
        generatedDate: "2025-11-22",
      },
    },

    // ── TREND (school-wide, no specific student) ──
    {
      studentId: null,
      insightType: "trend" as const,
      isCurrent: true,
      content: {
        summary: "Fall 2025 Attendance Trend — School-Wide Analysis",
        overallAttendanceRate: 82,
        gradeBreakdown: {
          grade9: {
            rate: 75,
            studentsAtRisk: 2,
            flagged: [
              "Connor Murphy (42% — critical)",
              "Tyler Rodriguez (75% — watch)",
            ],
          },
          grade10: { rate: 93, studentsAtRisk: 0 },
          grade11: {
            rate: 79,
            studentsAtRisk: 1,
            flagged: ["Marcus Williams (58% — high risk)"],
          },
          grade12: {
            rate: 85,
            studentsAtRisk: 1,
            flagged: ["Brandon Lee (60% — declining)"],
          },
        },
        concerns: [
          "Grade 9 chronic absenteeism above district threshold",
          "3 tardies linked to bus route delays — transportation issue",
        ],
        recommendations: [
          "Launch Grade 9 attendance awareness initiative",
          "Coordinate with transportation dept on bus delay patterns",
          "Lower early-warning threshold to 75% for automatic counselor alert",
          "Recognize zero-absence students at end of semester",
        ],
        generatedDate: "2025-11-17",
      },
    },
    {
      studentId: null,
      insightType: "trend" as const,
      isCurrent: true,
      content: {
        summary: "AP Course Performance Trend — Fall 2025",
        apCourses: [
          {
            course: "AP Calculus AB",
            avgScore: 91.8,
            passingRate: 100,
            topPerformer: "James Chen (99%)",
            note: "Exceptional cohort performance",
          },
          {
            course: "AP English Language & Comp",
            avgScore: 79.5,
            passingRate: 83,
            topPerformer: "James Chen (98%)",
            flagged: "Brandon Lee at risk of failing (55%)",
          },
        ],
        observations: [
          "AP Calculus showing strongest cohort in 3 years — all students scoring 84%+",
          "AP English has wider performance gap — Zoe Kim and James Chen excelling, Brandon Lee at risk",
          "Marcus Williams declining in AP English — consider course change",
        ],
        recommendations: [
          "Offer AP study skills workshop for students scoring below 80%",
          "Brandon Lee needs immediate academic support or course reassignment",
          "Consider adding AP Calculus prep session for next cohort",
        ],
        generatedDate: "2025-11-18",
      },
    },
    {
      studentId: null,
      insightType: "trend" as const,
      isCurrent: true,
      content: {
        summary: "Class of 2026 College Application Status — December Update",
        totalSeniors: 4,
        applicationStats: {
          submitted: 3,
          decided: 2,
          pending: 1,
          needsUrgentSupport: 1,
          totalAcceptances: 5,
          totalScholarshipValue: "$25,000+ annually",
        },
        highlights: [
          "James Chen: MIT + Stanford (full funding) — National Merit Finalist",
          "Olivia Davis: 2 acceptances, awaiting NYU — strong trajectory",
          "Samantha Torres: 2 acceptances, awaiting USC — U of A merit award",
        ],
        concerns: [
          "Brandon Lee: 1 acceptance (community college only), graduation at risk — immediate counselor escalation needed",
        ],
        nextSteps: [
          "Schedule college decision counseling for James (MIT vs Stanford)",
          "Follow up with Olivia on NYU decision timeline",
          "Brandon Lee intervention — graduation and application crisis meeting",
        ],
        generatedDate: "2025-11-25",
      },
    },
  ];

  await db.insert(aiInsights).values(insightsData as any[]);
  console.log(`  ai_insights:          ${insightsData.length} rows`);

  const totals = {
    students: studentRows.length,
    classes: classRows.length,
    enrollments: enrollmentData.length,
    attendance: attendanceData.length,
    grades: gradesData.length,
    tests: testData.length,
    gradPlans: gradPlanData.length,
    collegePlans: collegePrepData.length,
    insights: insightsData.length,
  };

  console.log(`
Demo seed complete!
  ${totals.students} students  |  ${totals.classes} classes  |  ${totals.enrollments} enrollments
  ${totals.attendance} attendance records  |  ${totals.grades} grades  |  ${totals.tests} test scores
  ${totals.gradPlans} graduation plans  |  ${totals.collegePlans} college prep plans  |  ${totals.insights} AI insights
`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

process.on("exit", (code) => {
  if (code === 0) process.exit(0);
});
