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
// Get these from: Supabase Dashboard → Authentication → Users → copy UUID column
const TEACHER_UUID = "11111111-1111-1111-1111-111111111111";
const COUNSELOR_UUID = "22222222-2222-2222-2222-222222222222";
const PRINCIPAL_UUID = "33333333-3333-3333-3333-333333333333";

async function seed() {
  console.log("Seeding test data...");

  // ── 1. staff_profiles ──────────────────────────────────────────────────────
  // IDs MUST match real auth.users.id values (see setup instructions above)
  await db
    .insert(staffProfiles)
    .values([
      {
        id: TEACHER_UUID,
        email: "teacher@edudash.test",
        fullName: "Alex Teacher",
        role: "teacher",
      },
      {
        id: COUNSELOR_UUID,
        email: "counselor@edudash.test",
        fullName: "Jordan Counselor",
        role: "counselor",
      },
      {
        id: PRINCIPAL_UUID,
        email: "principal@edudash.test",
        fullName: "Sam Principal",
        role: "principal",
      },
    ])
    .onConflictDoNothing();

  console.log("  staff_profiles: 3 rows");

  // ── 2. students ────────────────────────────────────────────────────────────
  const insertedStudents = await db
    .insert(students)
    .values([
      {
        firstName: "Emma",
        lastName: "Johnson",
        gradeLevel: 10,
        counselorId: COUNSELOR_UUID,
        isActive: true,
      },
      {
        firstName: "Marcus",
        lastName: "Williams",
        gradeLevel: 11,
        counselorId: COUNSELOR_UUID,
        isActive: true,
      },
      {
        firstName: "Sofia",
        lastName: "Garcia",
        gradeLevel: 9,
        counselorId: COUNSELOR_UUID,
        isActive: true,
      },
      {
        firstName: "James",
        lastName: "Chen",
        gradeLevel: 12,
        counselorId: COUNSELOR_UUID,
        isActive: true,
      },
      {
        firstName: "Ava",
        lastName: "Brown",
        gradeLevel: 10,
        counselorId: COUNSELOR_UUID,
        isActive: true,
      },
    ])
    .onConflictDoNothing()
    .returning({ id: students.id });

  // If records already exist (re-run), fetch them
  let [student1, student2, student3, student4, student5] = insertedStudents;

  console.log("  students: 5 rows");

  // ── 3. classes ─────────────────────────────────────────────────────────────
  const insertedClasses = await db
    .insert(classes)
    .values([
      {
        courseName: "Algebra II",
        courseCode: "MATH201",
        teacherId: TEACHER_UUID,
        semester: "fall",
        schoolYear: "2024-2025",
      },
      {
        courseName: "English Literature",
        courseCode: "ENG301",
        teacherId: TEACHER_UUID,
        semester: "fall",
        schoolYear: "2024-2025",
      },
    ])
    .onConflictDoNothing()
    .returning({ id: classes.id });

  const [class1, class2] = insertedClasses;

  console.log("  classes: 2 rows");

  // Only proceed with FK-dependent inserts if we have valid IDs
  if (!student1?.id || !student2?.id || !class1?.id) {
    console.log(
      "  Skipping FK-dependent rows (records already exist from previous seed run)"
    );
    console.log("Seed complete.");
    return;
  }

  // ── 4. enrollments ─────────────────────────────────────────────────────────
  // Students 1, 2, 3 in class1; students 1, 4 in class2
  await db
    .insert(enrollments)
    .values([
      { studentId: student1.id, classId: class1.id },
      { studentId: student2.id, classId: class1.id },
      { studentId: student3.id, classId: class1.id },
      { studentId: student1.id, classId: class2.id },
      { studentId: student4.id, classId: class2.id },
    ])
    .onConflictDoNothing();

  console.log("  enrollments: 5 rows");

  // ── 5. attendance_records ──────────────────────────────────────────────────
  // 2 records for student 1
  await db
    .insert(attendanceRecords)
    .values([
      {
        studentId: student1.id,
        classId: class1.id,
        date: "2024-09-05",
        status: "present",
        recordedBy: TEACHER_UUID,
      },
      {
        studentId: student1.id,
        classId: class1.id,
        date: "2024-09-10",
        status: "absent",
        notes: "Parent called in sick",
        recordedBy: TEACHER_UUID,
      },
    ])
    .onConflictDoNothing();

  console.log("  attendance_records: 2 rows");

  // ── 6. grades ──────────────────────────────────────────────────────────────
  // 2 grade entries for student 1 in class1
  await db
    .insert(grades)
    .values([
      {
        studentId: student1.id,
        classId: class1.id,
        gradeType: "midterm",
        score: "88.00",
        letterGrade: "B+",
        gradedAt: "2024-10-15",
      },
      {
        studentId: student1.id,
        classId: class1.id,
        gradeType: "quarter",
        score: "92.00",
        letterGrade: "A-",
        gradedAt: "2024-11-01",
      },
    ])
    .onConflictDoNothing();

  console.log("  grades: 2 rows");

  // ── 7. standardized_tests ──────────────────────────────────────────────────
  // 1 SAT entry for student 4
  await db
    .insert(standardizedTests)
    .values([
      {
        studentId: student4.id,
        testType: "SAT",
        totalScore: 1240,
        mathScore: 630,
        readingScore: 610,
        testDate: "2024-03-09",
      },
    ])
    .onConflictDoNothing();

  console.log("  standardized_tests: 1 row");

  // ── 8. graduation_plans ────────────────────────────────────────────────────
  // 1 entry for student 4
  await db
    .insert(graduationPlans)
    .values([
      {
        studentId: student4.id,
        creditsEarned: "18.0",
        creditsRequired: "24.0",
        onTrack: true,
      },
    ])
    .onConflictDoNothing();

  console.log("  graduation_plans: 1 row");

  // ── 9. college_prep_plans ──────────────────────────────────────────────────
  // 1 entry for student 4
  await db
    .insert(collegePrepPlans)
    .values([
      {
        studentId: student4.id,
        targetSchools: [
          { name: "State University", type: "safety" },
          { name: "Tech College", type: "target" },
        ],
      },
    ])
    .onConflictDoNothing();

  console.log("  college_prep_plans: 1 row");

  // ── 10. ai_insights ────────────────────────────────────────────────────────
  // 1 at_risk entry for student 2
  await db
    .insert(aiInsights)
    .values([
      {
        studentId: student2.id,
        insightType: "at_risk",
        isCurrent: true,
        content: {
          severity: "watch",
          summary: "Attendance below threshold",
        },
      },
    ])
    .onConflictDoNothing();

  console.log("  ai_insights: 1 row");

  console.log("Seed complete.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

process.on("exit", (code) => {
  if (code === 0) process.exit(0);
});
