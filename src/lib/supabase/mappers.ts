import type { Database } from "@/types/database.types";
import type { UserProfile } from "@/types/user.types";

type UserRow = Database["public"]["Tables"]["users"]["Row"];

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

// full_name "Ana García" → firstName: "Ana", lastName: "García"
function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  const idx = trimmed.indexOf(" ");
  if (idx === -1) return { firstName: trimmed, lastName: "" };
  return { firstName: trimmed.slice(0, idx), lastName: trimmed.slice(idx + 1) };
}

export function mapUserToProfile(row: UserRow, authUser: AuthUser): UserProfile {
  const { firstName, lastName } = splitFullName(row.full_name);

  return {
    id: row.id,
    firstName,
    lastName,
    email: row.email,
    phone: row.phone ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    role: row.role as UserProfile["role"],
    city: "",
    country: "",
    timezone: "America/Bogota",
    bio: undefined,
    languages: [],
    isActive: true,
    googleCalendarConnected: false,
    joinedAt: row.created_at,
    isEmailVerified: authUser.email_confirmed_at != null,
    preferences: DEFAULT_PREFERENCES,
  };
}

// Mantener alias por compatibilidad con código existente
export const mapProfileToUser = mapUserToProfile;
