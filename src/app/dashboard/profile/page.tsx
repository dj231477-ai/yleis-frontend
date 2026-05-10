import type { Metadata } from "next";
import { profileService } from "@/services/profile.service";
import { ProfileView } from "@/components/profile/ProfileView";
import { TopBar } from "@/components/layout/TopBar";

export const metadata: Metadata = { title: "Mi Perfil — Yleis" };

export default async function ProfilePage() {
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
