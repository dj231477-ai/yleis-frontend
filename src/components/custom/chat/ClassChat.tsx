"use client";

import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/services/messages";
import { FeatherClock, FeatherLock, FeatherSend } from "@subframe/core";
import { useEffect, useRef, useState } from "react";

type Props = {
  bookingId: string;
  currentUserId: string;
  /** Chat can be sent/received (booking active and within timing window) */
  isActive: boolean;
  /** Chat is enabled by timing — 45 min before class */
  chatEnabled: boolean;
  initialMessages?: Message[];
};

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function ClassChat({
  bookingId,
  currentUserId,
  isActive,
  chatEnabled,
  initialMessages = [],
}: Props) {
  const supabase = createClient();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [initError, setInitError] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Get or create conversation on mount
  useEffect(() => {
    async function init() {
      const { data: convId, error } = await supabase.rpc("get_or_create_conversation", {
        p_booking_id: bookingId,
      });
      if (error || !convId) {
        setInitError(true);
        return;
      }
      setConversationId(convId as string);

      // Load existing messages
      // biome-ignore lint/suspicious/noExplicitAny: messages not in typed schema
      const { data: msgs } = await (supabase as any)
        .from("messages")
        .select("id, conversation_id, sender_id, body, is_read, created_at")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true })
        .limit(100);
      if (msgs) setMessages(msgs as Message[]);

      // Mark unread as read
      // biome-ignore lint/suspicious/noExplicitAny: messages not in typed schema
      void (supabase as any)
        .from("messages")
        .update({ is_read: true })
        .eq("conversation_id", convId)
        .eq("is_read", false)
        .neq("sender_id", currentUserId);
    }
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`class-chat:${conversationId}`)
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
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, supabase]);

  // conversationId puede tardar en resolver (RPC async) — sin este chequeo,
  // el input queda habilitado antes de tiempo y un envío rápido se descarta
  // en silencio porque handleSend corta si conversationId todavía es null.
  const canSend = isActive && chatEnabled && conversationId !== null;
  const stillLoading = isActive && chatEnabled && conversationId === null && !initError;

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const text = body.trim();
    if (!text || !canSend || !conversationId || sending) return;
    setSending(true);
    setBody("");
    // Eco local — no depender solo de Realtime para que el propio remitente
    // vea su mensaje de inmediato. El handler de Realtime ya deduplica por id.
    // biome-ignore lint/suspicious/noExplicitAny: messages not in typed schema
    const { data: inserted } = await (supabase as any)
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        body: text,
      })
      .select("id, conversation_id, sender_id, body, is_read, created_at")
      .single();
    if (inserted) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === inserted.id)) return prev;
        return [...prev, inserted as Message];
      });
    }
    setSending(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  if (initError) {
    return (
      <div className="rounded-xl border border-error-200 bg-error-50 p-4">
        <p className="text-sm text-error-700">No se pudo cargar el chat. Recarga la página.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-xl border border-neutral-200 bg-white overflow-hidden">
      {/* Banner: not yet enabled */}
      {!chatEnabled && (
        <div className="flex items-center gap-2 border-b border-neutral-100 bg-neutral-50 px-4 py-3">
          <FeatherClock className="h-4 w-4 shrink-0 text-neutral-400" />
          <p className="text-sm text-neutral-500">
            El chat se activa 45 minutos antes del inicio de la clase.
          </p>
        </div>
      )}

      {/* Banner: read-only (completed) */}
      {chatEnabled && !isActive && (
        <div className="flex items-center gap-2 border-b border-neutral-100 bg-neutral-50 px-4 py-3">
          <FeatherLock className="h-4 w-4 shrink-0 text-neutral-400" />
          <p className="text-sm text-neutral-500">La clase ha terminado — chat de solo lectura.</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2 min-h-[240px] max-h-96">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-neutral-400 py-8">
            {chatEnabled
              ? "Sin mensajes aún. ¡Escribe algo!"
              : "Los mensajes aparecerán aquí cuando el chat se active."}
          </p>
        ) : (
          messages.map((msg) => {
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
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-neutral-200 bg-white px-4 py-3">
        {!canSend ? (
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5">
            <FeatherLock className="h-4 w-4 shrink-0 text-neutral-400" />
            <p className="text-sm text-neutral-400">
              {stillLoading
                ? "Cargando chat…"
                : !chatEnabled
                  ? "Chat no disponible aún"
                  : "Chat de solo lectura"}
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
