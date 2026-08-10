import { expect, test } from "@playwright/test";

test.describe("Login page", () => {
  test("loads and shows the login form by default", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Yleis" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Contraseña")).toBeVisible();
  });

  test("switches to the register tab and shows its fields", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Registrarse" }).click();
    await expect(page.locator("#reg-firstName")).toBeVisible();
    await expect(page.locator("#reg-lastName")).toBeVisible();
    await expect(page.locator("#reg-role")).toBeVisible();
  });

  test("shows an error on invalid login credentials", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#login-email").fill(`no-existe-${Date.now()}@yleis.co`);
    await page.locator("#login-password").fill("password-incorrecta-123");
    await page.locator('form button[type="submit"]').click();
    await expect(page.getByText("Email o contraseña incorrectos.")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("Google button redirects through Supabase to accounts.google.com", async ({ page }) => {
    await page.goto("/login");
    const navigation = page.waitForURL(/accounts\.google\.com/, { timeout: 15_000 });
    await page.getByRole("button", { name: /Continuar con Google/i }).click();
    await navigation;
    expect(page.url()).toContain("accounts.google.com");
  });
});

test.describe("Auth guard", () => {
  test("redirects unauthenticated users from /app to /login", async ({ page }) => {
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login/);
  });
});
