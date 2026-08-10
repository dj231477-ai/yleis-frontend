import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  (Deno.env.get("ADMIN_SERVICE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
