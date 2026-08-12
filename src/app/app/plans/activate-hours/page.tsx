// MP redirige aquí tras el pago de horas sueltas con estos query params:
// collection_status, collection_id, payment_id, status, external_reference, merchant_order_id, preference_id
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  collection_status?: string;
  collection_id?: string;
  payment_id?: string;
  external_reference?: string;
}>;

export default async function ActivateHoursPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;

  const collectionStatus = sp.collection_status;
  const paymentId = sp.payment_id ?? sp.collection_id;
  const externalRef = sp.external_reference ?? "";

  // Solo activar si el pago fue aprobado y es un pago de horas sueltas
  if (collectionStatus !== "approved" || !paymentId || !externalRef.startsWith("hours:")) {
    redirect("/app/plans?payment=pending");
  }

  // external_reference: "hours:category:hours:userId"
  const [, category, hoursRaw, refUserId] = externalRef.split(":");
  const hours = Number(hoursRaw);

  if ((category !== "A" && category !== "B") || !Number.isFinite(hours) || hours <= 0) {
    redirect("/app/plans?payment=failed");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verificar que el external_reference pertenece al usuario actual (anti-fraude)
  if (refUserId && refUserId !== user.id) {
    redirect("/app/plans?payment=failed");
  }

  // Verificar el pago con la API de MP antes de activar (server-side, MP_ACCESS_TOKEN
  // nunca al cliente). Fail-closed, igual que /app/plans/activate.
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    console.error(
      "[activate-hours] MP_ACCESS_TOKEN no configurado — no se puede verificar el pago"
    );
    redirect("/app/plans?payment=error");
  }

  let payment: { status: string; external_reference: string } | null = null;
  try {
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      next: { revalidate: 0 },
    });
    if (mpRes.ok) {
      payment = (await mpRes.json()) as { status: string; external_reference: string };
    } else {
      console.error("[activate-hours] MP respondió", mpRes.status);
    }
  } catch (e) {
    console.error("[activate-hours] Error consultando MP:", e);
  }

  if (!payment || payment.status !== "approved" || payment.external_reference !== externalRef) {
    redirect("/app/plans?payment=failed");
  }

  // Emitir un grant de un solo uso (precio recalculado en el servidor, no
  // se confía en nada del cliente) y pasarlo a activate_custom_hours.
  const { data: grantRows, error: grantError } = await supabase.rpc("create_custom_hours_grant", {
    p_category: category,
    p_hours: hours,
    p_mp_payment_id: paymentId,
  });

  const grantToken = grantRows?.[0]?.token;

  if (grantError || !grantToken) {
    console.error("[activate-hours] No se pudo emitir el grant:", grantError?.message);
    redirect("/app/plans?payment=error");
  }

  const { error } = await supabase.rpc("activate_custom_hours", {
    p_category: category,
    p_hours: hours,
    p_mp_payment_id: paymentId,
    p_grant_token: grantToken,
  });

  if (error) {
    console.error("[activate-hours]", error.message);
    redirect("/app/plans?payment=error");
  }

  redirect("/app/plans?activated=1");
}
