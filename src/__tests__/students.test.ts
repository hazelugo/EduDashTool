import { describe, it, expect } from "vitest";

describe("students.ts function exports", () => {
  it("exports getStudentList as a function", async () => {
    const mod = await import("../lib/students");
    expect(typeof mod.getStudentList).toBe("function");
  });

  it("exports getStudentById as a function", async () => {
    const mod = await import("../lib/students");
    expect(typeof mod.getStudentById).toBe("function");
  });

  it("exports canTeacherViewStudent as a function", async () => {
    const mod = await import("../lib/students");
    expect(typeof mod.canTeacherViewStudent).toBe("function");
  });

  it("exports getStudentGradesByClass as a function", async () => {
    const mod = await import("../lib/students");
    expect(typeof mod.getStudentGradesByClass).toBe("function");
  });

  it("exports getStudentAttendance as a function", async () => {
    const mod = await import("../lib/students");
    expect(typeof mod.getStudentAttendance).toBe("function");
  });

  it("exports getStudentTests as a function", async () => {
    const mod = await import("../lib/students");
    expect(typeof mod.getStudentTests).toBe("function");
  });

  it("exports getStudentGraduationPlan as a function", async () => {
    const mod = await import("../lib/students");
    expect(typeof mod.getStudentGraduationPlan).toBe("function");
  });

  it("exports getStudentCollegePrepPlan as a function", async () => {
    const mod = await import("../lib/students");
    expect(typeof mod.getStudentCollegePrepPlan).toBe("function");
  });
});

describe("StudentRow type shape", () => {
  it("has the expected property keys", () => {
    const sample: import("../lib/students").StudentRow = {
      id: "uuid-1",
      firstName: "Jane",
      lastName: "Doe",
      gradeLevel: 10,
      counselorName: null,
      isAtRisk: false,
    };
    expect(sample.id).toBe("uuid-1");
    expect(sample.isAtRisk).toBe(false);
    expect(sample.gradeLevel).toBe(10);
  });
});

describe("StudentDetail type shape", () => {
  it("has the expected property keys", () => {
    const sample: import("../lib/students").StudentDetail = {
      id: "uuid-2",
      firstName: "John",
      lastName: "Smith",
      gradeLevel: 11,
      counselorName: "Ms. Lee",
      enrolledAt: "2023-09-01",
      isAtRisk: true,
    };
    expect(sample.enrolledAt).toBe("2023-09-01");
    expect(sample.counselorName).toBe("Ms. Lee");
  });
});

describe("GradeEntry type shape", () => {
  it("uses gradeType field (not type)", () => {
    const sample: import("../lib/students").GradeEntry = {
      id: "uuid-3",
      gradeType: "midterm",
      score: 85.5,
      letterGrade: "B",
      gradedAt: "2024-10-15",
    };
    expect(sample.gradeType).toBe("midterm");
  });
});

describe("TestScore type shape", () => {
  it("uses testType field (not testName)", () => {
    const sample: import("../lib/students").TestScore = {
      id: "uuid-4",
      testType: "SAT",
      testDate: "2024-04-06",
      totalScore: 1400,
      mathScore: 720,
      readingScore: 680,
      writingScore: null,
      targetScore: 1500,
    };
    expect(sample.testType).toBe("SAT");
    expect(sample.targetScore).toBe(1500);
  });
});

describe("StudentAttendanceStats type shape", () => {
  it("has present/absent/tardy/excused/rate/trend fields", () => {
    const sample: import("../lib/students").StudentAttendanceStats = {
      present: 20,
      absent: 3,
      tardy: 1,
      excused: 2,
      rate: 85,
      trend: [{ week: "2024-03-04", rate: 88 }],
    };
    expect(sample.rate).toBe(85);
    expect(sample.trend).toHaveLength(1);
  });
});

describe("GraduationPlanData type shape", () => {
  it("can be null or an object with creditsEarned/creditsRequired/onTrack/planData", () => {
    const nullPlan: import("../lib/students").GraduationPlanData = null;
    expect(nullPlan).toBeNull();

    const plan: import("../lib/students").GraduationPlanData = {
      creditsEarned: 18,
      creditsRequired: 24,
      onTrack: true,
      planData: null,
    };
    expect(plan?.creditsEarned).toBe(18);
  });
});

describe("CollegePrepData type shape", () => {
  it("can be null or an object with targetSchools/applicationDeadline/etc", () => {
    const nullPlan: import("../lib/students").CollegePrepData = null;
    expect(nullPlan).toBeNull();

    const plan: import("../lib/students").CollegePrepData = {
      targetSchools: ["MIT", "Stanford"],
      applicationDeadline: "2025-01-01",
      essayStatus: "In Progress",
      recommendationStatus: "Requested",
      notes: "Strong STEM focus",
    };
    expect(plan?.targetSchools).toHaveLength(2);
  });
});
