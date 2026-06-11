import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const ERROR_MESSAGES: Record<string, string> = {
  STUDENT_NOT_FOUND: "No se encontró tu perfil de estudiante.",
  NO_CLASSES_AVAILABLE: "No tienes clases disponibles en tu plan activo.",
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
  } | null;

  if (!body?.teacherId || !body?.subjectId || !body?.scheduledAt || !body?.durationMin) {
    return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 });
  }

  // biome-ignore lint/suspicious/noExplicitAny: RPC no está en el schema generado
  const { data, error } = await (supabase as any).rpc("create_scheduled_booking", {
    p_teacher_id: body.teacherId,
    p_subject_id: body.subjectId,
    p_scheduled_at: body.scheduledAt,
    p_duration_min: body.durationMin,
    p_notes: body.notes ?? null,
  });

  if (error) {
    const code = (error.message ?? "").toUpperCase().trim();
    const msg = ERROR_MESSAGES[code] ?? "No se pudo crear la reserva. Intenta de nuevo.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return NextResponse.json({ bookingId: data });
}
