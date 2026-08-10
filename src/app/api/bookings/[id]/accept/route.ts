import { createCalendarEventWithMeet } from "@/lib/google-calendar";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Params = Promise<{ id: string }>;

export async function POST(_req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  // Verificar que el booking pertenece al profesor autenticado
  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!teacher)
    return NextResponse.json({ error: "Perfil de profesor no encontrado" }, { status: 403 });

  // Leer el status actual + datos para el evento de calendario
  // biome-ignore lint/suspicious/noExplicitAny: tabla no tipada
  const { data: booking } = await (supabase as any)
    .from("bookings")
    .select(
      "status, confirmation_code, scheduled_at, duration_min, subjects(name), students(users(email)), teachers(users(email, full_name))"
    )
    .eq("id", id)
    .eq("teacher_id", teacher.id)
    .in("status", ["pending_teacher", "pending"])
    .single();

  if (!booking) {
    return NextResponse.json({ error: "Reserva no encontrada o ya procesada" }, { status: 404 });
  }

  const isPlanBased = booking.status === "pending_teacher";
  const confirmationCode = isPlanBased
    ? Math.floor(Math.random() * 1_000_000)
        .toString()
        .padStart(6, "0")
    : null;

  // Si el profesor conectó Google Calendar, crear el evento + Meet ahora
  // que la clase queda confirmada. Best-effort: si falla, la reserva se
  // confirma igual (el profesor pega el link manual como hasta ahora).
  let meetLink: string | null = null;
  const { data: connection } = await supabase
    .from("teacher_calendar_connections")
    .select("refresh_token")
    .eq("teacher_id", teacher.id)
    .maybeSingle();

  if (connection?.refresh_token) {
    try {
      const startISO = booking.scheduled_at as string;
      const endISO = new Date(
        new Date(startISO).getTime() + (booking.duration_min as number) * 60_000
      ).toISOString();
      const studentEmail = booking.students?.users?.email as string | undefined;
      const teacherEmail = booking.teachers?.users?.email as string | undefined;
      const subjectName = (booking.subjects?.name as string | undefined) ?? "Clase";

      const result = await createCalendarEventWithMeet({
        refreshToken: connection.refresh_token,
        summary: `${subjectName} — Yleis`,
        description: "Clase agendada a través de Yleis.",
        startISO,
        endISO,
        attendeeEmails: [studentEmail, teacherEmail].filter((e): e is string => !!e),
      });
      meetLink = result.meetLink;
    } catch (e) {
      console.error("[bookings/accept] Error creando evento en Google Calendar:", e);
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: tabla no tipada
  const { error } = await (supabase as any)
    .from("bookings")
    .update({
      status: "confirmed",
      ...(confirmationCode ? { confirmation_code: confirmationCode } : {}),
      ...(meetLink ? { meet_link: meetLink } : {}),
    })
    .eq("id", id)
    .eq("teacher_id", teacher.id);

  if (error) {
    return NextResponse.json({ error: "No se pudo confirmar la reserva" }, { status: 500 });
  }

  return NextResponse.json({ confirmationCode, meetLink });
}
