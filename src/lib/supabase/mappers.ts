import type { Database } from "@/types/database.types";
import type { Language, UserProfile } from "@/types/user.types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

type AuthUser = {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
};

export const DEFAULT_PREFERENCES: UserProfile["preferences"] = {
  notifications: {
    email: true,
    push: true,
    sms: false,
    classReminder: true,
    bookingConfirmation: true,
    weeklyReport: false,
  },
  schedule: { preferredDays: [], preferredTimeSlots: [], sessionDuration: 60 },
  learning: { goals: [], pace: "standard", groupOrPrivate: "both" },
};

export function mapProfileToUser(profile: ProfileRow, authUser: AuthUser): UserProfile {
  const storedPrefs = profile.preferences as UserProfile["preferences"] | null;

  return {
    id: profile.id,
    firstName: profile.first_name,
    lastName: profile.last_name,
    email: authUser.email ?? "",
    phone: profile.phone ?? undefined,
    avatarUrl: profile.avatar_url ?? undefined,
    role: profile.role,
    city: profile.city ?? "",
    country: profile.country ?? "Colombia",
    timezone: profile.timezone ?? "America/Bogota",
    bio: profile.bio ?? undefined,
    languages: (profile.languages as Language[]) ?? [],
    isActive: profile.is_active,
    googleCalendarConnected: profile.google_calendar_connected,
    googleCalendarEmail: profile.google_calendar_email ?? undefined,
    joinedAt: profile.created_at,
    isEmailVerified: authUser.email_confirmed_at != null,
    preferences: storedPrefs ?? DEFAULT_PREFERENCES,
  };
}
