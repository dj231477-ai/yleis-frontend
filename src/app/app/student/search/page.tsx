import { SearchFilters } from "@/components/custom/search/SearchFilters";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedTeachers } from "@/services/teachers";
import { Avatar } from "@/ui/components/Avatar";
import { Badge } from "@/ui/components/Badge";
import { FeatherSearch, FeatherStar } from "@subframe/core";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata = { title: "Buscar profesores — Yleis" };
export const dynamic = "force-dynamic";

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

function StarRating({ rating, total }: { rating: number; total: number }) {
  return (
    <div className="flex items-center gap-1">
      <FeatherStar className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
      <span className="text-sm font-medium text-neutral-700">
        {rating > 0 ? rating.toFixed(1) : "—"}
      </span>
      {total > 0 && <span className="text-xs text-neutral-400">({total})</span>}
    </div>
  );
}

type SearchParams = Promise<{
  lang?: string;
  minPrice?: string;
  maxPrice?: string;
  rating?: string;
}>;

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const teachers = await getVerifiedTeachers(supabase, {
    language: sp.lang || undefined,
    minPrice: sp.minPrice ? Number(sp.minPrice) : undefined,
    maxPrice: sp.maxPrice ? Number(sp.maxPrice) : undefined,
    minRating: sp.rating ? Number(sp.rating) : undefined,
  });

  return (
    <div className="bg-neutral-50 min-h-full">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900">Buscar profesores</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {teachers.length === 0
              ? "Sin resultados"
              : `${teachers.length} profesor${teachers.length !== 1 ? "es" : ""} encontrado${teachers.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
          {/* Filtros */}
          <Suspense>
            <SearchFilters />
          </Suspense>

          {/* Grid de profesores */}
          {teachers.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-neutral-300 bg-white p-16 text-center">
              <FeatherSearch className="h-10 w-10 text-neutral-300" />
              <div>
                <p className="font-semibold text-neutral-700">Sin profesores</p>
                <p className="mt-1 text-sm text-neutral-500">
                  Prueba cambiando los filtros o busca otra materia.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {teachers.map((t) => (
                <Link key={t.id} href={`/app/student/teacher/${t.id}`} className="group">
                  <div className="flex h-full flex-col rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md">
                    {/* Header */}
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

                    {/* Idiomas */}
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

                    {/* Footer */}
                    <div className="mt-auto flex items-center justify-between pt-3 border-t border-neutral-100">
                      <StarRating rating={t.rating_avg} total={t.total_reviews} />
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
