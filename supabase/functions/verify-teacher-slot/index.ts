import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { getAuthenticatedUser } from "../_shared/auth.ts";
import { BUSINESS } from "../_shared/config.ts";
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

    const { teacher_id, scheduled_at, duration_min } = body;

    if (!teacher_id || typeof teacher_id !== "string") {
      return err("teacher_id requerido", 400, "MISSING_TEACHER_ID");
    }
    if (!scheduled_at || typeof scheduled_at !== "string") {
      return err("scheduled_at requerido", 400, "MISSING_SCHEDULED_AT");
    }
    if (
      !duration_min ||
      !(BUSINESS.CLASS_DURATIONS_MIN as readonly number[]).includes(duration_min)
    ) {
      return err(
        `duration_min debe ser uno de: ${BUSINESS.CLASS_DURATIONS_MIN.join(", ")}`,
        400,
        "INVALID_DURATION"
      );
    }

    const slotStart = new Date(scheduled_at);
    if (Number.isNaN(slotStart.getTime())) {
      return err("scheduled_at no es una fecha válida", 400, "INVALID_DATE");
    }
    if (slotStart <= new Date()) {
      return err("No se puede reservar en el pasado", 400, "PAST_DATE");
    }

    const slotEnd = new Date(slotStart.getTime() + duration_min * 60 * 1000);

    // Verificar que el profesor existe y está activo
    const { data: teacher, error: teacherError } = await supabaseAdmin
      .from("teachers")
      .select("id, status, onboarding_step")
      .eq("id", teacher_id)
      .eq("status", "active")
      .eq("onboarding_step", "verified")
      .single();

    if (teacherError || !teacher) {
      return ok({ available: false, reason: "Profesor no disponible" });
    }

    // Verificar overlap con bookings acticontigo existentes
    const { data: conflicts } = await supabaseAdmin
      .from("bookings")
      .select("id, scheduled_at, duration_min, status")
      .eq("teacher_id", teacher_id)
      .not("status", "in", '("cancelled_student","cancelled_teacher","refunded","no_show")');

    if (conflicts) {
      for (const booking of conflicts) {
        const bStart = new Date(booking.scheduled_at);
        const bEnd = new Date(bStart.getTime() + booking.duration_min * 60 * 1000);
        if (slotStart < bEnd && slotEnd > bStart) {
          return ok({ available: false, reason: "El profesor ya tiene una clase en ese horario" });
        }
      }
    }

    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        fn: "verify-teacher-slot",
        user: user.id,
        teacher_id,
        scheduled_at,
        duration_min,
        result: "available",
      })
    );

    return ok({ available: true });
  } catch (e) {
    console.error("[verify-teacher-slot]", e);
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
