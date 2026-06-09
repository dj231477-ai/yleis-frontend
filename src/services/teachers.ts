import { PLATFORM_FEE } from "@/lib/constants";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

// ── Tipos públicos ─────────────────────────────────────────────────────────────

export type TeacherCard = {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  headline: string | null;
  hourly_rate: number | null;
  rating_avg: number;
  total_reviews: number;
  languages: string[];
};

export type TeacherDetail = TeacherCard & {
  bio: string | null;
  years_experience: number | null;
};

export type PublicReview = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  student_name: string;
  student_avatar: string | null;
};

export type SearchFilters = {
  language?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
};

// ── Funciones públicas ─────────────────────────────────────────────────────────

export async function getVerifiedTeachers(
  supabase: SupabaseClient<Database>,
  filters: SearchFilters = {}
): Promise<TeacherCard[]> {
  // biome-ignore lint/suspicious/noExplicitAny: Supabase typed client does not include all tables
  let query = (supabase as any)
    .from("teachers")
    .select(
      "id, user_id, headline, hourly_rate, rating_avg, total_reviews, languages, users(full_name, avatar_url)"
    )
    .eq("onboarding_step", "verified");

  if (filters.language) query = query.contains("languages", [filters.language]);
  if (filters.minPrice !== undefined) query = query.gte("hourly_rate", filters.minPrice);
  if (filters.maxPrice !== undefined) query = query.lte("hourly_rate", filters.maxPrice);
  if (filters.minRating !== undefined) query = query.gte("rating_avg", filters.minRating);

  const { data } = await query.order("rating_avg", { ascending: false }).limit(60);

  // biome-ignore lint/suspicious/noExplicitAny: Supabase typed client does not include all tables
  return (data ?? []).map((t: any) => ({
    id: t.id,
    user_id: t.user_id,
    full_name: t.users?.full_name ?? "Profesor",
    avatar_url: t.users?.avatar_url ?? null,
    headline: t.headline,
    hourly_rate: t.hourly_rate,
    rating_avg: t.rating_avg ?? 0,
    total_reviews: t.total_reviews ?? 0,
    languages: t.languages ?? [],
  }));
}

export async function getTeacherById(
  supabase: SupabaseClient<Database>,
  teacherId: string
): Promise<TeacherDetail | null> {
  // biome-ignore lint/suspicious/noExplicitAny: Supabase typed client does not include all tables
  const { data } = await (supabase as any)
    .from("teachers")
    .select(
      "id, user_id, headline, bio, hourly_rate, rating_avg, total_reviews, languages, years_experience, users(full_name, avatar_url)"
    )
    .eq("id", teacherId)
    .eq("onboarding_step", "verified")
    .single();

  if (!data) return null;

  return {
    id: data.id,
    user_id: data.user_id,
    full_name: data.users?.full_name ?? "Profesor",
    avatar_url: data.users?.avatar_url ?? null,
    headline: data.headline,
    bio: data.bio,
    hourly_rate: data.hourly_rate,
    rating_avg: data.rating_avg ?? 0,
    total_reviews: data.total_reviews ?? 0,
    languages: data.languages ?? [],
    years_experience: data.years_experience,
  };
}

export async function getTeacherReviews(
  supabase: SupabaseClient<Database>,
  teacherId: string
): Promise<PublicReview[]> {
  // biome-ignore lint/suspicious/noExplicitAny: Supabase typed client does not include all tables
  const { data } = await (supabase as any)
    .from("reviews")
    .select("id, rating, comment, created_at, students(users(full_name, avatar_url))")
    .eq("teacher_id", teacherId)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(5);

  // biome-ignore lint/suspicious/noExplicitAny: Supabase typed client does not include all tables
  return (data ?? []).map((r: any) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    created_at: r.created_at,
    student_name: r.students?.users?.full_name ?? "Estudiante",
    student_avatar: r.students?.users?.avatar_url ?? null,
  }));
}

export type TeacherRow = Database["public"]["Tables"]["teachers"]["Row"];

export type OnboardingPayload = {
  headline: string;
  bio: string;
  hourly_rate: number;
  languages: string[];
};

export type PendingBooking = {
  id: string;
  scheduled_at: string;
  duration_min: number;
  price: number;
  student_name: string;
  student_avatar: string | null;
  subject_name: string;
};

export type UpcomingClass = {
  id: string;
  scheduled_at: string;
  duration_min: number;
  status: "confirmed" | "paid";
  meet_link: string | null;
  student_name: string;
  student_avatar: string | null;
  subject_name: string;
};

export type TeacherDashboardData = {
  full_name: string;
  avatar_url: string | null;
  headline: string | null;
  pending_bookings: PendingBooking[];
  upcoming_classes: UpcomingClass[];
  monthly_earnings_teacher: number;
};

