// Tipos del esquema de Supabase
// Regenerar con: npx supabase gen types typescript --project-id rrqoizdeoqzawqiuhlns > src/types/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: "student" | "teacher" | "translator" | "interpreter" | "admin";
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
          preferences: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: "student" | "teacher" | "translator" | "interpreter" | "admin";
          first_name: string;
          last_name: string;
          avatar_url?: string | null;
          phone?: string | null;
          city?: string | null;
          country?: string | null;
          timezone?: string;
          bio?: string | null;
          languages?: Json;
          is_active?: boolean;
          google_calendar_connected?: boolean;
          google_calendar_email?: string | null;
          preferences?: Json | null;
        };
        Update: {
          id?: string;
          role?: "student" | "teacher" | "translator" | "interpreter" | "admin";
          first_name?: string;
          last_name?: string;
          avatar_url?: string | null;
          phone?: string | null;
          city?: string | null;
          country?: string | null;
          timezone?: string;
          bio?: string | null;
          languages?: Json;
          is_active?: boolean;
          google_calendar_connected?: boolean;
          google_calendar_email?: string | null;
          preferences?: Json | null;
        };
        Relationships: [];
      };
      service_categories: {
        Row: {
          id: string;
          name: string;
          type: "language_class" | "translation" | "interpretation";
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: "language_class" | "translation" | "interpretation";
          description?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          type?: "language_class" | "translation" | "interpretation";
          description?: string | null;
        };
        Relationships: [];
      };
      provider_offerings: {
        Row: {
          id: string;
          provider_id: string;
          category_id: string;
          price_per_hour: number;
          modality: "live" | "recorded" | "both";
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          category_id: string;
          price_per_hour: number;
          modality?: "live" | "recorded" | "both";
          is_active?: boolean;
        };
        Update: {
          id?: string;
          provider_id?: string;
          category_id?: string;
          price_per_hour?: number;
          modality?: "live" | "recorded" | "both";
          is_active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "provider_offerings_provider_id_fkey";
            columns: ["provider_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "provider_offerings_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "service_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      bookings: {
        Row: {
          id: string;
          student_id: string;
          provider_id: string;
          offering_id: string;
          status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
          scheduled_at: string;
          duration_min: number;
          price: number;
          currency: string;
          meeting_url: string | null;
          recording_url: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          provider_id: string;
          offering_id: string;
          status?: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
          scheduled_at: string;
          duration_min?: number;
          price: number;
          currency?: string;
          meeting_url?: string | null;
          recording_url?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          student_id?: string;
          provider_id?: string;
          offering_id?: string;
          status?: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
          scheduled_at?: string;
          duration_min?: number;
          price?: number;
          currency?: string;
          meeting_url?: string | null;
          recording_url?: string | null;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_student_id_fkey";
            columns: ["student_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_provider_id_fkey";
            columns: ["provider_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_offering_id_fkey";
            columns: ["offering_id"];
            referencedRelation: "provider_offerings";
            referencedColumns: ["id"];
          },
        ];
      };
      express_requests: {
        Row: {
          id: string;
          student_id: string;
          category_id: string;
          status: "pending" | "accepted" | "timeout" | "cancelled";
          accepted_by: string | null;
          price_offered: number;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          category_id: string;
          status?: "pending" | "accepted" | "timeout" | "cancelled";
          accepted_by?: string | null;
          price_offered: number;
          expires_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          category_id?: string;
          status?: "pending" | "accepted" | "timeout" | "cancelled";
          accepted_by?: string | null;
          price_offered?: number;
          expires_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "express_requests_student_id_fkey";
            columns: ["student_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "express_requests_accepted_by_fkey";
            columns: ["accepted_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          booking_id: string;
          mp_payment_id: string | null;
          amount: number;
          platform_fee: number;
          provider_amount: number;
          status: "pending" | "approved" | "rejected" | "refunded";
          method: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          mp_payment_id?: string | null;
          amount: number;
          platform_fee: number;
          provider_amount: number;
          status?: "pending" | "approved" | "rejected" | "refunded";
          method?: string | null;
        };
        Update: {
          id?: string;
          booking_id?: string;
          mp_payment_id?: string | null;
          amount?: number;
          platform_fee?: number;
          provider_amount?: number;
          status?: "pending" | "approved" | "rejected" | "refunded";
          method?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey";
            columns: ["booking_id"];
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
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
        Insert: {
          id?: string;
          booking_id: string;
          reviewer_id: string;
          reviewed_id: string;
          rating: number;
          comment?: string | null;
        };
        Update: {
          id?: string;
          booking_id?: string;
          reviewer_id?: string;
          reviewed_id?: string;
          rating?: number;
          comment?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey";
            columns: ["booking_id"];
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey";
            columns: ["reviewer_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_reviewed_id_fkey";
            columns: ["reviewed_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
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
        Insert: {
          id?: string;
          booking_id: string;
          sender_id: string;
          content: string;
          read_at?: string | null;
        };
        Update: {
          id?: string;
          booking_id?: string;
          sender_id?: string;
          content?: string;
          read_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "messages_booking_id_fkey";
            columns: ["booking_id"];
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: "student" | "teacher" | "translator" | "interpreter" | "admin";
      booking_status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
      express_status: "pending" | "accepted" | "timeout" | "cancelled";
      service_type: "language_class" | "translation" | "interpretation";
      payment_status: "pending" | "approved" | "rejected" | "refunded";
      modality: "live" | "recorded" | "both";
    };
    CompositeTypes: Record<string, never>;
  };
};

export type UserRole = Database["public"]["Enums"]["user_role"];
export type BookingStatus = Database["public"]["Enums"]["booking_status"];
export type ExpressStatus = Database["public"]["Enums"]["express_status"];
export type ServiceType = Database["public"]["Enums"]["service_type"];
export type PaymentStatus = Database["public"]["Enums"]["payment_status"];
export type Modality = Database["public"]["Enums"]["modality"];
