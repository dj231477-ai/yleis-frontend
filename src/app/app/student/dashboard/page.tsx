import { createClient } from "@/lib/supabase/server";
import { type BookingRow, getStudentDashboard } from "@/services/students";
import { Avatar } from "@/ui/components/Avatar";
import { Badge } from "@/ui/components/Badge";
import { Button } from "@/ui/components/Button";
import { IconWithBackground } from "@/ui/components/IconWithBackground";
import {
  FeatherBookOpen,
  FeatherCalendar,
  FeatherCreditCard,
  FeatherSearch,
  FeatherUser,
  FeatherVideo,
} from "@subframe/core";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Mi Dashboard — Yleis" };

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function statusBadge(status: BookingRow["status"]) {
  if (status === "confirmed") return <Badge variant="success">Confirmada</Badge>;
  if (status === "paid") return <Badge variant="brand">Pagada</Badge>;
  return <Badge variant="neutral">{status}</Badge>;
}

function teacherInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function NextClassCard({ booking }: { booking: BookingRow }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-brand-100 bg-brand-50 p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-brand-700">Próxima clase</span>
        <IconWithBackground variant="brand" size="medium" icon={<FeatherBookOpen />} square />
      </div>

      <div className="flex items-center gap-3">
        <Avatar image={booking.teacher_avatar ?? undefined} size="large" variant="brand">
          {!booking.teacher_avatar ? teacherInitials(booking.teacher_name) : undefined}
        </Avatar>
        <div>
          <p className="font-semibold text-neutral-900">{booking.teacher_name}</p>
          <p className="text-sm text-neutral-500">{booking.subject_name}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-neutral-600">
        <span className="flex items-center gap-1">
          <FeatherCalendar className="h-3.5 w-3.5" />
          {formatDate(booking.scheduled_at)}
        </span>
        <span>
          {formatTime(booking.scheduled_at)} · {booking.duration_min} min
        </span>
      </div>

      {booking.meet_link ? (
        <a href={booking.meet_link} target="_blank" rel="noopener noreferrer">
          <Button variant="brand-primary" size="medium" icon={<FeatherVideo />} className="w-full">
            Unirse a la clase
          </Button>
        </a>
      ) : (
        <Button
          variant="brand-secondary"
          size="medium"
          icon={<FeatherVideo />}
          className="w-full"
          disabled
        >
          Link disponible próximamente
        </Button>
      )}
    </div>
  );
}

function EmptyClassCard() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
      <IconWithBackground variant="neutral" size="large" icon={<FeatherCalendar />} square />
      <div>
        <p className="font-semibold text-neutral-700">Sin clases programadas</p>
        <p className="mt-1 text-sm text-neutral-500">Reserva tu primera clase con un profesor</p>
      </div>
      <Link href="/app/student/search">
        <Button variant="brand-primary" size="medium" icon={<FeatherSearch />}>
          Busca tu primer profesor
        </Button>
      </Link>
    </div>
  );
}

function BookingRow({ booking }: { booking: BookingRow }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4 hover:bg-neutral-50 transition-colors">
      <Avatar image={booking.teacher_avatar ?? undefined} size="medium" variant="brand">
        {!booking.teacher_avatar ? teacherInitials(booking.teacher_name) : undefined}
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium text-neutral-900 text-sm">{booking.teacher_name}</p>
        <p className="text-xs text-neutral-500">{booking.subject_name}</p>
      </div>
      <div className="text-right text-xs text-neutral-500 shrink-0">
        <p>{formatDate(booking.scheduled_at)}</p>
        <p>{formatTime(booking.scheduled_at)}</p>
      </div>
      {statusBadge(booking.status)}
    </div>
  );
}

function HistoryRow({ booking }: { booking: BookingRow }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-neutral-100 last:border-0">
      <Avatar image={booking.teacher_avatar ?? undefined} size="small" variant="neutral">
        {!booking.teacher_avatar ? teacherInitials(booking.teacher_name) : undefined}
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm text-neutral-700">{booking.subject_name}</p>
        <p className="text-xs text-neutral-400">{booking.teacher_name}</p>
      </div>
      <div className="text-right text-xs text-neutral-400 shrink-0">
        <p>{formatDate(booking.scheduled_at)}</p>
      </div>
      <Badge variant="neutral">Completada</Badge>
    </div>
  );
}

const QUICK_ACTIONS = [
  {
    label: "Buscar profesor",
    icon: <FeatherSearch />,
    href: "/app/student/search",
    variant: "brand" as const,
  },
  {
    label: "Mis pagos",
    icon: <FeatherCreditCard />,
    href: "/app/payments",
    variant: "neutral" as const,
  },
  {
    label: "Mi perfil",
    icon: <FeatherUser />,
    href: "/app/profile",
    variant: "neutral" as const,
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function StudentDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let data;
  try {
    data = await getStudentDashboard(supabase);
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

  return (
    <div className="bg-neutral-50 min-h-full">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        {/* Bienvenida */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-900">Hola, {firstName} 👋</h1>
          <p className="mt-1 text-sm text-neutral-500">Aquí está tu actividad de aprendizaje</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Próxima clase */}
          <div className="flex flex-col gap-3">
            {data.next_class ? <NextClassCard booking={data.next_class} /> : <EmptyClassCard />}
          </div>

          {/* Reservas activas */}
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-neutral-700">Mis reservas activas</h2>
            {data.active_bookings.length > 0 ? (
              <div className="flex flex-col gap-2">
                {data.active_bookings.map((b) => (
                  <BookingRow key={b.id} booking={b} />
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-neutral-200 p-4 text-center text-sm text-neutral-400">
                No tienes reservas activas
              </p>
            )}
          </div>
        </div>

        {/* Acceso rápido */}
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">Acceso rápido</h2>
          <div className="grid grid-cols-3 gap-3">
            {QUICK_ACTIONS.map((action) => (
              <Link key={action.label} href={action.href}>
                <button
                  type="button"
                  className="flex w-full flex-col items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-5 text-center transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-sm"
                >
                  <IconWithBackground
                    variant={action.variant}
                    size="medium"
                    icon={action.icon}
                    square
                  />
                  <span className="text-xs font-medium text-neutral-700">{action.label}</span>
                </button>
              </Link>
            ))}
          </div>
        </div>

        {/* Historial reciente */}
        {data.history.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-sm font-semibold text-neutral-700">Historial reciente</h2>
            <div className="rounded-xl border border-neutral-200 bg-white px-4">
              {data.history.map((b) => (
                <HistoryRow key={b.id} booking={b} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
