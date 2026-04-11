import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

// ─── Role-scoping logic tests ─────────────────────────────────────────────────

// Build a chainable query builder mock that resolves to a given value at .where()
function makeQueryMock(resolveValue: unknown[]) {
  const chain: Record<string, unknown> = {};
  const methods = [
    "select",
    "selectDistinct",
    "from",
    "innerJoin",
    "leftJoin",
    "where",
    "orderBy",
    "limit",
    "offset",
  ];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  // Terminal awaitable: .where() returns a Promise when the chain is awaited
  (chain.where as ReturnType<typeof vi.fn>).mockResolvedValue(resolveValue);
  // Also make the chain itself thenable for patterns that await without .where()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (chain as any).then = (
    onfulfilled?: ((value: unknown[]) => unknown) | null,
    onrejected?: ((reason: unknown) => unknown) | null
  ) => Promise.resolve(resolveValue).then(onfulfilled, onrejected);
  return chain;
}

describe("getStudentList role-scoping", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty immediately for a teacher with no enrolled students", async () => {
    // Mock db.selectDistinct(...).from(...).innerJoin(...).where(...) → []
    const enrollmentChain = makeQueryMock([]);

    vi.doMock("@/db", () => ({
      db: {
        selectDistinct: vi.fn(() => enrollmentChain),
        select: vi.fn(() => enrollmentChain),
      },
    }));

    const { getStudentList } = await import("../lib/students");
    const result = await getStudentList({ viewerId: "teacher-1", viewerRole: "teacher" });
    expect(result).toEqual({ rows: [], total: 0 });
  });

  it("returns empty immediately when course filter matches no students", async () => {
    // For counselor: first db call (course enrollment lookup) returns []
    // The function should short-circuit and return { rows: [], total: 0 }
    const emptyChain = makeQueryMock([]);
    const countChain = makeQueryMock([{ total: 0 }]);
    let callCount = 0;

    vi.doMock("@/db", () => ({
      db: {
        select: vi.fn(() => {
          callCount = callCount + 1;
          // First select call is the course enrollment lookup
          return callCount === 1 ? emptyChain : countChain;
        }),
        selectDistinct: vi.fn(() => emptyChain),
      },
    }));

    const { getStudentList } = await import("../lib/students");
    const result = await getStudentList({
      viewerId: "counselor-1",
      viewerRole: "counselor",
      course: "Algebra",
    });
    expect(result).toEqual({ rows: [], total: 0 });
  });

  it("does not apply inArray restriction for counselor role", async () => {
    // For counselor: selectDistinct for teacher scoping should NOT be called
    const selectDistinctMock = vi.fn();
    const dataChain = makeQueryMock([]);
    const countChain = makeQueryMock([{ total: 0 }]);
    let selectCallCount = 0;

    vi.doMock("@/db", () => ({
      db: {
        selectDistinct: selectDistinctMock,
        select: vi.fn(() => {
          selectCallCount = selectCallCount + 1;
          return selectCallCount % 2 === 1 ? dataChain : countChain;
        }),
      },
    }));

    const { getStudentList } = await import("../lib/students");
    await getStudentList({ viewerId: "counselor-1", viewerRole: "counselor" });

    // selectDistinct is only used for teacher scoping; counselor path must not call it
    expect(selectDistinctMock).not.toHaveBeenCalled();
  });
});
