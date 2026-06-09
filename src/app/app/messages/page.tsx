import { createClient } from "@/lib/supabase/server";
import { getConversationsForUser } from "@/services/messages";
import { Avatar } from "@/ui/components/Avatar";
import { Badge } from "@/ui/components/Badge";
import { FeatherMessageSquare } from "@subframe/core";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Mensajes — Yleis" };
export const dynamic = "force-dynamic";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  return `${d} d`;
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const conversations = await getConversationsForUser(supabase, user.id);

  const active = conversations.filter((c) => ["confirmed", "paid"].includes(c.booking_status));
  const archived = conversations.filter((c) => !["confirmed", "paid"].includes(c.booking_status));

  return (
    <div className="bg-neutral-50 min-h-full">
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900">Mensajes</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Solo puedes escribir durante una clase activa.
          </p>
        </div>

        {conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-neutral-300 bg-white p-16 text-center">
            <FeatherMessageSquare className="h-10 w-10 text-neutral-300" />
            <div>
              <p className="font-semibold text-neutral-700">Sin mensajes aún</p>
              <p className="mt-1 text-sm text-neutral-500">
                Cuando una reserva sea confirmada, podrás escribirle al profesor o alumno desde aquí
                o desde "Mis Clases".
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {active.length > 0 && (
              <section>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Clases activas
                </h2>
                <div className="flex flex-col gap-1">
                  {active.map((c) => (
                    <ConvRow key={c.id} conv={c} />
                  ))}
                </div>
              </section>
            )}

            {archived.length > 0 && (
              <section>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Archivo
                </h2>
                <div className="flex flex-col gap-1">
                  {archived.map((c) => (
                    <ConvRow key={c.id} conv={c} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ConvRow({ conv }: { conv: Awaited<ReturnType<typeof getConversationsForUser>>[0] }) {
  const isActive = ["confirmed", "paid"].includes(conv.booking_status);
  return (
    <Link
      href={`/app/messages/${conv.id}`}
      className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 hover:bg-neutral-50 transition-colors"
    >
      <div className="relative shrink-0">
        <Avatar
          image={conv.other_user_avatar ?? undefined}
          size="medium"
          variant={isActive ? "brand" : "neutral"}
        >
          {!conv.other_user_avatar ? initials(conv.other_user_name) : undefined}
        </Avatar>
        {isActive && (
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-success-500" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-neutral-900">{conv.other_user_name}</p>
          <span className="shrink-0 text-xs text-neutral-400">{conv.booking_subject}</span>
        </div>
        <p className="mt-0.5 truncate text-xs text-neutral-500">
          {conv.last_message_body ?? "Sin mensajes aún"}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {conv.last_message_at && (
          <span className="text-[10px] text-neutral-400">{timeAgo(conv.last_message_at)}</span>
        )}
        {conv.unread_count > 0 ? (
          <Badge variant="brand">{conv.unread_count}</Badge>
        ) : !isActive ? (
          <Badge variant="neutral">Archivado</Badge>
        ) : null}
      </div>
    </Link>
  );
}
