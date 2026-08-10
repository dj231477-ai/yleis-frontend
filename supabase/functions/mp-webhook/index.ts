import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { sendPaymentReceiptEmail } from "../_shared/email.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

// ORDEN OBLIGATORIO — no reordenar:
// 1. Validar firma HMAC → 401 si inválida
// 2. Verificar idempotencia → 200 si ya existe
// 3. Obtener detalles del pago desde MP API → actualizar booking status
// 4. INSERT en mp_webhook_logs
// 5. Retornar 200 a MP (timeout 5s)
// 6. Forward a n8n de forma async (no bloquea la respuesta)

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Leer el body una sola vez — no se puede leer dos veces
  const rawBody = await req.text();
  let payload: Record<string, unknown>;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  // Paso 1: Validar firma HMAC de Mercado Pago
  const isValid = await validateMPSignature(req, payload);
  if (!isValid) {
    console.warn("[mp-webhook] HMAC inválida — rechazando request");
    return new Response(JSON.stringify({ error: "Firma inválida" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const action = String(payload.action ?? "");
  const eventId = String((payload.data as { id?: string })?.id ?? "");

  if (!eventId) {
    return new Response("OK", { status: 200 });
  }

  // Paso 2: Verificar idempotencia
  const { data: existing } = await supabaseAdmin
    .from("mp_webhook_logs")
    .select("id")
    .eq("mp_event_id", eventId)
    .maybeSingle();

  if (existing) {
    console.log(`[mp-webhook] Evento duplicado ignorado: ${eventId}`);
    return new Response("OK", { status: 200 });
  }

  // Paso 3: Obtener detalles del pago y actualizar booking status
  if (action === "payment.created" || action === "payment.updated") {
    await updateBookingFromPayment(eventId);
  }

  // Paso 4: Registrar
  await supabaseAdmin
    .from("mp_webhook_logs")
    .insert({ mp_event_id: eventId, action, status: 200, payload });

  // Paso 5: Responder a MP INMEDIATAMENTE (< 5s)
  const response = new Response("OK", { status: 200 });

  // Paso 6: Forward a n8n de forma async — no bloquea la respuesta
  const n8nUrl = Deno.env.get("N8N_WEBHOOK_URL");
  const n8nSecret = Deno.env.get("N8N_WEBHOOK_SECRET");

  if (n8nUrl) {
    EdgeRuntime.waitUntil(
      fetch(`${n8nUrl}/webhook/mp-payment-confirmed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-webhook-secret": n8nSecret ?? "",
        },
        body: JSON.stringify({ event_id: eventId, action, payload }),
      }).catch((e) => {
        console.error("[mp-webhook] Error forwarding a n8n:", e);
        supabaseAdmin.from("admin_tasks").insert({
          type: "webhook_forward_error",
          description: "Error al hacer forward del webhook de MP a n8n",
          data: { event_id: eventId, error: String(e) },
        });
      })
    );
  }

  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      fn: "mp-webhook",
      action,
      event_id: eventId,
    })
  );

  return response;
});

const MP_STATUS_TO_BOOKING: Record<string, string> = {
  approved: "paid",
  rejected: "cancelled_student",
  cancelled: "cancelled_student",
  pending: "pending",
  in_process: "pending",
  refunded: "refunded",
  charged_back: "refunded",
};

async function updateBookingFromPayment(paymentId: string): Promise<void> {
  const accessToken = Deno.env.get("MP_ACCESS_TOKEN");
  if (!accessToken) {
    console.warn("[mp-webhook] MP_ACCESS_TOKEN no configurado — no se actualiza el booking");
    return;
  }

  try {
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!mpRes.ok) {
      console.error("[mp-webhook] Error al obtener pago de MP:", mpRes.status);
      return;
    }

    const payment = (await mpRes.json()) as {
      id: number;
      status: string;
      status_detail: string;
      external_reference: string | null;
      transaction_amount: number;
      currency_id: string;
    };

    const bookingId = payment.external_reference;
    const bookingStatus = MP_STATUS_TO_BOOKING[payment.status];

    if (!bookingId || !bookingStatus) return;

    await supabaseAdmin.from("bookings").update({ status: bookingStatus }).eq("id", bookingId);

    // Registrar pago aprobado en tabla payments
    if (payment.status === "approved") {
      await supabaseAdmin.from("payments").upsert(
        {
          booking_id: bookingId,
          mp_payment_id: String(payment.id),
          amount: payment.transaction_amount,
          currency: payment.currency_id,
          status: "approved",
          mp_status: payment.status,
          mp_status_detail: payment.status_detail,
        },
        { onConflict: "mp_payment_id" }
      );

      await sendPaymentReceiptToStudent(bookingId, payment.transaction_amount);
    }

    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        fn: "mp-webhook",
        action: "booking_updated",
        booking_id: bookingId,
        mp_status: payment.status,
        new_status: bookingStatus,
      })
    );
  } catch (e) {
    console.error("[mp-webhook] Error en updateBookingFromPayment:", e);
    await supabaseAdmin.from("admin_tasks").insert({
      type: "payment_update_error",
      description: "Error al actualizar booking desde MP webhook",
      data: { payment_id: paymentId, error: String(e) },
    });
  }
}

async function sendPaymentReceiptToStudent(bookingId: string, amount: number): Promise<void> {
  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("students!inner(users!inner(email, full_name))")
    .eq("id", bookingId)
    .single();

  const student = (
    booking as { students?: { users?: { email: string; full_name: string } } } | null
  )?.students?.users;
  if (!student?.email) return;

  try {
    await sendPaymentReceiptEmail({
      to: student.email,
      studentName: student.full_name,
      amount,
    });
  } catch (e) {
    console.error("[mp-webhook] Error enviando email de recibo de pago:", e);
  }
}

async function validateMPSignature(req: Request, _payload: unknown): Promise<boolean> {
  const secret = Deno.env.get("MP_WEBHOOK_SECRET");
  if (!secret) {
    // Sin secreto configurado: solo permitir en desarrollo local
    const env = Deno.env.get("ENVIRONMENT") ?? "production";
    return env === "local";
  }

  const sig = req.headers.get("x-signature");
  const reqId = req.headers.get("x-request-id");
  const dataId = new URL(req.url).searchParams.get("data.id");

  if (!sig || !reqId || !dataId) return false;

  const ts = sig
    .split(",")
    .find((p) => p.startsWith("ts="))
    ?.split("=")[1];
  const hash = sig
    .split(",")
    .find((p) => p.startsWith("v1="))
    ?.split("=")[1];
  if (!ts || !hash) return false;

  const manifest = `id:${dataId};request-id:${reqId};ts:${ts};`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const buf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
  const expected = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Comparación de strings de igual longitud (tiempo constante aproximado)
  if (expected.length !== hash.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ hash.charCodeAt(i);
  }
  return diff === 0;
}

// Declaración de tipo para EdgeRuntime (Supabase Deno runtime)
declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void };
