// Phase 1 E2E tests — stubs written before implementation (Nyquist compliance)
// Tests marked RED until Plans 02 and 03 complete.
// FOUND-01, AUTH-01: login redirect test
// FOUND-05: rebrand test

import { test, expect } from "@playwright/test";

test.describe("login redirect", () => {
  test("authenticated user is redirected to /dashboard, not /songs", async ({
    page,
  }) => {
    test.skip(
      !process.env.TEST_EMAIL,
      "TEST_EMAIL not set — skipping auth test"
    );
    // Log in with test credentials (env vars: TEST_EMAIL, TEST_PASSWORD)
    await page.goto("/login");
    await page.fill('[name="email"]', process.env.TEST_EMAIL ?? "");
    await page.fill('[name="password"]', process.env.TEST_PASSWORD ?? "");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });
});

test.describe("rebrand", () => {
  test("app title is EduDash, not Song Tool", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/EduDash/);
    await expect(page.locator("h1")).not.toContainText("Song Tool");
    await expect(page.locator("h1")).toContainText("EduDash");
  });
});

test.describe("auth login", () => {
  test("login page renders email and password fields", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('[name="email"]')).toBeVisible();
    await expect(page.locator('[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});
