"use client";

import { RECIPIENT_RELATIONSHIPS, type RecipientRelationship } from "@/services/bookings";
import { Button } from "@/ui/components/Button";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
  const [noBalance, setNoBalance] = useState(false);

  // ¿Quién recibe la clase?
  const [recipientType, setRecipientType] = useState<"self" | "other">("self");
  const [recipientFirstName, setRecipientFirstName] = useState("");
  const [recipientLastName, setRecipientLastName] = useState("");
  const [recipientRelationship, setRecipientRelationship] = useState<RecipientRelationship>(
    RECIPIENT_RELATIONSHIPS[0]
  );
  const [recipientAge, setRecipientAge] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNoBalance(false);

    if (!date) {
      setError("Selecciona una fecha");
      return;
    }
    if (!subjectId) {
      setError("Selecciona una materia");
      return;
    }

    let recipient: {
      type: "self" | "other";
      firstName?: string;
      lastName?: string;
      relationship?: RecipientRelationship;
      age?: number;
    };
    if (recipientType === "self") {
      recipient = { type: "self" };
    } else {
      if (!recipientFirstName.trim() || !recipientLastName.trim()) {
        setError("Completa el nombre y apellido de quien recibirá la clase");
        return;
      }
      if (!recipientAge || Number(recipientAge) <= 0) {
        setError("Ingresa la edad de quien recibirá la clase");
        return;
      }
      recipient = {
        type: "other",
        firstName: recipientFirstName.trim(),
        lastName: recipientLastName.trim(),
        relationship: recipientRelationship,
        age: Number(recipientAge),
      };
    }

    // Combinar fecha y hora como datetime local → convertir a UTC
    const scheduledAt = new Date(`${date}T${time}:00`).toISOString();

    setLoading(true);

    // Se descuenta del saldo de horas del paquete activo — no pasa por
    // Mercado Pago (eso ya se cobró al comprar el paquete).
    const res = await fetch("/api/bookings/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teacherId,
        subjectId,
        scheduledAt,
        durationMin,
        notes: notes.trim() || undefined,
        recipient,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      bookingId?: string;
      error?: string;
    };

    if (!res.ok || !data.bookingId) {
      setError(data.error ?? "No se pudo crear la reserva. Intenta de nuevo.");
      setNoBalance((data.error ?? "").includes("saldo de horas"));
      setLoading(false);
      return;
    }

    router.push(`/app/student/booking/confirmation?id=${data.bookingId}`);
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
      {/* ¿Quién recibe la clase? */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-600">¿Quién recibe la clase?</label>
        <div className="flex gap-2">
          {(["self", "other"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setRecipientType(t)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                recipientType === t
                  ? "border-brand-400 bg-brand-50 text-brand-700"
                  : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
              }`}
            >
              {t === "self" ? "Yo" : "Otra persona"}
            </button>
          ))}
        </div>
      </div>

      {recipientType === "other" && (
        <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="recipient-first-name"
                className="text-xs font-medium text-neutral-600"
              >
                Nombre
              </label>
              <input
                id="recipient-first-name"
                type="text"
                value={recipientFirstName}
                onChange={(e) => setRecipientFirstName(e.target.value)}
                required
                className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="recipient-last-name" className="text-xs font-medium text-neutral-600">
                Apellido
              </label>
              <input
                id="recipient-last-name"
                type="text"
                value={recipientLastName}
                onChange={(e) => setRecipientLastName(e.target.value)}
                required
                className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="recipient-relationship"
                className="text-xs font-medium text-neutral-600"
              >
                Relación
              </label>
              <select
                id="recipient-relationship"
                value={recipientRelationship}
                onChange={(e) => setRecipientRelationship(e.target.value as RecipientRelationship)}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              >
                {RECIPIENT_RELATIONSHIPS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="recipient-age" className="text-xs font-medium text-neutral-600">
                Edad
              </label>
              <input
                id="recipient-age"
                type="number"
                min={1}
                value={recipientAge}
                onChange={(e) => setRecipientAge(e.target.value)}
                required
                className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>
          <p className="text-xs text-neutral-400">
            La materia/idioma se elige abajo, en el formulario general.
          </p>
        </div>
      )}

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

      {/* Resumen — se descuenta del saldo del paquete, no se cobra de nuevo */}
      <div className="rounded-xl border border-brand-100 bg-brand-50 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-neutral-600">
            {formatCOP(hourlyRate)}/hora × {durationMin / 60}h
          </span>
          <span className="text-lg font-bold text-brand-700">
            {durationMin / 60}h de tu paquete
          </span>
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          Se descuenta de tu saldo de horas · {teacherName} confirma al recibir la solicitud
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-error-50 border border-error-200 px-3 py-2 text-sm text-error">
          <p>{error}</p>
          {noBalance && (
            <a href="/app/plans" className="mt-1 inline-block font-medium underline">
              Comprar un paquete
            </a>
          )}
        </div>
      )}

      <Button
        variant="brand-primary"
        size="large"
        loading={loading}
        type="submit"
        className="w-full"
      >
        Solicitar clase
      </Button>
    </form>
  );
}
