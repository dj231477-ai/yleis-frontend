import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    status?: "online" | "offline" | "busy";
  } | null;

  const newStatus = body?.status ?? "offline";
  if (!["online", "offline", "busy"].includes(newStatus)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!teacher)
    return NextResponse.json({ error: "Perfil de profesor no encontrado" }, { status: 403 });

  // UPSERT en teacher_status — el profesor es dueño de su propio registro
  // biome-ignore lint/suspicious/noExplicitAny: teacher_status no está en schema tipado
  await (supabase as any)
    .from("teacher_status")
    .upsert(
      { teacher_id: teacher.id, status: newStatus, last_seen: new Date().toISOString() },
      { onConflict: "teacher_id" }
    );

  return NextResponse.json({ status: newStatus });
}
