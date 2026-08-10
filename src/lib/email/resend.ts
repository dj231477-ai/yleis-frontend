import { type EmailTemplateId, renderEmailTemplate } from "@/lib/email/templates";

type SendTemplateEmailInput = {
  to: string | string[];
  templateId: EmailTemplateId;
  variables?: Record<string, string | number | null | undefined>;
  subject?: string;
  replyTo?: string;
};

type ResendSuccess = {
  id: string;
};

type ResendError = {
  message?: string;
  name?: string;
};

const RESEND_API_URL = "https://api.resend.com/emails";

function getEmailEnv(key: string) {
  const value = process.env[key];
  if (!value) throw new Error(`Variable de entorno faltante: ${key}`);
  return value;
}

export async function sendTemplateEmail(input: SendTemplateEmailInput) {
  const apiKey = getEmailEnv("RESEND_API_KEY");
  const from = process.env.RESEND_FROM_EMAIL ?? "Yleis <hola@yleis.co>";
  const { subject, html } = renderEmailTemplate(input.templateId, input.variables);

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(input.to) ? input.to : [input.to],
      subject: input.subject ?? subject,
      html,
      reply_to: input.replyTo ?? process.env.RESEND_REPLY_TO ?? "hola@yleis.co",
    }),
  });

  const payload = (await response.json().catch(() => null)) as ResendSuccess | ResendError | null;

  if (!response.ok) {
    const message =
      payload && "message" in payload && payload.message
        ? payload.message
        : "No se pudo enviar el email";
    throw new Error(`[resend] ${response.status}: ${message}`);
  }

  return payload as ResendSuccess;
}
