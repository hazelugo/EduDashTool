import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  smallint,
  integer,
  numeric,
  date,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const staffRoleEnum = pgEnum("staff_role", [
  "teacher",
  "counselor",
  "principal",
]);

export const attendanceStatusEnum = pgEnum("attendance_status", [
  "present",
  "absent",
  "tardy",
  "excused",
]);

export const gradeTypeEnum = pgEnum("grade_type", [
  "midterm",
  "final",
  "quarter",
  "assignment",
]);

export const testTypeEnum = pgEnum("test_type", [
  "SAT",
  "PSAT",
  "ACT",
  "AP",
  "other",
]);

export const semesterEnum = pgEnum("semester", [
  "fall",
  "spring",
  "full_year",
]);

export const insightTypeEnum = pgEnum("insight_type", [
  "at_risk",
  "intervention",
  "roadmap",
  "trend",
]);

// ─── Table 1: staff_profiles ─────────────────────────────────────────────────
// id has NO .defaultRandom() — must be set to match auth.users.id

export const staffProfiles = pgTable("staff_profiles", {
  id: uuid("id").primaryKey(), // matches auth.users.id — NO defaultRandom()
  email: text("email").notNull(),
  fullName: text("full_name"),
  role: staffRoleEnum("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ─── Table 2: students ───────────────────────────────────────────────────────

export const students = pgTable(
  "students",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    gradeLevel: smallint("grade_level").notNull(), // 9, 10, 11, or 12
    counselorId: uuid("counselor_id").references(() => staffProfiles.id),
    isActive: boolean("is_active").notNull().default(true),
    enrolledAt: date("enrolled_at"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("students_grade_level_idx").on(t.gradeLevel),
    index("students_counselor_id_idx").on(t.counselorId),
    index("students_is_active_idx").on(t.isActive),
  ]
);

// ─── Table 3: classes ────────────────────────────────────────────────────────

export const classes = pgTable(
  "classes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseName: text("course_name").notNull(),
    courseCode: text("course_code"),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => staffProfiles.id),
    semester: semesterEnum("semester").notNull(),
    schoolYear: text("school_year").notNull(), // e.g., "2024-2025"
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("classes_teacher_id_idx").on(t.teacherId)]
);

// ─── Table 4: enrollments ────────────────────────────────────────────────────

export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    enrolledAt: timestamp("enrolled_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("enrollments_student_class_unique").on(t.studentId, t.classId),
    index("enrollments_student_id_idx").on(t.studentId),
    index("enrollments_class_id_idx").on(t.classId),
  ]
);

// ─── Table 5: attendance_records ─────────────────────────────────────────────

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    classId: uuid("class_id").references(() => classes.id), // nullable — school-wide attendance
    date: date("date").notNull(),
    status: attendanceStatusEnum("status").notNull(),
    notes: text("notes"),
    recordedBy: uuid("recorded_by").references(() => staffProfiles.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("attendance_records_student_date_idx").on(t.studentId, t.date)]
);

// ─── Table 6: grades ─────────────────────────────────────────────────────────

export const grades = pgTable(
  "grades",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    gradeType: gradeTypeEnum("grade_type").notNull(),
    score: numeric("score", { precision: 5, scale: 2 }), // 0.00–100.00
    letterGrade: text("letter_grade"),
    notes: text("notes"),
    gradedAt: date("graded_at"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("grades_student_id_idx").on(t.studentId),
    index("grades_student_class_idx").on(t.studentId, t.classId),
  ]
);

// ─── Table 7: standardized_tests ─────────────────────────────────────────────

export const standardizedTests = pgTable(
  "standardized_tests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    testType: testTypeEnum("test_type").notNull(),
    testDate: date("test_date"),
    totalScore: integer("total_score"),
    mathScore: integer("math_score"),
    readingScore: integer("reading_score"),
    writingScore: integer("writing_score"),
    targetScore: integer("target_score"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("standardized_tests_student_id_idx").on(t.studentId)]
);

// ─── Table 8: graduation_plans ───────────────────────────────────────────────
// 1:1 with student — uniqueIndex enforces one plan per student

export const graduationPlans = pgTable(
  "graduation_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    creditsEarned: numeric("credits_earned", { precision: 4, scale: 1 }).default(
      "0"
    ),
    creditsRequired: numeric("credits_required", {
      precision: 4,
      scale: 1,
    }).default("24"),
    onTrack: boolean("on_track").default(true),
    planData: jsonb("plan_data"), // flexible credit category breakdown
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("graduation_plans_student_id_unique").on(t.studentId),
  ]
);

// ─── Table 9: college_prep_plans ─────────────────────────────────────────────
// 1:1 with student — uniqueIndex enforces one plan per student

export const collegePrepPlans = pgTable(
  "college_prep_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    targetSchools: jsonb("target_schools"), // array of school objects
    applicationDeadline: date("application_deadline"),
    essayStatus: text("essay_status"),
    recommendationStatus: text("recommendation_status"),
    notes: text("notes"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("college_prep_plans_student_id_unique").on(t.studentId),
  ]
);

// ─── Table 10: ai_insights ───────────────────────────────────────────────────

export const aiInsights = pgTable(
  "ai_insights",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id").references(() => students.id, {
      onDelete: "cascade",
    }), // nullable for trend insights
    insightType: insightTypeEnum("insight_type").notNull(),
    content: jsonb("content").notNull(), // structured Gemini AI output
    isCurrent: boolean("is_current").notNull().default(true),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("ai_insights_student_current_idx").on(t.studentId, t.isCurrent),
  ]
);
