import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { sessionId?: string } | null;
  if (!body?.sessionId) return NextResponse.json({ error: "sessionId requerido" }, { status: 400 });

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id, hourly_rate")
    .eq("user_id", user.id)
    .single();
  if (!teacher)
    return NextResponse.json({ error: "Perfil de profesor no encontrado" }, { status: 403 });

  // Anti-race-condition: solo 1 profesor puede ganar — UPDATE con WHERE status='searching'
  // biome-ignore lint/suspicious/noExplicitAny: express_sessions no tipado
  const { data: session, error: matchError } = await (supabase as any)
    .from("express_sessions")
    .update({
      status: "matched",
      teacher_id: teacher.id,
    })
    .eq("id", body.sessionId)
    .eq("status", "searching")
    .gt("expires_at", new Date().toISOString())
    .select("student_id, subject_id, price_max, description")
    .single();

  if (matchError || !session) {
    return NextResponse.json(
      { error: "La sesión ya fue tomada o expiró. Intenta con otra solicitud." },
      { status: 409 }
    );
  }

  // Crear booking confirmado inmediatamente
  const code = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0");

  // biome-ignore lint/suspicious/noExplicitAny: bookings no tipado con todos los campos
  const { data: booking, error: bookingError } = await (supabase as any)
    .from("bookings")
    .insert({
      student_id: session.student_id,
      teacher_id: teacher.id,
      subject_id: session.subject_id,
      scheduled_at: new Date().toISOString(),
      duration_min: 60,
      status: "confirmed",
      price: session.price_max,
      confirmation_code: code,
      notes: session.description ?? null,
    })
    .select("id")
    .single();

  if (bookingError || !booking) {
    return NextResponse.json({ error: "No se pudo crear la clase" }, { status: 500 });
  }

  // Notificar al estudiante
  // biome-ignore lint/suspicious/noExplicitAny: students + users join no tipado
  const { data: studentUser } = await (supabase as any)
    .from("students")
    .select("users(id)")
    .eq("id", session.student_id)
    .single();

  if (studentUser?.users?.id) {
    // biome-ignore lint/suspicious/noExplicitAny: notifications no tipado
    await (supabase as any).from("notifications").insert({
      user_id: studentUser.users.id,
      type: "express",
      title: "¡Profesor encontrado!",
      body: "Tu solicitud Express fue aceptada. La clase comienza ahora.",
      data: { booking_id: booking.id },
    });
  }

  return NextResponse.json({ bookingId: booking.id });
}
