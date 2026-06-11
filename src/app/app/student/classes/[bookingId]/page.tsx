import { ClassChat } from "@/components/custom/chat/ClassChat";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/ui/components/Avatar";
import { Badge } from "@/ui/components/Badge";
import { FeatherCalendar, FeatherClock, FeatherVideo } from "@subframe/core";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId: _ } = await params;
  return { title: "Detalle de clase — Yleis" };
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

function formatCOP(n: number) {
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

const STATUS_LABELS: Record<
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

export default async function StudentClassDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!student) redirect("/app/student/classes");

  // biome-ignore lint/suspicious/noExplicitAny: confirmation_code, in_progress not in typed schema
  const { data: booking } = await (supabase as any)
    .from("bookings")
    .select(`
      id, scheduled_at, duration_min, price, status, meet_link, confirmation_code,
      subjects(name),
      teachers(users(full_name, avatar_url))
    `)
    .eq("id", bookingId)
    .eq("student_id", student.id)
    .maybeSingle();

  if (!booking) notFound();

  const teacherName = booking.teachers?.users?.full_name ?? "Profesor";
  const teacherAvatar = booking.teachers?.users?.avatar_url ?? null;
  const subjectName = booking.subjects?.name ?? "Clase";
  const statusEntry = STATUS_LABELS[booking.status] ?? {
    label: booking.status,
    variant: "neutral" as const,
  };

  const scheduledDate = new Date(booking.scheduled_at);
  const now = new Date();
  const minutesUntil = (scheduledDate.getTime() - now.getTime()) / 60000;

  // Chat is enabled 45 min before, and during/after (read-only when completed)
  const chatEnabled =
    minutesUntil <= 45 || ["in_progress", "completed"].includes(booking.status as string);
  const chatIsActive = ["confirmed", "paid", "in_progress"].includes(booking.status as string);

  const activeStatuses = ["pending_teacher", "pending", "confirmed", "paid", "in_progress"];
  if (!activeStatuses.includes(booking.status as string) && booking.status !== "completed") {
    redirect("/app/student/classes");
  }

  return (
    <div className="bg-neutral-50 min-h-full">
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-6">
          <a
            href="/app/student/classes"
            className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
          >
            ← Mis clases
          </a>
          <h1 className="text-2xl font-bold text-neutral-900">{subjectName}</h1>
        </div>

        {/* Booking card */}
        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center gap-3 mb-4">
            <Avatar image={teacherAvatar ?? undefined} size="large" variant="brand">
              {!teacherAvatar ? initials(teacherName) : undefined}
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-neutral-900">{teacherName}</p>
              <p className="text-sm text-neutral-500">{subjectName}</p>
            </div>
            <Badge variant={statusEntry.variant}>{statusEntry.label}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-neutral-600">
              <FeatherCalendar className="h-4 w-4 shrink-0 text-neutral-400" />
              <span>{formatDate(booking.scheduled_at)}</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-600">
              <FeatherClock className="h-4 w-4 shrink-0 text-neutral-400" />
              <span>
                {formatTime(booking.scheduled_at)} · {booking.duration_min} min
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3">
            <span className="text-sm font-semibold text-neutral-900">
              {formatCOP(booking.price)}
            </span>
            {booking.meet_link && (
              <a
                href={booking.meet_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-100 transition-colors"
              >
                <FeatherVideo className="h-4 w-4" />
                Unirse a Meet
              </a>
            )}
          </div>
        </div>

        {/* Confirmation code — visible only to student when booking is confirmed/paid/in_progress */}
        {booking.confirmation_code && ["confirmed", "paid"].includes(booking.status as string) && (
          <div className="mb-6 rounded-xl border-2 border-brand-200 bg-brand-50 p-5 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-600">
              Código de inicio de clase
            </p>
            <p className="font-mono text-4xl font-bold tracking-widest text-brand-700">
              {booking.confirmation_code}
            </p>
            <p className="mt-2 text-xs text-neutral-500">
              Dile este código al profesor cuando empiece la clase.
            </p>
          </div>
        )}

        {/* Chat */}
        {(chatEnabled || chatIsActive) && (
          <div>
            <h2 className="mb-3 text-sm font-semibold text-neutral-700">Chat de clase</h2>
            <ClassChat
              bookingId={bookingId}
              currentUserId={user.id}
              isActive={chatIsActive}
              chatEnabled={chatEnabled}
            />
          </div>
        )}
      </div>
    </div>
  );
}
