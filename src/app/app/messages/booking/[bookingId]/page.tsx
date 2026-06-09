import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// Redirector: given a bookingId, get-or-create the conversation and redirect to the chat.
export default async function BookingMessagesPage({
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

  const { data: conversationId, error } = await supabase.rpc("get_or_create_conversation", {
    p_booking_id: bookingId,
  });

  if (error || !conversationId) {
    // Booking not active or user is not a participant
    redirect("/app/messages");
  }

  redirect(`/app/messages/${conversationId}`);
}
