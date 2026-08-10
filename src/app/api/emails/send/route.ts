import { sendTemplateEmail } from "@/lib/email/resend";
import { EMAIL_TEMPLATES, type EmailTemplateId } from "@/lib/email/templates";
import { NextResponse } from "next/server";

type SendEmailBody = {
  to?: string | string[];
  templateId?: string;
  template_id?: string;
  variables?: Record<string, string | number | null | undefined>;
  subject?: string;
};

const TEMPLATE_ALIASES: Record<string, EmailTemplateId> = {
  E01: "welcome-student",
  E02: "welcome-teacher",
  E04: "booking-request-teacher",
  E05: "payment-receipt",
  E06: "reminder-24h",
  E07: "reminder-1h",
  E08: "booking-cancelled-refund",
  E09: "booking-cancelled-no-refund",
  E10: "review-request",
  E11: "reset-password",
};

function normalizeTemplateId(value: unknown): EmailTemplateId | null {
  if (typeof value !== "string") return null;
  if (value in EMAIL_TEMPLATES) return value as EmailTemplateId;
  return TEMPLATE_ALIASES[value] ?? null;
}

function isEmailList(value: unknown): value is string | string[] {
  if (typeof value === "string") return value.includes("@");
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === "string" && item.includes("@"))
  );
}

export async function POST(request: Request) {
  const expectedSecret = process.env.EMAIL_WEBHOOK_SECRET;
  if (!expectedSecret) {
    return NextResponse.json({ error: "Emails no configurados" }, { status: 503 });
  }

  const providedSecret = request.headers.get("x-yleis-email-secret");
  if (providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as SendEmailBody | null;
  const templateId = normalizeTemplateId(body?.templateId ?? body?.template_id);
  if (!body || !isEmailList(body.to) || !templateId) {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 });
  }

  try {
    const result = await sendTemplateEmail({
      to: body.to,
      templateId,
      variables: body.variables,
      subject: body.subject,
    });

    return NextResponse.json({ id: result.id });
  } catch (error) {
    console.error("[emails/send]", error);
    return NextResponse.json({ error: "No se pudo enviar el email" }, { status: 502 });
  }
}
