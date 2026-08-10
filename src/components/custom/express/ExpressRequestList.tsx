"use client";

import type { ExpressRequestItem } from "@/app/app/teacher/express/page";
import { FeatherZap } from "@subframe/core";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ExpressTimer } from "./ExpressTimer";

type Props = {
  initialRequests: ExpressRequestItem[];
};

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

export function ExpressRequestList({ initialRequests }: Props) {
  const router = useRouter();
  const [requests, setRequests] = useState<ExpressRequestItem[]>(initialRequests);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleExpired(sessionId: string) {
    setRequests((prev) => prev.filter((r) => r.id !== sessionId));
  }

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
      return;
    }
    // Race condition — session already taken
    setRequests((prev) => prev.filter((r) => r.id !== sessionId));
    setError(json.error ?? "La solicitud ya fue tomada por otro profesor.");
    setAccepting(null);
  }

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-neutral-300 bg-white p-16 text-center">
        <FeatherZap className="h-10 w-10 text-neutral-300" />
        <div>
          <p className="font-semibold text-neutral-700">Sin solicitudes Express ahora</p>
          <p className="mt-1 text-sm text-neutral-500">
            Las solicitudes de estudiantes que coincidan con tu tarifa aparecerán aquí. Recarga la
            página para actualizar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">
          {error}
        </div>
      )}
      {requests.map((r) => (
        <div key={r.id} className="rounded-xl border border-brand-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-neutral-900">{r.subject_name}</p>
              {r.description && (
                <p className="mt-0.5 text-sm text-neutral-500 line-clamp-2">{r.description}</p>
              )}
              <p className="mt-1 text-sm font-medium text-brand-700">
                {formatCOP(r.price_min)} – {formatCOP(r.price_max)} / hora
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleAccept(r.id)}
              disabled={accepting !== null}
              className="flex-none rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {accepting === r.id ? "Aceptando…" : "Aceptar"}
            </button>
          </div>
          <ExpressTimer expiresAt={r.expires_at} onExpire={() => handleExpired(r.id)} />
        </div>
      ))}
    </div>
  );
}
