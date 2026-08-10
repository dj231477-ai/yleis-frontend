import { PLATFORM_FEE, TEACHER_PAYOUT } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/ui/components/Avatar";
import { Badge } from "@/ui/components/Badge";
import { FeatherCalendar, FeatherDollarSign } from "@subframe/core";
import { redirect } from "next/navigation";

export const metadata = { title: "Pagos — Yleis" };
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
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

const BOOKING_SELECT = `
  id, scheduled_at, duration_min, price, status,
  teachers(users(full_name, avatar_url)),
  subjects(name)
` as const;

const TEACHER_BOOKING_SELECT = `
  id, scheduled_at, duration_min, price, status,
  students(users(full_name, avatar_url)),
  subjects(name)
` as const;

function statusBadge(status: string) {
  if (status === "paid") return <Badge variant="brand">Pagada</Badge>;
  if (status === "completed") return <Badge variant="success">Completada</Badge>;
  if (status === "confirmed") return <Badge variant="neutral">Confirmada</Badge>;
  return <Badge variant="neutral">{status}</Badge>;
}

export default async function PaymentsPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const { data: userRow } = await supabase
    .from("users")
    .select("role")
    .eq("id", authUser.id)
    .single();

  if (!userRow) redirect("/app");

  const isTeacher = userRow.role === "teacher";

  if (isTeacher) {
    // ── Vista profesor ─────────────────────────────────────────────────────
    const { data: teacher } = await supabase
      .from("teachers")
      .select("id")
      .eq("user_id", authUser.id)
      .single();

    if (!teacher) redirect("/app/teacher/onboarding");

    // biome-ignore lint/suspicious/noExplicitAny: Supabase typed client does not include all tables
    const { data: raw } = await (supabase as any)
      .from("bookings")
      .select(TEACHER_BOOKING_SELECT)
      .eq("teacher_id", teacher.id)
      .in("status", ["confirmed", "paid", "completed"])
      .order("scheduled_at", { ascending: false });

    // biome-ignore lint/suspicious/noExplicitAny: Supabase typed client does not include all tables
    const bookings = (raw ?? []).map((b: any) => ({
      id: b.id as string,
      scheduled_at: b.scheduled_at as string,
      duration_min: b.duration_min as number,
      price: b.price as number,
      status: b.status as string,
      counterpart_name: (b.students?.users?.full_name as string) ?? "Estudiante",
      counterpart_avatar: (b.students?.users?.avatar_url as string | null) ?? null,
      subject_name: (b.subjects?.name as string) ?? "Clase",
    }));

    const totalEarned = bookings
      .filter((b: { status: string }) => b.status === "completed")
      .reduce((sum: number, b: { price: number }) => sum + b.price * TEACHER_PAYOUT, 0);

    const currentMonth = new Intl.DateTimeFormat("es-CO", {
      month: "long",
      year: "numeric",
    }).format(new Date());

    return (
      <TeacherPaymentsView
        bookings={bookings}
        totalEarned={totalEarned}
        currentMonth={currentMonth}
      />
    );
  }

  // ── Vista estudiante ──────────────────────────────────────────────────────
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", authUser.id)
    .single();

  if (!student) {
    return <EmptyPayments isTeacher={false} />;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Supabase typed client does not include all tables
  const { data: raw } = await (supabase as any)
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("student_id", student.id)
    .in("status", ["paid", "completed"])
    .order("scheduled_at", { ascending: false });

  // biome-ignore lint/suspicious/noExplicitAny: Supabase typed client does not include all tables
  const bookings = (raw ?? []).map((b: any) => ({
    id: b.id as string,
    scheduled_at: b.scheduled_at as string,
    duration_min: b.duration_min as number,
    price: b.price as number,
    status: b.status as string,
    counterpart_name: (b.teachers?.users?.full_name as string) ?? "Profesor",
    counterpart_avatar: (b.teachers?.users?.avatar_url as string | null) ?? null,
    subject_name: (b.subjects?.name as string) ?? "Clase",
  }));

  const totalSpent = bookings.reduce((sum: number, b: { price: number }) => sum + b.price, 0);

  return <StudentPaymentsView bookings={bookings} totalSpent={totalSpent} />;
}

// ── Sub-views ─────────────────────────────────────────────────────────────────

