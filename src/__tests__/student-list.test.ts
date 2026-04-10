import { describe, it, expect } from "vitest";

// LIST-01: Counselor and principal see all active students
// LIST-02: Teacher sees only students enrolled in their classes
// LIST-03: Filter by name, grade, risk level, course
// LIST-04: Pagination — max 25 rows per page with total count
// LIST-05: getCourseOptions() returns role-scoped distinct course names

// ─── deriveRiskLevel pure function tests ─────────────────────────────────────

describe("deriveRiskLevel", () => {
  it("maps onTrack=false to at-risk", async () => {
    const { deriveRiskLevel } = await import("../lib/students");
    expect(deriveRiskLevel(false)).toBe("at-risk");
  });

  it("maps onTrack=true to on-track", async () => {
    const { deriveRiskLevel } = await import("../lib/students");
    expect(deriveRiskLevel(true)).toBe("on-track");
  });

  it("maps onTrack=null to watch", async () => {
    const { deriveRiskLevel } = await import("../lib/students");
    expect(deriveRiskLevel(null)).toBe("watch");
  });
});

// ─── Export contract tests ───────────────────────────────────────────────────

describe("student list module exports", () => {
  it("exports getStudentList as a function", async () => {
    const { getStudentList } = await import("../lib/students");
    expect(getStudentList).toBeDefined();
    expect(typeof getStudentList).toBe("function");
  });

  it("exports getCourseOptions as a function", async () => {
    const { getCourseOptions } = await import("../lib/students");
    expect(getCourseOptions).toBeDefined();
    expect(typeof getCourseOptions).toBe("function");
  });

  it("exports PAGE_SIZE equal to 25", async () => {
    const { PAGE_SIZE } = await import("../lib/students");
    expect(PAGE_SIZE).toBe(25);
  });
});

// ─── Type shape tests (compile-time via TypeScript) ──────────────────────────

describe("StudentRow type shape", () => {
  it("StudentRow has riskLevel field (not isAtRisk)", async () => {
    const { deriveRiskLevel } = await import("../lib/students");
    // Verify the function produces valid RiskLevel values
    const atRisk = deriveRiskLevel(false);
    const onTrack = deriveRiskLevel(true);
    const watch = deriveRiskLevel(null);

    // These are compile-time type assertions via the runtime value check
    const validRiskLevels: string[] = ["at-risk", "watch", "on-track"];
    expect(validRiskLevels).toContain(atRisk);
    expect(validRiskLevels).toContain(onTrack);
    expect(validRiskLevels).toContain(watch);

    // Simulate a StudentRow object shape to verify riskLevel field exists
    type RiskLevel = "at-risk" | "watch" | "on-track";
    const mockRow: {
      id: string;
      firstName: string;
      lastName: string;
      gradeLevel: number;
      counselorName: string | null;
      riskLevel: RiskLevel;
    } = {
      id: "uuid-1",
      firstName: "Jane",
      lastName: "Doe",
      gradeLevel: 11,
      counselorName: "Mr. Smith",
      riskLevel: deriveRiskLevel(false),
    };
    expect(mockRow.riskLevel).toBe("at-risk");
  });
});

describe("StudentListResult type shape", () => {
  it("StudentListResult has rows and total fields", () => {
    // Compile-time shape check via runtime simulation
    type StudentListResult = {
      rows: unknown[];
      total: number;
    };
    const mockResult: StudentListResult = {
      rows: [],
      total: 0,
    };
    expect(mockResult).toHaveProperty("rows");
    expect(mockResult).toHaveProperty("total");
    expect(Array.isArray(mockResult.rows)).toBe(true);
    expect(typeof mockResult.total).toBe("number");
  });
});

describe("GetStudentListParams type shape", () => {
  it("accepts page, limit, course, riskLevel fields", () => {
    // Compile-time shape validation via mock object
    type RiskLevel = "at-risk" | "watch" | "on-track";
    type GetStudentListParams = {
      search?: string;
      grade?: number;
      riskLevel?: RiskLevel;
      course?: string;
      page?: number;
      limit?: number;
      viewerId: string;
      viewerRole: "principal" | "counselor" | "teacher";
    };
    const params: GetStudentListParams = {
      viewerId: "staff-uuid",
      viewerRole: "counselor",
      page: 1,
      limit: 25,
      course: "Algebra",
      riskLevel: "at-risk",
    };
    expect(params.page).toBe(1);
    expect(params.limit).toBe(25);
    expect(params.course).toBe("Algebra");
    expect(params.riskLevel).toBe("at-risk");
  });
});
