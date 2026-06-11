import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    subjectId?: string;
    description?: string;
    priceMin?: number;
    priceMax?: number;
  } | null;

  if (!body?.subjectId || !body?.priceMin || !body?.priceMax) {
    return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 });
  }
  if (body.priceMin > body.priceMax) {
    return NextResponse.json(
      { error: "El precio mínimo no puede ser mayor al máximo" },
      { status: 400 }
    );
  }

  // Obtener student_id
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!student)
    return NextResponse.json({ error: "Perfil de estudiante no encontrado" }, { status: 403 });

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  // biome-ignore lint/suspicious/noExplicitAny: express_sessions no está en schema tipado
  const { data: session, error: sessionError } = await (supabase as any)
    .from("express_sessions")
    .insert({
      student_id: student.id,
      subject_id: body.subjectId,
      description: body.description ?? null,
      price_min: body.priceMin,
      price_max: body.priceMax,
      status: "searching",
      duration_min: 60,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "No se pudo crear la solicitud" }, { status: 500 });
  }

  // Notificar a profesores verificados disponibles con esa materia
  // biome-ignore lint/suspicious/noExplicitAny: teacher_status no está en schema tipado
  const { data: availableTeachers } = await (supabase as any)
    .from("teachers")
    .select("id, user_id, hourly_rate")
    .eq("onboarding_step", "verified")
    .gte("hourly_rate", body.priceMin)
    .lte("hourly_rate", body.priceMax);

  if (availableTeachers && availableTeachers.length > 0) {
    const userIds = availableTeachers.map((t: { user_id: string }) => t.user_id);
    // biome-ignore lint/suspicious/noExplicitAny: notifications no está en schema tipado
    await (supabase as any).from("notifications").insert(
      userIds.map((uid: string) => ({
        user_id: uid,
        type: "express",
        title: "Nueva solicitud Express",
        body: "Un estudiante busca clase ahora mismo. ¡Acepta antes de 15 min!",
        data: { express_session_id: session.id },
      }))
    );
  }

  return NextResponse.json({ sessionId: session.id, expiresAt });
}
