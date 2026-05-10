"use client";

import { useState } from "react";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileTabs } from "./ProfileTabs";
import { ServicesOverviewSection } from "./ServicesOverviewSection";
import type { UserProfile } from "@/types/user.types";
import type { Booking, UpcomingClass } from "@/types/booking.types";

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

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
      <ProfileHeader user={user} onEditClick={handleEditClick} />

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
