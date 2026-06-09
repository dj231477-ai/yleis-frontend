"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const LANGUAGES = ["Inglés", "Francés", "Portugués", "Alemán", "Español"];

export function SearchFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const update = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      router.push(`${pathname}?${next.toString()}`);
    },
    [router, pathname, params]
  );

  const lang = params.get("lang") ?? "";
  const minPrice = params.get("minPrice") ?? "";
  const maxPrice = params.get("maxPrice") ?? "";
  const rating = params.get("rating") ?? "";

  function clear() {
    router.push(pathname);
  }

  const hasFilters = lang || minPrice || maxPrice || rating;

  return (
    <aside className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-700">Filtros</h2>
        {hasFilters && (
          <button type="button" onClick={clear} className="text-xs text-brand-600 hover:underline">
            Limpiar
          </button>
        )}
      </div>

      {/* Idioma */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500">Idioma / área</label>
        <select
          value={lang}
          onChange={(e) => update("lang", e.target.value)}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        >
          <option value="">Todos</option>
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {/* Precio */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500">Precio por hora (ARS)</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Mín"
            value={minPrice}
            min={0}
            onChange={(e) => update("minPrice", e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
          <span className="text-neutral-400">—</span>
          <input
            type="number"
            placeholder="Máx"
            value={maxPrice}
            min={0}
            onChange={(e) => update("maxPrice", e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
      </div>

      {/* Rating */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500">Calificación mínima</label>
        <div className="flex flex-col gap-1">
          {[
            { label: "Cualquiera", value: "" },
            { label: "4+ estrellas", value: "4" },
            { label: "4.5+ estrellas", value: "4.5" },
          ].map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="rating"
                value={opt.value}
                checked={rating === opt.value}
                onChange={() => update("rating", opt.value)}
                className="accent-brand-600"
              />
              <span className="text-sm text-neutral-700">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>
    </aside>
  );
}
