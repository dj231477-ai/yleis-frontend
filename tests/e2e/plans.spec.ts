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

  test("buying custom hours redirects to Mercado Pago checkout with the tiered price", async ({
    page,
  }) => {
    await page.goto("/app/plans");
    // Ámbito acotado a esta sección — el label "Cat. A · $65.000/h" también
    // aparece en el toggle A/B de cada PlanCard más arriba en la página.
    const section = page.getByTestId("buy-hours-form");
    await expect(
      section.getByRole("heading", { name: "¿Prefieres una cantidad distinta de horas?" })
    ).toBeVisible();

    // 8 horas en categoría A cae en el umbral de la tarifa "estándar" ($60.200/h) →
    // total esperado 481.600, igual al paquete Estándar A de tamaño fijo.
    await section.getByRole("button", { name: "Cat. A · $65.000/h" }).click();
    await section.locator("#custom-hours").fill("8");
    await expect(section.getByText("481.600")).toBeVisible();

    const buyButton = section.getByRole("button", { name: "Comprar 8h" });
    await Promise.all([
      page.waitForURL(/mercadopago\.com/, { timeout: 20_000 }),
      buyButton.click(),
    ]);

    expect(page.url()).toContain("mercadopago.com");
  });
});
