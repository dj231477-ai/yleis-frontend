import { Sidebar } from "@/components/layout/Sidebar";
import { mapUserToProfile } from "@/lib/supabase/mappers";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const { data: row } = await supabase.from("users").select("*").eq("id", authUser.id).single();

  if (!row) redirect("/api/auth/signout");

  const { data: teacher } = await supabase
    .from("teachers")
    .select("onboarding_step")
    .eq("user_id", authUser.id)
    .maybeSingle();

  const isVerifiedTeacher = teacher?.onboarding_step === "verified";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar user={mapUserToProfile(row, authUser)} isVerifiedTeacher={isVerifiedTeacher} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
