export type EmailTemplateId =
  | "welcome-student"
  | "welcome-teacher"
  | "booking-request-teacher"
  | "payment-receipt"
  | "reminder-24h"
  | "reminder-1h"
  | "booking-cancelled-refund"
  | "booking-cancelled-no-refund"
  | "review-request"
  | "reset-password";

type TemplateInput = Record<string, string | number | null | undefined>;

type EmailTemplate = {
  subject: string;
  preview: string;
  body: (vars: TemplateInput) => string;
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://yleis.co";

function value(vars: TemplateInput, key: string, fallback = "") {
  const raw = vars[key];
  return raw === null || raw === undefined || raw === "" ? fallback : escapeHtml(String(raw));
}

function money(vars: TemplateInput, key: string) {
  const raw = Number(vars[key] ?? 0);
  if (!Number.isFinite(raw)) return "$0 COP";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(raw);
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function button(label: string, href: string) {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:#6c5ce7;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:700">${escapeHtml(label)}</a>`;
}

function details(rows: Array<[string, string]>) {
  return `<div style="background:#f8f8fc;border-radius:12px;padding:18px 22px;margin:24px 0">${rows
    .map(
      ([label, val]) =>
        `<div style="display:flex;justify-content:space-between;gap:16px;border-bottom:1px solid #ebebf0;padding:9px 0;font-size:14px"><span style="color:#75758f">${label}</span><strong style="color:#1a1a2e;text-align:right">${val}</strong></div>`
    )
    .join("")}</div>`;
}

function layout(title: string, preview: string, body: string) {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;background:#f5f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a2e">
    <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0">${escapeHtml(preview)}</div>
    <main style="max-width:600px;margin:0 auto;padding:40px 20px">
      <section style="background:#ffffff;border-radius:16px;padding:40px;box-shadow:0 2px 12px rgba(0,0,0,.06)">
        <div style="font-size:28px;font-weight:800;margin-bottom:28px">Y<span style="color:#6c5ce7">leis</span></div>
        ${body}
      </section>
      <footer style="text-align:center;margin-top:28px;font-size:13px;color:#9090a8">
        <p>Palabras que conectan al mundo</p>
        <p>2026 Yleis - <a href="https://yleis.co" style="color:#6c5ce7">yleis.co</a></p>
      </footer>
    </main>
  </body>
</html>`;
}

export const EMAIL_TEMPLATES: Record<EmailTemplateId, EmailTemplate> = {
  "welcome-student": {
    subject: "Bienvenido/a a Yleis",
    preview: "Tu cuenta de estudiante esta lista.",
    body: (vars) => `
      <h1 style="font-size:24px;margin:0 0 12px">Bienvenido/a, ${value(vars, "name", "estudiante")}</h1>
      <p style="font-size:16px;line-height:1.6;color:#4a4a68">Ya puedes buscar profesores, reservar clases y usar Express cuando necesites ayuda inmediata.</p>
      <p style="margin-top:24px">${button("Explorar profesores", `${APP_URL}/app/student/search`)}</p>
    `,
  },
  "welcome-teacher": {
    subject: "Bienvenido/a a Yleis Profesores",
    preview: "Completa tu perfil para empezar a recibir solicitudes.",
    body: (vars) => `
      <h1 style="font-size:24px;margin:0 0 12px">Hola, ${value(vars, "name", "profesor/a")}</h1>
      <p style="font-size:16px;line-height:1.6;color:#4a4a68">Completa tu onboarding para que podamos verificar tu perfil y activar tus clases en Yleis.</p>
      <p style="margin-top:24px">${button("Completar perfil", `${APP_URL}/app/teacher/onboarding`)}</p>
    `,
  },
  "booking-request-teacher": {
    subject: "Nueva solicitud de clase",
    preview: "Tienes una reserva pendiente por confirmar.",
    body: (vars) => `
      <h1 style="font-size:24px;margin:0 0 12px">Nueva solicitud de clase</h1>
      <p style="font-size:16px;line-height:1.6;color:#4a4a68">Hola ${value(vars, "teacher_name", "profesor/a")}, ${value(vars, "student_name", "un estudiante")} quiere tomar una clase contigo.</p>
      ${details([
        ["Estudiante", value(vars, "student_name", "Estudiante")],
        ["Materia", value(vars, "subject_name", "Clase")],
        ["Fecha y hora", value(vars, "scheduled_at", "Por confirmar")],
        ["Valor", money(vars, "price")],
      ])}
      <p style="font-size:14px;line-height:1.6;color:#856404;background:#fff3cd;border-left:4px solid #ffc107;border-radius:8px;padding:14px 18px">Tienes 24 horas para confirmar. Si no confirmas, la reserva se cancelara automaticamente.</p>
      <p style="margin-top:24px">${button("Revisar solicitud", `${APP_URL}/app/teacher/dashboard`)}</p>
    `,
  },
  "payment-receipt": {
    subject: "Pago confirmado en Yleis",
    preview: "Tu pago fue aprobado.",
    body: (vars) => `
      <h1 style="font-size:24px;margin:0 0 12px">Pago confirmado</h1>
      <p style="font-size:16px;line-height:1.6;color:#4a4a68">Gracias, ${value(vars, "student_name", "estudiante")}. Tu clase quedo reservada.</p>
      ${details([
        ["Profesor", value(vars, "teacher_name", "Profesor")],
        ["Materia", value(vars, "subject_name", "Clase")],
        ["Fecha y hora", value(vars, "scheduled_at", "Por confirmar")],
        ["Total pagado", money(vars, "amount")],
      ])}
      <p style="margin-top:24px">${button("Ver mis clases", `${APP_URL}/app/student/classes`)}</p>
    `,
  },
  "reminder-24h": {
    subject: "Recordatorio: tu clase es manana",
    preview: "Tu clase en Yleis empieza en 24 horas.",
    body: (vars) => `
      <h1 style="font-size:24px;margin:0 0 12px">Tu clase es manana</h1>
      <p style="font-size:16px;line-height:1.6;color:#4a4a68">Te esperamos para tu clase con ${value(vars, "teacher_name", "tu profesor/a")}.</p>
      ${details([
        ["Materia", value(vars, "subject_name", "Clase")],
        ["Fecha y hora", value(vars, "scheduled_at", "Por confirmar")],
      ])}
      <p style="margin-top:24px">${button("Ver clase", `${APP_URL}/app/student/classes`)}</p>
    `,
  },
  "reminder-1h": {
    subject: "Tu clase empieza en 1 hora",
    preview: "Prepara tu clase en Yleis.",
    body: (vars) => `
      <h1 style="font-size:24px;margin:0 0 12px">Tu clase empieza pronto</h1>
      <p style="font-size:16px;line-height:1.6;color:#4a4a68">Entra a tu detalle de clase para usar el link de Google Meet cuando este disponible.</p>
      ${details([
        ["Profesor", value(vars, "teacher_name", "Profesor")],
        ["Materia", value(vars, "subject_name", "Clase")],
        ["Fecha y hora", value(vars, "scheduled_at", "Por confirmar")],
      ])}
      <p style="margin-top:24px">${button("Abrir mis clases", `${APP_URL}/app/student/classes`)}</p>
    `,
  },
  "booking-cancelled-refund": {
    subject: "Clase cancelada - reembolso en camino",
    preview: "Tu clase fue cancelada y el reembolso esta en proceso.",
    body: (vars) => `
      <h1 style="font-size:24px;margin:0 0 12px">Clase cancelada</h1>
      <p style="font-size:16px;line-height:1.6;color:#4a4a68">Procesaremos el reembolso de ${money(vars, "refund_amount")} a tu metodo de pago original.</p>
      <p style="margin-top:24px">${button("Buscar otra clase", `${APP_URL}/app/student/search`)}</p>
    `,
  },
  "booking-cancelled-no-refund": {
    subject: "Clase cancelada",
    preview: "Se aplico la politica de cancelacion.",
    body: (vars) => `
      <h1 style="font-size:24px;margin:0 0 12px">Clase cancelada</h1>
      <p style="font-size:16px;line-height:1.6;color:#4a4a68">${value(vars, "reason", "La reserva fue cancelada de acuerdo con la politica vigente.")}</p>
      <p style="margin-top:24px">${button("Buscar otra clase", `${APP_URL}/app/student/search`)}</p>
    `,
  },
  "review-request": {
    subject: "Como estuvo tu clase?",
    preview: "Tu opinion ayuda a otros estudiantes.",
    body: (vars) => `
      <h1 style="font-size:24px;margin:0 0 12px">Como estuvo tu clase?</h1>
      <p style="font-size:16px;line-height:1.6;color:#4a4a68">Cuentanos como fue tu experiencia con ${value(vars, "teacher_name", "tu profesor/a")}.</p>
      <p style="margin-top:24px">${button("Ver mis clases", `${APP_URL}/app/student/classes`)}</p>
    `,
  },
  "reset-password": {
    subject: "Restablece tu contrasena",
    preview: "Usa este enlace para recuperar el acceso a Yleis.",
    body: (vars) => `
      <h1 style="font-size:24px;margin:0 0 12px">Restablece tu contrasena</h1>
      <p style="font-size:16px;line-height:1.6;color:#4a4a68">Si solicitaste recuperar tu cuenta, usa el boton de abajo.</p>
      <p style="margin-top:24px">${button("Cambiar contrasena", value(vars, "reset_url", `${APP_URL}/login`))}</p>
    `,
  },
};

export function renderEmailTemplate(templateId: EmailTemplateId, variables: TemplateInput = {}) {
  const template = EMAIL_TEMPLATES[templateId];
  return {
    subject: template.subject,
    html: layout(template.subject, template.preview, template.body(variables)),
  };
}
