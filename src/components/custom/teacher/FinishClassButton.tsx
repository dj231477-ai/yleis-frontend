"use client";

import { FeatherCheck, FeatherLoader } from "@subframe/core";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = { bookingId: string; scheduledEndAt: string };

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso)
  );
}

export function FinishClassButton({ bookingId, scheduledEndAt }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEarly = new Date() < new Date(scheduledEndAt);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/bookings/${bookingId}/finish`, { method: "POST" });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(json.error ?? "No se pudo finalizar la clase");
      setLoading(false);
      setConfirming(false);
      return;
    }
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-warning-200 bg-warning-50 p-3">
        <p className="text-sm text-warning-800">
          {isEarly
            ? `Aún no ha transcurrido todo el tiempo contratado (termina a las ${formatTime(scheduledEndAt)}). ¿Estás seguro de finalizar la clase ahora?`
            : "¿Confirmás que la clase terminó?"}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg bg-warning-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-warning-700 disabled:opacity-40 transition-colors"
          >
            {loading && <FeatherLoader className="h-3.5 w-3.5 animate-spin" />}
            Sí, finalizar
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={loading}
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="flex w-fit items-center gap-1.5 rounded-lg bg-success-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-success-700 transition-colors"
      >
        <FeatherCheck className="h-3.5 w-3.5" />
        Finalizar clase
      </button>
      {error && (
        <p className="rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-xs text-error-700">
          {error}
        </p>
      )}
    </div>
  );
}
