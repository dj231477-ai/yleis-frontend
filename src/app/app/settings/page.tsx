import { AvatarSection } from "@/components/custom/settings/AvatarSection";
import { PasswordForm } from "@/components/custom/settings/PasswordForm";
import { PersonalInfoForm } from "@/components/custom/settings/PersonalInfoForm";
import { TeacherProfileForm } from "@/components/custom/settings/TeacherProfileForm";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = { title: "Configuración — Yleis" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: userRow } = await supabase
    .from("users")
    .select("full_name, email, avatar_url, phone, role")
    .eq("id", user.id)
    .single();

  if (!userRow) redirect("/app");

  const role = userRow.role;

  let teacherProfile: {
    headline: string | null;
    bio: string | null;
    hourly_rate: number | null;
    languages: string[];
    onboarding_step: string;
  } | null = null;

  if (role === "teacher") {
    const { data: teacher } = await supabase
      .from("teachers")
      .select("headline, bio, hourly_rate, languages, onboarding_step")
      .eq("user_id", user.id)
      .single();
    teacherProfile = teacher;
  }

  const isOAuth = user.app_metadata?.provider !== "email";

  return (
    <div className="bg-neutral-50 min-h-full">
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="mb-8 text-2xl font-bold text-neutral-900">Configuración</h1>

        <div className="flex flex-col gap-6">
          {/* Foto de perfil */}
          <Section title="Foto de perfil">
            <AvatarSection currentUrl={userRow.avatar_url} fullName={userRow.full_name} />
          </Section>

          {/* Información personal */}
          <Section title="Información personal">
            <PersonalInfoForm
              fullName={userRow.full_name}
              email={userRow.email}
              phone={userRow.phone ?? ""}
            />
          </Section>

          {/* Perfil de profesor */}
          {role === "teacher" &&
            teacherProfile &&
            teacherProfile.onboarding_step === "verified" && (
              <Section title="Perfil de profesor">
                <TeacherProfileForm
                  headline={teacherProfile.headline ?? ""}
                  bio={teacherProfile.bio ?? ""}
                  hourlyRate={teacherProfile.hourly_rate ?? 0}
                  languages={teacherProfile.languages ?? []}
                />
              </Section>
            )}

          {/* Seguridad */}
          {!isOAuth && (
            <Section title="Seguridad">
              <PasswordForm />
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6">
      <h2 className="mb-5 text-sm font-semibold text-neutral-700">{title}</h2>
      {children}
    </div>
  );
}
