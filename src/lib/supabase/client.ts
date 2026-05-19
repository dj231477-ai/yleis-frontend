import type { Database } from "@/types/database.types";
import { createBrowserClient } from "@supabase/ssr";

// Usar en Client Components ("use client")
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw new Error("Variable de entorno faltante: NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey) throw new Error("Variable de entorno faltante: NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createBrowserClient<Database>(url, anonKey);
}
