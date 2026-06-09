import { createMiddlewareClient } from "@/lib/supabase/middleware";
import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // /app/* requiere sesión activa — el rol lo verifica cada página consultando la DB
  if (pathname.startsWith("/app") && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // /login con sesión → hub de rol
  if (pathname === "/login" && user) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  // /dashboard/* (rutas legacy)
  if (pathname.startsWith("/dashboard") && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/app/:path*", "/dashboard/:path*", "/login", "/auth/callback"],
};
