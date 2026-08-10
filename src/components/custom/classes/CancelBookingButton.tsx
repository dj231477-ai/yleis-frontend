"use client";

import { FeatherLoader, FeatherX } from "@subframe/core";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = { bookingId: string };

export function CancelBookingButton({ bookingId }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(json.error ?? "No se pudo cancelar la reserva");
      setLoading(false);
      setConfirming(false);
      return;
    }
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-error-200 bg-error-50 p-3">
        <p className="text-sm text-error-700">
          ¿Seguro que quieres cancelar esta clase? Si pagaste con saldo de un paquete, las horas se
          devuelven a tu saldo.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg bg-error-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-error-700 disabled:opacity-40 transition-colors"
          >
            {loading && <FeatherLoader className="h-3.5 w-3.5 animate-spin" />}
            Sí, cancelar
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
        className="flex w-fit items-center gap-1.5 rounded-lg border border-error-200 px-3 py-1.5 text-xs font-medium text-error-700 hover:bg-error-50 transition-colors"
      >
        <FeatherX className="h-3.5 w-3.5" />
        Cancelar clase
      </button>
      {error && (
        <p className="rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-xs text-error-700">
          {error}
        </p>
      )}
    </div>
  );
}
