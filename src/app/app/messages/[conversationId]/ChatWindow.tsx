"use client";

import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/services/messages";
import { Avatar } from "@/ui/components/Avatar";
import { FeatherArrowLeft, FeatherLock, FeatherSend } from "@subframe/core";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Props = {
  conversationId: string;
  currentUserId: string;
  isActive: boolean;
  initialMessages: Message[];
  meta: {
    other_user_name: string;
    other_user_avatar: string | null;
    booking_subject: string;
    booking_status: string;
  };
};

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function ChatWindow({
  conversationId,
  currentUserId,
  isActive,
  initialMessages,
  meta,
}: Props) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          if (msg.sender_id !== currentUserId) {
            // biome-ignore lint/suspicious/noExplicitAny: messages not in typed schema
            void (supabase as any).from("messages").update({ is_read: true }).eq("id", msg.id);
          }
        }
      )
      .subscribe();

    // Mark unread messages as read on mount
    // biome-ignore lint/suspicious/noExplicitAny: messages not in typed schema
    void (supabase as any)
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .eq("is_read", false)
      .neq("sender_id", currentUserId);

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, supabase]);

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const text = body.trim();
    if (!text || !isActive || sending) return;
    setSending(true);
    setBody("");
    // biome-ignore lint/suspicious/noExplicitAny: messages not in typed schema
    await (supabase as any).from("messages").insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      body: text,
    });
    setSending(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-4rem)] flex-col bg-neutral-50">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3">
        <Link
          href="/app/messages"
          className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 transition-colors"
        >
          <FeatherArrowLeft className="h-4 w-4" />
        </Link>
        <Avatar
          image={meta.other_user_avatar ?? undefined}
          size="small"
          variant={isActive ? "brand" : "neutral"}
        >
          {!meta.other_user_avatar ? initials(meta.other_user_name) : undefined}
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold text-neutral-900">{meta.other_user_name}</p>
          <p className="text-xs text-neutral-500">{meta.booking_subject}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
        {messages.length === 0 && (
          <p className="text-center text-sm text-neutral-400 py-8">
            Sin mensajes aún. ¡Envía el primero!
          </p>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === currentUserId;
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-xs rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                  isMine
                    ? "rounded-br-sm bg-brand-500 text-white"
                    : "rounded-bl-sm bg-white border border-neutral-200 text-neutral-900"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                <p
                  className={`mt-0.5 text-right text-[10px] ${isMine ? "text-brand-100" : "text-neutral-400"}`}
                >
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-neutral-200 bg-white px-4 py-3">
        {!isActive ? (
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
            <FeatherLock className="h-4 w-4 shrink-0 text-neutral-400" />
            <p className="text-sm text-neutral-500">
              El chat solo está disponible durante una clase activa.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSend} className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              maxLength={2000}
              placeholder="Escribe un mensaje…"
              className="flex-1 resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 outline-none focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
              style={{ maxHeight: "120px", overflowY: "auto" }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${el.scrollHeight}px`;
              }}
            />
            <button
              type="submit"
              disabled={!body.trim() || sending}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white transition-colors hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FeatherSend className="h-4 w-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
