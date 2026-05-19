// Tipos generados del esquema de Supabase
// Regenerar con: npx supabase gen types typescript --project-id TU_PROJECT_ID > src/types/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type UserRole = "student" | "teacher" | "translator" | "interpreter" | "admin";
export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
export type ExpressStatus = "pending" | "accepted" | "timeout" | "cancelled";
export type ServiceType = "language_class" | "translation" | "interpretation";
export type PaymentStatus = "pending" | "approved" | "rejected" | "refunded";
export type Modality = "live" | "recorded" | "both";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          first_name: string;
          last_name: string;
          avatar_url: string | null;
          phone: string | null;
          city: string | null;
          country: string | null;
          timezone: string;
          bio: string | null;
          languages: Json;
          is_active: boolean;
          google_calendar_connected: boolean;
          google_calendar_email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      service_categories: {
        Row: {
          id: string;
          name: string;
          type: ServiceType;
          description: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["service_categories"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<Database["public"]["Tables"]["service_categories"]["Insert"]>;
      };
      provider_offerings: {
        Row: {
          id: string;
          provider_id: string;
          category_id: string;
          price_per_hour: number;
          modality: Modality;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["provider_offerings"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<Database["public"]["Tables"]["provider_offerings"]["Insert"]>;
      };
      bookings: {
        Row: {
          id: string;
          student_id: string;
          provider_id: string;
          offering_id: string;
          status: BookingStatus;
          scheduled_at: string;
          duration_min: number;
          price: number;
          currency: string;
          meeting_url: string | null;
          recording_url: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["bookings"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["bookings"]["Insert"]>;
      };
      express_requests: {
        Row: {
          id: string;
          student_id: string;
          category_id: string;
          status: ExpressStatus;
          accepted_by: string | null;
          price_offered: number;
          expires_at: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["express_requests"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["express_requests"]["Insert"]>;
      };
      payments: {
        Row: {
          id: string;
          booking_id: string;
          mp_payment_id: string | null;
          amount: number;
          platform_fee: number;
          provider_amount: number;
          status: PaymentStatus;
          method: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["payments"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["payments"]["Insert"]>;
      };
      reviews: {
        Row: {
          id: string;
          booking_id: string;
          reviewer_id: string;
          reviewed_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["reviews"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["reviews"]["Insert"]>;
      };
      messages: {
        Row: {
          id: string;
          booking_id: string;
          sender_id: string;
          content: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["messages"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["messages"]["Insert"]>;
      };
    };
  };
};
