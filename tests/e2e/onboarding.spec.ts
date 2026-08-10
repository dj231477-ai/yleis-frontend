import { expect, test } from "@playwright/test";

const TEACHER_EMAIL = process.env.TEST_TEACHER_EMAIL ?? "cuentaprofesor@prueba.com";
const TEACHER_PASSWORD = process.env.TEST_TEACHER_PASSWORD ?? "123456789";
const SUPABASE_URL =
  process.env.PLAYWRIGHT_SUPABASE_URL ?? "https://ekpnisnaekbhgnhleuea.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.PLAYWRIGHT_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrcG5pc25hZWtiaGduaGxldWVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MTcxNjEsImV4cCI6MjA5Nzk5MzE2MX0.YX7F3yM3WvySj8angzBwrQ1aY98YwCxDLyyVGRiY2sA";

// Resetea el estado de onboarding de la cuenta de prueba antes de cada corrida —
// sin esto el test no es repetible (la 2da vez encuentra la cuenta ya "submitted").
async function resetOnboardingState() {
  const tokenRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEACHER_EMAIL, password: TEACHER_PASSWORD }),
  });
  const { access_token } = await tokenRes.json();

  await fetch(`${SUPABASE_URL}/rest/v1/teachers?user_id=eq.${await teacherUserId(access_token)}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      onboarding_step: "profile",
      headline: null,
      bio: null,
      languages: [],
    }),
  });
}

async function teacherUserId(accessToken: string): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` },
  });
  const user = await res.json();
  return user.id;
}

test.describe("Teacher onboarding", () => {
  test.use({ storageState: "tests/e2e/.auth/teacher.json" });

  test.beforeEach(async () => {
    await resetOnboardingState();
  });

  test("fills the 3-step form and the submission actually persists", async ({ page }) => {
    await page.goto("/app/teacher/onboarding");

    // Paso 1 — perfil
    await expect(page.getByRole("heading", { name: "Tu perfil profesional" })).toBeVisible();
    await page.locator("#headline").fill("Profesor de inglés — regresión E2E");
    await page
      .locator("#bio")
      .fill(
        "Bio de prueba generada por Playwright para validar que el onboarding persiste correctamente tras el fix de la migración 029."
      );
    await page.getByRole("button", { name: "Siguiente" }).click();

    // Paso 2 — enseñanza
    await expect(page.getByRole("heading", { name: "Tu enseñanza" })).toBeVisible();
    await page.locator("#hourly_rate").fill("50000");
    await page.getByRole("button", { name: "+ Inglés" }).click();
    await page.getByRole("button", { name: "Siguiente" }).click();

    // Paso 3 — documentos (se omite, es opcional) → enviar
    await expect(page.getByRole("heading", { name: "Documentos" })).toBeVisible();
    await page.getByRole("button", { name: "Enviar solicitud" }).click();

    // Tras enviar, la página recarga y muestra la pantalla de "en revisión"
    await expect(page.getByText(/en revisión|pendiente/i)).toBeVisible({ timeout: 15_000 });
  });
});
