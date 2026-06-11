import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  // biome-ignore lint/suspicious/noExplicitAny: subjects no está en schema tipado
  const { data } = await (supabase as any).from("subjects").select("id, name").order("name");

  return NextResponse.json({ subjects: data ?? [] });
}
