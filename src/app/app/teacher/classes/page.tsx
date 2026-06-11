import { createClient } from "@/lib/supabase/server";
import { getTeacherProfile } from "@/services/teachers";
import { Avatar } from "@/ui/components/Avatar";
import { Badge } from "@/ui/components/Badge";
import { FeatherCalendar, FeatherMessageSquare } from "@subframe/core";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Mis Clases — Yleis Profesores" };
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

function formatARS(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
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
    pending: { label: "Pendiente", variant: "warning" },
    confirmed: { label: "Confirmada", variant: "brand" },
    paid: { label: "Pagada", variant: "brand" },
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
  students(users(full_name, avatar_url)),
  subjects(name)
` as const;

export default async function TeacherClassesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: userRow } = await supabase.from("users").select("role").eq("id", user.id).single();

  if (userRow?.role !== "teacher") redirect("/app/student/dashboard");

  const teacher = await getTeacherProfile(supabase, user.id);
  if (!teacher || teacher.onboarding_step !== "verified") redirect("/app/teacher/onboarding");

  // biome-ignore lint/suspicious/noExplicitAny: Supabase typed client does not include all tables
  const { data: raw } = await (supabase as any)
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("teacher_id", teacher.id)
    .order("scheduled_at", { ascending: false });

  // biome-ignore lint/suspicious/noExplicitAny: Supabase typed client does not include all tables
  const all = (raw ?? []).map((b: any) => ({
    id: b.id as string,
    scheduled_at: b.scheduled_at as string,
    duration_min: b.duration_min as number,
    price: b.price as number,
    status: b.status as string,
    meet_link: (b.meet_link as string | null) ?? null,
    student_name: (b.students?.users?.full_name as string) ?? "Estudiante",
    student_avatar: (b.students?.users?.avatar_url as string | null) ?? null,
    subject_name: (b.subjects?.name as string) ?? "Clase",
  }));

  const upcoming = all.filter((b: { status: string }) =>
    ["pending", "confirmed", "paid"].includes(b.status)
  );
  const history = all.filter(
    (b: { status: string }) => !["pending", "confirmed", "paid"].includes(b.status)
  );
  const totalEarned = all
    .filter((b: { status: string }) => b.status === "completed")
    .reduce((s: number, b: { price: number }) => s + b.price * 0.85, 0);

  return (
    <div className="bg-neutral-50 min-h-full">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900">Mis Clases</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {all.length} clase{all.length !== 1 ? "s" : ""} en total
          </p>
        </div>

        {all.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <StatCard label="Activas" value={upcoming.length} color="brand" />
            <StatCard
              label="Completadas"
              value={history.filter((b: { status: string }) => b.status === "completed").length}
              color="success"
            />
            <StatCard label="Ganado" value={formatARS(totalEarned)} color="neutral" />
          </div>
        )}

        {all.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-neutral-300 bg-white p-16 text-center">
            <FeatherCalendar className="h-10 w-10 text-neutral-300" />
            <div>
              <p className="font-semibold text-neutral-700">Aún no tienes clases</p>
              <p className="mt-1 text-sm text-neutral-500">
                Las reservas que aceptes aparecerán aquí.
              </p>
            </div>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="mb-5">
                <h2 className="mb-3 text-sm font-semibold text-neutral-700">Próximas y activas</h2>
                <div className="flex flex-col gap-2">
                  {upcoming.map((b: (typeof all)[0]) => (
                    <ClassRow key={b.id} booking={b} />
                  ))}
                </div>
              </div>
            )}
            {history.length > 0 && (
              <div>
                <h2 className="mb-3 text-sm font-semibold text-neutral-700">Historial</h2>
                <div className="flex flex-col gap-2">
                  {history.map((b: (typeof all)[0]) => (
                    <ClassRow key={b.id} booking={b} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ClassRow({
  booking: b,
}: {
  booking: {
    id: string;
    scheduled_at: string;
    duration_min: number;
    price: number;
    status: string;
    meet_link: string | null;
    student_name: string;
    student_avatar: string | null;
    subject_name: string;
  };
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4 hover:bg-neutral-50 transition-colors">
      <Avatar image={b.student_avatar ?? undefined} size="medium" variant="neutral">
        {!b.student_avatar ? initials(b.student_name) : undefined}
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium text-neutral-900 text-sm">{b.student_name}</p>
        <p className="text-xs text-neutral-500">{b.subject_name}</p>
        <div className="flex items-center gap-1 mt-0.5 text-xs text-neutral-400">
          <FeatherCalendar className="h-3 w-3" />
          {formatDate(b.scheduled_at)} · {formatTime(b.scheduled_at)} · {b.duration_min} min
        </div>
      </div>
      <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
        <p className="text-sm font-medium text-neutral-700">{formatARS(b.price)}</p>
        <div className="flex items-center gap-1.5">
          {statusBadge(b.status)}
          {(b.status === "confirmed" || b.status === "paid") && (
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
}: { label: string; value: number | string; color: "brand" | "success" | "neutral" }) {
  const colorMap = {
    brand: "border-brand-100 bg-brand-50 text-brand-700",
    success: "border-success-100 bg-success-50 text-success-700",
    neutral: "border-neutral-200 bg-white text-neutral-700",
  };
  return (
    <div className={`rounded-xl border p-4 text-center ${colorMap[color]}`}>
      <p className="text-xl font-bold leading-tight">{value}</p>
      <p className="text-xs text-neutral-500 mt-0.5">{label}</p>
    </div>
  );
}
