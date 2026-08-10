import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
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
  if (!teacher) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 403 });

  await supabase.from("teacher_calendar_connections").delete().eq("teacher_id", teacher.id);
  await supabase
    .from("teachers")
    .update({ google_calendar_connected: false, google_calendar_email: null })
    .eq("id", teacher.id);

  return NextResponse.json({ ok: true });
}
