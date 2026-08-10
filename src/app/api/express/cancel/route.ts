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

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!student)
    return NextResponse.json({ error: "Perfil de estudiante no encontrado" }, { status: 403 });

  // RLS ya restringe el UPDATE al dueño de la sesión; el filtro por status="searching"
  // evita cancelar una sesión que un profesor ya tomó justo antes (anti-carrera).
  // biome-ignore lint/suspicious/noExplicitAny: express_sessions no está en schema tipado
  const { data: cancelled, error } = await (supabase as any)
    .from("express_sessions")
    .update({ status: "cancelled_student" })
    .eq("id", body.sessionId)
    .eq("student_id", student.id)
    .eq("status", "searching")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[express/cancel]", error);
    return NextResponse.json({ error: "Error interno al cancelar la sesión" }, { status: 500 });
  }

  if (!cancelled) {
    return NextResponse.json(
      { error: "La sesión ya fue aceptada por un profesor o ya no existe" },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true });
}
