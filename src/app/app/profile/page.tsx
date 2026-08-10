import { GoogleCalendarConnection } from "@/components/custom/teacher/GoogleCalendarConnection";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/ui/components/Avatar";
import { Badge } from "@/ui/components/Badge";
import { Button } from "@/ui/components/Button";
import { FeatherBook, FeatherCalendar, FeatherSettings, FeatherStar } from "@subframe/core";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Mi Perfil — Yleis" };
export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

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

type SearchParams = Promise<{ calendar?: "connected" | "cancelled" | "error" }>;

export default async function ProfilePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const [{ data: userRow }, { data: teacher }] = await Promise.all([
    supabase
      .from("users")
      .select("full_name, email, phone, avatar_url, role, created_at")
      .eq("id", authUser.id)
      .single(),
    supabase
      .from("teachers")
      .select(
        "headline, bio, hourly_rate, languages, onboarding_step, rating_avg, total_reviews, years_experience, google_calendar_connected, google_calendar_email"
      )
      .eq("user_id", authUser.id)
      .maybeSingle(),
  ]);

  if (!userRow) redirect("/app");

  const isVerifiedTeacher = teacher?.onboarding_step === "verified";
  const showRating = isVerifiedTeacher && (teacher?.total_reviews ?? 0) >= 5;

  const roleBadge =
    userRow.role === "teacher" ? (
      <Badge variant="brand">Profesor</Badge>
    ) : userRow.role === "admin" ? (
      <Badge variant="warning">Admin</Badge>
    ) : (
      <Badge variant="neutral">Estudiante</Badge>
    );

  return (
    <div className="bg-neutral-50 min-h-full">
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        {sp.calendar === "connected" && (
          <div className="mb-5 rounded-xl border border-success-200 bg-success-50 px-4 py-3 text-sm font-medium text-success-700">
            Google Calendar conectado — el link de Meet se va a generar solo al confirmar una clase.
          </div>
        )}
        {sp.calendar === "error" && (
          <div className="mb-5 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm font-medium text-error-700">
            No se pudo conectar Google Calendar. Intenta de nuevo.
          </div>
        )}

        {/* Hero card */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 mb-5">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <Avatar image={userRow.avatar_url ?? undefined} size="x-large" variant="brand">
              {!userRow.avatar_url ? initials(userRow.full_name) : undefined}
            </Avatar>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-neutral-900">{userRow.full_name}</h1>
                {roleBadge}
                {isVerifiedTeacher && <Badge variant="success">Verificado</Badge>}
              </div>
              <p className="text-sm text-neutral-500">{userRow.email}</p>
              {teacher?.headline && (
                <p className="mt-2 text-sm text-neutral-700 italic">{teacher.headline}</p>
              )}
              {showRating && (
                <div className="mt-2 flex items-center gap-1.5">
                  <FeatherStar className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium text-neutral-700">
                    {teacher!.rating_avg.toFixed(1)}
                  </span>
                  <span className="text-xs text-neutral-400">
                    ({teacher!.total_reviews} reseñas)
                  </span>
                </div>
              )}
            </div>
            <Link href="/app/settings">
              <Button variant="neutral-secondary" size="small" icon={<FeatherSettings />}>
                Editar
              </Button>
            </Link>
          </div>
        </div>

        {/* Info */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 mb-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Información
          </h2>
          <dl className="flex flex-col gap-3">
            <Row label="Email" value={userRow.email} />
            {userRow.phone && <Row label="Teléfono" value={userRow.phone} />}
            <Row label="Miembro desde" value={formatDate(userRow.created_at)} />
            <Row
              label="Modo actual"
              value={userRow.role === "teacher" ? "Profesor" : "Estudiante"}
            />
          </dl>
        </div>

        {/* Perfil profesional (si es profesor verificado) */}
        {isVerifiedTeacher && teacher && (
          <div className="rounded-xl border border-neutral-200 bg-white p-6 mb-5">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Perfil profesional
            </h2>
            <div className="flex flex-col gap-4">
              {teacher.hourly_rate != null && (
                <div className="flex items-center gap-3 rounded-lg bg-brand-50 border border-brand-100 px-4 py-3">
                  <span className="text-xs text-neutral-500">Tarifa por hora</span>
                  <span className="ml-auto text-lg font-bold text-brand-700">
                    {formatCOP(teacher.hourly_rate)}
                  </span>
                </div>
              )}
              {teacher.years_experience != null && (
                <Row label="Años de experiencia" value={`${teacher.years_experience} años`} />
              )}
              {teacher.languages && teacher.languages.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-neutral-500 w-32 shrink-0">Idiomas</span>
                  <div className="flex flex-wrap gap-1">
                    {teacher.languages.map((l: string) => (
                      <Badge key={l} variant="neutral">
                        {l}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {teacher.bio && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <FeatherBook className="h-3.5 w-3.5 text-neutral-400" />
                    <span className="text-xs font-medium text-neutral-500">Sobre mí</span>
                  </div>
                  <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line">
                    {teacher.bio}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Conexión de Google Calendar (cualquier profesor, verificado o no) */}
        {teacher && (
          <div className="rounded-xl border border-neutral-200 bg-white p-6 mb-5">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Calendario
            </h2>
            <GoogleCalendarConnection
              connected={teacher.google_calendar_connected ?? false}
              email={teacher.google_calendar_email}
            />
          </div>
        )}

        {/* CTA si no es profesor */}
        {!teacher && (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center">
            <FeatherCalendar className="mx-auto mb-3 h-8 w-8 text-neutral-300" />
            <p className="text-sm font-medium text-neutral-700">¿Quieres dar clases?</p>
            <p className="mt-1 text-xs text-neutral-500 mb-4">
              Completa tu perfil de profesor y empieza a ganar dinero enseñando.
            </p>
            <Link href="/app/teacher/onboarding">
              <Button variant="brand-primary" size="small">
                Conviértete en profesor
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 text-sm text-neutral-500">{label}</span>
      <span className="text-sm font-medium text-neutral-800">{value}</span>
    </div>
  );
}
