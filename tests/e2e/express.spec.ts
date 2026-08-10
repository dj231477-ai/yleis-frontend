import { expect, test } from "@playwright/test";

test.describe("Student Express request", () => {
  test.use({ storageState: "tests/e2e/.auth/student.json" });

  test("creating an express request switches to the searching state with a live timer", async ({
    page,
  }) => {
    await page.goto("/app/student/search");

    await expect(page.getByRole("heading", { name: "Clase Express" })).toBeVisible();

    // El <select> de materias se llena async vía /api/subjects — sin esto el
    // submit puede correr con subjectId todavía vacío (carrera, no hay disabled
    // mientras carga) y falla con "Selecciona una materia".
    await expect(page.locator("select").first().locator("option")).not.toHaveCount(0);

    await page.getByRole("button", { name: "Buscar profesor ahora" }).click();

    // Pasa a estado "searching": aparece el timer y el botón de cancelar
    await expect(page.getByText(/Notificamos a los profesores disponibles/)).toBeVisible({
      timeout: 10_000,
    });
    const cancelButton = page.getByRole("button", { name: "Cancelar búsqueda" });
    await expect(cancelButton).toBeVisible();

    // Cancelar para no dejar la solicitud viva
    await cancelButton.click();
    await expect(page.getByRole("button", { name: "Buscar profesor ahora" })).toBeVisible();
  });
});
