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

  // SECURITY DEFINER function handles: match session + create booking atomically
  // biome-ignore lint/suspicious/noExplicitAny: accept_express_session not in typed schema yet
  const { data: result, error } = await (supabase as any).rpc("accept_express_session", {
    p_session_id: body.sessionId,
    p_teacher_user_id: user.id,
  });

  if (error) {
    console.error("[express/accept]", error);
    return NextResponse.json({ error: "Error interno al aceptar la sesión" }, { status: 500 });
  }

  const res = result as { booking_id?: string; error?: string };

  if (res.error === "TEACHER_NOT_FOUND") {
    return NextResponse.json({ error: "Perfil de profesor no encontrado" }, { status: 403 });
  }

  if (res.error === "SESSION_TAKEN") {
    return NextResponse.json(
      { error: "La sesión ya fue tomada o expiró. Intenta con otra solicitud." },
      { status: 409 }
    );
  }

  if (!res.booking_id) {
    return NextResponse.json({ error: "No se pudo crear la clase" }, { status: 500 });
  }

  return NextResponse.json({ bookingId: res.booking_id });
}
