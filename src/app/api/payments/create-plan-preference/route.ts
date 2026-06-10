import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const MP_PREFERENCES_URL = "https://api.mercadopago.com/checkout/preferences";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body?.planSlug || typeof body.planSlug !== "string") {
      return NextResponse.json({ error: "planSlug requerido" }, { status: 400 });
    }
    const { planSlug } = body as { planSlug: string };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data: plan } = await supabase
      .from("membership_plans")
      .select("id, name, price, slug")
      .eq("slug", planSlug)
      .eq("is_active", true)
      .single();

    if (!plan) return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
    if (Number(plan.price) === 0) {
      return NextResponse.json({ error: "El plan gratuito no requiere pago" }, { status: 400 });
    }

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
          id: plan.slug,
          title: `Plan ${plan.name} — Yleis`,
          quantity: 1,
          unit_price: Number(plan.price),
          currency_id: "COP",
        },
      ],
      payer: { email: user.email },
      back_urls: {
        success: `${appUrl}/app/plans/activate`,
        failure: `${appUrl}/app/plans?payment=failed`,
        pending: `${appUrl}/app/plans/activate`,
      },
      auto_approve: false,
      // external_reference: plan:slug:userId — para identificar el pago en la activación
      external_reference: `plan:${planSlug}:${user.id}`,
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
        "X-Idempotency-Key": `plan-${planSlug}-${user.id}`,
      },
      body: JSON.stringify(preference),
    });

    if (!mpRes.ok) {
      const detail = await mpRes.text();
      console.error("[create-plan-preference] MP error:", mpRes.status, detail);
      return NextResponse.json({ error: "Error al crear el pago" }, { status: 502 });
    }

    const mpData = (await mpRes.json()) as { init_point: string; sandbox_init_point: string };
    const initPoint =
      process.env.NODE_ENV === "production" ? mpData.init_point : mpData.sandbox_init_point;

    return NextResponse.json({ init_point: initPoint });
  } catch (e) {
    console.error("[create-plan-preference]", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
