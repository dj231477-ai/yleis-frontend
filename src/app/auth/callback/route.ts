import { sendTemplateEmail } from "@/lib/email/resend";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Ventana para considerar "recién registrado": handle_new_user() crea la fila de
// public.users en el mismo instante del primer INSERT en auth.users, así que un
// created_at muy reciente identifica de forma confiable el primer login (email/password
// confirmado o primer OAuth), sin necesitar una columna adicional de "welcome_email_sent".
const NEW_USER_WINDOW_MS = 60_000;

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);
    if (data.user) {
      sendWelcomeEmailIfNewUser(supabase, data.user.id).catch((e) => {
        console.error("[auth/callback] No se pudo enviar el email de bienvenida:", e);
      });
    }
  }

  // Hub de rol decide el destino final según el role del usuario
  return NextResponse.redirect(`${origin}/app`);
}

async function sendWelcomeEmailIfNewUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data: profile } = await supabase
    .from("users")
    .select("email, full_name, role, created_at")
    .eq("id", userId)
    .single();
  if (!profile) return;

  const isNewUser = Date.now() - new Date(profile.created_at).getTime() < NEW_USER_WINDOW_MS;
  if (!isNewUser) return;

  await sendTemplateEmail({
    to: profile.email,
    templateId: profile.role === "teacher" ? "welcome-teacher" : "welcome-student",
    variables: { name: profile.full_name },
  });
}
