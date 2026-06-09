"use client";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Message } from "@/services/messages";
import { FeatherSend } from "@subframe/core";
import { useEffect, useRef, useState } from "react";

type Props = {
  conversationId: string;
  initialMessages: Message[];
  currentUserId: string;
  isActive: boolean;
};

export function ChatWindow({ conversationId, initialMessages, currentUserId, isActive }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Subscribe to new messages via Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
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
            // Avoid duplicates (optimistic update already added it)
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // supabase instance is stable; only re-subscribe when conversationId changes
    // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  }, [conversationId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    // biome-ignore lint/correctness/useExhaustiveDependencies: scroll only on message list change
  }, [messages]);

  // Mark incoming messages as read
  useEffect(() => {
    const unread = messages.filter((m) => m.sender_id !== currentUserId && !m.is_read);
    if (unread.length === 0) return;
    supabase
      .from("messages")
      .update({ is_read: true })
      .in(
        "id",
        unread.map((m) => m.id)
      )
      .then(() => {
        setMessages((prev) =>
          prev.map((m) => (unread.some((u) => u.id === m.id) ? { ...m, is_read: true } : m))
        );
      });
    // supabase and currentUserId are stable refs; run only when messages change
    // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  }, [messages]);

  async function handleSend() {
    const text = body.trim();
    if (!text || sending) return;

    setSending(true);
    setBody("");

    // Optimistic update
    const optimisticId = `opt-${Date.now()}`;
    const optimistic: Message = {
      id: optimisticId,
      conversation_id: conversationId,
      sender_id: currentUserId,
      body: text,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      body: text,
    });

    if (error) {
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setBody(text);
    }
    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function formatTime(iso: string) {
    return new Intl.DateTimeFormat("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-neutral-400 py-8">
            No hay mensajes aún. ¡Sé el primero en escribir!
          </p>
        )}
        {messages.map((msg) => {
          const isOwn = msg.sender_id === currentUserId;
          return (
            <div key={msg.id} className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-xs rounded-2xl px-4 py-2.5 text-sm shadow-sm lg:max-w-md",
                  isOwn
                    ? "rounded-br-sm bg-brand-600 text-white"
                    : "rounded-bl-sm bg-white text-neutral-900 border border-neutral-200"
                )}
              >
                <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                <p
                  className={cn(
                    "mt-1 text-right text-[10px]",
                    isOwn ? "text-brand-200" : "text-neutral-400"
                  )}
                >
                  {formatTime(msg.created_at)}
                  {isOwn && <span className="ml-1">{msg.is_read ? "✓✓" : "✓"}</span>}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-neutral-200 bg-white px-4 py-3">
        {isActive ? (
          <div className="flex items-end gap-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un mensaje… (Enter para enviar)"
              rows={1}
              disabled={sending}
              className="flex-1 resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:opacity-50"
              style={{ maxHeight: "120px", overflowY: "auto" }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${el.scrollHeight}px`;
              }}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!body.trim() || sending}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FeatherSend className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
            <p className="text-sm text-neutral-400">
              Esta clase ha finalizado. Los mensajes son de solo lectura.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
