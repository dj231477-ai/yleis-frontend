import { BookingModalTrigger } from "@/components/custom/classes/BookingModalTrigger";
import { createClient } from "@/lib/supabase/server";
import { getActivePlan } from "@/services/plans";
import { getVerifiedTeachers } from "@/services/teachers";
import { Avatar } from "@/ui/components/Avatar";
import { Badge } from "@/ui/components/Badge";
import { Button } from "@/ui/components/Button";
import {
  FeatherCalendar,
  FeatherClock,
  FeatherExternalLink,
  FeatherMessageSquare,
  FeatherSearch,
} from "@subframe/core";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Mis Clases — Yleis" };
export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
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

function statusBadge(status: string) {
  const map: Record<
    string,
    { label: string; variant: "brand" | "success" | "warning" | "error" | "neutral" }
  > = {
    pending_teacher: { label: "Esperando profesor", variant: "warning" },
    pending: { label: "Pendiente pago", variant: "warning" },
    confirmed: { label: "Confirmada", variant: "brand" },
    paid: { label: "Pagada", variant: "brand" },
    in_progress: { label: "En curso", variant: "success" },
    completed: { label: "Completada", variant: "success" },
    cancelled_student: { label: "Cancelada", variant: "error" },
    cancelled_teacher: { label: "Cancelada", variant: "error" },
    refunded: { label: "Reembolsada", variant: "neutral" },
  };
  const entry = map[status] ?? { label: status, variant: "neutral" as const };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}

const BOOKING_SELECT = `
  id, scheduled_at, duration_min, price, status, meet_link,
  teachers(users(full_name, avatar_url)),
  subjects(name)
` as const;

type BookingRow = {
  id: string;
  scheduled_at: string;
  duration_min: number;
  price: number;
  status: string;
  meet_link: string | null;
  teacher_name: string;
  teacher_avatar: string | null;
  subject_name: string;
};

export default async function StudentClassesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [studentResult, activePlan, teachers, subjectsResult] = await Promise.all([
    supabase.from("students").select("id").eq("user_id", user.id).single(),
    getActivePlan(supabase, user.id),
    getVerifiedTeachers(supabase),
    // biome-ignore lint/suspicious/noExplicitAny: tabla no tipada
    (supabase as any)
      .from("subjects")
      .select("id, name, category")
      .order("name"),
  ]);

  const student = studentResult.data;
  const subjects: Array<{ id: string; name: string; category: string | null }> =
    subjectsResult.data ?? [];

  const teacherList = teachers.map((t) => ({
    id: t.id,
    full_name: t.full_name,
    hourly_rate: t.hourly_rate,
  }));

  const hasActivePlan =
    activePlan != null && activePlan.plan_slug !== "free" && activePlan.remaining_hours > 0;

  if (!student) {
    return <EmptyState subjects={subjects} teachers={teacherList} hasActivePlan={hasActivePlan} />;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Supabase typed client does not include all tables
  const { data: raw } = await (supabase as any)
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("student_id", student.id)
    .order("scheduled_at", { ascending: false });

  // biome-ignore lint/suspicious/noExplicitAny: Supabase typed client does not include all tables
  const all: BookingRow[] = (raw ?? []).map((b: any) => ({
    id: b.id as string,
    scheduled_at: b.scheduled_at as string,
    duration_min: b.duration_min as number,
    price: b.price as number,
    status: b.status as string,
    meet_link: (b.meet_link as string | null) ?? null,
    teacher_name: (b.teachers?.users?.full_name as string) ?? "Profesor",
    teacher_avatar: (b.teachers?.users?.avatar_url as string | null) ?? null,
    subject_name: (b.subjects?.name as string) ?? "Clase",
  }));

  const ACTIVE_STATUSES = ["pending_teacher", "pending", "confirmed", "paid", "in_progress"];
  const upcoming = all.filter((b) => ACTIVE_STATUSES.includes(b.status));
  const history = all.filter((b) => !ACTIVE_STATUSES.includes(b.status));

  if (all.length === 0) {
    return <EmptyState subjects={subjects} teachers={teacherList} hasActivePlan={hasActivePlan} />;
  }

  const activePlanLabel = activePlan
    ? `${activePlan.plan_name} · ${activePlan.remaining_hours}h disponibles`
    : null;

  return (
    <div className="bg-neutral-50 min-h-full">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Mis Clases</h1>
            {activePlanLabel && (
              <p className="mt-1 text-sm text-brand-600 font-medium">{activePlanLabel}</p>
            )}
          </div>
          {hasActivePlan && <BookingModalTrigger subjects={subjects} teachers={teacherList} />}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard label="Activas" value={upcoming.length} color="brand" />
          <StatCard
            label="Completadas"
            value={history.filter((b) => b.status === "completed").length}
            color="success"
          />
          <StatCard
            label="Canceladas"
            value={history.filter((b) => b.status.startsWith("cancelled")).length}
            color="neutral"
          />
        </div>

        {/* Próximas y activas */}
        {upcoming.length > 0 && (
          <Section title="Próximas y activas">
            {upcoming.map((b) => (
              <ClassRow key={b.id} booking={b} />
            ))}
          </Section>
        )}

        {/* Historial */}
        {history.length > 0 && (
          <Section title="Historial">
            {history.map((b) => (
              <ClassRow key={b.id} booking={b} />
            ))}
          </Section>
        )}
      </div>
    </div>
  );
}

