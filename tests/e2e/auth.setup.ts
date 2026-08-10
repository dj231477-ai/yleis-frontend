import { expect, test as setup } from "@playwright/test";

const TEACHER_EMAIL = process.env.TEST_TEACHER_EMAIL ?? "cuentaprofesor@prueba.com";
const TEACHER_PASSWORD = process.env.TEST_TEACHER_PASSWORD ?? "123456789";
const STUDENT_EMAIL = process.env.TEST_STUDENT_EMAIL ?? "cuentaestudiante@prueba.com";
const STUDENT_PASSWORD = process.env.TEST_STUDENT_PASSWORD ?? "123456789";

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(/\/app/, { timeout: 15_000 });
}

setup("authenticate as teacher", async ({ page }) => {
  await login(page, TEACHER_EMAIL, TEACHER_PASSWORD);
  await expect(page).toHaveURL(/\/app/);
  await page.context().storageState({ path: "tests/e2e/.auth/teacher.json" });
});

setup("authenticate as student", async ({ page }) => {
  await login(page, STUDENT_EMAIL, STUDENT_PASSWORD);
  await expect(page).toHaveURL(/\/app/);
  await page.context().storageState({ path: "tests/e2e/.auth/student.json" });
});
