import { TopBar } from "@/components/layout/TopBar";
import { ProfileView } from "@/components/profile/ProfileView";
import { mapProfileToUser } from "@/lib/supabase/mappers";
import { createClient } from "@/lib/supabase/server";
import { profileService } from "@/services/profile.service";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Mi Perfil — Yleis" };

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";

export default async function ProfilePage() {
  if (USE_MOCKS) {
    const [user, bookings, upcomingClasses] = await Promise.all([
      profileService.getProfile(),
      profileService.getBookings(),
      profileService.getUpcomingClasses(),
    ]);
    return (
      <>
        <TopBar title="Mi Perfil" subtitle={`${user.firstName} ${user.lastName} · ${user.email}`} />
        <ProfileView
          initialUser={user}
          initialBookings={bookings}
          initialUpcomingClasses={upcomingClasses}
        />
      </>
    );
  }

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (!profile) redirect("/login");

  const user = mapProfileToUser(profile, authUser);

  return (
    <>
      <TopBar title="Mi Perfil" subtitle={`${user.firstName} ${user.lastName} · ${user.email}`} />
      <ProfileView initialUser={user} initialBookings={[]} initialUpcomingClasses={[]} />
    </>
  );
}
