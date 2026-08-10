import { supabaseAdmin } from "./supabase.ts";

export async function getAuthenticatedUser(req: Request) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function requireRole(userId: string, role: string): Promise<void> {
  const { data } = await supabaseAdmin.from("users").select("role").eq("id", userId).single();
  if (data?.role !== role) throw new Error(`Se requiere rol: ${role}`);
}

export async function getUserRole(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin.from("users").select("role").eq("id", userId).single();
  return data?.role ?? null;
}
