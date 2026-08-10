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

async function studentAccessToken(): Promise<string> {
  const tokenRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: STUDENT_EMAIL, password: STUDENT_PASSWORD }),
  });
  const { access_token } = await tokenRes.json();
  return access_token;
}

// La regla de negocio bloquea una 2da reserva pendiente con el mismo profesor
// ("Ya tienes una reserva pendiente...") — sin esto el test no es repetible.
async function cancelExistingPendingBookings(accessToken: string) {
  const authHeaders = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` };

  const studentRes = await fetch(`${SUPABASE_URL}/rest/v1/students?select=id`, {
    headers: authHeaders,
  });
  const [student] = await studentRes.json();
  if (!student) return;

  const bookingsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/bookings?student_id=eq.${student.id}&teacher_id=eq.${TEACHER_ID}&status=in.(pending,pending_teacher)&select=id`,
    { headers: authHeaders }
  );
  const pending: { id: string }[] = await bookingsRes.json();

  for (const booking of pending) {
    await fetch(`${SUPABASE_URL}/functions/v1/cancel-booking`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ booking_id: booking.id, reason: "E2E cleanup" }),
    });
  }
}

// Resetea el saldo del paquete de la cuenta de prueba a un valor fijo, vía
// una función restringida solo a este email (ver migración 038) — así el
// test no depende de haber comprado un paquete real por Mercado Pago.
async function grantTestPackageHours(accessToken: string, hours: number) {
  await fetch(`${SUPABASE_URL}/rest/v1/rpc/grant_test_package_hours`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_hours: hours }),
  });
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

test.describe("Student booking — with package balance", () => {
  test.use({ storageState: "tests/e2e/.auth/student.json" });

  test.beforeEach(async () => {
    await ensureTeacherIsVerified();
    const token = await studentAccessToken();
    await cancelExistingPendingBookings(token);
    await grantTestPackageHours(token, 5);
  });

  test("scheduling a class discounts the hours from the package — no Mercado Pago", async ({
    page,
  }) => {
    await page.goto(`/app/student/booking/${TEACHER_ID}`);

    await expect(page.getByRole("heading", { name: "Reservar clase" })).toBeVisible();

    await page.locator("select").first().selectOption({ label: "Inglés" });
    await page.locator('input[type="date"]').fill(randomFutureDate());
    await page.locator("select").nth(1).selectOption("10:00");
    await page.getByRole("button", { name: "1 hora" }).click();

    // Ya no pasa por Mercado Pago — el submit descuenta del saldo y va
    // directo a la confirmación en el propio sitio.
    await page.getByRole("button", { name: "Solicitar clase" }).click();
    await page.waitForURL(/\/app\/student\/booking\/confirmation\?id=/, { timeout: 15_000 });

    await expect(page.getByText(/solicitud fue enviada|reserva confirmada/i)).toBeVisible();
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

    await page.getByRole("button", { name: "Solicitar clase" }).click();
    await page.waitForURL(/\/app\/student\/booking\/confirmation\?id=/, { timeout: 15_000 });

    await expect(page.getByText(/Sofía Pérez/)).toBeVisible();
  });
});

test.describe("Student booking — without package balance", () => {
  test.use({ storageState: "tests/e2e/.auth/student.json" });

  test.beforeEach(async () => {
    await ensureTeacherIsVerified();
    const token = await studentAccessToken();
    await cancelExistingPendingBookings(token);
    await grantTestPackageHours(token, 0);
  });

  test("shows a no-balance error with a link to buy a package", async ({ page }) => {
    await page.goto(`/app/student/booking/${TEACHER_ID}`);
    await expect(page.getByRole("heading", { name: "Reservar clase" })).toBeVisible();

    await page.locator("select").first().selectOption({ label: "Inglés" });
    await page.locator('input[type="date"]').fill(randomFutureDate());
    await page.locator("select").nth(1).selectOption("10:00");
    await page.getByRole("button", { name: "1 hora" }).click();
    await page.getByRole("button", { name: "Solicitar clase" }).click();

    await expect(page.getByText(/saldo de horas/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("link", { name: "Comprar un paquete" })).toBeVisible();
  });
});

async function fetchActiveMembershipHours(accessToken: string): Promise<number> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/memberships?status=eq.active&select=remaining_hours&order=updated_at.desc&limit=1`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` } }
  );
  const [row] = await res.json();
  return Number(row?.remaining_hours ?? 0);
}

async function fetchBookingStatus(accessToken: string, bookingId: string): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${bookingId}&select=status`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` },
  });
  const [row] = await res.json();
  return row?.status;
}

