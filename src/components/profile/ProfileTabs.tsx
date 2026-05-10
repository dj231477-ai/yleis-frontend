"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/types/user.types";
import type { Booking, UpcomingClass } from "@/types/booking.types";
import { PersonalInfoSection } from "./PersonalInfoSection";
import { BookingHistorySection } from "./BookingHistorySection";
import { ClassPreferencesSection } from "./ClassPreferencesSection";
import { SecuritySection } from "./SecuritySection";
import { GoogleCalendarSection } from "./GoogleCalendarSection";
import { UpcomingClassesSection } from "./UpcomingClassesSection";
import { NotificationsSection } from "./NotificationsSection";

const TABS = [
  { id: "personal", label: "Personal" },
  { id: "upcoming", label: "Próximas clases" },
  { id: "history", label: "Historial" },
  { id: "preferences", label: "Preferencias" },
  { id: "security", label: "Seguridad" },
  { id: "integrations", label: "Integraciones" },
  { id: "notifications", label: "Notificaciones" },
] as const;

type TabId = (typeof TABS)[number]["id"];

type Props = {
  user: UserProfile;
  bookings: Booking[];
  upcomingClasses: UpcomingClass[];
  onUserUpdate: (updated: UserProfile) => void;
};

export function ProfileTabs({ user, bookings, upcomingClasses, onUserUpdate }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("personal");

  return (
    <div>
      {/* Tab nav */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex min-w-max gap-1 rounded-xl border border-border bg-muted/50 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "personal" && (
          <PersonalInfoSection user={user} onUpdate={onUserUpdate} />
        )}
        {activeTab === "upcoming" && (
          <UpcomingClassesSection classes={upcomingClasses} />
        )}
        {activeTab === "history" && (
          <BookingHistorySection bookings={bookings} />
        )}
        {activeTab === "preferences" && (
          <ClassPreferencesSection user={user} />
        )}
        {activeTab === "security" && (
          <SecuritySection user={user} />
        )}
        {activeTab === "integrations" && (
          <GoogleCalendarSection
            user={user}
            onUpdate={(partial) => onUserUpdate({ ...user, ...partial })}
          />
        )}
        {activeTab === "notifications" && (
          <NotificationsSection user={user} />
        )}
      </div>
    </div>
  );
}
