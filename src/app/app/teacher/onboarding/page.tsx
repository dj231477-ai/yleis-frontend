import { OnboardingForm } from "@/components/custom/teacher/OnboardingForm";
import { OnboardingPending } from "@/components/custom/teacher/OnboardingPending";
import { OnboardingRejected } from "@/components/custom/teacher/OnboardingRejected";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = { title: "Verificación de profesor — Yleis" };

export default async function TeacherOnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Garantizar que existe el registro en teachers (migración 016 lo eliminó del trigger)
  await supabase
    .from("teachers")
    .upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });

  const { data: teacher } = await supabase
    .from("teachers")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!teacher) redirect("/login");

  if (teacher.onboarding_step === "verified") {
    redirect("/app/teacher/dashboard");
  }

  // submitted o under_review → en revisión
  if (teacher.onboarding_step === "submitted" || teacher.onboarding_step === "under_review") {
    return <OnboardingPending />;
  }

  if (teacher.onboarding_step === "rejected") {
    return <OnboardingRejected />;
  }

  // profile o documents → mostrar formulario
  return <OnboardingForm userId={user.id} teacher={teacher} />;
}
