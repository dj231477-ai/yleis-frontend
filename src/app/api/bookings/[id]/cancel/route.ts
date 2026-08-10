import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Params = Promise<{ id: string }>;

export async function POST(req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { reason?: string } | null;

  // cancel-booking valida pertenencia (estudiante o profesor del booking),
  // el estado cancelable y el reembolso de horas — ver supabase/functions/cancel-booking
  const { data, error } = await supabase.functions.invoke("cancel-booking", {
    body: { booking_id: id, reason: body?.reason ?? undefined },
  });

  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status ?? 500;
    let message = "No se pudo cancelar la reserva";
    try {
      const parsed = (await (error as { context: Response }).context.json()) as {
        error?: string;
      };
      if (parsed?.error) message = parsed.error;
    } catch {
      // sin body JSON legible - usar mensaje genérico
    }
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json(data);
}
