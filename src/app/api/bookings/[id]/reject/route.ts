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

  // Leer status: si es pending_teacher, usar RPC para restaurar la clase al plan
  // biome-ignore lint/suspicious/noExplicitAny: tabla no tipada
  const { data: booking } = await (supabase as any)
    .from("bookings")
    .select("status, auto_assign")
    .eq("id", id)
    .eq("teacher_id", teacher.id)
    .in("status", ["pending_teacher", "pending"])
    .single();

  if (!booking) {
    return NextResponse.json({ error: "Reserva no encontrada o ya procesada" }, { status: 404 });
  }

  if (booking.status === "pending_teacher" && booking.auto_assign) {
    // Solicitud de asignación automática: en vez de cancelar, reasignar al
    // siguiente profesor candidato (mismo criterio, excluyendo a los ya
    // intentados) — solo cancela y devuelve las horas si no queda ninguno.
    // biome-ignore lint/suspicious/noExplicitAny: RPC no tipado
    const { data: result, error } = await (supabase as any).rpc("reassign_or_cancel_auto_booking", {
      p_booking_id: id,
    });
    if (error) {
      return NextResponse.json({ error: "No se pudo rechazar la reserva" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, reassigned: Boolean(result?.reassigned) });
  }

  if (booking.status === "pending_teacher") {
    // Restaura clase al plan del estudiante + cancela booking en una sola transacción
    // biome-ignore lint/suspicious/noExplicitAny: RPC no tipado
    const { error } = await (supabase as any).rpc("restore_booking_class", {
      p_booking_id: id,
    });
    if (error) {
      return NextResponse.json({ error: "No se pudo rechazar la reserva" }, { status: 500 });
    }
  } else {
    // Booking de pago directo — solo cancelar, sin clase que restaurar
    // biome-ignore lint/suspicious/noExplicitAny: tabla no tipada
    const { error } = await (supabase as any)
      .from("bookings")
      .update({ status: "cancelled_teacher" })
      .eq("id", id)
      .eq("teacher_id", teacher.id)
      .eq("status", "pending");
    if (error) {
      return NextResponse.json({ error: "No se pudo rechazar la reserva" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
