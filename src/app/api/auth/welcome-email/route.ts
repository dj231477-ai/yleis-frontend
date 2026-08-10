import { sendTemplateEmail } from "@/lib/email/resend";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("email, full_name, role")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });

  try {
    await sendTemplateEmail({
      to: profile.email,
      templateId: profile.role === "teacher" ? "welcome-teacher" : "welcome-student",
      variables: { name: profile.full_name },
    });
  } catch (error) {
    console.error("[auth/welcome-email]", error);
    return NextResponse.json({ error: "No se pudo enviar el email" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