test.describe("Booking cancellation", () => {
  test.use({ storageState: "tests/e2e/.auth/student.json" });

  test.beforeEach(async () => {
    await ensureTeacherIsVerified();
    const token = await studentAccessToken();
    await cancelExistingPendingBookings(token);
    await grantTestPackageHours(token, 5);
  });

  test("a confirmed class stays cancellable up until the start code is entered, and hours are refunded", async ({
    page,
    browser,
  }) => {
    // 1. El estudiante solicita la clase (descuenta 1 hora del paquete)
    await page.goto(`/app/student/booking/${TEACHER_ID}`);
    await expect(page.getByRole("heading", { name: "Reservar clase" })).toBeVisible();
    await page.locator("select").first().selectOption({ label: "Inglés" });
    await page.locator('input[type="date"]').fill(randomFutureDate());
    await page.locator("select").nth(1).selectOption("10:00");
    await page.getByRole("button", { name: "1 hora" }).click();
    await page.getByRole("button", { name: "Solicitar clase" }).click();
    await page.waitForURL(/\/app\/student\/booking\/confirmation\?id=/, { timeout: 15_000 });
    const rawBookingId = new URL(page.url()).searchParams.get("id");
    expect(rawBookingId).toBeTruthy();
    const bookingId = rawBookingId as string;

    const studentToken = await studentAccessToken();
    const hoursAfterBooking = await fetchActiveMembershipHours(studentToken);

    // 2. El profesor confirma la reserva (vía su propia sesión autenticada,
    // sin pasar por la UI para no depender de layout/orden de la lista de pendientes)
    const teacherContext = await browser.newContext({
      storageState: "tests/e2e/.auth/teacher.json",
    });
    const acceptRes = await teacherContext.request.post(`/api/bookings/${bookingId}/accept`);
    expect(acceptRes.ok()).toBeTruthy();
    await teacherContext.close();

    expect(await fetchBookingStatus(studentToken, bookingId)).toBe("confirmed");

    // 3. El estudiante cancela desde el detalle de la clase confirmada —
    // antes de que el profesor introduzca el código de inicio
    await page.goto(`/app/student/classes/${bookingId}`);
    await expect(page.getByRole("button", { name: "Cancelar clase" })).toBeVisible();
    await page.getByRole("button", { name: "Cancelar clase" }).click();
    await page.getByRole("button", { name: "Sí, cancelar" }).click();

    // La página de detalle redirige a la lista una vez que el booking deja de
    // estar "activo" (ver activeStatuses en student/classes/[bookingId]/page.tsx)
    await page.waitForURL(/\/app\/student\/classes$/, { timeout: 10_000 });
    expect(await fetchBookingStatus(studentToken, bookingId)).toBe("cancelled_student");

    // 4. La hora descontada vuelve al saldo del paquete
    const hoursAfterCancel = await fetchActiveMembershipHours(studentToken);
    expect(hoursAfterCancel).toBe(hoursAfterBooking + 1);
  });
});

test.describe("Booking lifecycle — start and finish", () => {
  test.use({ storageState: "tests/e2e/.auth/student.json" });

  test.beforeEach(async () => {
    await ensureTeacherIsVerified();
    const token = await studentAccessToken();
    await cancelExistingPendingBookings(token);
    await grantTestPackageHours(token, 5);
  });

  test("the teacher can start a class with the code and finish it, warning if the contracted time hasn't elapsed", async ({
    page,
    browser,
  }) => {
    // 1. El estudiante solicita la clase
    await page.goto(`/app/student/booking/${TEACHER_ID}`);
    await expect(page.getByRole("heading", { name: "Reservar clase" })).toBeVisible();
    await page.locator("select").first().selectOption({ label: "Inglés" });
    await page.locator('input[type="date"]').fill(randomFutureDate());
    await page.locator("select").nth(1).selectOption("10:00");
    await page.getByRole("button", { name: "1 hora" }).click();
    await page.getByRole("button", { name: "Solicitar clase" }).click();
    await page.waitForURL(/\/app\/student\/booking\/confirmation\?id=/, { timeout: 15_000 });
    const rawBookingId = new URL(page.url()).searchParams.get("id");
    expect(rawBookingId).toBeTruthy();
    const bookingId = rawBookingId as string;

    const studentToken = await studentAccessToken();

    // 2. El profesor confirma y obtiene el código de inicio
    const teacherContext = await browser.newContext({
      storageState: "tests/e2e/.auth/teacher.json",
    });
    const acceptRes = await teacherContext.request.post(`/api/bookings/${bookingId}/accept`);
    expect(acceptRes.ok()).toBeTruthy();
    const { confirmationCode } = (await acceptRes.json()) as { confirmationCode: string };
    expect(confirmationCode).toBeTruthy();

    // 3. El profesor inicia la clase con el código (la fecha es futura, así que
    // el tiempo contratado todavía no transcurrió)
    const startRes = await teacherContext.request.post(`/api/bookings/${bookingId}/start`, {
      data: { code: confirmationCode },
    });
    expect(startRes.ok()).toBeTruthy();
    expect(await fetchBookingStatus(studentToken, bookingId)).toBe("in_progress");

    // 4. El profesor intenta finalizar antes de tiempo — debe ver la advertencia
    const teacherPage = await teacherContext.newPage();
    await teacherPage.goto(`/app/teacher/classes/${bookingId}`);
    await teacherPage.getByRole("button", { name: "Finalizar clase" }).click();
    await expect(
      teacherPage.getByText(/Aún no ha transcurrido todo el tiempo contratado/)
    ).toBeVisible();

    await teacherPage.getByRole("button", { name: "Sí, finalizar" }).click();
    await expect(teacherPage.getByText("Completada")).toBeVisible({ timeout: 10_000 });
    expect(await fetchBookingStatus(studentToken, bookingId)).toBe("completed");

    await teacherContext.close();
  });
});
