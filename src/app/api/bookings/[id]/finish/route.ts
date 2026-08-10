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
    .select("id, status")
    .eq("id", id)
    .eq("teacher_id", teacher.id)
    .eq("status", "in_progress")
    .maybeSingle();

  if (!booking) {
    return NextResponse.json({ error: "Clase no encontrada o no está en curso" }, { status: 404 });
  }

  // biome-ignore lint/suspicious/noExplicitAny: tabla no tipada
  const { error } = await (supabase as any)
    .from("bookings")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("teacher_id", teacher.id);

  if (error) {
    return NextResponse.json({ error: "No se pudo finalizar la clase" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
