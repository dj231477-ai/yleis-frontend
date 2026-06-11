import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Params = Promise<{ sessionId: string }>;

export async function GET(_req: Request, { params }: { params: Params }) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  // biome-ignore lint/suspicious/noExplicitAny: express_sessions no tipado con bookings join
  const { data: session } = await (supabase as any)
    .from("express_sessions")
    .select("status, expires_at, bookings(id)")
    .eq("id", sessionId)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
  }

  // Si expiró pero no se actualizó el status
  const isExpired = session.status === "searching" && new Date(session.expires_at) < new Date();

  return NextResponse.json({
    status: isExpired ? "expired" : session.status,
    bookingId: session.bookings?.[0]?.id ?? null,
    expiresAt: session.expires_at,
  });
}
