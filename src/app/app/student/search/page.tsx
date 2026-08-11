"use client";

import { AutoAssignForm } from "@/components/custom/booking/AutoAssignForm";
import { Avatar } from "@/ui/components/Avatar";
import { Badge } from "@/ui/components/Badge";
import { FeatherSearch, FeatherStar } from "@subframe/core";
import Link from "next/link";
import { useEffect, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

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
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [nameQuery, setNameQuery] = useState("");

  const filteredTeachers = nameQuery.trim()
    ? teachers.filter((t) => t.full_name.toLowerCase().includes(nameQuery.trim().toLowerCase()))
    : teachers;

  useEffect(() => {
    async function load() {
      const teachersRes = await fetch("/api/teachers").catch(() => null);
      if (teachersRes?.ok) {
        const data = (await teachersRes.json()) as { teachers: Teacher[] };
        setTeachers(data.teachers ?? []);
      }
      setCatalogLoading(false);
    }
    void load();
  }, []);

  return (
    <div className="bg-neutral-50 min-h-full">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <AutoAssignForm />

        <div>
          <div className="mb-1 flex items-center gap-2">
            <FeatherSearch className="h-5 w-5 text-neutral-500" />
            <h1 className="text-lg font-bold text-neutral-900">Solicitar una clase o paquete</h1>
          </div>
          <p className="mb-4 text-sm text-neutral-500">
            Elige un profesor y solicítale una clase o paquete. El tiempo de respuesta puede ser de
            3 hasta 24 horas. Si buscas algo más urgente, usa{" "}
            <Link href="/app/student/express" className="font-medium text-brand-700 underline">
              Clase Express
            </Link>
            .
          </p>

          <div className="mb-4 flex flex-col gap-1.5">
            <label htmlFor="teacher-name-search" className="text-xs font-medium text-neutral-600">
              ¿Buscas a un profesor en particular? Busca por nombre
            </label>
            <input
              id="teacher-name-search"
              type="text"
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              placeholder="Ej: María García"
              className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
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
          ) : filteredTeachers.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-neutral-300 bg-white p-16 text-center">
              <FeatherSearch className="h-10 w-10 text-neutral-300" />
              <p className="text-sm text-neutral-500">
                {nameQuery.trim()
                  ? `No encontramos profesores que coincidan con "${nameQuery}".`
                  : "No hay profesores verificados aún."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredTeachers.map((t) => (
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
