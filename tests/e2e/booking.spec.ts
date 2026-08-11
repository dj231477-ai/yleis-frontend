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

  test("choosing Presencial modality is saved and shows no Meet section", async ({ page }) => {
    await page.goto(`/app/student/booking/${TEACHER_ID}`);
    await expect(page.getByRole("heading", { name: "Reservar clase" })).toBeVisible();

    await page.locator("select").first().selectOption({ label: "Inglés" });
    await page.locator('input[type="date"]').fill(randomFutureDate());
    await page.locator("select").nth(1).selectOption("12:00");
    await page.getByRole("button", { name: "1 hora" }).click();
    await page.getByRole("button", { name: "Presencial" }).click();
    await page.getByRole("button", { name: "Solicitar clase" }).click();
    await page.waitForURL(/\/app\/student\/booking\/confirmation\?id=/, { timeout: 15_000 });
    const bookingId = new URL(page.url()).searchParams.get("id");
    expect(bookingId).toBeTruthy();

    await page.goto(`/app/student/classes/${bookingId}`);
    await expect(page.getByText("Presencial", { exact: true })).toBeVisible();
    await expect(page.getByText(/Unirse a Meet|Meet se habilita/)).not.toBeVisible();
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

    // 2.5. Antes de iniciar, el link de Meet no debe estar disponible todavía
    // (el botón "Unirse/Abrir Meet" solo funciona después del código de inicio)
    const preStartPage = await teacherContext.newPage();
    await preStartPage.goto(`/app/teacher/classes/${bookingId}`);
    await expect(preStartPage.getByRole("link", { name: /Abrir Meet/ })).not.toBeVisible();
    await expect(preStartPage.getByText(/Meet se habilita al iniciar la clase/)).toBeVisible();
    await preStartPage.close();

    // 3. El profesor inicia la clase con el código (la fecha es futura, así que
    // el tiempo contratado todavía no transcurrió)
    const startRes = await teacherContext.request.post(`/api/bookings/${bookingId}/start`, {
      data: { code: confirmationCode },
    });
    expect(startRes.ok()).toBeTruthy();
    expect(await fetchBookingStatus(studentToken, bookingId)).toBe("in_progress");

    const teacherPage = await teacherContext.newPage();

    // 3.5. El chat de clase debe cargar y permitir enviar mensajes con la clase
    // en curso (bug real: get_or_create_conversation() rechazaba con
    // "booking_not_active" cualquier estado que no fuera confirmed/paid)
    await teacherPage.goto(`/app/teacher/classes/${bookingId}`);
    await expect(teacherPage.getByText("No se pudo cargar el chat")).not.toBeVisible();
    const teacherChatInput = teacherPage.getByPlaceholder("Escribe un mensaje…");
    await expect(teacherChatInput).toBeVisible({ timeout: 10_000 });

    // El estudiante ya tiene el chat abierto ANTES de que el profesor mande el
    // mensaje — así se verifica que llega en vivo por Realtime, no solo al
    // recargar (bug real: la tabla messages no estaba en la publicación
    // supabase_realtime, así que postgres_changes nunca emitía nada).
    await page.goto(`/app/student/classes/${bookingId}`);
    await expect(page.getByText("No se pudo cargar el chat")).not.toBeVisible();
    await expect(page.getByPlaceholder("Escribe un mensaje…")).toBeVisible({ timeout: 10_000 });
    // El input habilitado solo confirma que conversationId resolvió — el canal
    // Realtime todavía puede estar terminando el handshake del websocket en ese
    // instante. Un margen breve evita una carrera artificial que un uso humano
    // normal nunca produciría (nadie escribe en el mismo milisegundo que el otro
    // termina de cargar la página).
    await page.waitForTimeout(1000);

    await teacherChatInput.fill("Hola, ¿ya estás listo?");
    await teacherChatInput.press("Enter");
    await expect(teacherPage.getByText("Hola, ¿ya estás listo?")).toBeVisible();

    // Sin recargar la página del estudiante — debe llegar solo por Realtime
    await expect(page.getByText("Hola, ¿ya estás listo?")).toBeVisible({ timeout: 10_000 });

    // 4. El profesor intenta finalizar antes de tiempo — debe ver la advertencia
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

// "Portugués" se usa exclusivamente para aislar estos tests: el profesor de
// prueba se marca temporalmente como el único que dicta ese idioma, para no
// competir por antigüedad con la cuenta real de producción que ya dicta
// Inglés/Francés/Alemán (el algoritmo elige al profesor verificado más
// antiguo — si usáramos Inglés, la solicitud automática caería en la cuenta
// real y le mandaría una notificación/email falsos).
async function setTeacherLanguages(languages: string[]) {
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
    body: JSON.stringify({ onboarding_step: "verified", hourly_rate: 50000, languages }),
  });
}

