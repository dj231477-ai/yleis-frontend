"use client";

import { RECIPIENT_RELATIONSHIPS, type RecipientRelationship } from "@/services/bookings";
import { Button } from "@/ui/components/Button";
import { FeatherZap } from "@subframe/core";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Subject = { id: string; name: string; category: string | null };

const DURATIONS = [
  { label: "1 hora", value: 60 },
  { label: "1.5 horas", value: 90 },
  { label: "2 horas", value: 120 },
];

const TIME_SLOTS = Array.from({ length: 15 }, (_, i) => {
  const hour = i + 7;
  return `${String(hour).padStart(2, "0")}:00`;
});

function todayMin() {
  return new Date().toISOString().split("T")[0];
}

export function AutoAssignForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(() => searchParams.get("auto") === "1");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [durationMin, setDurationMin] = useState(60);
  const [modality, setModality] = useState<"presencial" | "virtual">("virtual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [recipientType, setRecipientType] = useState<"self" | "other">("self");
  const [recipientFirstName, setRecipientFirstName] = useState("");
  const [recipientLastName, setRecipientLastName] = useState("");
  const [recipientRelationship, setRecipientRelationship] = useState<RecipientRelationship>(
    RECIPIENT_RELATIONSHIPS[0]
  );
  const [recipientAge, setRecipientAge] = useState("");

  useEffect(() => {
    if (!open || subjects.length > 0) return;
    async function load() {
      const res = await fetch("/api/subjects").catch(() => null);
      if (res?.ok) {
        const data = (await res.json()) as { subjects: Subject[] };
        setSubjects(data.subjects ?? []);
        if (data.subjects?.[0]) setSubjectId(data.subjects[0].id);
      }
    }
    void load();
  }, [open, subjects.length]);

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

    const scheduledAt = new Date(`${date}T${time}:00`).toISOString();

    setLoading(true);
    const res = await fetch("/api/bookings/auto-assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId, scheduledAt, durationMin, modality, recipient }),
    });

    const data = (await res.json().catch(() => ({}))) as { bookingId?: string; error?: string };
    if (!res.ok || !data.bookingId) {
      setError(data.error ?? "No se pudo crear la reserva. Intenta de nuevo.");
      setLoading(false);
      return;
    }

    router.push(`/app/student/booking/confirmation?id=${data.bookingId}`);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-6 flex w-full items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4 text-left transition-colors hover:border-brand-300 hover:bg-brand-100"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white">
          <FeatherZap className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-800">
            ¿No sabes a qué profesor elegir? Que Yleis te asigne uno
          </p>
          <p className="mt-0.5 text-xs text-neutral-500">
            Solo dinos materia, fecha y hora — te asignamos el profesor disponible más experimentado
            en la plataforma. Recomendado.
          </p>
        </div>
      </button>
    );
  }

  const grouped = subjects.reduce<Record<string, Subject[]>>((acc, s) => {
    const cat = s.category ?? "Otras";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 flex flex-col gap-4 rounded-xl border border-brand-200 bg-brand-50 p-5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FeatherZap className="h-5 w-5 text-brand-600" />
          <h2 className="text-sm font-semibold text-brand-800">
            Asignación automática de profesor
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-neutral-500 underline hover:text-neutral-700"
        >
          Cancelar
        </button>
      </div>

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
                  ? "border-brand-400 bg-white text-brand-700"
                  : "border-neutral-200 bg-white/60 text-neutral-600 hover:border-neutral-300"
              }`}
            >
              {t === "self" ? "Yo" : "Otra persona"}
            </button>
          ))}
        </div>
      </div>

      {recipientType === "other" && (
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-neutral-200 bg-white p-3">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="auto-recipient-first-name"
              className="text-xs font-medium text-neutral-600"
            >
              Nombre
            </label>
            <input
              id="auto-recipient-first-name"
              type="text"
              value={recipientFirstName}
              onChange={(e) => setRecipientFirstName(e.target.value)}
              required
              className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="auto-recipient-last-name"
              className="text-xs font-medium text-neutral-600"
            >
              Apellido
            </label>
            <input
              id="auto-recipient-last-name"
              type="text"
              value={recipientLastName}
              onChange={(e) => setRecipientLastName(e.target.value)}
              required
              className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="auto-recipient-relationship"
              className="text-xs font-medium text-neutral-600"
            >
              Relación
            </label>
            <select
              id="auto-recipient-relationship"
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
            <label htmlFor="auto-recipient-age" className="text-xs font-medium text-neutral-600">
              Edad
            </label>
            <input
              id="auto-recipient-age"
              type="number"
              min={1}
              value={recipientAge}
              onChange={(e) => setRecipientAge(e.target.value)}
              required
              className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-600">Materia</label>
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          required
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
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
                  ? "border-brand-400 bg-white text-brand-700"
                  : "border-neutral-200 bg-white/60 text-neutral-600 hover:border-neutral-300"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-600">Modalidad</label>
        <div className="flex gap-2">
          {(["virtual", "presencial"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModality(m)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                modality === m
                  ? "border-brand-400 bg-white text-brand-700"
                  : "border-neutral-200 bg-white/60 text-neutral-600 hover:border-neutral-300"
              }`}
            >
              {m === "virtual" ? "Virtual" : "Presencial"}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-neutral-500">
        Se descuenta del saldo de horas de tu paquete. Le enviamos la solicitud al profesor
        verificado con más antigüedad disponible para esa materia y horario; si no puede, se la
        pasamos al siguiente automáticamente.
      </p>

      {error && (
        <p className="rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700">
          {error}
        </p>
      )}

      <Button variant="brand-primary" size="large" loading={loading} type="submit">
        Solicitar clase automáticamente
      </Button>
    </form>
  );
}
