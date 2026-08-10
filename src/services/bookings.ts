import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export const RECIPIENT_RELATIONSHIPS = [
  "Padre",
  "Madre",
  "Abuelo",
  "Abuela",
  "Familiar",
  "Herman@",
  "Cónyuge",
  "Pareja",
  "Amigo",
] as const;

export type RecipientRelationship = (typeof RECIPIENT_RELATIONSHIPS)[number];

export type BookingConfirmation = {
  id: string;
  scheduled_at: string;
  duration_min: number;
  price: number;
  notes: string | null;
  teacher_name: string;
  teacher_avatar: string | null;
  subject_name: string;
  recipient_type: "self" | "other";
  recipient_first_name: string | null;
  recipient_last_name: string | null;
  recipient_relationship: string | null;
  recipient_age: number | null;
  membership_id: string | null;
};

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
      "id, scheduled_at, duration_min, price, notes, teachers(users(full_name, avatar_url)), subjects(name), recipient_type, recipient_first_name, recipient_last_name, recipient_relationship, recipient_age, membership_id"
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
    recipient_type: data.recipient_type ?? "self",
    recipient_first_name: data.recipient_first_name ?? null,
    recipient_last_name: data.recipient_last_name ?? null,
    recipient_relationship: data.recipient_relationship ?? null,
    recipient_age: data.recipient_age ?? null,
    membership_id: data.membership_id ?? null,
  };
}
