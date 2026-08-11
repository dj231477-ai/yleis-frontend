"use client";

import { Button } from "@/ui/components/Button";
import { FeatherCalendar, FeatherCheck, FeatherX } from "@subframe/core";
import { useState } from "react";

type Subject = { id: string; name: string; category: string | null };
type Teacher = { id: string; full_name: string; hourly_rate: number | null };

type Props = {
  subjects: Subject[];
  teachers: Teacher[];
  onClose: () => void;
  onSuccess: (bookingId: string) => void;
};

const TIME_SLOTS = Array.from({ length: 15 }, (_, i) => {
  const h = i + 7;
  return `${String(h).padStart(2, "0")}:00`;
});

function tomorrowMin() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

export function BookingModal({ subjects, teachers, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [teacherId, setTeacherId] = useState(teachers[0]?.id ?? "");
  const [assignMode, setAssignMode] = useState<"manual" | "auto">("auto");
  const [modality, setModality] = useState<"presencial" | "virtual">("virtual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTeacher = teachers.find((t) => t.id === teacherId);
  const estimatedPrice =
    assignMode === "manual" && selectedTeacher?.hourly_rate != null
      ? selectedTeacher.hourly_rate * 1
      : null;

  async function handleSubmit() {
    setError(null);
    if (!date) {
      setError("Selecciona una fecha");
      return;
    }
    if (assignMode === "manual" && !teacherId) {
      setError("Selecciona un profesor");
      return;
    }

    const scheduledAt = new Date(`${date}T${time}:00`).toISOString();

    setLoading(true);
    const res = await fetch(
      assignMode === "auto" ? "/api/bookings/auto-assign" : "/api/bookings/create",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(assignMode === "manual" ? { teacherId } : {}),
          subjectId,
          scheduledAt,
          durationMin: 60,
          notes: notes.trim() || undefined,
          modality,
        }),
      }
    );

    const json = (await res.json().catch(() => ({}))) as { bookingId?: string; error?: string };
    if (!res.ok || !json.bookingId) {
      setError(json.error ?? "No se pudo crear la reserva. Intenta de nuevo.");
      setLoading(false);
      return;
    }

    onSuccess(json.bookingId);
  }

  // Agrupar materias por categoría para el select
  const grouped = subjects.reduce<Record<string, Subject[]>>((acc, s) => {
    const cat = s.category ?? "Otras";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Programar clase</h2>
            <p className="text-xs text-neutral-400 mt-0.5">Paso {step} de 3</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
          >
            <FeatherX className="h-4 w-4" />
          </button>
        </div>

        {/* Progress */}
        <div className="flex h-1 bg-neutral-100">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 transition-colors ${s <= step ? "bg-brand-500" : ""}`}
            />
          ))}
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          {/* Paso 1 — Materia y notas */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-neutral-600">
                  ¿Cómo eliges profesor?
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAssignMode("auto")}
                    className={`flex-1 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors ${
                      assignMode === "auto"
                        ? "border-brand-400 bg-brand-50 text-brand-700"
                        : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
                    }`}
                  >
                    Que Yleis elija
                    <span className="block text-xs font-normal text-neutral-400">Recomendado</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignMode("manual")}
                    className={`flex-1 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors ${
                      assignMode === "manual"
                        ? "border-brand-400 bg-brand-50 text-brand-700"
                        : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
                    }`}
                  >
                    Elegir yo
                    <span className="block text-xs font-normal text-neutral-400">
                      Un profesor específico
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-neutral-600">Materia</label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
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

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-neutral-600">
                  Notas para el profesor{" "}
                  <span className="text-neutral-400 font-normal">(opcional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={300}
                  rows={3}
                  placeholder="¿Qué quieres trabajar en la clase?"
                  className="resize-none rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
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
                          ? "border-brand-400 bg-brand-50 text-brand-700"
                          : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
                      }`}
                    >
                      {m === "virtual" ? "Virtual" : "Presencial"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Paso 2 — Fecha, hora (duración fija 60 min) */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-neutral-600">Fecha</label>
                  <input
                    type="date"
                    value={date}
                    min={tomorrowMin()}
                    onChange={(e) => setDate(e.target.value)}
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-neutral-600">Hora</label>
                  <select
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                  >
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 flex items-center gap-2">
                <FeatherCalendar className="h-4 w-4 text-brand-400 flex-none" />
                <p className="text-xs text-brand-700">Duración fija: 1 hora (60 min)</p>
              </div>
            </div>
          )}

          {/* Paso 3 — Profesor (o resumen si es asignación automática) */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              {assignMode === "auto" ? (
                <div className="rounded-xl border border-brand-100 bg-brand-50 p-4">
                  <p className="text-sm font-medium text-brand-800">
                    Yleis te asigna un profesor automáticamente
                  </p>
                  <p className="mt-1 text-xs text-neutral-600">
                    Le enviamos la solicitud al profesor verificado disponible con más antigüedad en
                    la plataforma para esa materia y horario. Si no puede, se la pasamos al
                    siguiente — no tienes que hacer nada más.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-neutral-600">Profesor</label>
                  {teachers.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-neutral-300 p-4 text-center text-sm text-neutral-400">
                      No hay profesores verificados disponibles para esta materia.
                    </p>
                  ) : (
                    <select
                      value={teacherId}
                      onChange={(e) => setTeacherId(e.target.value)}
                      className="rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                    >
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.full_name}
                          {t.hourly_rate != null ? ` — ${formatCOP(t.hourly_rate)}/h` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {estimatedPrice != null && (
                <div className="rounded-xl border border-brand-100 bg-brand-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600">Precio estimado (60 min)</span>
                    <span className="text-lg font-bold text-brand-700">
                      {formatCOP(estimatedPrice)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">
                    Se descuenta 1 hora de tu paquete. El profesor debe aceptar la solicitud.
                  </p>
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-neutral-100 px-5 py-4">
          {step > 1 ? (
            <Button
              variant="neutral-secondary"
              size="medium"
              onClick={() => {
                setError(null);
                setStep((s) => (s - 1) as 1 | 2 | 3);
              }}
              disabled={loading}
            >
              Atrás
            </Button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <Button
              variant="brand-primary"
              size="medium"
              onClick={() => {
                setError(null);
                setStep((s) => (s + 1) as 1 | 2 | 3);
              }}
            >
              Siguiente
            </Button>
          ) : (
            <Button
              variant="brand-primary"
              size="medium"
              icon={loading ? undefined : <FeatherCheck />}
              loading={loading}
              onClick={handleSubmit}
              disabled={assignMode === "manual" && teachers.length === 0}
            >
              Confirmar reserva
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
