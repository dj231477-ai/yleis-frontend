import { createClient } from "@/lib/supabase/server";
import { getTeacherProfile } from "@/services/teachers";
import { Avatar } from "@/ui/components/Avatar";
import { FeatherUser } from "@subframe/core";
import { redirect } from "next/navigation";

export const metadata = { title: "Mis Estudiantes — Yleis" };
export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

type StudentEntry = {
  student_id: string;
  full_name: string;
  avatar_url: string | null;
  total_classes: number;
  last_booking: string;
};

export default async function TeacherStudentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: userRow } = await supabase.from("users").select("role").eq("id", user.id).single();

  if (userRow?.role !== "teacher") redirect("/app/student/dashboard");

  const teacher = await getTeacherProfile(supabase, user.id);
  if (!teacher || teacher.onboarding_step !== "verified") redirect("/app/teacher/onboarding");

  // biome-ignore lint/suspicious/noExplicitAny: Supabase typed client does not include all tables
  const { data: raw } = await (supabase as any)
    .from("bookings")
    .select("student_id, scheduled_at, status, students(user_id, users(full_name, avatar_url))")
    .eq("teacher_id", teacher.id)
    .in("status", ["confirmed", "paid", "completed"])
    .order("scheduled_at", { ascending: false });

  // Deduplicate students
  const map = new Map<string, StudentEntry>();
  for (const b of raw ?? []) {
    const sid = b.student_id as string;
    const name = (b.students?.users?.full_name as string) ?? "Estudiante";
    const avatar = (b.students?.users?.avatar_url as string | null) ?? null;
    if (!map.has(sid)) {
      map.set(sid, {
        student_id: sid,
        full_name: name,
        avatar_url: avatar,
        total_classes: 1,
        last_booking: b.scheduled_at,
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      map.get(sid)!.total_classes++;
    }
  }

  const students = Array.from(map.values());
  const totalClasses = students.reduce((s, e) => s + e.total_classes, 0);

  return (
    <div className="bg-neutral-50 min-h-full">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900">Mis Estudiantes</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {students.length} estudiante{students.length !== 1 ? "s" : ""} · {totalClasses} clase
            {totalClasses !== 1 ? "s" : ""} en total
          </p>
        </div>

        {students.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-neutral-300 bg-white p-16 text-center">
            <FeatherUser className="h-10 w-10 text-neutral-300" />
            <div>
              <p className="font-semibold text-neutral-700">Aún no tienes estudiantes</p>
              <p className="mt-1 text-sm text-neutral-500">
                Cuando aceptes reservas, aparecerán aquí.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {students.map((s) => (
              <div
                key={s.student_id}
                className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 hover:bg-neutral-50 transition-colors"
              >
                <Avatar image={s.avatar_url ?? undefined} size="medium" variant="neutral">
                  {!s.avatar_url ? initials(s.full_name) : undefined}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium text-neutral-900 text-sm">{s.full_name}</p>
                  <p className="text-xs text-neutral-400">
                    Última clase: {formatDate(s.last_booking)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-neutral-700">{s.total_classes}</p>
                  <p className="text-xs text-neutral-400">
                    clase{s.total_classes !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