function ClassRow({ booking: b }: { booking: BookingRow }) {
  const formatCOP = (n: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(n);

  const showChat = ["confirmed", "paid", "in_progress"].includes(b.status);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4 hover:bg-neutral-50 transition-colors">
      <Avatar image={b.teacher_avatar ?? undefined} size="medium" variant="brand">
        {!b.teacher_avatar ? initials(b.teacher_name) : undefined}
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium text-neutral-900 text-sm">{b.teacher_name}</p>
        <p className="text-xs text-neutral-500">{b.subject_name}</p>
        <div className="flex items-center gap-1 mt-0.5 text-xs text-neutral-400">
          <FeatherCalendar className="h-3 w-3" />
          {formatDate(b.scheduled_at)} · {formatTime(b.scheduled_at)} · {b.duration_min} min
        </div>
      </div>
      <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
        <p className="text-sm font-medium text-neutral-700">{formatCOP(b.price)}</p>
        <div className="flex items-center gap-1.5">
          {statusBadge(b.status)}
          {["confirmed", "paid", "in_progress"].includes(b.status) && (
            <Link
              href={`/app/student/classes/${b.id}`}
              title="Ver detalle y chat"
              className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-400 hover:bg-brand-50 hover:text-brand-600 transition-colors"
            >
              <FeatherExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
          {showChat && (
            <Link
              href={`/app/messages/booking/${b.id}`}
              title="Abrir mensajes"
              className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-400 hover:bg-brand-50 hover:text-brand-600 transition-colors"
            >
              <FeatherMessageSquare className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: { label: string; value: number; color: "brand" | "success" | "neutral" }) {
  const colorMap = {
    brand: "border-brand-100 bg-brand-50 text-brand-700",
    success: "border-success-100 bg-success-50 text-success-700",
    neutral: "border-neutral-200 bg-white text-neutral-700",
  };
  return (
    <div className={`rounded-xl border p-4 text-center ${colorMap[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-neutral-500 mt-0.5">{label}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="mb-3 text-sm font-semibold text-neutral-700">{title}</h2>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function EmptyState({
  subjects,
  teachers,
  hasActivePlan,
}: {
  subjects: Array<{ id: string; name: string; category: string | null }>;
  teachers: Array<{ id: string; full_name: string; hourly_rate: number | null }>;
  hasActivePlan: boolean;
}) {
  return (
    <div className="bg-neutral-50 min-h-full">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-neutral-900">Mis Clases</h1>
          {hasActivePlan && <BookingModalTrigger subjects={subjects} teachers={teachers} />}
        </div>
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-neutral-300 bg-white p-16 text-center">
          {hasActivePlan ? (
            <>
              <FeatherClock className="h-10 w-10 text-neutral-300" />
              <div>
                <p className="font-semibold text-neutral-700">Aún no tienes clases</p>
                <p className="mt-1 text-sm text-neutral-500">
                  Tienes clases disponibles en tu plan. ¡Programa la primera!
                </p>
              </div>
            </>
          ) : (
            <>
              <FeatherSearch className="h-10 w-10 text-neutral-300" />
              <div>
                <p className="font-semibold text-neutral-700">Aún no tienes clases</p>
                <p className="mt-1 text-sm text-neutral-500">
                  Reserva tu primera clase o activa un plan para programar.
                </p>
              </div>
              <Link href="/app/student/search">
                <Button variant="brand-primary" size="medium">
                  Buscar profesores
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
