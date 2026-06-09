import { BookingForm } from "@/components/custom/booking/BookingForm";
import { createClient } from "@/lib/supabase/server";
import { getTeacherById } from "@/services/teachers";
import { Avatar } from "@/ui/components/Avatar";
import { FeatherArrowLeft } from "@subframe/core";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

type PageParams = Promise<{ teacherId: string }>;

export default async function BookingPage({ params }: { params: PageParams }) {
  const { teacherId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: userRow } = await supabase.from("users").select("role").eq("id", user.id).single();

  if (userRow?.role === "teacher") redirect("/app/teacher/dashboard");

  const [teacher, { data: subjects }] = await Promise.all([
    getTeacherById(supabase, teacherId),
    supabase
      .from("subjects")
      .select("id, name, category")
      .eq("is_active", true)
      .order("category")
      .order("name"),
  ]);

  if (!teacher) notFound();
  if (!teacher.hourly_rate) redirect(`/app/student/teacher/${teacherId}`);

  return (
    <div className="bg-neutral-50 min-h-full">
      <div className="mx-auto w-full max-w-lg px-4 py-8 sm:px-6">
        {/* Back */}
        <Link
          href={`/app/student/teacher/${teacherId}`}
          className="mb-6 flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
        >
          <FeatherArrowLeft className="h-4 w-4" />
          Volver al perfil
        </Link>

        <h1 className="mb-6 text-xl font-bold text-neutral-900">Reservar clase</h1>

        {/* Profesor seleccionado */}
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4">
          <Avatar image={teacher.avatar_url ?? undefined} size="medium" variant="brand">
            {!teacher.avatar_url ? initials(teacher.full_name) : undefined}
          </Avatar>
          <div>
            <p className="font-semibold text-neutral-900">{teacher.full_name}</p>
            {teacher.headline && <p className="text-xs text-neutral-500">{teacher.headline}</p>}
          </div>
        </div>

        {/* Formulario */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <BookingForm
            teacherId={teacher.id}
            teacherName={teacher.full_name}
            hourlyRate={teacher.hourly_rate}
            subjects={subjects ?? []}
          />
        </div>
      </div>
    </div>
  );
}
