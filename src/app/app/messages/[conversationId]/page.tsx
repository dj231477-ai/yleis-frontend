import { createClient } from "@/lib/supabase/server";
import { getConversationMeta, getMessages, isConversationActive } from "@/services/messages";
import { Avatar } from "@/ui/components/Avatar";
import { Badge } from "@/ui/components/Badge";
import { FeatherArrowLeft, FeatherCalendar } from "@subframe/core";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChatWindow } from "./ChatWindow";

export const dynamic = "force-dynamic";

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
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

  const [messages, active, meta] = await Promise.all([
    getMessages(supabase, conversationId),
    isConversationActive(supabase, conversationId),
    getConversationMeta(supabase, conversationId, user.id),
  ]);

  // RLS will return empty if user is not a participant — treat as not found
  if (!meta) notFound();

  const statusMap: Record<
    string,
    { label: string; variant: "brand" | "success" | "warning" | "error" | "neutral" }
  > = {
    confirmed: { label: "Confirmada", variant: "brand" },
    paid: { label: "Pagada", variant: "brand" },
    completed: { label: "Completada", variant: "success" },
    pending: { label: "Pendiente", variant: "warning" },
    cancelled_student: { label: "Cancelada", variant: "error" },
    cancelled_teacher: { label: "Cancelada", variant: "error" },
    refunded: { label: "Reembolsada", variant: "neutral" },
  };
  const statusInfo = statusMap[meta.booking_status] ?? {
    label: meta.booking_status,
    variant: "neutral" as const,
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3">
        <Link
          href="/app/messages"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
        >
          <FeatherArrowLeft className="h-4 w-4" />
        </Link>

        <Avatar
          image={meta.other_user_avatar ?? undefined}
          size="small"
          variant={active ? "brand" : "neutral"}
        >
          {!meta.other_user_avatar ? initials(meta.other_user_name) : undefined}
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold text-neutral-900">{meta.other_user_name}</p>
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <FeatherCalendar className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {meta.booking_subject} · {formatDate(meta.scheduled_at)}
            </span>
          </div>
        </div>

        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
      </div>

      {/* Chat body — ChatWindow handles Realtime + sending */}
      <ChatWindow
        conversationId={conversationId}
        initialMessages={messages}
        currentUserId={user.id}
        isActive={active}
      />
    </div>
  );
}
