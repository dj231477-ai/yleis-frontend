import { expect, test } from "@playwright/test";

test.describe("Membership plans", () => {
  test.use({ storageState: "tests/e2e/.auth/student.json" });

  test("activating a paid plan redirects to Mercado Pago checkout", async ({ page }) => {
    await page.goto("/app/plans");
    await expect(page.getByRole("heading", { name: "Planes" })).toBeVisible();

    // Cualquier botón "Activar ..." de un plan pago (el free/actual están disabled)
    const activateButton = page.getByRole("button", { name: /^Activar/ }).first();
    await expect(activateButton).toBeVisible();

    await Promise.all([
      page.waitForURL(/mercadopago\.com/, { timeout: 20_000 }),
      activateButton.click(),
    ]);

    expect(page.url()).toContain("mercadopago.com");
  });
});
