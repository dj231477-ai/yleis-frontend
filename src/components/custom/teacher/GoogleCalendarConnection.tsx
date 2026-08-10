"use client";

import { Button } from "@/ui/components/Button";
import { FeatherCalendar, FeatherCheckCircle, FeatherLink2, FeatherUnlink } from "@subframe/core";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  connected: boolean;
  email: string | null;
};

export function GoogleCalendarConnection({ connected, email }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDisconnect() {
    setLoading(true);
    await fetch("/api/teacher/calendar/disconnect", { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 p-4">
      <div className="flex items-center gap-3">
        <FeatherCalendar className="h-5 w-5 text-neutral-400" />
        <div>
          <p className="text-sm font-medium text-neutral-900">Google Calendar</p>
          {connected ? (
            <div className="mt-0.5 flex items-center gap-1.5">
              <FeatherCheckCircle className="h-3.5 w-3.5 text-success-600" />
              <span className="text-xs text-neutral-500">{email}</span>
            </div>
          ) : (
            <p className="mt-0.5 text-xs text-neutral-400">
              Conectalo para que el link de Meet se genere solo al confirmar una clase
            </p>
          )}
        </div>
      </div>

      {connected ? (
        <Button
          variant="neutral-secondary"
          size="small"
          icon={<FeatherUnlink />}
          loading={loading}
          onClick={handleDisconnect}
        >
          Desconectar
        </Button>
      ) : (
        <a href="/api/teacher/calendar/connect">
          <Button variant="brand-secondary" size="small" icon={<FeatherLink2 />}>
            Conectar
          </Button>
        </a>
      )}
    </div>
  );
}
