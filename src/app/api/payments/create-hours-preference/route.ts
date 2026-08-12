import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const MP_PREFERENCES_URL = "https://api.mercadopago.com/checkout/preferences";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const category = body?.category;
    const hours = Number(body?.hours);

    if (category !== "A" && category !== "B") {
      return NextResponse.json({ error: "categoría inválida" }, { status: 400 });
    }
    if (!Number.isFinite(hours) || hours <= 0 || hours > 200) {
      return NextResponse.json({ error: "cantidad de horas inválida" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    // Precio calculado siempre en el servidor (mismo descuento escalonado
    // que los paquetes fijos) — nunca se confía en un monto del cliente.
    const { data: price, error: priceError } = await supabase.rpc("calculate_custom_hours_price", {
      p_category: category,
      p_hours: hours,
    });

    if (priceError || price === null) {
      console.error("[create-hours-preference] Error calculando precio:", priceError?.message);
      return NextResponse.json({ error: "No se pudo calcular el precio" }, { status: 500 });
    }

    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json({ error: "Pagos no disponibles en este momento" }, { status: 503 });
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://yleis.co");

    const preference = {
      items: [
        {
          id: `hours_${category}`,
          title: `${hours}h sueltas — Categoría ${category} — Yleis`,
          quantity: 1,
          unit_price: Number(price),
          currency_id: "COP",
        },
      ],
      payer: { email: user.email },
      back_urls: {
        success: `${appUrl}/app/plans/activate-hours`,
        failure: `${appUrl}/app/plans?payment=failed`,
        pending: `${appUrl}/app/plans/activate-hours`,
      },
      auto_approve: false,
      // external_reference: hours:category:hours:userId — para identificar el pago en la activación
      external_reference: `hours:${category}:${hours}:${user.id}`,
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
        "X-Idempotency-Key": `hours-${category}-${hours}-${user.id}-${Date.now()}`,
      },
      body: JSON.stringify(preference),
    });

    if (!mpRes.ok) {
      const detail = await mpRes.text();
      console.error("[create-hours-preference] MP error:", mpRes.status, detail);
      return NextResponse.json({ error: "Error al crear el pago" }, { status: 502 });
    }

    const mpData = (await mpRes.json()) as { init_point: string; sandbox_init_point: string };
    const initPoint =
      process.env.NODE_ENV === "production" ? mpData.init_point : mpData.sandbox_init_point;

    return NextResponse.json({ init_point: initPoint });
  } catch (e) {
    console.error("[create-hours-preference]", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
