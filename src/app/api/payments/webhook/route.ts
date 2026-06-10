// Webhook de Mercado Pago → Next.js route handler
//
// Responsabilidades de ESTE handler:
//   1. Validar que el payload es JSON parseable
//   2. Reenviar al Edge Function mp-webhook que tiene service_role
//   3. Responder 200 a MP en < 5 segundos
//
// La validación HMAC completa, idempotencia y update de booking
// ocurren en supabase/functions/mp-webhook/index.ts

export async function POST(request: Request) {
  const rawBody = await request.text();

  // Rechazar payloads que no son JSON válido
  try {
    JSON.parse(rawBody);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    console.error("[mp-webhook] NEXT_PUBLIC_SUPABASE_URL no configurado");
    return new Response("OK", { status: 200 }); // 200 para que MP no reintente
  }

  // Preservar query params (data.id viene como ?data.id=xxx en la URL de MP)
  const url = new URL(request.url);
  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/mp-webhook?${url.searchParams.toString()}`;

  // Reenviar con headers originales de firma de MP
  const forwardHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const sig = request.headers.get("x-signature");
  const reqId = request.headers.get("x-request-id");
  if (sig) forwardHeaders["x-signature"] = sig;
  if (reqId) forwardHeaders["x-request-id"] = reqId;

  // Llamada síncrona — la Edge Function responde en < 2s
  // MP espera hasta 5s antes de marcar como timeout
  try {
    await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: forwardHeaders,
      body: rawBody,
      signal: AbortSignal.timeout(4000),
    });
  } catch (e) {
    // Edge Function no disponible (aún no deployada) — logear pero siempre devolver 200
    // para que MP no reintente. El booking se actualizará cuando la Edge Function esté activa.
    console.error("[mp-webhook] Error al reenviar al Edge Function:", e);
  }

  return new Response("OK", { status: 200 });
}
