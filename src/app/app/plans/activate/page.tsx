// MP redirige aquí tras el pago del plan con estos query params:
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

export default async function PlanActivatePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;

  const collectionStatus = sp.collection_status;
  const paymentId = sp.payment_id ?? sp.collection_id;
  const externalRef = sp.external_reference ?? "";

  // Solo activar si el pago fue aprobado y es un pago de plan
  if (collectionStatus !== "approved" || !paymentId || !externalRef.startsWith("plan:")) {
    redirect("/app/plans?payment=pending");
  }

  // external_reference: "plan:slug:userId"
  const [, planSlug, refUserId] = externalRef.split(":");

  if (!planSlug) redirect("/app/plans?payment=failed");

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
  // nunca al cliente). Fail-closed: token no configurado, MP no responde, o cualquier
  // duda sobre el pago => no se activa nada (antes esto "procedía igual").
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    console.error("[activate-plan] MP_ACCESS_TOKEN no configurado — no se puede verificar el pago");
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
      console.error("[activate-plan] MP respondió", mpRes.status);
    }
  } catch (e) {
    console.error("[activate-plan] Error consultando MP:", e);
  }

  if (!payment || payment.status !== "approved" || payment.external_reference !== externalRef) {
    redirect("/app/plans?payment=failed");
  }

  // Emitir un grant de un solo uso (solo alcanzable habiendo pasado la verificación de
  // arriba) y pasarlo a activate_membership — el RPC ya no acepta activarse sin él, así
  // que llamarlo directo desde fuera de esta página (con un payment_id inventado) falla.
  const { data: grantToken, error: grantError } = await supabase.rpc(
    "create_membership_activation_grant",
    { p_plan_slug: planSlug, p_mp_payment_id: paymentId }
  );

  if (grantError || !grantToken) {
    console.error("[activate-plan] No se pudo emitir el grant:", grantError?.message);
    redirect("/app/plans?payment=error");
  }

  const { error } = await supabase.rpc("activate_membership", {
    p_plan_slug: planSlug,
    p_mp_payment_id: paymentId,
    p_grant_token: grantToken,
  });

  if (error) {
    console.error("[activate-plan]", error.message);
    redirect("/app/plans?payment=error");
  }

  redirect("/app/plans?activated=1");
}
