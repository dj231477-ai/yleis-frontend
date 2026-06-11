"use client";

import { ExpressTimer } from "@/components/custom/express/ExpressTimer";
import { Avatar } from "@/ui/components/Avatar";
import { Badge } from "@/ui/components/Badge";
import { Button } from "@/ui/components/Button";
import { FeatherSearch, FeatherStar, FeatherZap } from "@subframe/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Subject = { id: string; name: string };
type Teacher = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  headline: string | null;
  hourly_rate: number | null;
  rating_avg: number;
  total_reviews: number;
  languages: string[];
};

type ExpressStatus = "idle" | "searching" | "matched" | "expired";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

// ── Main component (Client) ───────────────────────────────────────────────────

export default function SearchPage() {
  const router = useRouter();

  // Express state
  const [expressStatus, setExpressStatus] = useState<ExpressStatus>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [expressError, setExpressError] = useState<string | null>(null);
  const [expressLoading, setExpressLoading] = useState(false);

  // Express form
  const [subjectId, setSubjectId] = useState("");
  const [description, setDescription] = useState("");
  const [priceMin, setPriceMin] = useState(40000);
  const [priceMax, setPriceMax] = useState(80000);

  // Catalog
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cargar subjects + teachers al montar
  useEffect(() => {
    async function load() {
      const [subjectsRes, teachersRes] = await Promise.all([
        fetch("/api/subjects").catch(() => null),
        fetch("/api/teachers").catch(() => null),
      ]);
      if (subjectsRes?.ok) {
        const data = (await subjectsRes.json()) as { subjects: Subject[] };
        setSubjects(data.subjects ?? []);
        if (data.subjects?.[0]) setSubjectId(data.subjects[0].id);
      }
      if (teachersRes?.ok) {
        const data = (await teachersRes.json()) as { teachers: Teacher[] };
        setTeachers(data.teachers ?? []);
      }
      setCatalogLoading(false);
    }
    void load();
  }, []);

  // Polling cuando está buscando
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
    setSessionId(null);
    setExpiresAt(null);
    setExpressStatus("idle");
  }

  return (
    <div className="bg-neutral-50 min-h-full">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        {/* ── Sección Express ─────────────────────────────────────────────── */}
        <div className="mb-8 rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <FeatherZap className="h-5 w-5 text-brand-600" />
            <h2 className="text-lg font-bold text-neutral-900">Clase Express</h2>
            <Badge variant="brand">Inmediata</Badge>
          </div>

          {/* idle — formulario */}
          {expressStatus === "idle" && (
            <form onSubmit={handleExpressSubmit} className="flex flex-col gap-4">
              <p className="text-sm text-neutral-500">
                Describe lo que necesitas y conectamos con el profesor disponible ahora mismo.
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

          {/* searching — timer */}
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

          {/* matched — redirect en curso */}
          {expressStatus === "matched" && (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-success-700">
                ¡Profesor encontrado! Redirigiendo a tu clase…
              </p>
            </div>
          )}

          {/* expired */}
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

        {/* ── Catálogo de profesores ───────────────────────────────────────── */}
        <div>
          <div className="mb-4 flex items-center gap-2">
            <FeatherSearch className="h-5 w-5 text-neutral-500" />
            <h2 className="text-lg font-bold text-neutral-900">Catálogo de profesores</h2>
          </div>

          {catalogLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border border-neutral-200 bg-white p-5 h-44 animate-pulse"
                />
              ))}
            </div>
          ) : teachers.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-neutral-300 bg-white p-16 text-center">
              <FeatherSearch className="h-10 w-10 text-neutral-300" />
              <p className="text-sm text-neutral-500">No hay profesores verificados aún.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {teachers.map((t) => (
                <Link key={t.id} href={`/app/student/teacher/${t.id}`} className="group">
                  <div className="flex h-full flex-col rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md">
                    <div className="flex items-start gap-3 mb-3">
                      <Avatar image={t.avatar_url ?? undefined} size="large" variant="brand">
                        {!t.avatar_url ? initials(t.full_name) : undefined}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-neutral-900 truncate">{t.full_name}</p>
                        {t.headline && (
                          <p className="text-xs text-neutral-500 line-clamp-2 mt-0.5">
                            {t.headline}
                          </p>
                        )}
                      </div>
                    </div>
                    {t.languages.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {t.languages.slice(0, 3).map((l) => (
                          <Badge key={l} variant="neutral">
                            {l}
                          </Badge>
                        ))}
                        {t.languages.length > 3 && (
                          <Badge variant="neutral">+{t.languages.length - 3}</Badge>
                        )}
                      </div>
                    )}
                    <div className="mt-auto flex items-center justify-between pt-3 border-t border-neutral-100">
                      <div className="flex items-center gap-1">
                        <FeatherStar className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium text-neutral-700">
                          {t.rating_avg > 0 ? t.rating_avg.toFixed(1) : "—"}
                        </span>
                        {t.total_reviews > 0 && (
                          <span className="text-xs text-neutral-400">({t.total_reviews})</span>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-brand-700">
                        {t.hourly_rate ? formatCOP(t.hourly_rate) + "/h" : "A consultar"}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
