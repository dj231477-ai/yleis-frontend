"use client";

import { Button } from "@/ui/components/Button";
import { FeatherCheck, FeatherLoader, FeatherX } from "@subframe/core";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  bookingId: string;
  bookingStatus?: string;
  onAccepted?: (confirmationCode: string | null) => void;
};

export function BookingActions({ bookingId, bookingStatus, onAccepted }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<"accept" | "reject" | null>(null);
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null);

  async function handleAction(action: "accept" | "reject") {
    setLoading(action);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/${action}`, { method: "POST" });
      if (res.ok && action === "accept") {
        const json = (await res.json().catch(() => ({}))) as { confirmationCode?: string | null };
        const code = json.confirmationCode ?? null;
        setConfirmationCode(code);
        if (onAccepted) onAccepted(code);
      }
    } finally {
      router.refresh();
      setLoading(null);
    }
  }

  if (confirmationCode) {
    return (
      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-neutral-500">Código de inicio de clase:</p>
        <span className="font-mono text-xl font-bold tracking-widest text-brand-700">
          {confirmationCode}
        </span>
        <p className="text-xs text-neutral-400">Compártelo con el estudiante para iniciar.</p>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="brand-secondary"
        size="small"
        icon={loading === "accept" ? <FeatherLoader className="animate-spin" /> : <FeatherCheck />}
        onClick={() => handleAction("accept")}
        disabled={loading !== null}
      >
        Aceptar
      </Button>
      <Button
        variant="neutral-secondary"
        size="small"
        icon={loading === "reject" ? <FeatherLoader className="animate-spin" /> : <FeatherX />}
        onClick={() => handleAction("reject")}
        disabled={loading !== null}
      >
        Rechazar
      </Button>
    </div>
  );
}
