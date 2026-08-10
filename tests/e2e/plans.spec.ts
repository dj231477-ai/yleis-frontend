import { expect, test } from "@playwright/test";

test.describe("Membership plans", () => {
  test.use({ storageState: "tests/e2e/.auth/student.json" });

  test("buying a paid package redirects to Mercado Pago checkout", async ({ page }) => {
    await page.goto("/app/plans");
    await expect(page.getByRole("heading", { name: "Paquetes" })).toBeVisible();

    // Cualquier botón "Comprar ..." de un paquete pago (el free/actual están disabled)
    const buyButton = page.getByRole("button", { name: /^Comprar/ }).first();
    await expect(buyButton).toBeVisible();

    await Promise.all([
      page.waitForURL(/mercadopago\.com/, { timeout: 20_000 }),
      buyButton.click(),
    ]);

    expect(page.url()).toContain("mercadopago.com");
  });
});
