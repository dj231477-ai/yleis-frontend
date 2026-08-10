import { expect, test } from "@playwright/test";

const STUDENT_EMAIL = process.env.TEST_STUDENT_EMAIL ?? "cuentaestudiante@prueba.com";
const STUDENT_PASSWORD = process.env.TEST_STUDENT_PASSWORD ?? "123456789";
const SUPABASE_URL =
  process.env.PLAYWRIGHT_SUPABASE_URL ?? "https://ekpnisnaekbhgnhleuea.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.PLAYWRIGHT_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrcG5pc25hZWtiaGduaGxldWVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MTcxNjEsImV4cCI6MjA5Nzk5MzE2MX0.YX7F3yM3WvySj8angzBwrQ1aY98YwCxDLyyVGRiY2sA";

async function studentAccessToken(): Promise<string> {
  const tokenRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: STUDENT_EMAIL, password: STUDENT_PASSWORD }),
  });
  const { access_token } = await tokenRes.json();
  return access_token;
}

async function fetchSessionStatus(accessToken: string, sessionId: string): Promise<string> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/express_sessions?id=eq.${sessionId}&select=status`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` } }
  );
  const [row] = await res.json();
  return row?.status;
}

test.describe("Student Express request", () => {
  test.use({ storageState: "tests/e2e/.auth/student.json" });

  test("creating an express request switches to the searching state with a live timer", async ({
    page,
  }) => {
    await page.goto("/app/student/express");

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

  test("cancelling marks the session as cancelled server-side, not just in the UI", async ({
    page,
  }) => {
    await page.goto("/app/student/express");

    let sessionId: string | null = null;
    page.on("response", async (res) => {
      if (res.url().endsWith("/api/express/create") && res.ok()) {
        const json = (await res.json().catch(() => null)) as { sessionId?: string } | null;
        if (json?.sessionId) sessionId = json.sessionId;
      }
    });

    await expect(page.locator("select").first().locator("option")).not.toHaveCount(0);
    await page.getByRole("button", { name: "Buscar profesor ahora" }).click();
    await expect(page.getByText(/Notificamos a los profesores disponibles/)).toBeVisible({
      timeout: 10_000,
    });
    await expect.poll(() => sessionId).not.toBeNull();

    await page.getByRole("button", { name: "Cancelar búsqueda" }).click();
    await expect(page.getByRole("button", { name: "Buscar profesor ahora" })).toBeVisible();

    const accessToken = await studentAccessToken();
    // biome-ignore lint/style/noNonNullAssertion: verificado arriba con expect.poll
    const status = await fetchSessionStatus(accessToken, sessionId!);
    expect(status).toBe("cancelled_student");
  });
});
