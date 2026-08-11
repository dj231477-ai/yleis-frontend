"use client";

import { ExpressTimer } from "@/components/custom/express/ExpressTimer";
import { Badge } from "@/ui/components/Badge";
import { Button } from "@/ui/components/Button";
import { FeatherZap } from "@subframe/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type Subject = { id: string; name: string };
type ExpressStatus = "idle" | "searching" | "matched" | "expired";

export default function StudentExpressPage() {
  const router = useRouter();

  const [expressStatus, setExpressStatus] = useState<ExpressStatus>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [expressError, setExpressError] = useState<string | null>(null);
  const [expressLoading, setExpressLoading] = useState(false);

  const [subjectId, setSubjectId] = useState("");
  const [description, setDescription] = useState("");
  const [priceMin, setPriceMin] = useState(40000);
  const [priceMax, setPriceMax] = useState(80000);
  const [modality, setModality] = useState<"presencial" | "virtual">("virtual");

  const [subjects, setSubjects] = useState<Subject[]>([]);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/subjects").catch(() => null);
      if (res?.ok) {
        const data = (await res.json()) as { subjects: Subject[] };
        setSubjects(data.subjects ?? []);
        if (data.subjects?.[0]) setSubjectId(data.subjects[0].id);
      }
    }
    void load();
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const handleExpired = useCallback(() => {
    stopPolling();
    setExpressStatus("expired");
  }, [stopPolling]);

  useEffect(() => {
    if (expressStatus !== "searching" || !sessionId) {
      stopPolling();
      return;
    }
    pollingRef.current = setInterval(async () => {
      const res = await fetch(`/api/express/status/${sessionId}`).catch(() => null);
      if (!res?.ok) return;
      const json = (await res.json()) as {
        status: string;
        bookingId?: string | null;
      };
      if (json.status === "matched" && json.bookingId) {
        stopPolling();
        setExpressStatus("matched");
        router.push(`/app/student/classes/${json.bookingId}`);
      } else if (json.status === "expired") {
        handleExpired();
      }
    }, 5000);
    return stopPolling;
  }, [expressStatus, sessionId, router, stopPolling, handleExpired]);

  async function handleExpressSubmit(e: React.FormEvent) {
    e.preventDefault();
    setExpressError(null);
    if (!subjectId) {
      setExpressError("Selecciona una materia");
      return;
    }
    setExpressLoading(true);
    const res = await fetch("/api/express/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectId,
        description: description.trim() || undefined,
        priceMin,
        priceMax,
        modality,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      sessionId?: string;
      expiresAt?: string;
      error?: string;
    };
    if (!res.ok || !json.sessionId) {
      setExpressError(json.error ?? "No se pudo crear la solicitud. Intenta de nuevo.");
      setExpressLoading(false);
      return;
    }
    setSessionId(json.sessionId);
    setExpiresAt(json.expiresAt!);
    setExpressStatus("searching");
    setExpressLoading(false);
  }

  async function handleCancelExpress() {
    stopPolling();
    if (sessionId) {
      const res = await fetch("/api/express/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }).catch(() => null);

      if (!res?.ok) {
        // Puede que un profesor la haya aceptado justo antes de cancelar - seguimos
        // el flujo normal de match en vez de descartar la sesión silenciosamente.
        const statusRes = await fetch(`/api/express/status/${sessionId}`).catch(() => null);
        const statusJson = statusRes?.ok
          ? ((await statusRes.json()) as { status: string; bookingId?: string | null })
          : null;
        if (statusJson?.status === "matched" && statusJson.bookingId) {
          setExpressStatus("matched");
          router.push(`/app/student/classes/${statusJson.bookingId}`);
          return;
        }
      }
    }
    setSessionId(null);
    setExpiresAt(null);
    setExpressStatus("idle");
  }

  return (
    <div className="bg-neutral-50 min-h-full">
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <FeatherZap className="h-5 w-5 text-brand-600" />
            <h2 className="text-lg font-bold text-neutral-900">Clase Express</h2>
            <Badge variant="brand">Inmediata</Badge>
          </div>

          {expressStatus === "idle" && (
            <form onSubmit={handleExpressSubmit} className="flex flex-col gap-4">
              <p className="text-sm text-neutral-500">
                Describe lo que necesitas y conectamos con el profesor disponible ahora mismo. Si
                prefieres agendar con fecha y hora fija o usar el saldo de un paquete, usa{" "}
                <Link href="/app/student/search" className="font-medium text-brand-700 underline">
                  Solicitar una clase o paquete
                </Link>
                .
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-neutral-600">Materia</label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-neutral-600">¿Qué necesitas?</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={150}
                    placeholder="Ej: Ayuda con gramática inglesa nivel B2"
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                  />
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
                          ? "border-brand-400 bg-brand-50 text-brand-700"
                          : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
                      }`}
                    >
                      {m === "virtual" ? "Virtual" : "Presencial"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-neutral-600">
                    Precio mínimo / hora
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">
                      $
                    </span>
                    <input
                      type="number"
                      value={priceMin}
                      min={10000}
                      max={priceMax}
                      step={5000}
                      onChange={(e) => setPriceMin(Number(e.target.value))}
                      className="w-full rounded-lg border border-neutral-200 bg-white pl-6 pr-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-neutral-600">
                    Precio máximo / hora
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">
                      $
                    </span>
                    <input
                      type="number"
                      value={priceMax}
                      min={priceMin}
                      step={5000}
                      onChange={(e) => setPriceMax(Number(e.target.value))}
                      className="w-full rounded-lg border border-neutral-200 bg-white pl-6 pr-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                </div>
              </div>

              {expressError && (
                <p className="rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700">
                  {expressError}
                </p>
              )}

              <Button
                variant="brand-primary"
                size="large"
                type="submit"
                loading={expressLoading}
                icon={<FeatherZap />}
                className="sm:w-fit"
              >
                Buscar profesor ahora
              </Button>
            </form>
          )}

          {expressStatus === "searching" && expiresAt && (
            <div className="flex flex-col gap-4">
              <ExpressTimer expiresAt={expiresAt} onExpire={handleExpired} />
              <p className="text-sm text-neutral-500">
                Notificamos a los profesores disponibles. El primero en aceptar se conecta contigo.
              </p>
              <Button
                variant="neutral-secondary"
                size="medium"
                onClick={handleCancelExpress}
                className="sm:w-fit"
              >
                Cancelar búsqueda
              </Button>
            </div>
          )}

          {expressStatus === "matched" && (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-success-700">
                ¡Profesor encontrado! Redirigiendo a tu clase…
              </p>
            </div>
          )}

          {expressStatus === "expired" && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-error-700">
                El tiempo expiró sin que ningún profesor aceptara.
              </p>
              <p className="text-xs text-neutral-500">
                Intenta ampliar el rango de precio o vuelve a intentarlo en un momento.
              </p>
              <Button
                variant="brand-secondary"
                size="medium"
                icon={<FeatherZap />}
                onClick={() => setExpressStatus("idle")}
                className="sm:w-fit"
              >
                Intentar de nuevo
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
