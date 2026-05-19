import type { Database } from "@/types/database.types";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Variable de entorno faltante: ${key}`);
  return value;
}

// Usar en Server Components, Server Actions y API Routes
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Component — las cookies se manejan en el middleware
          }
        },
      },
    }
  );
}
