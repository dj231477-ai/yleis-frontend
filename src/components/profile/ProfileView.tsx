"use client";

import { profileService } from "@/services/profile.service";
import type { Booking, UpcomingClass } from "@/types/booking.types";
import type { UserProfile } from "@/types/user.types";
import { useState } from "react";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileTabs } from "./ProfileTabs";
import { ServicesOverviewSection } from "./ServicesOverviewSection";

type Props = {
  initialUser: UserProfile;
  initialBookings: Booking[];
  initialUpcomingClasses: UpcomingClass[];
};

export function ProfileView({ initialUser, initialBookings, initialUpcomingClasses }: Props) {
  const [user, setUser] = useState<UserProfile>(initialUser);

  function handleEditClick() {
    const el = document.getElementById("section-tabs");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleAvatarChange(file: File) {
    const { avatarUrl } = await profileService.uploadAvatar(file);
    setUser((prev) => ({ ...prev, avatarUrl }));
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
      <ProfileHeader
        user={user}
        onEditClick={handleEditClick}
        onAvatarChange={handleAvatarChange}
      />

      <ServicesOverviewSection role={user.role} />

      <div id="section-tabs">
        <ProfileTabs
          user={user}
          bookings={initialBookings}
          upcomingClasses={initialUpcomingClasses}
          onUserUpdate={setUser}
        />
      </div>
    </div>
  );
}
