"use client";

import { useEffect, useState } from "react";

type Props = {
  expiresAt: string;
  onExpire: () => void;
};

export function ExpressTimer({ expiresAt, onExpire }: Props) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  );

  useEffect(() => {
    if (remaining <= 0) {
      onExpire();
      return;
    }
    const id = setInterval(() => {
      const secs = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setRemaining(secs);
      if (secs <= 0) {
        clearInterval(id);
        onExpire();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt, onExpire, remaining]);

  const total = 15 * 60; // 15 min en segundos
  const pct = Math.max(0, Math.min(100, (remaining / total) * 100));
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const label = `${mins}:${String(secs).padStart(2, "0")}`;

  const color =
    remaining > 5 * 60 ? "bg-brand-500" : remaining > 2 * 60 ? "bg-warning-500" : "bg-error-500";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-neutral-500">Buscando profesor…</span>
        <span
          className={`font-mono font-bold ${
            remaining <= 2 * 60 ? "text-error-600" : "text-neutral-700"
          }`}
        >
          {label}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-neutral-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
