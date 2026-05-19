import { createClient } from "@/lib/supabase/client";
import { mapProfileToUser } from "@/lib/supabase/mappers";
import { MOCK_BOOKINGS, MOCK_UPCOMING_CLASSES } from "@/mocks/bookings.mock";
import { CURRENT_USER } from "@/mocks/user.mock";
import type { Booking, UpcomingClass } from "@/types/booking.types";
import type { Database } from "@/types/database.types";
import type { ProfileUpdatePayload, UserProfile } from "@/types/user.types";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

export const profileService = {
  async getProfile(): Promise<UserProfile> {
    if (USE_MOCKS) {
      await delay();
      return CURRENT_USER;
    }
    throw new Error("En modo Supabase, usa createClient() del server directamente en page.tsx");
  },

  async updateProfile(payload: ProfileUpdatePayload): Promise<UserProfile> {
    if (USE_MOCKS) {
      await delay(600);
      return { ...CURRENT_USER, ...payload };
    }

    const supabase = createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) throw new Error("No autenticado");

    const updates: Database["public"]["Tables"]["profiles"]["Update"] = {};
    if (payload.firstName !== undefined) updates.first_name = payload.firstName;
    if (payload.lastName !== undefined) updates.last_name = payload.lastName;
    if (payload.phone !== undefined) updates.phone = payload.phone;
    if (payload.city !== undefined) updates.city = payload.city;
    if (payload.country !== undefined) updates.country = payload.country;
    if (payload.timezone !== undefined) updates.timezone = payload.timezone;
    if (payload.bio !== undefined) updates.bio = payload.bio;
    if (payload.languages !== undefined)
      updates.languages =
        payload.languages as Database["public"]["Tables"]["profiles"]["Update"]["languages"];
    if (payload.preferences !== undefined)
      updates.preferences =
        payload.preferences as Database["public"]["Tables"]["profiles"]["Update"]["preferences"];

    const { error: updateError } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", authUser.id);
    if (updateError) throw new Error(updateError.message);

    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .single();
    if (fetchError || !profile) throw new Error("No se pudo obtener el perfil actualizado");

    return mapProfileToUser(profile, authUser);
  },

  async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
    if (USE_MOCKS) {
      await delay(800);
      return { avatarUrl: `https://api.dicebear.com/9.x/avataaars/svg?seed=${Date.now()}` };
    }

    const supabase = createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) throw new Error("No autenticado");

    const ext = file.name.split(".").at(-1) ?? "jpg";
    const path = `${authUser.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
    if (uploadError) throw new Error(uploadError.message);

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);

    await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("id", authUser.id);

    return { avatarUrl: urlData.publicUrl };
  },

  async getBookings(): Promise<Booking[]> {
    if (USE_MOCKS) {
      await delay();
      return MOCK_BOOKINGS;
    }
    throw new Error("En modo Supabase, usa createClient() del server directamente en page.tsx");
  },

  async getUpcomingClasses(): Promise<UpcomingClass[]> {
    if (USE_MOCKS) {
      await delay();
      return MOCK_UPCOMING_CLASSES;
    }
    throw new Error("En modo Supabase, usa createClient() del server directamente en page.tsx");
  },

  async connectGoogleCalendar(): Promise<{ authUrl: string }> {
    if (USE_MOCKS) {
      await delay();
      return { authUrl: "#mock-google-oauth" };
    }
    throw new Error("Google Calendar: integración pendiente");
  },

  async disconnectGoogleCalendar(): Promise<void> {
    if (USE_MOCKS) {
      await delay();
      return;
    }
    throw new Error("Google Calendar: integración pendiente");
  },

  async changePassword(payload: {
    currentPassword: string;
    newPassword: string;
  }): Promise<void> {
    if (USE_MOCKS) {
      await delay(600);
      if (payload.currentPassword === "wrong") throw new Error("Contraseña actual incorrecta.");
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: payload.newPassword });
    if (error) throw new Error(error.message);
  },
};
