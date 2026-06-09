import { createClient } from "@/lib/supabase/server";
import { getBookingConfirmation } from "@/services/bookings";
import { Avatar } from "@/ui/components/Avatar";
import { Button } from "@/ui/components/Button";
import {
  FeatherCalendar,
  FeatherCheckCircle,
  FeatherClock,
  FeatherDollarSign,
} from "@subframe/core";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function formatARS(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" }).format(
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

type SearchParams = Promise<{ id?: string }>;

export default async function ConfirmationPage({ searchParams }: { searchParams: SearchParams }) {
  const { id } = await searchParams;
  if (!id) redirect("/app/student/search");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const booking = await getBookingConfirmation(supabase, id, user.id);
  if (!booking) redirect("/app/student/dashboard");

  return (
    <div className="bg-neutral-50 min-h-full">
      <div className="mx-auto w-full max-w-lg px-4 py-12 sm:px-6">
        {/* Éxito */}
        <div className="mb-6 flex flex-col items-center text-center">
          <FeatherCheckCircle className="mb-4 h-16 w-16 text-success" />
          <h1 className="text-2xl font-bold text-neutral-900">¡Reserva enviada!</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Tu solicitud fue enviada al profesor. Te confirmarán la clase en cuanto reciban el pago.
          </p>
        </div>

        {/* Resumen de la reserva */}
        <div className="mb-5 rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Resumen de la reserva
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
              <FeatherCalendar className="h-4 w-4 text-neutral-400 shrink-0" />
              <span className="capitalize">{formatDate(booking.scheduled_at)}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-neutral-700">
              <FeatherClock className="h-4 w-4 text-neutral-400 shrink-0" />
              <span>
                {formatTime(booking.scheduled_at)} · {booking.duration_min} minutos
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-neutral-700">
              <FeatherDollarSign className="h-4 w-4 text-neutral-400 shrink-0" />
              <span className="font-semibold text-brand-700">{formatARS(booking.price)}</span>
            </div>
          </div>

          {booking.notes && (
            <div className="mt-3 rounded-lg bg-neutral-50 p-3 border-t border-neutral-100">
              <p className="text-xs text-neutral-500 font-medium mb-1">Notas enviadas</p>
              <p className="text-sm text-neutral-600">{booking.notes}</p>
            </div>
          )}
        </div>

        {/* Instrucciones de pago */}
        <div className="mb-6 rounded-xl border border-warning-200 bg-warning-50 p-5">
          <p className="mb-2 text-sm font-semibold text-warning-800">Instrucciones de pago</p>
          <p className="text-sm text-warning-700 leading-relaxed">
            Para confirmar tu clase, realiza el pago de <strong>{formatARS(booking.price)}</strong>{" "}
            a <strong>{booking.teacher_name}</strong> por cualquiera de estos métodos:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-warning-700 list-disc list-inside">
            <li>Transferencia bancaria / CBU</li>
            <li>Mercado Pago</li>
            <li>Nequi / Daviplata</li>
          </ul>
          <p className="mt-3 text-xs text-warning-600">
            El profesor confirmará la clase en cuanto reciba la comprobación. Si no confirma en 24
            horas, tu reserva se cancelará automáticamente.
          </p>
        </div>

        {/* Acciones */}
        <div className="flex flex-col gap-3">
          <Link href="/app/student/dashboard">
            <Button variant="brand-primary" size="large" className="w-full">
              Ver mis reservas
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
