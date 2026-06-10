import { createClient } from "@/lib/supabase/server";
import { getBookingConfirmation } from "@/services/bookings";
import { Avatar } from "@/ui/components/Avatar";
import { Button } from "@/ui/components/Button";
import {
  FeatherAlertCircle,
  FeatherCalendar,
  FeatherCheckCircle,
  FeatherClock,
  FeatherDollarSign,
  FeatherLoader,
} from "@subframe/core";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso)
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

// Acepta tanto ?booking_id= (MP redirect) como ?id= (flujo manual legacy)
type SearchParams = Promise<{
  booking_id?: string;
  id?: string;
  payment?: "success" | "pending";
}>;

export default async function ConfirmationPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const bookingId = sp.booking_id ?? sp.id;
  const paymentState = sp.payment ?? "manual";

  if (!bookingId) redirect("/app/student/search");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const booking = await getBookingConfirmation(supabase, bookingId, user.id);
  if (!booking) redirect("/app/student/dashboard");

  const isMP = paymentState === "success" || paymentState === "pending";
  const isPending = paymentState === "pending";

  return (
    <div className="bg-neutral-50 min-h-full">
      <div className="mx-auto w-full max-w-lg px-4 py-12 sm:px-6">
        {/* Estado principal */}
        <div className="mb-6 flex flex-col items-center text-center">
          {isPending ? (
            <FeatherLoader className="mb-4 h-16 w-16 text-warning-500" />
          ) : (
            <FeatherCheckCircle className="mb-4 h-16 w-16 text-success" />
          )}
          <h1 className="text-2xl font-bold text-neutral-900">
            {isPending ? "Pago en proceso" : "¡Reserva confirmada!"}
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            {isPending
              ? "Tu pago está siendo procesado. Te avisaremos cuando se confirme."
              : isMP
                ? "Tu pago fue recibido. El profesor confirmará la clase en breve."
                : "Tu solicitud fue enviada. El profesor la confirmará pronto."}
          </p>
        </div>

        {/* Resumen de la reserva */}
        <div className="mb-5 rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Resumen
          </h2>

          <div className="mb-4 flex items-center gap-3">
            <Avatar image={booking.teacher_avatar ?? undefined} size="medium" variant="brand">
              {!booking.teacher_avatar ? initials(booking.teacher_name) : undefined}
            </Avatar>
            <div>
              <p className="font-semibold text-neutral-900">{booking.teacher_name}</p>
              <p className="text-xs text-neutral-500">{booking.subject_name}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 border-t border-neutral-100 pt-4">
            <div className="flex items-center gap-2.5 text-sm text-neutral-700">
              <FeatherCalendar className="h-4 w-4 shrink-0 text-neutral-400" />
              <span className="capitalize">{formatDate(booking.scheduled_at)}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-neutral-700">
              <FeatherClock className="h-4 w-4 shrink-0 text-neutral-400" />
              <span>
                {formatTime(booking.scheduled_at)} · {booking.duration_min} min
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-neutral-700">
              <FeatherDollarSign className="h-4 w-4 shrink-0 text-neutral-400" />
              <span className="font-semibold text-brand-700">{formatCOP(booking.price)}</span>
            </div>
          </div>

          {booking.notes && (
            <div className="mt-3 rounded-lg border-t border-neutral-100 bg-neutral-50 p-3">
              <p className="mb-1 text-xs font-medium text-neutral-500">Notas enviadas</p>
              <p className="text-sm text-neutral-600">{booking.notes}</p>
            </div>
          )}
        </div>

        {/* Banner pago manual (flujo sin MP) */}
        {!isMP && (
          <div className="mb-6 rounded-xl border border-warning-200 bg-warning-50 p-5">
            <div className="mb-2 flex items-center gap-2">
              <FeatherAlertCircle className="h-4 w-4 text-warning-700" />
              <p className="text-sm font-semibold text-warning-800">Completa tu pago</p>
            </div>
            <p className="text-sm leading-relaxed text-warning-700">
              Transfiere <strong>{formatCOP(booking.price)}</strong> a{" "}
              <strong>{booking.teacher_name}</strong> por cualquiera de estos medios:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-warning-700">
              <li>Nequi / Daviplata</li>
              <li>Transferencia bancaria</li>
              <li>Mercado Pago</li>
            </ul>
            <p className="mt-3 text-xs text-warning-600">
              El profesor tiene 24 horas para confirmar tras recibir el comprobante. Si no confirma,
              la reserva se cancela automáticamente.
            </p>
          </div>
        )}

        {/* Acciones */}
        <div className="flex flex-col gap-3">
          <Link href="/app/student/classes">
            <Button variant="brand-primary" size="large" className="w-full">
              Ver mis clases
            </Button>
          </Link>
          <Link href="/app/student/search">
            <Button variant="neutral-secondary" size="large" className="w-full">
              Buscar otro profesor
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
