import { exchangeCodeForTokens, getGoogleUserEmail } from "@/lib/google-calendar";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;
  const redirectTo = (query: string) => NextResponse.redirect(`${appUrl}/app/profile?${query}`);

  if (errorParam) {
    // El profesor canceló el consentimiento en Google — no es un error real
    return redirectTo("calendar=cancelled");
  }
  if (!code || !state) return redirectTo("calendar=error");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${appUrl}/login`);

  const cookieState = request.headers
    .get("cookie")
    ?.split("; ")
    .find((c) => c.startsWith("gcal_oauth_state="))
    ?.split("=")[1];

  if (!cookieState || cookieState !== state) {
    return redirectTo("calendar=error");
  }

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!teacher) return redirectTo("calendar=error");

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      // Ya estaba conectado y Google no reemitió el refresh_token (no debería
      // pasar con prompt=consent, pero por si acaso no rompemos la conexión existente)
      return redirectTo("calendar=error");
    }
    const email = await getGoogleUserEmail(tokens.access_token);

    // biome-ignore lint/suspicious/noExplicitAny: tabla no tipada
    const { error: upsertError } = await (supabase as any)
      .from("teacher_calendar_connections")
      .upsert(
        {
          teacher_id: teacher.id,
          google_email: email,
          refresh_token: tokens.refresh_token,
          access_token: tokens.access_token,
          token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        },
        { onConflict: "teacher_id" }
      );

    if (upsertError) {
      console.error("[calendar/callback] Error guardando conexión:", upsertError);
      return redirectTo("calendar=error");
    }

    await supabase
      .from("teachers")
      .update({ google_calendar_connected: true, google_calendar_email: email })
      .eq("id", teacher.id);

    const response = redirectTo("calendar=connected");
    response.cookies.delete("gcal_oauth_state");
    return response;
  } catch (e) {
    console.error("[calendar/callback] Error:", e);
    return redirectTo("calendar=error");
  }
}
