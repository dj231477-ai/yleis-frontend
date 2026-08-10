import { expect, test } from "@playwright/test";

test.describe("Teacher dashboard", () => {
  test.use({ storageState: "tests/e2e/.auth/teacher.json" });

  test("loads without redirecting to login", async ({ page }) => {
    await page.goto("/app/teacher/dashboard");
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Student dashboard", () => {
  test.use({ storageState: "tests/e2e/.auth/student.json" });

  test("loads without redirecting to login", async ({ page }) => {
    await page.goto("/app/student/dashboard");
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator("body")).toBeVisible();
  });
});
