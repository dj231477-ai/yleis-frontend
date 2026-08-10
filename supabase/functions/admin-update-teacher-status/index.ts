import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_STATUSES = ["verified", "rejected", "under_review"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Verificar auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Cliente con anon key + JWT del usuario para verificar identidad
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // 3. Obtener usuario autenticado
    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Cliente admin con service key para bypassear RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("ADMIN_SERVICE_KEY") ?? ""
    );

    // 5. Verificar que el usuario es admin
    console.log("JWT user.id:", user?.id);

    const { data: userData, error: roleError } = await supabaseAdmin
      .from("users")
      .select("role, id")
      .eq("id", user.id)
      .single();

    console.log("DB userData:", JSON.stringify(userData));
    console.log("DB roleError:", JSON.stringify(roleError));

    if (roleError || userData?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Acceso denegado — se requiere rol admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Leer y validar body
    const body = await req.json().catch(() => null);
    if (!body) {
      return new Response(JSON.stringify({ error: "Body inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { teacherId, newStatus, rejectionReason } = body;

    if (!teacherId || typeof teacherId !== "string") {
      return new Response(JSON.stringify({ error: "teacherId requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!VALID_STATUSES.includes(newStatus)) {
      return new Response(JSON.stringify({ error: "Estado inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (newStatus === "rejected" && (!rejectionReason || !rejectionReason.trim())) {
      return new Response(JSON.stringify({ error: "rejectionReason requerido para rechazar" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7. Verificar que el profesor existe
    const { data: teacher } = await supabaseAdmin
      .from("teachers")
      .select("id")
      .eq("id", teacherId)
      .single();

    if (!teacher) {
      return new Response(JSON.stringify({ error: "Profesor no encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 8. Construir payload y ejecutar UPDATE
    const updatePayload: Record<string, unknown> = { onboarding_step: newStatus };

    if (newStatus === "verified") {
      updatePayload.verified_at = new Date().toISOString();
      updatePayload.rejection_reason = null;
    }
    if (newStatus === "rejected") {
      updatePayload.rejection_reason = rejectionReason.trim();
      updatePayload.verified_at = null;
    }

    const { error: updateError } = await supabaseAdmin
      .from("teachers")
      .update(updatePayload)
      .eq("id", teacherId);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        fn: "admin-update-teacher-status",
        admin: user.id,
        teacherId,
        newStatus,
      })
    );

    return new Response(JSON.stringify({ data: { teacherId, newStatus } }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[admin-update-teacher-status]", e);
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
