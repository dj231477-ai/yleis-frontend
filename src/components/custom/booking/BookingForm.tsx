"use client";

import { createClient } from "@/lib/supabase/client";
import { createBooking } from "@/services/bookings";
import { Button } from "@/ui/components/Button";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Subject = { id: string; name: string; category: string | null };

type Props = {
  teacherId: string;
  teacherName: string;
  hourlyRate: number;
  subjects: Subject[];
};

const DURATIONS = [
  { label: "1 hora", value: 60 },
  { label: "1.5 horas", value: 90 },
  { label: "2 horas", value: 120 },
];

const TIME_SLOTS = Array.from({ length: 15 }, (_, i) => {
  const hour = i + 7; // 07:00 to 21:00
  return `${String(hour).padStart(2, "0")}:00`;
});

function todayMin() {
  return new Date().toISOString().split("T")[0];
}

function formatCOP(amount: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function BookingForm({ teacherId, teacherName, hourlyRate, subjects }: Props) {
  const router = useRouter();
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [durationMin, setDurationMin] = useState(60);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const price = useMemo(() => hourlyRate * (durationMin / 60), [hourlyRate, durationMin]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!date) {
      setError("Selecciona una fecha");
      return;
    }
    if (!subjectId) {
      setError("Selecciona una materia");
      return;
    }

    // Combinar fecha y hora como datetime local → convertir a UTC
    const scheduledAt = new Date(`${date}T${time}:00`).toISOString();

    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Sesión expirada. Inicia sesión de nuevo.");
      setLoading(false);
      return;
    }

    const { bookingId, error: bookingError } = await createBooking(supabase, user.id, {
      teacherId,
      subjectId,
      scheduledAt,
      durationMin,
      price,
      notes: notes.trim() || undefined,
    });

    if (bookingError) {
      setError(bookingError);
      setLoading(false);
      return;
    }

    // Crear preferencia de pago en Mercado Pago
    const prefRes = await fetch("/api/payments/create-preference", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId }),
    });

    if (!prefRes.ok) {
      const { error: prefError } = (await prefRes.json().catch(() => ({}))) as {
        error?: string;
      };
      setError(prefError ?? "No se pudo iniciar el pago. Intenta de nuevo.");
      setLoading(false);
      return;
    }

    const { init_point } = (await prefRes.json()) as { init_point: string };
    // Mercado Pago Checkout Pro vive en un dominio externo
    window.location.href = init_point;
  }

  // Agrupar materias por categoría
  const grouped = subjects.reduce<Record<string, Subject[]>>((acc, s) => {
    const cat = s.category ?? "Otras";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Materia */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-600">Materia</label>
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          required
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        >
          {Object.entries(grouped).map(([cat, items]) => (
            <optgroup key={cat} label={cat}>
              {items.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Fecha y hora */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-600">Fecha</label>
          <input
            type="date"
            value={date}
            min={todayMin()}
            onChange={(e) => setDate(e.target.value)}
            required
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-600">Hora</label>
          <select
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          >
            {TIME_SLOTS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Duración */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-600">Duración</label>
        <div className="flex gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDurationMin(d.value)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                durationMin === d.value
                  ? "border-brand-400 bg-brand-50 text-brand-700"
                  : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notas */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-600">
          Notas para el profesor <span className="text-neutral-400">(opcional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={300}
          rows={3}
          placeholder="Cuéntale al profesor qué quieres trabajar en la clase..."
          className="resize-none rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
      </div>

      {/* Resumen de precio */}
      <div className="rounded-xl border border-brand-100 bg-brand-50 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-neutral-600">
            {formatCOP(hourlyRate)}/hora × {durationMin / 60}h
          </span>
          <span className="text-lg font-bold text-brand-700">{formatCOP(price)}</span>
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          Pago seguro vía Mercado Pago · {teacherName} confirma al acreditarse
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-error-50 border border-error-200 px-3 py-2 text-sm text-error">
          {error}
        </p>
      )}

      <Button
        variant="brand-primary"
        size="large"
        loading={loading}
        type="submit"
        className="w-full"
      >
        Confirmar y pagar
      </Button>
    </form>
  );
}
