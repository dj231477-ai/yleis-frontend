export type UserRole = "student" | "teacher" | "translator" | "interpreter" | "admin";

export type Language = {
  code: string;
  name: string;
  flag: string;
  level?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "Native";
};

export type UserProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  role: UserRole;
  city: string;
  country: string;
  timezone: string;
  bio?: string;
  languages: Language[];
  subjects?: string[];
  specializations?: string[];
  languagePairs?: { source: Language; target: Language }[];
  serviceType?: "classes" | "translation" | "interpretation" | "all";
  joinedAt: string;
  isEmailVerified: boolean;
  isActive: boolean;
  googleCalendarConnected: boolean;
  googleCalendarEmail?: string;
  preferences: UserPreferences;
};

export type UserPreferences = {
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    classReminder: boolean;
    bookingConfirmation: boolean;
    weeklyReport: boolean;
  };
  schedule: {
    preferredDays: string[];
    preferredTimeSlots: string[];
    sessionDuration: 30 | 60 | 90;
  };
  learning: {
    goals: string[];
    pace: "relaxed" | "standard" | "intensive";
    groupOrPrivate: "group" | "private" | "both";
  };
};

export type ProfileUpdatePayload = Partial<
  Pick<
    UserProfile,
    "firstName" | "lastName" | "phone" | "city" | "country" | "timezone" | "bio" | "languages" | "subjects"
  >
>;
