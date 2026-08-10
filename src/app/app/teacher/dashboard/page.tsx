import { BookingActions } from "@/components/custom/teacher/BookingActions";
import { ExpressSection } from "@/components/custom/teacher/ExpressSection";
import { PLATFORM_FEE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import {
  type PendingBooking,
  type UpcomingClass,
  getTeacherDashboard,
  getTeacherProfile,
} from "@/services/teachers";
import { Avatar } from "@/ui/components/Avatar";
import { Badge } from "@/ui/components/Badge";
import { IconWithBackground } from "@/ui/components/IconWithBackground";
import { FeatherCalendar, FeatherDollarSign, FeatherVideo } from "@subframe/core";
import { redirect } from "next/navigation";

export const metadata = { title: "Mi Dashboard — Yleis Profesores" };

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatCOP(amount: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function studentInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-sm font-semibold text-neutral-700">{children}</h2>;
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-dashed border-neutral-200 p-4 text-center text-sm text-neutral-400">
      {message}
    </p>
  );
}

function PendingBookingRow({ booking }: { booking: PendingBooking }) {
  const isPlanBased = booking.status === "pending_teacher";
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <Avatar image={booking.student_avatar ?? undefined} size="medium" variant="neutral">
          {!booking.student_avatar ? studentInitials(booking.student_name) : undefined}
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="truncate font-medium text-neutral-900 text-sm">{booking.student_name}</p>
          <p className="text-xs text-neutral-500">{booking.subject_name}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-sm font-medium text-neutral-700">{formatCOP(booking.price)}</span>
          <Badge variant={isPlanBased ? "brand" : "neutral"} className="text-[10px]">
            {isPlanBased ? "Plan" : "Pago directo"}
          </Badge>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-neutral-500">
          <FeatherCalendar className="h-3.5 w-3.5" />
          {formatDate(booking.scheduled_at)} · {formatTime(booking.scheduled_at)} ·{" "}
          {booking.duration_min} min
        </span>
        <BookingActions bookingId={booking.id} bookingStatus={booking.status} />
      </div>
    </div>
  );
}

function UpcomingClassRow({ cls }: { cls: UpcomingClass }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4 hover:bg-neutral-50 transition-colors">
      <Avatar image={cls.student_avatar ?? undefined} size="medium" variant="brand">
        {!cls.student_avatar ? studentInitials(cls.student_name) : undefined}
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium text-neutral-900 text-sm">{cls.student_name}</p>
        <p className="text-xs text-neutral-500">{cls.subject_name}</p>
      </div>
      <div className="text-right text-xs text-neutral-500 shrink-0 mr-2">
        <p>{formatDate(cls.scheduled_at)}</p>
        <p>{formatTime(cls.scheduled_at)}</p>
      </div>
      {cls.meet_link ? (
        <a
          href={cls.meet_link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100 transition-colors"
        >
          <FeatherVideo className="h-3.5 w-3.5" />
          Meet
        </a>
      ) : (
        <span className="rounded-lg bg-neutral-100 px-2.5 py-1.5 text-xs text-neutral-400">
          Sin link
        </span>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function TeacherDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const teacher = await getTeacherProfile(supabase, user.id);
  if (!teacher || teacher.onboarding_step !== "verified") {
    redirect("/app/teacher/onboarding");
  }

  let data;
  try {
    data = await getTeacherDashboard(supabase, user.id);
  } catch {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          <p className="font-semibold text-neutral-700">Error al cargar los datos</p>
          <p className="mt-1 text-sm text-neutral-500">Recarga la página o intenta más tarde.</p>
        </div>
      </div>
    );
  }

  const firstName = data.full_name.split(" ")[0];
  const currentMonth = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric" }).format(
    new Date()
  );

  return (
    <div className="bg-neutral-50 min-h-full">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        {/* Bienvenida */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-900">Hola, {firstName} 👋</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {data.headline ?? "Bienvenido a tu panel de profesor"}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Reservas pendientes */}
          <div>
            <SectionHeader>
              Reservas pendientes{" "}
              {data.pending_bookings.length > 0 && (
                <Badge variant="warning" className="ml-1.5 inline-flex">
                  {data.pending_bookings.length}
                </Badge>
              )}
            </SectionHeader>
            {data.pending_bookings.length > 0 ? (
              <div className="flex flex-col gap-3">
                {data.pending_bookings.map((b) => (
                  <PendingBookingRow key={b.id} booking={b} />
                ))}
              </div>
            ) : (
              <EmptyState message="No tienes reservas pendientes de confirmar" />
            )}
          </div>

          {/* Próximas clases */}
          <div>
            <SectionHeader>Próximas clases</SectionHeader>
            {data.upcoming_classes.length > 0 ? (
              <div className="flex flex-col gap-2">
                {data.upcoming_classes.map((cls) => (
                  <UpcomingClassRow key={cls.id} cls={cls} />
                ))}
              </div>
            ) : (
              <EmptyState message="No tienes clases programadas" />
            )}
          </div>
        </div>

        {/* Fila inferior: Ganancias + Express */}
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Ganancias del mes */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <SectionHeader>Ganancias del mes</SectionHeader>
              <IconWithBackground
                variant="success"
                size="small"
                icon={<FeatherDollarSign />}
                square
              />
            </div>
            <p className="text-3xl font-bold text-neutral-900">
              {formatCOP(data.monthly_earnings_teacher)}
            </p>
            <p className="mt-1 text-xs text-neutral-400 capitalize">{currentMonth}</p>
            <div className="mt-3 rounded-lg bg-neutral-50 border border-neutral-100 px-3 py-2">
              <p className="text-xs text-neutral-500">
                Comisión Yleis ({(PLATFORM_FEE * 100).toFixed(0)}%) ya descontada
              </p>
            </div>
          </div>

          {/* Modo Express */}
          <ExpressSection teacherId={teacher.id} />
        </div>
      </div>
    </div>
  );
}
