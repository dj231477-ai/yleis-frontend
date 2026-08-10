import { randomUUID } from "node:crypto";
import { getGoogleCalendarAuthUrl } from "@/lib/google-calendar";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL));

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!teacher) {
    return NextResponse.redirect(new URL("/app/profile", process.env.NEXT_PUBLIC_APP_URL));
  }

  const state = randomUUID();
  const authUrl = getGoogleCalendarAuthUrl(state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("gcal_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
