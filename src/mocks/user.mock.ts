import type { UserProfile } from "@/types/user.types";

const BASE_PREFS: UserProfile["preferences"] = {
  notifications: {
    email: true,
    push: true,
    sms: false,
    classReminder: true,
    bookingConfirmation: true,
    weeklyReport: false,
  },
  schedule: {
    preferredDays: ["monday", "wednesday", "friday"],
    preferredTimeSlots: ["morning", "afternoon"],
    sessionDuration: 60,
  },
  learning: {
    goals: ["Trabajo internacional", "Viajes", "Certificación B2"],
    pace: "standard",
    groupOrPrivate: "both",
  },
};

export const MOCK_STUDENT: UserProfile = {
  id: "usr_01",
  firstName: "Valentina",
  lastName: "Restrepo",
  email: "valentina.restrepo@email.com",
  phone: "+54 9 11 4567 8901",
  avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=Valentina",
  role: "student",
  city: "",
  country: "",
  timezone: "America/Bogota",
  bio: "Apasionada por los idiomas. Estudiando inglés avanzado.",
  languages: [
    { code: "es", name: "Español", flag: "🇦🇷", level: "Native" },
    { code: "en", name: "Inglés", flag: "🇺🇸", level: "B2" },
  ],
  joinedAt: "2024-03-15T00:00:00Z",
  isEmailVerified: true,
  isActive: true,
  googleCalendarConnected: false,
  preferences: BASE_PREFS,
};

export const MOCK_TEACHER: UserProfile = {
  id: "usr_02",
  firstName: "Carlos",
  lastName: "Martínez",
  email: "carlos.martinez@yleis.co",
  phone: "+54 9 11 9876 5432",
  avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=Carlos",
  role: "teacher",
  city: "",
  country: "",
  timezone: "America/Bogota",
  bio: "Profesor certificado con 8 años de experiencia en inglés de negocios.",
  languages: [
    { code: "es", name: "Español", flag: "🇦🇷", level: "Native" },
    { code: "en", name: "Inglés", flag: "🇺🇸", level: "C2" },
  ],
  joinedAt: "2023-06-01T00:00:00Z",
  isEmailVerified: true,
  isActive: true,
  googleCalendarConnected: false,
  preferences: BASE_PREFS,
};

export const MOCK_ADMIN: UserProfile = {
  ...MOCK_STUDENT,
  id: "usr_03",
  firstName: "Laura",
  lastName: "Gómez",
  email: "laura.gomez@yleis.co",
  role: "admin",
  avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=Laura",
};

// ✏️ Cambia esta línea para simular el rol en el navegador:
export const CURRENT_USER = MOCK_STUDENT;
// export const CURRENT_USER = MOCK_TEACHER;
// export const CURRENT_USER = MOCK_ADMIN;
