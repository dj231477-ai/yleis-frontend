import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id, hourly_rate")
    .eq("user_id", user.id)
    .single();
  if (!teacher) return NextResponse.json({ requests: [] });

  // Sesiones buscando con precio compatible con la tarifa del profesor
  // biome-ignore lint/suspicious/noExplicitAny: express_sessions + subjects join no tipado
  const { data } = await (supabase as any)
    .from("express_sessions")
    .select("id, description, price_min, price_max, expires_at, subjects(name)")
    .eq("status", "searching")
    .gt("expires_at", new Date().toISOString())
    .lte("price_min", teacher.hourly_rate ?? 999999)
    .gte("price_max", teacher.hourly_rate ?? 0)
    .order("created_at", { ascending: true })
    .limit(10);

  // biome-ignore lint/suspicious/noExplicitAny: join no tipado
  const requests = (data ?? []).map((r: any) => ({
    id: r.id,
    description: r.description ?? null,
    price_min: Number(r.price_min ?? 0),
    price_max: Number(r.price_max ?? 0),
    expires_at: r.expires_at,
    subject_name: r.subjects?.name ?? "Clase",
  }));

  return NextResponse.json({ requests });
}
