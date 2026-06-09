import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type Client = SupabaseClient<Database>;

export type ConversationWithContext = {
  id: string;
  booking_id: string;
  booking_status: string;
  booking_subject: string;
  scheduled_at: string;
  other_user_name: string;
  other_user_avatar: string | null;
  last_message_body: string | null;
  last_message_at: string | null;
  unread_count: number;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  is_read: boolean;
  created_at: string;
};

// Returns all conversations for the current user with booking + other participant context
export async function getConversationsForUser(
  supabase: Client,
  userId: string
): Promise<ConversationWithContext[]> {
  // biome-ignore lint/suspicious/noExplicitAny: Supabase typed client doesn't include post-MVP tables yet
  const { data: raw } = await (supabase as any)
    .from("conversation_participants")
    .select(`
      conversation_id,
      conversations(
        id,
        booking_id,
        bookings(
          status,
          scheduled_at,
          subjects(name),
          students(user_id, users(full_name, avatar_url)),
          teachers(user_id, users(full_name, avatar_url))
        )
      )
    `)
    .eq("user_id", userId);

  if (!raw) return [];

  const results: ConversationWithContext[] = [];

  for (const row of raw) {
    const conv = row.conversations;
    if (!conv || !conv.bookings) continue;

    const b = conv.bookings;
    const studentUserId = b.students?.user_id;
    const teacherUserId = b.teachers?.user_id;

    // Determine other user
    const isStudent = studentUserId === userId;
    const otherName = isStudent
      ? (b.teachers?.users?.full_name ?? "Profesor")
      : (b.students?.users?.full_name ?? "Estudiante");
    const otherAvatar = isStudent
      ? (b.teachers?.users?.avatar_url ?? null)
      : (b.students?.users?.avatar_url ?? null);

    // Last message
    // biome-ignore lint/suspicious/noExplicitAny: Supabase typed client doesn't include post-MVP tables yet
    const { data: lastMsg } = await (supabase as any)
      .from("messages")
      .select("body, created_at")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Unread count (messages not from current user and not read)
    // biome-ignore lint/suspicious/noExplicitAny: Supabase typed client doesn't include post-MVP tables yet
    const { count: unread } = await (supabase as any)
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conv.id)
      .eq("is_read", false)
      .neq("sender_id", userId);

    results.push({
      id: conv.id,
      booking_id: conv.booking_id,
      booking_status: b.status,
      booking_subject: b.subjects?.name ?? "Clase",
      scheduled_at: b.scheduled_at,
      other_user_name: otherName,
      other_user_avatar: otherAvatar,
      last_message_body: lastMsg?.body ?? null,
      last_message_at: lastMsg?.created_at ?? null,
      unread_count: unread ?? 0,
    });
  }

  // Sort: active first, then by last message date
  return results.sort((a, b) => {
    const aActive = ["confirmed", "paid"].includes(a.booking_status) ? 1 : 0;
    const bActive = ["confirmed", "paid"].includes(b.booking_status) ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;
    const aTime = a.last_message_at ?? a.scheduled_at;
    const bTime = b.last_message_at ?? b.scheduled_at;
    return bTime > aTime ? 1 : -1;
  });
}

// Returns messages for a conversation (newest last, limit 100)
export async function getMessages(supabase: Client, conversationId: string): Promise<Message[]> {
  // biome-ignore lint/suspicious/noExplicitAny: Supabase typed client doesn't include post-MVP tables yet
  const { data } = await (supabase as any)
    .from("messages")
    .select("id, conversation_id, sender_id, body, is_read, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(100);

  return (data ?? []).map((m: Message) => ({
    id: m.id,
    conversation_id: m.conversation_id,
    sender_id: m.sender_id,
    body: m.body,
    is_read: m.is_read,
    created_at: m.created_at,
  }));
}

// Returns true if the booking linked to the conversation is still active
export async function isConversationActive(
  supabase: Client,
  conversationId: string
): Promise<boolean> {
  // biome-ignore lint/suspicious/noExplicitAny: Supabase typed client doesn't include post-MVP tables yet
  const { data } = await (supabase as any)
    .from("conversations")
    .select("bookings(status)")
    .eq("id", conversationId)
    .maybeSingle();

  const status = data?.bookings?.status;
  return status === "confirmed" || status === "paid";
}

// Returns conversation metadata for the chat header
export async function getConversationMeta(
  supabase: Client,
  conversationId: string,
  userId: string
): Promise<{
  other_user_name: string;
  other_user_avatar: string | null;
  booking_subject: string;
  booking_status: string;
  scheduled_at: string;
} | null> {
  // biome-ignore lint/suspicious/noExplicitAny: Supabase typed client doesn't include post-MVP tables yet
  const { data: conv } = await (supabase as any)
    .from("conversations")
    .select(`
      booking_id,
      bookings(
        status,
        scheduled_at,
        subjects(name),
        students(user_id, users(full_name, avatar_url)),
        teachers(user_id, users(full_name, avatar_url))
      )
    `)
    .eq("id", conversationId)
    .maybeSingle();

  if (!conv?.bookings) return null;

  const b = conv.bookings;
  const isStudent = b.students?.user_id === userId;
  return {
    other_user_name: isStudent
      ? (b.teachers?.users?.full_name ?? "Profesor")
      : (b.students?.users?.full_name ?? "Estudiante"),
    other_user_avatar: isStudent
      ? (b.teachers?.users?.avatar_url ?? null)
      : (b.students?.users?.avatar_url ?? null),
    booking_subject: b.subjects?.name ?? "Clase",
    booking_status: b.status,
    scheduled_at: b.scheduled_at,
  };
}
