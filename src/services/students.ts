import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type BookingStatus = Database["public"]["Tables"]["bookings"]["Row"]["status"];

export type BookingRow = {
  id: string;
  scheduled_at: string;
  scheduled_end_at: string;
  duration_min: number;
  status: BookingStatus;
  price: number;
  meet_link: string | null;
  teacher_name: string;
  teacher_avatar: string | null;
  subject_name: string;
};

export type StudentDashboardData = {
  full_name: string;
  avatar_url: string | null;
  active_bookings: BookingRow[];
  next_class: BookingRow | null;
  history: BookingRow[];
};

// biome-ignore lint/suspicious/noExplicitAny: Supabase typed client does not include all tables
function mapBooking(b: any): BookingRow {
  const teacher = b.teachers;
  const teacherUser = teacher?.users ?? {};
  return {
    id: b.id,
    scheduled_at: b.scheduled_at,
    scheduled_end_at: b.scheduled_end_at,
    duration_min: b.duration_min,
    status: b.status,
    price: b.price,
    meet_link: b.meet_link ?? null,
    teacher_name: teacherUser.full_name ?? "Profesor",
    teacher_avatar: teacherUser.avatar_url ?? null,
    subject_name: b.subjects?.name ?? "Clase",
  };
}

const BOOKING_SELECT = `
  id, scheduled_at, scheduled_end_at, duration_min, status, price, meet_link,
  teachers(users(full_name, avatar_url)),
  subjects(name)
` as const;

export async function getStudentDashboard(
  supabase: SupabaseClient<Database>
): Promise<StudentDashboardData> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const [{ data: userRow }, { data: studentRow }] = await Promise.all([
    supabase.from("users").select("full_name, avatar_url").eq("id", user.id).single(),
    supabase.from("students").select("id").eq("user_id", user.id).single(),
  ]);

  if (!studentRow) {
    return {
      full_name: userRow?.full_name ?? "Estudiante",
      avatar_url: userRow?.avatar_url ?? null,
      active_bookings: [],
      next_class: null,
      history: [],
    };
  }

  const [{ data: rawActive }, { data: rawHistory }] = await Promise.all([
    supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("student_id", studentRow.id)
      .in("status", ["confirmed", "paid"])
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(5),
    supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("student_id", studentRow.id)
      .eq("status", "completed")
      .order("scheduled_at", { ascending: false })
      .limit(3),
  ]);

  const active_bookings = (rawActive ?? []).map(mapBooking);

  return {
    full_name: userRow?.full_name ?? "Estudiante",
    avatar_url: userRow?.avatar_url ?? null,
    active_bookings,
    next_class: active_bookings[0] ?? null,
    history: (rawHistory ?? []).map(mapBooking),
  };
}
