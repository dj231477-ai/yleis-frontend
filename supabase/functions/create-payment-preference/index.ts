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

    const { booking_id } = body;
    if (!booking_id || typeof booking_id !== "string") {
      return err("booking_id requerido", 400, "MISSING_FIELD");
    }

    // Verificar ownership: el booking debe pertenecer al alumno autenticado
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select(`
        id, student_id, teacher_id, subject_id, scheduled_at,
        duration_min, status, price,
        students!inner(user_id),
        subjects(name),
        teachers!inner(user_id, users(full_name))
      `)
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      return err("Reserva no encontrada", 404, "NOT_FOUND");
    }

    // Verificar que pertenece al usuario autenticado
    if ((booking.students as { user_id: string }).user_id !== user.id) {
      return err("Sin permisos sobre esta reserva", 403, "FORBIDDEN");
    }

    if (!["pending", "confirmed"].includes(booking.status)) {
      return err(
        `No se puede pagar una reserva en estado: ${booking.status}`,
        400,
        "INVALID_STATUS"
      );
    }

    // Precio siempre de la DB, nunca del cliente
    const amount = Number(booking.price);
    if (amount < BUSINESS.MIN_CLASS_PRICE_COP) {
      return err("Precio inválido en la reserva", 400, "INVALID_PRICE");
    }

    const platformFee = Math.round(amount * BUSINESS.PLATFORM_FEE * 100) / 100;
    const teacherPayout = Math.round(amount * BUSINESS.TEACHER_PAYOUT * 100) / 100;

    const appUrl = Deno.env.get("APP_URL") ?? "https://yleis.co";
    const mpToken = Deno.env.get("MP_ACCESS_TOKEN");
    if (!mpToken) {
      return err("MP_ACCESS_TOKEN no configurado", 500, "MP_NOT_CONFIGURED");
    }
    const subjectName = (booking.subjects as { name: string })?.name ?? "Clase";

    // Crear preferencia en Mercado Pago
    const mpBody = {
      items: [
        {
          id: booking_id,
          title: subjectName,
          description: `Clase de ${subjectName} - ${booking.duration_min} min`,
          quantity: 1,
          currency_id: BUSINESS.CURRENCY,
          unit_price: amount,
        },
      ],
      back_urls: {
        success: `${appUrl}/payment/success?booking_id=${booking_id}`,
        failure: `${appUrl}/payment/failure?booking_id=${booking_id}`,
        pending: `${appUrl}/payment/pending?booking_id=${booking_id}`,
      },
      auto_return: "approved",
      external_reference: booking_id,
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mp-webhook`,
      expires: true,
      expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mpToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mpBody),
    });

    if (!mpRes.ok) {
      const mpErr = await mpRes.text();
      console.error("[create-payment-preference] MP error:", mpErr);
      return err("Error al crear preferencia de pago", 502, "MP_ERROR");
    }

    const mpData = await mpRes.json();

    // Registrar el pago pendiente en la DB (servicio, no el cliente)
    const { error: insertError } = await supabaseAdmin.from("payments").insert({
      booking_id,
      student_id: booking.student_id,
      status: "pending",
      amount,
      platform_fee: platformFee,
      teacher_payout: teacherPayout,
      currency: BUSINESS.CURRENCY,
      mp_preference_id: mpData.id,
    });

    if (insertError) {
      console.error("[create-payment-preference] DB insert error:", insertError);
      return err("Error al registrar el pago", 500, "DB_ERROR");
    }

    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        fn: "create-payment-preference",
        user: user.id,
        booking_id,
        amount,
        preference_id: mpData.id,
      })
    );

    return ok({
      preference_id: mpData.id,
      checkout_url: mpData.init_point,
    });
  } catch (e) {
    console.error("[create-payment-preference]", e);
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
