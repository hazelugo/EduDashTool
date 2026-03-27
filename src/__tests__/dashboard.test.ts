import { describe, it, expect } from "vitest";

describe("dashboard query exports", () => {
  it("exports getAtRiskStudents as a function", async () => {
    const mod = await import("../lib/dashboard");
    expect(typeof mod.getAtRiskStudents).toBe("function");
  });

  it("getAtRiskStudents accepts zero parameters", async () => {
    const mod = await import("../lib/dashboard");
    expect(mod.getAtRiskStudents.length).toBe(0);
  });

  it("exports getSchoolStats as a function", async () => {
    const mod = await import("../lib/dashboard");
    expect(typeof mod.getSchoolStats).toBe("function");
  });

  it("getSchoolStats accepts one parameter (atRiskCount)", async () => {
    const mod = await import("../lib/dashboard");
    expect(mod.getSchoolStats.length).toBe(1);
  });

  it("exports getAttendanceTrend as a function", async () => {
    const mod = await import("../lib/dashboard");
    expect(typeof mod.getAttendanceTrend).toBe("function");
  });

  it("exports getGradeDistribution as a function", async () => {
    const mod = await import("../lib/dashboard");
    expect(typeof mod.getGradeDistribution).toBe("function");
  });
});

describe("AtRiskStudent type shape", () => {
  it("exported type has expected property keys (structural check via sample object)", () => {
    // Compile-time check: if AtRiskStudent type changes, this assignment will error
    const sample: import("../lib/dashboard").AtRiskStudent = {
      id: "uuid",
      firstName: "Jane",
      lastName: "Doe",
      gradeLevel: 11,
      counselorName: null,
      riskReasons: ["graduation", "attendance"],
    };
    expect(sample.id).toBe("uuid");
    expect(sample.riskReasons).toContain("graduation");
  });
});

describe("SchoolStats type shape", () => {
  it("exported type has expected property keys", () => {
    const sample: import("../lib/dashboard").SchoolStats = {
      totalStudents: 150,
      avgGpa: 3.1,
      totalAtRisk: 5,
      attendanceRate: 92,
    };
    expect(sample.totalStudents).toBe(150);
  });
});
