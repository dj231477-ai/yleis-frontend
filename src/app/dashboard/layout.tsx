import { Sidebar } from "@/components/layout/Sidebar";
import { mapProfileToUser } from "@/lib/supabase/mappers";
import { createClient } from "@/lib/supabase/server";
import { profileService } from "@/services/profile.service";
import type { UserProfile } from "@/types/user.types";
import { redirect } from "next/navigation";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";

function Shell({ user, children }: { user: UserProfile; children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar user={user} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (USE_MOCKS) {
    const user = await profileService.getProfile();
    return <Shell user={user}>{children}</Shell>;
  }

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  // First attempt: read existing profile
  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (existing) {
    return <Shell user={mapProfileToUser(existing, authUser)}>{children}</Shell>;
  }

  // Profile missing — trigger may have failed. Try to create it.
  const meta = authUser.user_metadata ?? {};
  const { data: created } = await supabase
    .from("profiles")
    .insert({
      id: authUser.id,
      first_name: (meta.first_name as string) ?? authUser.email?.split("@")[0] ?? "Usuario",
      last_name: (meta.last_name as string) ?? "",
      role:
        (meta.role as "student" | "teacher" | "translator" | "interpreter" | "admin") ?? "student",
    })
    .select("*")
    .single();

  if (created) {
    return <Shell user={mapProfileToUser(created, authUser)}>{children}</Shell>;
  }

  // Insert failed (e.g. RLS or duplicate). Try one more fetch in case trigger ran concurrently.
  const { data: retried } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (retried) {
    return <Shell user={mapProfileToUser(retried, authUser)}>{children}</Shell>;
  }

  // Completely stuck — sign out to avoid the middleware redirect loop
  redirect("/api/auth/signout");
}
