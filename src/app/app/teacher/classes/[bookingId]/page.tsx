import { ClassChat } from "@/components/custom/chat/ClassChat";
import { StartClassButton } from "@/components/custom/teacher/StartClassButton";
import { createClient } from "@/lib/supabase/server";
import { getTeacherProfile } from "@/services/teachers";
import { Avatar } from "@/ui/components/Avatar";
import { Badge } from "@/ui/components/Badge";
import { FeatherCalendar, FeatherClock, FeatherVideo } from "@subframe/core";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
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
  pending_teacher: { label: "Pendiente tu confirmación", variant: "warning" },
  pending: { label: "Pendiente pago", variant: "warning" },
  confirmed: { label: "Confirmada", variant: "brand" },
  paid: { label: "Pagada", variant: "brand" },
  in_progress: { label: "En curso", variant: "success" },
  completed: { label: "Completada", variant: "success" },
  cancelled_student: { label: "Cancelada", variant: "error" },
  cancelled_teacher: { label: "Cancelada", variant: "error" },
  refunded: { label: "Reembolsada", variant: "neutral" },
};

export default async function TeacherClassDetailPage({
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

  const teacher = await getTeacherProfile(supabase, user.id);
  if (!teacher || teacher.onboarding_step !== "verified") redirect("/app/teacher/onboarding");

  // biome-ignore lint/suspicious/noExplicitAny: confirmation_code not in typed schema
  const { data: booking } = await (supabase as any)
    .from("bookings")
    .select(`
      id, scheduled_at, duration_min, price, status, meet_link, confirmation_code,
      subjects(name),
      students(users(full_name, avatar_url))
    `)
    .eq("id", bookingId)
    .eq("teacher_id", teacher.id)
    .maybeSingle();

  if (!booking) notFound();

  const studentName = booking.students?.users?.full_name ?? "Estudiante";
  const studentAvatar = booking.students?.users?.avatar_url ?? null;
  const subjectName = booking.subjects?.name ?? "Clase";
  const statusEntry = STATUS_LABELS[booking.status] ?? {
    label: booking.status,
    variant: "neutral" as const,
  };

  const scheduledDate = new Date(booking.scheduled_at);
  const now = new Date();
  const minutesUntil = (scheduledDate.getTime() - now.getTime()) / 60000;

  const chatEnabled =
    minutesUntil <= 45 || ["in_progress", "completed"].includes(booking.status as string);
  const chatIsActive = ["confirmed", "paid", "in_progress"].includes(booking.status as string);

  return (
    <div className="bg-neutral-50 min-h-full">
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-6">
          <a
            href="/app/teacher/dashboard"
            className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
          >
            ← Dashboard
          </a>
          <h1 className="text-2xl font-bold text-neutral-900">{subjectName}</h1>
        </div>

        {/* Booking card */}
        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center gap-3 mb-4">
            <Avatar image={studentAvatar ?? undefined} size="large" variant="neutral">
              {!studentAvatar ? initials(studentName) : undefined}
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-neutral-900">{studentName}</p>
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
                Abrir Meet
              </a>
            )}
          </div>
        </div>

        {/* Start class section — teacher enters code to begin */}
        {["confirmed", "paid"].includes(booking.status as string) && (
          <div className="mb-6 rounded-xl border border-brand-200 bg-brand-50 p-5">
            <p className="mb-1 text-sm font-semibold text-brand-800">Iniciar clase</p>
            <p className="mb-4 text-xs text-neutral-500">
              Pídele el código al estudiante e introdúcelo para marcar la clase como iniciada.
            </p>
            <StartClassButton bookingId={bookingId} />
          </div>
        )}

        {/* In progress indicator */}
        {booking.status === "in_progress" && (
          <div className="mb-6 rounded-xl border border-success-200 bg-success-50 px-5 py-3">
            <p className="text-sm font-semibold text-success-700">Clase en curso</p>
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
