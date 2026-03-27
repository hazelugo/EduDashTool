// Student list and profile query functions
// Full implementations to be added during plan execution

export type StudentRow = {
  id: string;
  firstName: string;
  lastName: string;
  gradeLevel: number;
  counselorName: string | null;
  isAtRisk: boolean;
};

export type StudentDetail = {
  id: string;
  firstName: string;
  lastName: string;
  gradeLevel: number;
  counselorName: string | null;
  enrolledAt: string | null;
  isAtRisk: boolean;
};

export type GradeEntry = {
  id: string;
  gradeType: "midterm" | "final" | "quarter" | "assignment";
  score: number | null;
  letterGrade: string | null;
  gradedAt: string | null;
};

export type ClassWithGrades = {
  classId: string;
  courseName: string;
  courseCode: string;
  semester: string;
  schoolYear: string;
  grades: GradeEntry[];
};

export type StudentAttendanceStats = {
  present: number;
  absent: number;
  tardy: number;
  excused: number;
  rate: number | null;
  trend: { week: string; rate: number }[];
};

export type TestScore = {
  id: string;
  testType: "SAT" | "PSAT" | "ACT" | "AP" | "other";
  testDate: string | null;
  totalScore: number | null;
  mathScore: number | null;
  readingScore: number | null;
  writingScore: number | null;
  targetScore: number | null;
};

export type GraduationPlanData = {
  creditsEarned: number;
  creditsRequired: number;
  onTrack: boolean;
  planData: Record<string, unknown> | null;
} | null;

export type CollegePrepData = {
  targetSchools: unknown[];
  applicationDeadline: string | null;
  essayStatus: string | null;
  recommendationStatus: string | null;
  notes: string | null;
} | null;

export type GetStudentListParams = {
  search?: string;
  grade?: number;
  atRisk?: boolean;
  viewerId: string;
  viewerRole: "principal" | "counselor" | "teacher";
};

// Implementations to be added in plan execution
export async function getStudentList(_params: GetStudentListParams): Promise<StudentRow[]> {
  throw new Error("Not implemented");
}

export async function getStudentById(_studentId: string): Promise<StudentDetail | null> {
  throw new Error("Not implemented");
}

export async function getStudentGradesByClass(_studentId: string): Promise<ClassWithGrades[]> {
  throw new Error("Not implemented");
}

export async function getStudentAttendance(_studentId: string): Promise<StudentAttendanceStats> {
  throw new Error("Not implemented");
}

export async function getStudentTests(_studentId: string): Promise<TestScore[]> {
  throw new Error("Not implemented");
}

export async function getStudentGraduationPlan(_studentId: string): Promise<GraduationPlanData> {
  throw new Error("Not implemented");
}

export async function getStudentCollegePrepPlan(_studentId: string): Promise<CollegePrepData> {
  throw new Error("Not implemented");
}

export async function canTeacherViewStudent(teacherId: string, studentId: string): Promise<boolean> {
  throw new Error("Not implemented");
}
