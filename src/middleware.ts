import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Variable de entorno faltante: ${key}`);
  return value;
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && request.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard/profile", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
