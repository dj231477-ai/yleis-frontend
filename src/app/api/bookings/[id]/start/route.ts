import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: bookingId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { code?: string } | null;
  if (!body?.code) return NextResponse.json({ error: "Código requerido" }, { status: 400 });

  // Fetch booking — teacher must own it and it must be confirmed
  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!teacher)
    return NextResponse.json({ error: "Perfil de profesor no encontrado" }, { status: 403 });

  // biome-ignore lint/suspicious/noExplicitAny: confirmation_code not in typed schema
  const { data: booking } = await (supabase as any)
    .from("bookings")
    .select("id, confirmation_code, status")
    .eq("id", bookingId)
    .eq("teacher_id", teacher.id)
    .in("status", ["confirmed", "paid"])
    .maybeSingle();

  if (!booking) {
    return NextResponse.json({ error: "Clase no encontrada o ya iniciada" }, { status: 404 });
  }

  if (booking.confirmation_code !== body.code) {
    return NextResponse.json({ error: "Código incorrecto" }, { status: 400 });
  }

  // biome-ignore lint/suspicious/noExplicitAny: status not fully typed
  const { error: updateError } = await (supabase as any)
    .from("bookings")
    .update({ status: "in_progress", updated_at: new Date().toISOString() })
    .eq("id", bookingId);

  if (updateError) {
    return NextResponse.json({ error: "No se pudo iniciar la clase" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
