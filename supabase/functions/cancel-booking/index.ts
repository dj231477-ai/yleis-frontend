import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { getAuthenticatedUser } from "../_shared/auth.ts";
import { BUSINESS } from "../_shared/config.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { sendBookingCancelledEmail } from "../_shared/email.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import type { CancellationResult } from "../_shared/types.ts";

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return err("No autorizado", 401, "UNAUTHORIZED");

    const body = await req.json().catch(() => null);
    if (!body) return err("Body inválido", 400, "INVALID_BODY");

    const { booking_id, reason } = body;
    if (!booking_id || typeof booking_id !== "string") {
      return err("booking_id requerido", 400, "MISSING_FIELD");
    }

    // Determinar si el que cancela es el alumno o el profesor
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select(`
        id, student_id, teacher_id, scheduled_at, duration_min,
        status, price, membership_id, hours_charged,
        students!inner(user_id, users!inner(email, full_name)),
        teachers!inner(user_id)
      `)
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      return err("Reserva no encontrada", 404, "NOT_FOUND");
    }

    const isStudent = (booking.students as { user_id: string }).user_id === user.id;
    const isTeacher = (booking.teachers as { user_id: string }).user_id === user.id;

    if (!isStudent && !isTeacher) {
      return err("Sin permisos sobre esta reserva", 403, "FORBIDDEN");
    }

    const cancellableStatuses = ["pending", "pending_teacher", "confirmed", "paid"];
    if (!cancellableStatuses.includes(booking.status)) {
      return err(
        `No se puede cancelar una reserva en estado: ${booking.status}`,
        400,
        "INVALID_STATUS"
      );
    }

    // Calcular política de reembolso
    const scheduledAt = new Date(booking.scheduled_at);
    const now = new Date();
    const hoursUntil = (scheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60);
    const originalPrice = Number(booking.price);

    let refundPolicy: CancellationResult["refund_policy"];
    let refundAmount: number;

    if (hoursUntil >= BUSINESS.REFUND_100_BEFORE_HOURS) {
      refundPolicy = "full";
      refundAmount = originalPrice;
    } else if (hoursUntil >= BUSINESS.REFUND_50_BEFORE_HOURS) {
      refundPolicy = "partial";
      refundAmount = Math.round(originalPrice * 0.5 * 100) / 100;
    } else {
      refundPolicy = "none";
      refundAmount = 0;
    }

    const newStatus = isStudent ? "cancelled_student" : "cancelled_teacher";

    // Actualizar el booking
    const { error: updateError } = await supabaseAdmin
      .from("bookings")
      .update({
        status: newStatus,
        cancellation_reason: reason ?? null,
      })
      .eq("id", booking_id);

    if (updateError) {
      console.error("[cancel-booking] Error actualizando booking:", updateError);
      return err("Error al cancelar la reserva", 500, "DB_ERROR");
    }

    // Si la clase se pagó con saldo de un paquete (no con Mercado Pago),
    // devolver las horas completas al saldo — siempre, sin escalar por
    // cercanía a la clase (eso solo aplica al reembolso en plata de abajo).
    if (booking.membership_id && booking.hours_charged) {
      const { error: refundHoursError } = await supabaseAdmin.rpc("refund_membership_hours", {
        p_membership_id: booking.membership_id,
        p_hours: booking.hours_charged,
      });
      if (refundHoursError) {
        console.error("[cancel-booking] Error devolviendo horas al paquete:", refundHoursError);
      }
    }

    // Actualizar el pago si existe
    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("id, status, amount")
      .eq("booking_id", booking_id)
      .maybeSingle();

    if (payment && payment.status === "approved") {
      await supabaseAdmin
        .from("payments")
        .update({
          status: "refunded",
          refund_amount: refundAmount,
        })
        .eq("id", payment.id);
    }

    // Email de cancelación al estudiante (directo, no depende de n8n)
    const studentContact = (booking.students as { users?: { email: string; full_name: string } })
      .users;
    if (studentContact?.email) {
      try {
        await sendBookingCancelledEmail({
          to: studentContact.email,
          refundAmount,
          hasRefund: refundPolicy !== "none",
        });
      } catch (e) {
        console.error("[cancel-booking] Error enviando email de cancelación:", e);
      }
    }

    // Forward a n8n para procesar el reembolso REAL en Mercado Pago (API de refunds).
    // El email ya se envía arriba de forma directa — este forward queda pendiente de
    // que n8n esté activo; hasta entonces `payments.status` se marca "refunded" en la
    // fila pero MP no recibe la solicitud de devolución real del dinero.
    const n8nUrl = Deno.env.get("N8N_WEBHOOK_URL");
    const n8nSecret = Deno.env.get("N8N_WEBHOOK_SECRET");

    if (n8nUrl) {
      fetch(`${n8nUrl}/webhook/booking-cancelled`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-webhook-secret": n8nSecret ?? "",
        },
        body: JSON.stringify({
          booking_id,
          cancelled_by: isStudent ? "student" : "teacher",
          reason: reason ?? null,
          refund_policy: refundPolicy,
          refund_amount: refundAmount,
          payment_id: payment?.id ?? null,
          mp_payment_id: null,
        }),
      }).catch((e) => console.error("[cancel-booking] n8n forward error:", e));
    }

    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        fn: "cancel-booking",
        user: user.id,
        booking_id,
        refund_policy: refundPolicy,
        refund_amount: refundAmount,
      })
    );

    return ok({
      cancelled: true,
      refund_policy: refundPolicy,
      refund_amount: refundAmount,
      hours_until_class: Math.max(0, hoursUntil),
    });
  } catch (e) {
    console.error("[cancel-booking]", e);
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
