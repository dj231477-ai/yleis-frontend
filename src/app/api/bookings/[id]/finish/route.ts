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

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!teacher)
    return NextResponse.json({ error: "Perfil de profesor no encontrado" }, { status: 403 });

  // biome-ignore lint/suspicious/noExplicitAny: tabla no tipada
  const { data: booking } = await (supabase as any)
    .from("bookings")
    .select("id, status, scheduled_at, scheduled_end_at")
    .eq("id", id)
    .eq("teacher_id", teacher.id)
    .eq("status", "in_progress")
    .maybeSingle();

  if (!booking) {
    return NextResponse.json({ error: "Clase no encontrada o no está en curso" }, { status: 404 });
  }

  const now = new Date();
  // Si se finaliza antes de la hora contratada, acortar scheduled_end_at a
  // ahora — si no, el rango original sigue "ocupando" el calendario del
  // profesor hasta su fin planeado y bloquea nuevas reservas (constraint
  // no_overlapping_bookings no distingue completed de una clase en curso real).
  // Nunca por debajo de scheduled_at: si la clase se marca in_progress/completed
  // fuera de su fecha agendada (p. ej. iniciar y terminar el mismo día para una
  // clase programada semanas después), scheduled_end_at < scheduled_at rompe la
  // construcción del tstzrange usado por esa misma constraint.
  const scheduledAt = new Date(booking.scheduled_at);
  const scheduledEndAtOriginal = new Date(booking.scheduled_end_at);
  const scheduledEndAt =
    now < scheduledEndAtOriginal
      ? new Date(Math.max(now.getTime(), scheduledAt.getTime())).toISOString()
      : booking.scheduled_end_at;

  // biome-ignore lint/suspicious/noExplicitAny: tabla no tipada
  const { error } = await (supabase as any)
    .from("bookings")
    .update({
      status: "completed",
      scheduled_end_at: scheduledEndAt,
      updated_at: now.toISOString(),
    })
    .eq("id", id)
    .eq("teacher_id", teacher.id);

  if (error) {
    return NextResponse.json({ error: "No se pudo finalizar la clase" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
