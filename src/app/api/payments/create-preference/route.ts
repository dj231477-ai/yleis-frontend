import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const MP_PREFERENCES_URL = "https://api.mercadopago.com/checkout/preferences";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body?.bookingId || typeof body.bookingId !== "string") {
      return NextResponse.json({ error: "bookingId requerido" }, { status: 400 });
    }
    const { bookingId, isExpress = false } = body as {
      bookingId: string;
      isExpress?: boolean;
    };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    // Validar ownership via RLS (el estudiante solo ve sus propias reservas)
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, price, status, teacher_id, duration_min")
      .eq("id", bookingId)
      .single();

    if (!booking) return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
    if (booking.status !== "pending") {
      return NextResponse.json(
        { error: "Esta reserva ya fue pagada o cancelada" },
        { status: 400 }
      );
    }

    // Calcular descuento Express según el plan activo del estudiante
    let expressDiscount = 0;
    if (isExpress) {
      const { data: planRows } = await supabase.rpc("get_active_plan", {
        p_user_id: user.id,
      });
      if (planRows && planRows.length > 0) {
        expressDiscount = Number(planRows[0].express_discount ?? 0);
      }
    }

    const originalPrice = Number(booking.price);
    const unitPrice = isExpress ? Math.round(originalPrice * (1 - expressDiscount)) : originalPrice;

    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json({ error: "Pagos no disponibles en este momento" }, { status: 503 });
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://yleis.com");

    const preference = {
      items: [
        {
          id: bookingId,
          title: isExpress
            ? `Clase Express — ${booking.duration_min} min`
            : `Clase particular — ${booking.duration_min} min`,
          quantity: 1,
          unit_price: unitPrice,
          currency_id: "COP",
        },
      ],
      payer: { email: user.email },
      back_urls: {
        success: `${appUrl}/app/student/booking/confirmation?payment=success&booking_id=${bookingId}`,
        failure: `${appUrl}/app/student/booking/${booking.teacher_id}?payment=failed`,
        pending: `${appUrl}/app/student/booking/confirmation?payment=pending&booking_id=${bookingId}`,
      },
      auto_approve: false,
      external_reference: bookingId,
      notification_url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/mp-webhook`,
      statement_descriptor: "Yleis",
      expires: true,
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    const mpRes = await fetch(MP_PREFERENCES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": bookingId,
      },
      body: JSON.stringify(preference),
    });

    if (!mpRes.ok) {
      const detail = await mpRes.text();
      console.error("[create-preference] MP error:", mpRes.status, detail);
      return NextResponse.json({ error: "Error al crear el pago" }, { status: 502 });
    }

    const mpData = (await mpRes.json()) as { init_point: string; sandbox_init_point: string };
    const initPoint =
      process.env.NODE_ENV === "production" ? mpData.init_point : mpData.sandbox_init_point;

    return NextResponse.json({ init_point: initPoint, discount_applied: expressDiscount });
  } catch (e) {
    console.error("[create-preference]", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
