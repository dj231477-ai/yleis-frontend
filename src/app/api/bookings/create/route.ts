import { sendTemplateEmail } from "@/lib/email/resend";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const ERROR_MESSAGES: Record<string, string> = {
  STUDENT_NOT_FOUND: "No se encontró tu perfil de estudiante.",
  NO_HOURS_AVAILABLE: "No tienes saldo de horas disponible en tu paquete.",
  TEACHER_RATE_NOT_SET: "El profesor no tiene tarifa configurada aún.",
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    teacherId?: string;
    subjectId?: string;
    scheduledAt?: string;
    durationMin?: number;
    notes?: string;
    recipient?: {
      type: "self" | "other";
      firstName?: string;
      lastName?: string;
      relationship?: string;
      age?: number;
    };
  } | null;

  if (!body?.teacherId || !body?.subjectId || !body?.scheduledAt || !body?.durationMin) {
    return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 });
  }

  const recipient = body.recipient ?? { type: "self" as const };

  // biome-ignore lint/suspicious/noExplicitAny: RPC no está en el schema generado
  const { data, error } = await (supabase as any).rpc("create_scheduled_booking", {
    p_teacher_id: body.teacherId,
    p_subject_id: body.subjectId,
    p_scheduled_at: body.scheduledAt,
    p_duration_min: body.durationMin,
    p_notes: body.notes ?? null,
    p_recipient_type: recipient.type,
    p_recipient_first_name: recipient.type === "other" ? recipient.firstName : null,
    p_recipient_last_name: recipient.type === "other" ? recipient.lastName : null,
    p_recipient_relationship: recipient.type === "other" ? recipient.relationship : null,
    p_recipient_age: recipient.type === "other" ? recipient.age : null,
  });

  if (error) {
    const code = (error.message ?? "").toUpperCase().trim();
    const msg = ERROR_MESSAGES[code] ?? "No se pudo crear la reserva. Intenta de nuevo.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  notifyTeacherOfNewBooking(supabase, user.id, data as string).catch((e) => {
    console.error("[bookings/create] No se pudo notificar al profesor por email:", e);
  });

  return NextResponse.json({ bookingId: data });
}

async function notifyTeacherOfNewBooking(
  supabase: SupabaseServerClient,
  studentUserId: string,
  bookingId: string
) {
  const { data: booking } = await supabase
    .from("bookings")
    .select("scheduled_at, price, teacher_id, subject_id")
    .eq("id", bookingId)
    .single();
  if (!booking) return;

  const [{ data: teacher }, { data: subject }, { data: student }] = await Promise.all([
    supabase.from("teachers").select("user_id").eq("id", booking.teacher_id).single(),
    supabase.from("subjects").select("name").eq("id", booking.subject_id).single(),
    supabase.from("users").select("full_name").eq("id", studentUserId).single(),
  ]);
  if (!teacher) return;

  const { data: teacherUser } = await supabase
    .from("users")
    .select("email, full_name")
    .eq("id", teacher.user_id)
    .single();
  if (!teacherUser) return;

  await sendTemplateEmail({
    to: teacherUser.email,
    templateId: "booking-request-teacher",
    variables: {
      teacher_name: teacherUser.full_name,
      student_name: student?.full_name ?? "Un estudiante",
      subject_name: subject?.name ?? "Clase",
      scheduled_at: new Date(booking.scheduled_at).toLocaleString("es-CO", {
        dateStyle: "long",
        timeStyle: "short",
      }),
      price: booking.price,
    },
  });
}
