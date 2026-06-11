"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = { bookingId: string };

export function StartClassButton({ bookingId }: Props) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (trimmed.length !== 6) {
      setError("El código debe tener 6 dígitos");
      return;
    }
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/bookings/${bookingId}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: trimmed }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(json.error ?? "No se pudo iniciar la clase");
      setLoading(false);
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          maxLength={6}
          className="w-36 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-center font-mono text-xl font-bold tracking-widest text-neutral-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
        <button
          type="submit"
          disabled={loading || code.trim().length !== 6}
          className="flex-1 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Iniciando…" : "Iniciar clase"}
        </button>
      </div>
      {error && (
        <p className="rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700">
          {error}
        </p>
      )}
    </form>
  );
}
