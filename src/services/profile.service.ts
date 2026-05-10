// Profile service — uses mocks when USE_MOCKS=true (default while backend is not ready).
// To switch to real API: set NEXT_PUBLIC_USE_MOCKS=false in .env.local
// Django endpoint expected: GET/PATCH /api/v1/profile/me/

import type { UserProfile, ProfileUpdatePayload } from "@/types/user.types";
import type { Booking, UpcomingClass } from "@/types/booking.types";
import { CURRENT_USER } from "@/mocks/user.mock";
import { MOCK_BOOKINGS, MOCK_UPCOMING_CLASSES } from "@/mocks/bookings.mock";
import { apiClient } from "./api";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";

// Simulates network latency in mock mode
const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

export const profileService = {
  async getProfile(): Promise<UserProfile> {
    if (USE_MOCKS) {
      await delay();
      return CURRENT_USER;
    }
    return apiClient.get<UserProfile>("/v1/profile/me/");
  },

  async updateProfile(payload: ProfileUpdatePayload): Promise<UserProfile> {
    if (USE_MOCKS) {
      await delay(600);
      return { ...CURRENT_USER, ...payload };
    }
    return apiClient.patch<UserProfile>("/v1/profile/me/", payload);
  },

  async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
    if (USE_MOCKS) {
      await delay(800);
      return { avatarUrl: `https://api.dicebear.com/9.x/avataaars/svg?seed=${Date.now()}` };
    }
    const form = new FormData();
    form.append("avatar", file);
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/profile/avatar/`, {
      method: "POST",
      body: form,
    });
    return response.json();
  },

  async getBookings(): Promise<Booking[]> {
    if (USE_MOCKS) {
      await delay();
      return MOCK_BOOKINGS;
    }
    return apiClient.get<Booking[]>("/v1/bookings/");
  },

  async getUpcomingClasses(): Promise<UpcomingClass[]> {
    if (USE_MOCKS) {
      await delay();
      return MOCK_UPCOMING_CLASSES;
    }
    return apiClient.get<UpcomingClass[]>("/v1/classes/upcoming/");
  },

  async connectGoogleCalendar(): Promise<{ authUrl: string }> {
    if (USE_MOCKS) {
      await delay();
      return { authUrl: "#mock-google-oauth" };
    }
    return apiClient.post<{ authUrl: string }>("/v1/integrations/google-calendar/connect/", {});
  },

  async disconnectGoogleCalendar(): Promise<void> {
    if (USE_MOCKS) {
      await delay();
      return;
    }
    return apiClient.delete("/v1/integrations/google-calendar/disconnect/");
  },

  async changePassword(payload: { currentPassword: string; newPassword: string }): Promise<void> {
    if (USE_MOCKS) {
      await delay(600);
      if (payload.currentPassword === "wrong") throw new Error("Contraseña actual incorrecta.");
      return;
    }
    return apiClient.post("/v1/auth/change-password/", payload);
  },
};