async function fetchBooking(
  accessToken: string,
  bookingId: string
): Promise<{ status: string; teacher_id: string; auto_assign: boolean }> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/bookings?id=eq.${bookingId}&select=status,teacher_id,auto_assign`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` } }
  );
  const [row] = await res.json();
  return row;
}

test.describe("Auto-assign teacher", () => {
  test.use({ storageState: "tests/e2e/.auth/student.json" });

  test.beforeEach(async () => {
    await setTeacherLanguages(["Portugués"]);
    const token = await studentAccessToken();
    await cancelExistingPendingBookings(token);
    await grantTestPackageHours(token, 5);
  });

  test.afterEach(async () => {
    await setTeacherLanguages(["Inglés"]);
  });

  test("assigns the request to the matching verified teacher and deducts hours", async ({
    page,
  }) => {
    const studentToken = await studentAccessToken();
    const hoursBefore = await fetchActiveMembershipHours(studentToken);

    await page.goto("/app/student/search");
    await page.getByRole("button", { name: /No sabes a qué profesor elegir/ }).click();
    await page
      .locator("form")
      .filter({ hasText: "Asignación automática de profesor" })
      .locator("select")
      .first()
      .selectOption({ label: "Portugués" });
    await page.locator('input[type="date"]').fill(randomFutureDate());
    await page
      .locator("form")
      .filter({ hasText: "Asignación automática de profesor" })
      .locator("select")
      .nth(1)
      .selectOption("13:00");
    await page.getByRole("button", { name: "Solicitar clase automáticamente" }).click();
    await page.waitForURL(/\/app\/student\/booking\/confirmation\?id=/, { timeout: 15_000 });
    const bookingId = new URL(page.url()).searchParams.get("id");
    expect(bookingId).toBeTruthy();

    const booking = await fetchBooking(studentToken, bookingId as string);
    expect(booking.auto_assign).toBe(true);
    expect(booking.status).toBe("pending_teacher");
    expect(booking.teacher_id).toBe(TEACHER_ID);

    const hoursAfter = await fetchActiveMembershipHours(studentToken);
    expect(hoursAfter).toBe(hoursBefore - 1);
  });

  test("rejecting with no other matching teacher cancels and refunds the hours", async ({
    page,
    browser,
  }) => {
    const studentToken = await studentAccessToken();
    const hoursBefore = await fetchActiveMembershipHours(studentToken);

    await page.goto("/app/student/search");
    await page.getByRole("button", { name: /No sabes a qué profesor elegir/ }).click();
    const form = page.locator("form").filter({ hasText: "Asignación automática de profesor" });
    await form.locator("select").first().selectOption({ label: "Portugués" });
    await page.locator('input[type="date"]').fill(randomFutureDate());
    await form.locator("select").nth(1).selectOption("14:00");
    await page.getByRole("button", { name: "Solicitar clase automáticamente" }).click();
    await page.waitForURL(/\/app\/student\/booking\/confirmation\?id=/, { timeout: 15_000 });
    const bookingId = new URL(page.url()).searchParams.get("id") as string;

    const teacherContext = await browser.newContext({
      storageState: "tests/e2e/.auth/teacher.json",
    });
    const rejectRes = await teacherContext.request.post(`/api/bookings/${bookingId}/reject`);
    expect(rejectRes.ok()).toBeTruthy();
    const rejectJson = (await rejectRes.json()) as { reassigned?: boolean };
    expect(rejectJson.reassigned).toBe(false);
    await teacherContext.close();

    const booking = await fetchBooking(studentToken, bookingId);
    expect(booking.status).toBe("cancelled_teacher");

    const hoursAfter = await fetchActiveMembershipHours(studentToken);
    expect(hoursAfter).toBe(hoursBefore);
  });
});
