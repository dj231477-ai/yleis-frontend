// Envío de emails transaccionales desde Edge Functions (Deno) — llama a Resend
// directamente en vez de depender del forward a n8n, que hoy no está activo.
// Duplica (deliberadamente, como BUSINESS en config.ts) una versión mínima de los
// templates de frontend/src/lib/email/templates.ts: Deno no puede importar ese
// módulo (runtime distinto), así que se mantienen sincronizados a mano.

const RESEND_API_URL = "https://api.resend.com/emails";

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY no configurado — email no enviado");
    return;
  }
  const from = Deno.env.get("RESEND_FROM_EMAIL") ?? "Yleis <hola@yleis.co>";

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[email] Resend ${res.status}: ${body}`);
  }
}

function money(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function layout(body: string): string {
  return `<!doctype html>
<html lang="es">
  <body style="margin:0;background:#f5f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a2e">
    <main style="max-width:600px;margin:0 auto;padding:40px 20px">
      <section style="background:#ffffff;border-radius:16px;padding:40px;box-shadow:0 2px 12px rgba(0,0,0,.06)">
        <div style="font-size:28px;font-weight:800;margin-bottom:28px">Y<span style="color:#6c5ce7">leis</span></div>
        ${body}
      </section>
    </main>
  </body>
</html>`;
}

export async function sendPaymentReceiptEmail(params: {
  to: string;
  studentName: string;
  amount: number;
}): Promise<void> {
  await sendEmail(
    params.to,
    "Pago confirmado en Yleis",
    layout(`
      <h1 style="font-size:24px;margin:0 0 12px">Pago confirmado</h1>
      <p style="font-size:16px;line-height:1.6;color:#4a4a68">Gracias, ${params.studentName}. Tu clase quedó reservada.</p>
      <p style="font-size:16px;line-height:1.6;color:#1a1a2e"><strong>Total pagado: ${money(params.amount)}</strong></p>
    `)
  );
}

export async function sendBookingCancelledEmail(params: {
  to: string;
  refundAmount: number;
  hasRefund: boolean;
}): Promise<void> {
  const body = params.hasRefund
    ? `<h1 style="font-size:24px;margin:0 0 12px">Clase cancelada</h1>
       <p style="font-size:16px;line-height:1.6;color:#4a4a68">Procesaremos el reembolso de <strong>${money(params.refundAmount)}</strong> a tu método de pago original.</p>`
    : `<h1 style="font-size:24px;margin:0 0 12px">Clase cancelada</h1>
       <p style="font-size:16px;line-height:1.6;color:#4a4a68">La reserva fue cancelada de acuerdo con la política de cancelación vigente. No aplica reembolso.</p>`;

  await sendEmail(
    params.to,
    params.hasRefund ? "Clase cancelada - reembolso en camino" : "Clase cancelada",
    layout(body)
  );
}
