import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/ui/components/Badge";
import { FeatherCalendar, FeatherExternalLink, FeatherVideo } from "@subframe/core";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Calendario - Yleis" };
export const dynamic = "force-dynamic";

type CalendarBooking = {
  id: string;
  scheduled_at: string;
  duration_min: number;
  status: string;
  meet_link: string | null;
  subject_name: string;
  counterpart_name: string;
};

type TeacherBookingRow = {
  id: string;
  scheduled_at: string;
  duration_min: number;
  status: string;
  meet_link: string | null;
  subjects?: { name?: string | null } | null;
  students?: { users?: { full_name?: string | null } | null } | null;
};

type StudentBookingRow = {
  id: string;
  scheduled_at: string;
  duration_min: number;
  status: string;
  meet_link: string | null;
  subjects?: { name?: string | null } | null;
  teachers?: { users?: { full_name?: string | null } | null } | null;
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(iso));
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Pendiente",
    pending_teacher: "Por confirmar",
    confirmed: "Confirmada",
    paid: "Pagada",
    in_progress: "En curso",
  };
  return labels[status] ?? status;
}

export default async function CalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: userRow } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!userRow) redirect("/app");

  const role = userRow.role;
  let bookings: CalendarBooking[] = [];

  if (role === "teacher") {
    const { data: teacher } = await supabase
      .from("teachers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (teacher) {
      // biome-ignore lint/suspicious/noExplicitAny: typed client does not include nested relation shape
      const { data } = await (supabase as any)
        .from("bookings")
        .select(
          "id, scheduled_at, duration_min, status, meet_link, subjects(name), students(users(full_name))"
        )
        .eq("teacher_id", teacher.id)
        .gte("scheduled_at", new Date().toISOString())
        .in("status", ["pending", "pending_teacher", "confirmed", "paid", "in_progress"])
        .order("scheduled_at", { ascending: true })
        .limit(12);

      const rows = (data ?? []) as TeacherBookingRow[];
      bookings = rows.map((booking) => ({
        id: booking.id,
        scheduled_at: booking.scheduled_at,
        duration_min: booking.duration_min,
        status: booking.status,
        meet_link: booking.meet_link ?? null,
        subject_name: booking.subjects?.name ?? "Clase",
        counterpart_name: booking.students?.users?.full_name ?? "Estudiante",
      }));
    }
  } else {
    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (student) {
      // biome-ignore lint/suspicious/noExplicitAny: typed client does not include nested relation shape
      const { data } = await (supabase as any)
        .from("bookings")
        .select(
          "id, scheduled_at, duration_min, status, meet_link, subjects(name), teachers(users(full_name))"
        )
        .eq("student_id", student.id)
        .gte("scheduled_at", new Date().toISOString())
        .in("status", ["pending", "pending_teacher", "confirmed", "paid", "in_progress"])
        .order("scheduled_at", { ascending: true })
        .limit(12);

      const rows = (data ?? []) as StudentBookingRow[];
      bookings = rows.map((booking) => ({
        id: booking.id,
        scheduled_at: booking.scheduled_at,
        duration_min: booking.duration_min,
        status: booking.status,
        meet_link: booking.meet_link ?? null,
        subject_name: booking.subjects?.name ?? "Clase",
        counterpart_name: booking.teachers?.users?.full_name ?? "Profesor",
      }));
    }
  }

  const calcomUrl = process.env.NEXT_PUBLIC_CALCOM_URL;

  return (
    <div className="bg-neutral-50 min-h-full">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Calendario</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Proximas clases y acceso rapido a tus reuniones.
            </p>
          </div>
          {calcomUrl && (
            <a
              href={calcomUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              <FeatherExternalLink className="h-4 w-4" />
              Abrir Cal.com
            </a>
          )}
        </div>

        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <FeatherCalendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-neutral-800">Cal.com</h2>
              <p className="mt-1 text-sm text-neutral-500">
                La integracion queda lista para activarse con `NEXT_PUBLIC_CALCOM_URL`. En el MVP,
                el link de Google Meet se gestiona manualmente en cada clase.
              </p>
            </div>
          </div>
        </div>

        {bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white p-12 text-center">
            <FeatherCalendar className="h-10 w-10 text-neutral-300" />
            <h2 className="mt-4 text-lg font-semibold text-neutral-800">Sin clases proximas</h2>
            <p className="mt-1 max-w-sm text-sm text-neutral-500">
              Cuando tengas reservas confirmadas o pendientes, apareceran aqui.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-neutral-900">{booking.subject_name}</h2>
                    <Badge variant="brand">{statusLabel(booking.status)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-neutral-500">
                    {booking.counterpart_name} · {formatDate(booking.scheduled_at)} ·{" "}
                    {formatTime(booking.scheduled_at)} · {booking.duration_min} min
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {booking.meet_link && (
                    <a
                      href={booking.meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-success-50 px-3 py-2 text-sm font-medium text-success-700 hover:bg-success-100"
                    >
                      <FeatherVideo className="h-4 w-4" />
                      Meet
                    </a>
                  )}
                  <Link
                    href={
                      role === "teacher"
                        ? `/app/teacher/classes/${booking.id}`
                        : `/app/student/classes/${booking.id}`
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    <FeatherExternalLink className="h-4 w-4" />
                    Detalle
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
