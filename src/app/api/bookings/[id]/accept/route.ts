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

  // Leer el status actual para saber si generar código
  // biome-ignore lint/suspicious/noExplicitAny: tabla no tipada
  const { data: booking } = await (supabase as any)
    .from("bookings")
    .select("status, confirmation_code")
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

  // biome-ignore lint/suspicious/noExplicitAny: tabla no tipada
  const { error } = await (supabase as any)
    .from("bookings")
    .update({
      status: "confirmed",
      ...(confirmationCode ? { confirmation_code: confirmationCode } : {}),
    })
    .eq("id", id)
    .eq("teacher_id", teacher.id);

  if (error) {
    return NextResponse.json({ error: "No se pudo confirmar la reserva" }, { status: 500 });
  }

  return NextResponse.json({ confirmationCode });
}
