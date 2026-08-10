import { expect, test } from "@playwright/test";

// Profesor de prueba (cuentaprofesor@prueba.com) fijado como verified/hourly_rate=50000
// para que aparezca en /app/student/booking. teachers.id, no user_id.
const TEACHER_ID = "ced8be79-6ca7-4015-9256-7288bb7264cc";

const STUDENT_EMAIL = process.env.TEST_STUDENT_EMAIL ?? "cuentaestudiante@prueba.com";
const STUDENT_PASSWORD = process.env.TEST_STUDENT_PASSWORD ?? "123456789";
const TEACHER_EMAIL = process.env.TEST_TEACHER_EMAIL ?? "cuentaprofesor@prueba.com";
const TEACHER_PASSWORD = process.env.TEST_TEACHER_PASSWORD ?? "123456789";
const SUPABASE_URL =
  process.env.PLAYWRIGHT_SUPABASE_URL ?? "https://ekpnisnaekbhgnhleuea.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.PLAYWRIGHT_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrcG5pc25hZWtiaGduaGxldWVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MTcxNjEsImV4cCI6MjA5Nzk5MzE2MX0.YX7F3yM3WvySj8angzBwrQ1aY98YwCxDLyyVGRiY2sA";

function randomFutureDate(): string {
  const days = 7 + Math.floor(Math.random() * 200); // evita choques con corridas previas
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// La regla de negocio bloquea una 2da reserva pendiente con el mismo profesor
// ("Ya tienes una reserva pendiente...") — sin esto el test no es repetible.
async function cancelExistingPendingBookings() {
  const tokenRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: STUDENT_EMAIL, password: STUDENT_PASSWORD }),
  });
  const { access_token } = await tokenRes.json();
  const authHeaders = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${access_token}` };

  const studentRes = await fetch(`${SUPABASE_URL}/rest/v1/students?select=id`, {
    headers: authHeaders,
  });
  const [student] = await studentRes.json();
  if (!student) return;

  const bookingsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/bookings?student_id=eq.${student.id}&teacher_id=eq.${TEACHER_ID}&status=eq.pending&select=id`,
    { headers: authHeaders }
  );
  const pending: { id: string }[] = await bookingsRes.json();

  for (const booking of pending) {
    await fetch(`${SUPABASE_URL}/functions/v1/cancel-booking`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ booking_id: booking.id, reason: "E2E cleanup" }),
    });
  }
}

// onboarding.spec.ts reusa esta misma cuenta y la deja en onboarding_step
// "submitted" al terminar — forzamos "verified" para que este test no dependa
// del orden de ejecución de otros archivos de test.
async function ensureTeacherIsVerified() {
  const tokenRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEACHER_EMAIL, password: TEACHER_PASSWORD }),
  });
  const { access_token } = await tokenRes.json();

  await fetch(`${SUPABASE_URL}/rest/v1/teachers?id=eq.${TEACHER_ID}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      onboarding_step: "verified",
      hourly_rate: 50000,
      languages: ["Inglés"],
    }),
  });
}

test.describe("Student booking", () => {
  test.use({ storageState: "tests/e2e/.auth/student.json" });

  test.beforeEach(async () => {
    await ensureTeacherIsVerified();
    await cancelExistingPendingBookings();
  });

  test("scheduling a class creates a booking and redirects to Mercado Pago checkout", async ({
    page,
  }) => {
    await page.goto(`/app/student/booking/${TEACHER_ID}`);

    await expect(page.getByRole("heading", { name: "Reservar clase" })).toBeVisible();

    await page.locator("select").first().selectOption({ label: "Inglés" });
    await page.locator('input[type="date"]').fill(randomFutureDate());
    await page.locator("select").nth(1).selectOption("10:00");
    await page.getByRole("button", { name: "1 hora" }).click();

    // El submit crea el booking, pide la preferencia a Mercado Pago, y redirige
    // a un dominio externo (mercadopago.com) — no completamos el pago real.
    await Promise.all([
      page.waitForURL(/mercadopago\.com/, { timeout: 20_000 }),
      page.getByRole("button", { name: "Confirmar y pagar" }).click(),
    ]);

    expect(page.url()).toContain("mercadopago.com");
  });

  test("booking for someone else saves the recipient's data", async ({ page }) => {
    await page.goto(`/app/student/booking/${TEACHER_ID}`);
    await expect(page.getByRole("heading", { name: "Reservar clase" })).toBeVisible();

    await page.getByRole("button", { name: "Otra persona" }).click();
    await page.getByLabel("Nombre").fill("Sofía");
    await page.getByLabel("Apellido").fill("Pérez");
    await page.getByLabel("Relación").selectOption("Herman@");
    await page.getByLabel("Edad").fill("12");

    await page.locator("select").nth(1).selectOption({ label: "Inglés" });
    await page.locator('input[type="date"]').fill(randomFutureDate());
    await page.locator("select").nth(2).selectOption("11:00");
    await page.getByRole("button", { name: "1 hora" }).click();

    await Promise.all([
      page.waitForURL(/mercadopago\.com/, { timeout: 20_000 }),
      page.getByRole("button", { name: "Confirmar y pagar" }).click(),
    ]);

    expect(page.url()).toContain("mercadopago.com");
  });
});
