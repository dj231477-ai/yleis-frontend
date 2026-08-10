import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { getAuthenticatedUser } from "../_shared/auth.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return err("No autorizado", 401, "UNAUTHORIZED");

    const body = await req.json().catch(() => null);
    if (!body) return err("Body inválido", 400, "INVALID_BODY");

    const { action } = body;
    if (!action || !["online", "offline"].includes(action)) {
      return err("action debe ser 'online' o 'offline'", 400, "INVALID_ACTION");
    }

    // Verificar que el usuario es un profesor activo verificado
    const { data: teacher, error: teacherError } = await supabaseAdmin
      .from("teachers")
      .select("id, status, onboarding_step")
      .eq("user_id", user.id)
      .eq("status", "active")
      .eq("onboarding_step", "verified")
      .single();

    if (teacherError || !teacher) {
      return err("Solo profesores verificados pueden usar el modo Express", 403, "FORBIDDEN");
    }

    const newStatus = action === "online" ? "online" : "offline";

    // UPSERT en teacher_status
    const { error: upsertError } = await supabaseAdmin.from("teacher_status").upsert(
      {
        teacher_id: teacher.id,
        status: newStatus,
        last_seen: new Date().toISOString(),
      },
      { onConflict: "teacher_id" }
    );

    if (upsertError) {
      console.error("[express-go-online] Error en upsert:", upsertError);
      return err("Error al actualizar estado", 500, "DB_ERROR");
    }

    // Notificar a n8n si el profesor se pone online (para W09)
    if (action === "online") {
      const n8nUrl = Deno.env.get("N8N_WEBHOOK_URL");
      const n8nSecret = Deno.env.get("N8N_WEBHOOK_SECRET");

      if (n8nUrl) {
        fetch(`${n8nUrl}/webhook/teacher-online`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-webhook-secret": n8nSecret ?? "",
          },
          body: JSON.stringify({ teacher_id: teacher.id }),
        }).catch((e) => console.error("[express-go-online] n8n forward error:", e));
      }
    }

    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        fn: "express-go-online",
        user: user.id,
        teacher_id: teacher.id,
        action: newStatus,
      })
    );

    return ok({ status: newStatus });
  } catch (e) {
    console.error("[express-go-online]", e);
    return err("Error interno", 500, "INTERNAL_ERROR");
  }
});

const ok = (data: object, status = 200) =>
  new Response(JSON.stringify({ data }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const err = (message: string, status: number, code: string) =>
  new Response(JSON.stringify({ error: message, code }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