export async function getTeacherProfile(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<TeacherRow | null> {
  const { data } = await supabase.from("teachers").select("*").eq("user_id", userId).single();
  return data;
}

export async function getTeacherDashboard(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<TeacherDashboardData> {
  // 1. Teacher + user info
  const [teacherResult, userResult] = await Promise.all([
    supabase.from("teachers").select("id, headline").eq("user_id", userId).single(),
    supabase.from("users").select("full_name, avatar_url").eq("id", userId).single(),
  ]);

  if (!teacherResult.data) throw new Error("Perfil de profesor no encontrado");
  if (!userResult.data) throw new Error("Usuario no encontrado");

  const teacher = teacherResult.data;
  const user = userResult.data;

  const now = new Date().toISOString();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // 2. Fetch bookings in parallel
  const [pendingResult, upcomingResult, completedResult] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, scheduled_at, duration_min, price, student_id, subject_id")
      .eq("teacher_id", teacher.id)
      .eq("status", "pending")
      .order("scheduled_at", { ascending: true }),
    supabase
      .from("bookings")
      .select("id, scheduled_at, duration_min, status, meet_link, student_id, subject_id")
      .eq("teacher_id", teacher.id)
      .in("status", ["confirmed", "paid"])
      .gte("scheduled_at", now)
      .order("scheduled_at", { ascending: true })
      .limit(5),
    supabase
      .from("bookings")
      .select("price")
      .eq("teacher_id", teacher.id)
      .eq("status", "completed")
      .gte("scheduled_at", startOfMonth.toISOString()),
  ]);

  // 3. Collect unique student and subject IDs
  const allBookings = [...(pendingResult.data ?? []), ...(upcomingResult.data ?? [])];
  const uniqueStudentIds = [...new Set(allBookings.map((b) => b.student_id))];
  const uniqueSubjectIds = [...new Set(allBookings.map((b) => b.subject_id))];

  // 4. Resolve student names and subject names
  const [studentsResult, subjectsResult] = await Promise.all([
    uniqueStudentIds.length > 0
      ? supabase.from("students").select("id, user_id").in("id", uniqueStudentIds)
      : Promise.resolve({ data: [] as Array<{ id: string; user_id: string }> }),
    uniqueSubjectIds.length > 0
      ? supabase.from("subjects").select("id, name").in("id", uniqueSubjectIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
  ]);

  const studentUserIds = (studentsResult.data ?? []).map((s) => s.user_id);
  const { data: studentUsers } =
    studentUserIds.length > 0
      ? await supabase.from("users").select("id, full_name, avatar_url").in("id", studentUserIds)
      : { data: [] as Array<{ id: string; full_name: string; avatar_url: string | null }> };

  // 5. Build lookup maps
  const studentMap = new Map<string, { full_name: string; avatar_url: string | null }>();
  for (const s of studentsResult.data ?? []) {
    const u = (studentUsers ?? []).find((u) => u.id === s.user_id);
    if (u) studentMap.set(s.id, { full_name: u.full_name, avatar_url: u.avatar_url });
  }

  const subjectMap = new Map<string, string>();
  for (const s of subjectsResult.data ?? []) {
    subjectMap.set(s.id, s.name);
  }

  // 6. Calculate earnings
  const gross = (completedResult.data ?? []).reduce((sum, b) => sum + b.price, 0);
  const monthly_earnings_teacher = gross * (1 - PLATFORM_FEE);

  // 7. Assemble
  const pending_bookings: PendingBooking[] = (pendingResult.data ?? []).map((b) => ({
    id: b.id,
    scheduled_at: b.scheduled_at,
    duration_min: b.duration_min,
    price: b.price,
    student_name: studentMap.get(b.student_id)?.full_name ?? "Alumno",
    student_avatar: studentMap.get(b.student_id)?.avatar_url ?? null,
    subject_name: subjectMap.get(b.subject_id) ?? "—",
  }));

  const upcoming_classes: UpcomingClass[] = (upcomingResult.data ?? []).map((b) => ({
    id: b.id,
    scheduled_at: b.scheduled_at,
    duration_min: b.duration_min,
    status: b.status as "confirmed" | "paid",
    meet_link: b.meet_link,
    student_name: studentMap.get(b.student_id)?.full_name ?? "Alumno",
    student_avatar: studentMap.get(b.student_id)?.avatar_url ?? null,
    subject_name: subjectMap.get(b.subject_id) ?? "—",
  }));

  return {
    full_name: user.full_name,
    avatar_url: user.avatar_url,
    headline: teacher.headline,
    pending_bookings,
    upcoming_classes,
    monthly_earnings_teacher,
  };
}

export async function submitOnboarding(
  supabase: SupabaseClient<Database>,
  userId: string,
  payload: OnboardingPayload
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("teachers")
    .update({
      headline: payload.headline,
      bio: payload.bio,
      hourly_rate: payload.hourly_rate,
      languages: payload.languages,
      onboarding_step: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  if (error) return { error: error.message };
  return { error: null };
}

export async function uploadTeacherDocument(
  supabase: SupabaseClient<Database>,
  userId: string,
  file: File
): Promise<{ error: string | null }> {
  const safeName = file.name
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 60);
  const path = `${userId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("teacher-docs")
    .upload(path, file, { upsert: false });
  if (uploadError) return { error: uploadError.message };

  // Guardar la URL en documents_urls para que el admin la vea
  const { data: urlData } = supabase.storage.from("teacher-docs").getPublicUrl(path);
  const { data: current } = await supabase
    .from("teachers")
    .select("documents_urls")
    .eq("user_id", userId)
    .single();

  const currentUrls = Array.isArray(current?.documents_urls)
    ? (current.documents_urls as string[])
    : [];
  await supabase
    .from("teachers")
    .update({ documents_urls: [...currentUrls, urlData.publicUrl] })
    .eq("user_id", userId);

  return { error: null };
}
