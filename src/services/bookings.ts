import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CreateBookingPayload = {
  teacherId: string;
  subjectId: string;
  scheduledAt: string;
  durationMin: number;
  price: number;
  notes?: string;
};

export type BookingConfirmation = {
  id: string;
  scheduled_at: string;
  duration_min: number;
  price: number;
  notes: string | null;
  teacher_name: string;
  teacher_avatar: string | null;
  subject_name: string;
};

export async function createBooking(
  supabase: SupabaseClient<Database>,
  userId: string,
  payload: CreateBookingPayload
): Promise<{ bookingId: string | null; error: string | null }> {
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (!student) {
    return { bookingId: null, error: "No se encontró tu perfil de estudiante. Recarga la página." };
  }

  const { data: existing } = await supabase
    .from("bookings")
    .select("id")
    .eq("student_id", student.id)
    .eq("teacher_id", payload.teacherId)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return {
      bookingId: null,
      error:
        "Ya tienes una reserva pendiente con este profesor. Espera a que la confirme antes de hacer otra.",
    };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Supabase typed client does not include all tables
  const { data: booking, error } = await (supabase as any)
    .from("bookings")
    .insert({
      student_id: student.id,
      teacher_id: payload.teacherId,
      subject_id: payload.subjectId,
      scheduled_at: payload.scheduledAt,
      duration_min: payload.durationMin,
      price: payload.price,
      notes: payload.notes ?? null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) return { bookingId: null, error: error.message };
  return { bookingId: booking.id, error: null };
}

export async function getBookingConfirmation(
  supabase: SupabaseClient<Database>,
  bookingId: string,
  userId: string
): Promise<BookingConfirmation | null> {
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (!student) return null;

  // biome-ignore lint/suspicious/noExplicitAny: Supabase typed client does not include all tables
  const { data } = await (supabase as any)
    .from("bookings")
    .select(
      "id, scheduled_at, duration_min, price, notes, teachers(users(full_name, avatar_url)), subjects(name)"
    )
    .eq("id", bookingId)
    .eq("student_id", student.id)
    .single();

  if (!data) return null;

  return {
    id: data.id,
    scheduled_at: data.scheduled_at,
    duration_min: data.duration_min,
    price: data.price,
    notes: data.notes,
    teacher_name: data.teachers?.users?.full_name ?? "Profesor",
    teacher_avatar: data.teachers?.users?.avatar_url ?? null,
    subject_name: data.subjects?.name ?? "Clase",
  };
}
