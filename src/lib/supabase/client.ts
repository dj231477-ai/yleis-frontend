import type { Database } from "@/types/database.types";
import { createBrowserClient } from "@supabase/ssr";

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Variable de entorno faltante: ${key}`);
  return value;
}

// Usar en Client Components ("use client")
export function createClient() {
  return createBrowserClient<Database>(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  );
}
