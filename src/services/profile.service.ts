import { createClient } from "@/lib/supabase/client";
import { mapUserToProfile } from "@/lib/supabase/mappers";
import type { ProfileUpdatePayload, UserProfile } from "@/types/user.types";

export const profileService = {
  async updateProfile(payload: ProfileUpdatePayload): Promise<UserProfile> {
    const supabase = createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) throw new Error("No autenticado");

    const updates: { full_name?: string; phone?: string } = {};

    if (payload.firstName !== undefined || payload.lastName !== undefined) {
      // Obtener el full_name actual para completar la mitad que no cambia
      const { data: current } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", authUser.id)
        .single();

      const parts = (current?.full_name ?? "").split(" ");
      const currentFirst = parts[0] ?? "";
      const currentLast = parts.slice(1).join(" ");
      const first = payload.firstName ?? currentFirst;
      const last = payload.lastName ?? currentLast;
      updates.full_name = `${first} ${last}`.trim();
    }

    if (payload.phone !== undefined) updates.phone = payload.phone;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from("users").update(updates).eq("id", authUser.id);
      if (error) throw new Error(error.message);
    }

    const { data: row, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .single();
    if (fetchError || !row) throw new Error("No se pudo obtener el perfil actualizado");

    return mapUserToProfile(row, authUser);
  },

  async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
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

    await supabase.from("users").update({ avatar_url: urlData.publicUrl }).eq("id", authUser.id);

    return { avatarUrl: urlData.publicUrl };
  },

  async connectGoogleCalendar(): Promise<{ authUrl: string }> {
    throw new Error("Google Calendar — post-MVP");
  },

  async disconnectGoogleCalendar(): Promise<void> {
    throw new Error("Google Calendar — post-MVP");
  },

  async changePassword(payload: {
    currentPassword: string;
    newPassword: string;
  }): Promise<void> {
    // currentPassword no se usa: Supabase valida la sesión activa
    void payload.currentPassword;
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: payload.newPassword,
    });
    if (error) throw new Error(error.message);
  },
};
