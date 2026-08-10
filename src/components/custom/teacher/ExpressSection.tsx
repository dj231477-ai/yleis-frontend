"use client";

import { ExpressTimer } from "@/components/custom/express/ExpressTimer";
import { IconWithBackground } from "@/ui/components/IconWithBackground";
import { FeatherToggleLeft, FeatherToggleRight, FeatherZap } from "@subframe/core";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type ExpressRequest = {
  id: string;
  description: string | null;
  price_min: number;
  price_max: number;
  expires_at: string;
  subject_name: string;
};

type Props = {
  teacherId: string;
};

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

export function ExpressSection({ teacherId }: Props) {
  const router = useRouter();
  const [requests, setRequests] = useState<ExpressRequest[]>([]);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchRequests = useCallback(async () => {
    const res = await fetch("/api/express/requests").catch(() => null);
    if (!res?.ok) return;
    const json = (await res.json()) as { requests: ExpressRequest[] };
    setRequests((json.requests ?? []).filter((r) => new Date(r.expires_at) > new Date()));
  }, []);

  useEffect(() => {
    void fetchRequests();
    pollingRef.current = setInterval(fetchRequests, 10000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchRequests]);

  async function handleAccept(sessionId: string) {
    setAccepting(sessionId);
    setError(null);
    const res = await fetch("/api/express/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      bookingId?: string;
      error?: string;
    };
    if (res.ok && json.bookingId) {
      router.push(`/app/teacher/classes/${json.bookingId}`);
    } else {
      setError(json.error ?? "No se pudo aceptar la solicitud. Intenta de nuevo.");
      // Sesión ya tomada, o ya no disponible — refrescar la lista
      void fetchRequests();
    }
    setAccepting(null);
  }

  function handleRequestExpired(sessionId: string) {
    setRequests((prev) => prev.filter((r) => r.id !== sessionId));
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-neutral-700">Modo Express</h2>
          {requests.length > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
              {requests.length}
            </span>
          )}
        </div>
        <IconWithBackground variant="brand" size="small" icon={<FeatherZap />} square />
      </div>

      {error && (
        <p className="mb-3 rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-xs text-error-700">
          {error}
        </p>
      )}

      {requests.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-200 p-4 text-center text-sm text-neutral-400">
          Sin solicitudes Express activas ahora mismo.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((r) => (
            <div
              key={r.id}
              className="rounded-lg border border-brand-100 bg-brand-50 p-3 flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{r.subject_name}</p>
                  {r.description && (
                    <p className="text-xs text-neutral-500 line-clamp-2">{r.description}</p>
                  )}
                  <p className="text-xs text-brand-700 font-medium mt-0.5">
                    {formatCOP(r.price_min)} – {formatCOP(r.price_max)} / hora
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAccept(r.id)}
                  disabled={accepting !== null}
                  className="flex-none rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {accepting === r.id ? "Aceptando…" : "Aceptar"}
                </button>
              </div>
              <ExpressTimer expiresAt={r.expires_at} onExpire={() => handleRequestExpired(r.id)} />
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 text-xs text-neutral-400">
        <FeatherZap className="h-3.5 w-3.5" />
        <span>Las solicitudes que coincidan con tu tarifa aparecen aquí automáticamente.</span>
      </div>
    </div>
  );
}

// Export separado para el toggle del sidebar
export function ExpressToggle({ teacherId, isOnline }: { teacherId: string; isOnline: boolean }) {
  const [online, setOnline] = useState(isOnline);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const newStatus = online ? "offline" : "online";
    await fetch("/api/express/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    }).catch(() => null);
    setOnline(!online);
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 hover:bg-neutral-100 transition-colors disabled:opacity-50"
    >
      {online ? (
        <FeatherToggleRight className="h-4 w-4 text-brand-500 flex-none" />
      ) : (
        <FeatherToggleLeft className="h-4 w-4 text-neutral-400 flex-none" />
      )}
      <span className={`text-sm ${online ? "text-brand-700 font-medium" : "text-neutral-500"}`}>
        {online ? "Disponible Express" : "Offline Express"}
      </span>
    </button>
  );
}
