import type { UserProfile } from "@/types/user.types";

const BASE_PREFS: UserProfile["preferences"] = {
  notifications: {
    email: true, push: true, sms: false,
    classReminder: true, bookingConfirmation: true, weeklyReport: false,
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

// --- Estudiante ---
export const MOCK_STUDENT: UserProfile = {
  id: "usr_01",
  firstName: "Valentina",
  lastName: "Restrepo",
  email: "valentina.restrepo@email.com",
  phone: "+57 310 456 7890",
  avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=Valentina",
  role: "student",
  serviceType: "classes",
  city: "Medellín",
  country: "Colombia",
  timezone: "America/Bogota",
  bio: "Apasionada por los idiomas. Estudiando inglés avanzado y francés para oportunidades internacionales.",
  languages: [
    { code: "es", name: "Español", flag: "🇨🇴", level: "Native" },
    { code: "en", name: "Inglés",  flag: "🇺🇸", level: "B2" },
    { code: "fr", name: "Francés", flag: "🇫🇷", level: "A2" },
  ],
  subjects: ["Business English", "Conversación", "Gramática"],
  joinedAt: "2024-03-15T00:00:00Z",
  isEmailVerified: true,
  isActive: true,
  googleCalendarConnected: true,
  googleCalendarEmail: "valentina.restrepo@gmail.com",
  preferences: BASE_PREFS,
};

// --- Docente ---
export const MOCK_TEACHER: UserProfile = {
  id: "usr_02",
  firstName: "Carlos",
  lastName: "Martínez",
  email: "carlos.martinez@yleis.com",
  phone: "+57 315 789 0123",
  avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=Carlos",
  role: "teacher",
  serviceType: "classes",
  city: "Bogotá",
  country: "Colombia",
  timezone: "America/Bogota",
  bio: "Profesor certificado con 8 años de experiencia en inglés de negocios y preparación IELTS/TOEFL.",
  languages: [
    { code: "es", name: "Español",   flag: "🇨🇴", level: "Native" },
    { code: "en", name: "Inglés",    flag: "🇺🇸", level: "C2" },
    { code: "pt", name: "Portugués", flag: "🇧🇷", level: "B1" },
  ],
  subjects: ["Business English", "IELTS", "TOEFL", "Inglés General"],
  joinedAt: "2023-06-01T00:00:00Z",
  isEmailVerified: true,
  isActive: true,
  googleCalendarConnected: false,
  preferences: BASE_PREFS,
};

// --- Traductor ---
export const MOCK_TRANSLATOR: UserProfile = {
  id: "usr_03",
  firstName: "Sofía",
  lastName: "Mendoza",
  email: "sofia.mendoza@yleis.com",
  phone: "+57 321 654 9870",
  avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=Sofia",
  role: "translator",
  serviceType: "translation",
  city: "Cali",
  country: "Colombia",
  timezone: "America/Bogota",
  bio: "Traductora certificada especializada en documentos legales, médicos y técnicos. 6 años de experiencia.",
  languages: [
    { code: "es", name: "Español", flag: "🇨🇴", level: "Native" },
    { code: "en", name: "Inglés",  flag: "🇺🇸", level: "C1" },
    { code: "fr", name: "Francés", flag: "🇫🇷", level: "B2" },
  ],
  specializations: ["Legal", "Médico", "Técnico", "Financiero"],
  languagePairs: [
    { source: { code: "en", name: "Inglés", flag: "🇺🇸" }, target: { code: "es", name: "Español", flag: "🇨🇴" } },
    { source: { code: "fr", name: "Francés", flag: "🇫🇷" }, target: { code: "es", name: "Español", flag: "🇨🇴" } },
  ],
  joinedAt: "2023-09-10T00:00:00Z",
  isEmailVerified: true,
  isActive: true,
  googleCalendarConnected: true,
  googleCalendarEmail: "sofia.mendoza@gmail.com",
  preferences: BASE_PREFS,
};

// --- Intérprete ---
export const MOCK_INTERPRETER: UserProfile = {
  id: "usr_04",
  firstName: "Diego",
  lastName: "Vargas",
  email: "diego.vargas@yleis.com",
  phone: "+57 300 111 2233",
  avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=Diego",
  role: "interpreter",
  serviceType: "interpretation",
  city: "Barranquilla",
  country: "Colombia",
  timezone: "America/Bogota",
  bio: "Intérprete simultáneo y consecutivo con experiencia en conferencias internacionales y eventos corporativos.",
  languages: [
    { code: "es", name: "Español", flag: "🇨🇴", level: "Native" },
    { code: "en", name: "Inglés",  flag: "🇺🇸", level: "C2" },
    { code: "de", name: "Alemán",  flag: "🇩🇪", level: "C1" },
  ],
  specializations: ["Conferencias", "Legal", "Corporativo", "Diplomático"],
  joinedAt: "2024-01-20T00:00:00Z",
  isEmailVerified: true,
  isActive: true,
  googleCalendarConnected: false,
  preferences: BASE_PREFS,
};

// --- Admin ---
export const MOCK_ADMIN: UserProfile = {
  ...MOCK_STUDENT,
  id: "usr_05",
  firstName: "Laura",
  lastName: "Gómez",
  email: "laura.gomez@yleis.com",
  role: "admin",
  city: "Bogotá",
  avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=Laura",
};

// ✏️  Cambia esta línea para simular el rol en el navegador:
export const CURRENT_USER = MOCK_STUDENT;
// export const CURRENT_USER = MOCK_TEACHER;
// export const CURRENT_USER = MOCK_TRANSLATOR;
// export const CURRENT_USER = MOCK_INTERPRETER;
// export const CURRENT_USER = MOCK_ADMIN;