type BookingEntry = {
  id: string;
  scheduled_at: string;
  duration_min: number;
  price: number;
  status: string;
  counterpart_name: string;
  counterpart_avatar: string | null;
  subject_name: string;
};

function StudentPaymentsView({
  bookings,
  totalSpent,
}: { bookings: BookingEntry[]; totalSpent: number }) {
  return (
    <div className="bg-neutral-50 min-h-full">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">Mis Pagos</h1>
        <p className="text-sm text-neutral-500 mb-6">Historial de clases pagadas</p>

        {bookings.length > 0 && (
          <div className="rounded-xl border border-brand-100 bg-brand-50 p-5 mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-500">Total invertido en clases</p>
              <p className="text-2xl font-bold text-brand-700">{formatCOP(totalSpent)}</p>
            </div>
            <FeatherDollarSign className="h-8 w-8 text-brand-300" />
          </div>
        )}

        {bookings.length === 0 ? (
          <EmptyPayments isTeacher={false} />
        ) : (
          <div className="flex flex-col gap-3">
            {bookings.map((b) => (
              <BookingEntry key={b.id} booking={b} isTeacher={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TeacherPaymentsView({
  bookings,
  totalEarned,
  currentMonth,
}: {
  bookings: BookingEntry[];
  totalEarned: number;
  currentMonth: string;
}) {
  return (
    <div className="bg-neutral-50 min-h-full">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">Mis Ganancias</h1>
        <p className="text-sm text-neutral-500 mb-6">Resumen de clases y cobros</p>

        {bookings.length > 0 && (
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="rounded-xl border border-success-100 bg-success-50 p-5">
              <p className="text-xs text-neutral-500 mb-1">Ganado (clases completadas)</p>
              <p className="text-2xl font-bold text-success-700">{formatCOP(totalEarned)}</p>
              <p className="text-xs text-neutral-400 mt-1">
                Comisión Yleis ({(PLATFORM_FEE * 100).toFixed(0)}%) ya descontada
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-5">
              <p className="text-xs text-neutral-500 mb-1">Total de clases</p>
              <p className="text-2xl font-bold text-neutral-900">{bookings.length}</p>
              <p className="text-xs text-neutral-400 mt-1 capitalize">{currentMonth}</p>
            </div>
          </div>
        )}

        {bookings.length === 0 ? (
          <EmptyPayments isTeacher={true} />
        ) : (
          <div className="flex flex-col gap-3">
            {bookings.map((b) => (
              <BookingEntry key={b.id} booking={b} isTeacher={true} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BookingEntry({ booking: b, isTeacher }: { booking: BookingEntry; isTeacher: boolean }) {
  const earned = isTeacher ? b.price * TEACHER_PAYOUT : b.price;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4">
      <Avatar
        image={b.counterpart_avatar ?? undefined}
        size="medium"
        variant={isTeacher ? "neutral" : "brand"}
      >
        {!b.counterpart_avatar ? initials(b.counterpart_name) : undefined}
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium text-neutral-900 text-sm">{b.counterpart_name}</p>
        <p className="text-xs text-neutral-500">{b.subject_name}</p>
        <div className="flex items-center gap-1 mt-0.5 text-xs text-neutral-400">
          <FeatherCalendar className="h-3 w-3" />
          {formatDate(b.scheduled_at)} · {b.duration_min} min
        </div>
      </div>
      <div className="text-right shrink-0">
        <p
          className={`text-sm font-semibold ${isTeacher ? "text-success-700" : "text-neutral-800"}`}
        >
          {isTeacher ? "+" : ""}
          {formatCOP(earned)}
        </p>
        <div className="mt-1">{statusBadge(b.status)}</div>
      </div>
    </div>
  );
}

function EmptyPayments({ isTeacher }: { isTeacher: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-300 bg-white p-12 text-center">
      <FeatherDollarSign className="h-10 w-10 text-neutral-300" />
      <p className="font-medium text-neutral-700">
        {isTeacher ? "Aún no tienes ganancias registradas" : "Aún no has pagado ninguna clase"}
      </p>
      <p className="text-sm text-neutral-400">
        {isTeacher
          ? "Cuando completes clases, aparecerán aquí."
          : "Reserva tu primera clase para empezar."}
      </p>
    </div>
  );
}
