import { createClient } from "@/lib/supabase/server";
import { getConversationMeta, getMessages, isConversationActive } from "@/services/messages";
import { notFound, redirect } from "next/navigation";
import { ChatWindow } from "./ChatWindow";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { title: "Chat — Yleis" };
  const meta = await getConversationMeta(supabase, conversationId, user.id);
  return { title: meta ? `${meta.other_user_name} — Yleis` : "Chat — Yleis" };
}

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verify user is a participant
  // biome-ignore lint/suspicious/noExplicitAny: conversation_participants not in typed schema
  const { data: participant } = await (supabase as any)
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!participant) notFound();

  const [meta, initialMessages, active] = await Promise.all([
    getConversationMeta(supabase, conversationId, user.id),
    getMessages(supabase, conversationId),
    isConversationActive(supabase, conversationId),
  ]);

  if (!meta) notFound();

  return (
    <ChatWindow
      conversationId={conversationId}
      currentUserId={user.id}
      isActive={active}
      initialMessages={initialMessages}
      meta={meta}
    />
  );
}
