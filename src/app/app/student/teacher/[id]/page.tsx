import { createClient } from "@/lib/supabase/server";
import { getTeacherById, getTeacherReviews } from "@/services/teachers";
import { Avatar } from "@/ui/components/Avatar";
import { Badge } from "@/ui/components/Badge";
import { Button } from "@/ui/components/Button";
import { FeatherArrowLeft, FeatherBook, FeatherCalendar, FeatherStar } from "@subframe/core";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function formatARS(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
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

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <FeatherStar
          key={i}
          className={`h-4 w-4 ${i <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-neutral-300"}`}
        />
      ))}
    </div>
  );
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

type PageParams = Promise<{ id: string }>;

export default async function TeacherProfilePage({ params }: { params: PageParams }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [teacher, reviews] = await Promise.all([
    getTeacherById(supabase, id),
    getTeacherReviews(supabase, id),
  ]);

  if (!teacher) notFound();

  const showRating = teacher.total_reviews >= 5;

  return (
    <div className="bg-neutral-50 min-h-full">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        {/* Back */}
        <Link
          href="/app/student/search"
          className="mb-6 flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
        >
          <FeatherArrowLeft className="h-4 w-4" />
          Volver a la búsqueda
        </Link>

        {/* Hero */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 mb-5">
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <Avatar image={teacher.avatar_url ?? undefined} size="x-large" variant="brand">
              {!teacher.avatar_url ? initials(teacher.full_name) : undefined}
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-neutral-900">{teacher.full_name}</h1>
              {teacher.headline && (
                <p className="mt-1 text-base text-neutral-600">{teacher.headline}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {showRating && (
                  <div className="flex items-center gap-1.5">
                    <StarRating rating={teacher.rating_avg} />
                    <span className="text-sm text-neutral-600">
                      {teacher.rating_avg.toFixed(1)} ({teacher.total_reviews} reseñas)
                    </span>
                  </div>
                )}
                {teacher.years_experience && (
                  <span className="text-sm text-neutral-500">
                    {teacher.years_experience} años de experiencia
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {teacher.languages.map((l) => (
                  <Badge key={l} variant="brand">
                    {l}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Precio y CTA */}
          <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-brand-100 bg-brand-50 px-5 py-4">
            <div>
              <p className="text-xs text-neutral-500">Tarifa por hora</p>
              <p className="text-2xl font-bold text-brand-700">
                {teacher.hourly_rate ? formatARS(teacher.hourly_rate) : "A consultar"}
              </p>
            </div>
            <Link href={`/app/student/booking/${teacher.id}`}>
              <Button variant="brand-primary" size="large" icon={<FeatherCalendar />}>
                Reservar clase
              </Button>
            </Link>
          </div>
        </div>

        {/* Sobre mí */}
        {teacher.bio && (
          <div className="rounded-xl border border-neutral-200 bg-white p-6 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <FeatherBook className="h-4 w-4 text-neutral-400" />
              <h2 className="text-sm font-semibold text-neutral-700">Sobre mí</h2>
            </div>
            <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-line">
              {teacher.bio}
            </p>
          </div>
        )}

        {/* Reseñas */}
        {reviews.length > 0 && (
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <div className="flex items-center gap-2 mb-4">
              <FeatherStar className="h-4 w-4 text-yellow-400" />
              <h2 className="text-sm font-semibold text-neutral-700">Reseñas recientes</h2>
              <span className="ml-auto text-xs text-neutral-400">
                {teacher.total_reviews} en total
              </span>
            </div>
            <div className="flex flex-col divide-y divide-neutral-100">
              {reviews.map((r) => (
                <div key={r.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar image={r.student_avatar ?? undefined} size="small" variant="neutral">
                      {!r.student_avatar ? initials(r.student_name) : undefined}
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-neutral-800">{r.student_name}</p>
                      <p className="text-xs text-neutral-400">{formatDate(r.created_at)}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <FeatherStar
                          key={i}
                          className={`h-3.5 w-3.5 ${i <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-neutral-200"}`}
                        />
                      ))}
                    </div>
                  </div>
                  {r.comment && (
                    <p className="text-sm text-neutral-600 leading-relaxed">{r.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA flotante móvil */}
        <div className="sticky bottom-4 mt-5 sm:hidden">
          <Link href={`/app/student/booking/${teacher.id}`} className="block">
            <Button
              variant="brand-primary"
              size="large"
              icon={<FeatherCalendar />}
              className="w-full shadow-lg"
            >
              Reservar clase —{" "}
              {teacher.hourly_rate ? formatARS(teacher.hourly_rate) + "/h" : "A consultar"}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
