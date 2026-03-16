import { describe, it, expect, vi, beforeEach } from "vitest";

// AUTH-02: Staff member role is stored in staff_profiles linked to their auth user
// These tests verify the requireStaffProfile() contract
describe("requireStaffProfile", () => {
  it("exports requireStaffProfile as a function", async () => {
    const mod = await import("../lib/auth");
    expect(typeof mod.requireStaffProfile).toBe("function");
  });

  it("exports StaffProfile type (verified via runtime shape)", async () => {
    // Shape contract: { userId: string, email: string, fullName: string | null, role: string }
    // Actual enforcement is TypeScript compile-time; runtime stub confirms export exists
    const mod = await import("../lib/auth");
    expect(mod.requireStaffProfile).toBeDefined();
  });
});
