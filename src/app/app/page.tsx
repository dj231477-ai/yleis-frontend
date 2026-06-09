import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AppRootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: userRow } = await supabase.from("users").select("role").eq("id", user.id).single();

  const role = userRow?.role ?? "student";

  if (role === "admin") redirect("/app/admin/dashboard");

  if (role === "teacher") {
    await supabase
      .from("teachers")
      .upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });

    const { data: teacher } = await supabase
      .from("teachers")
      .select("onboarding_step")
      .eq("user_id", user.id)
      .single();

    if (teacher?.onboarding_step === "verified") {
      redirect("/app/teacher/dashboard");
    }
    redirect("/app/teacher/onboarding");
  }

  await supabase
    .from("students")
    .upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });

  redirect("/app/student/dashboard");
}
