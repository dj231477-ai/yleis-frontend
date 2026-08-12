export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      admin_tasks: {
        Row: {
          created_at: string;
          data: Json;
          description: string;
          id: string;
          resolved_at: string | null;
          status: string;
          type: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          data?: Json;
          description: string;
          id?: string;
          resolved_at?: string | null;
          status?: string;
          type: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          data?: Json;
          description?: string;
          id?: string;
          resolved_at?: string | null;
          status?: string;
          type?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      bookings: {
        Row: {
          auto_assign: boolean;
          auto_assign_excluded_teacher_ids: string[];
          cancellation_reason: string | null;
          confirmation_code: string | null;
          created_at: string;
          duration_min: number;
          hours_charged: number | null;
          id: string;
          meet_link: string | null;
          membership_id: string | null;
          modality: string;
          notes: string | null;
          price: number;
          recipient_age: number | null;
          recipient_first_name: string | null;
          recipient_last_name: string | null;
          recipient_relationship: string | null;
          recipient_type: string;
          reminder_1h_sent: boolean;
          reminder_24h_sent: boolean;
          scheduled_at: string;
          scheduled_end_at: string;
          status: string;
          student_id: string;
          subject_id: string;
          teacher_id: string;
          updated_at: string;
        };
        Insert: {
          auto_assign?: boolean;
          auto_assign_excluded_teacher_ids?: string[];
          cancellation_reason?: string | null;
          confirmation_code?: string | null;
          created_at?: string;
          duration_min: number;
          hours_charged?: number | null;
          id?: string;
          meet_link?: string | null;
          membership_id?: string | null;
          modality?: string;
          notes?: string | null;
          price: number;
          recipient_age?: number | null;
          recipient_first_name?: string | null;
          recipient_last_name?: string | null;
          recipient_relationship?: string | null;
          recipient_type?: string;
          reminder_1h_sent?: boolean;
          reminder_24h_sent?: boolean;
          scheduled_at: string;
          scheduled_end_at: string;
          status?: string;
          student_id: string;
          subject_id: string;
          teacher_id: string;
          updated_at?: string;
        };
        Update: {
          auto_assign?: boolean;
          auto_assign_excluded_teacher_ids?: string[];
          cancellation_reason?: string | null;
          confirmation_code?: string | null;
          created_at?: string;
          duration_min?: number;
          hours_charged?: number | null;
          id?: string;
          meet_link?: string | null;
          membership_id?: string | null;
          modality?: string;
          notes?: string | null;
          price?: number;
          recipient_age?: number | null;
          recipient_first_name?: string | null;
          recipient_last_name?: string | null;
          recipient_relationship?: string | null;
          recipient_type?: string;
          reminder_1h_sent?: boolean;
          reminder_24h_sent?: boolean;
          scheduled_at?: string;
          scheduled_end_at?: string;
          status?: string;
          student_id?: string;
          subject_id?: string;
          teacher_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_membership_id_fkey";
            columns: ["membership_id"];
            isOneToOne: false;
            referencedRelation: "memberships";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "teacher_dashboard_summary";
            referencedColumns: ["teacher_id"];
          },
          {
            foreignKeyName: "bookings_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "teacher_public_catalog";
            referencedColumns: ["teacher_id"];
          },
          {
            foreignKeyName: "bookings_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "teacher_public_profile";
            referencedColumns: ["teacher_id"];
          },
          {
            foreignKeyName: "bookings_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "teachers";
            referencedColumns: ["id"];
          },
        ];
      };
      conversation_participants: {
        Row: {
          conversation_id: string;
          created_at: string;
          id: string;
          user_id: string;
        };
        Insert: {
          conversation_id: string;
          created_at?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          conversation_id?: string;
          created_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "teacher_public_catalog";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "teacher_public_profile";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          booking_id: string | null;
          created_at: string;
          id: string;
          updated_at: string;
        };
        Insert: {
          booking_id?: string | null;
          created_at?: string;
          id?: string;
          updated_at?: string;
        };
        Update: {
          booking_id?: string | null;
          created_at?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "teacher_pending_bookings";
            referencedColumns: ["booking_id"];
          },
        ];
      };
      custom_hours_grants: {
        Row: {
          category: string;
          created_at: string;
          expires_at: string;
          hours: number;
          id: string;
          mp_payment_id: string;
          price_cop: number;
          student_user_id: string;
          token: string;
          used: boolean;
        };
        Insert: {
          category: string;
          created_at?: string;
          expires_at?: string;
          hours: number;
          id?: string;
          mp_payment_id: string;
          price_cop: number;
          student_user_id: string;
          token?: string;
          used?: boolean;
        };
        Update: {
          category?: string;
          created_at?: string;
          expires_at?: string;
          hours?: number;
          id?: string;
          mp_payment_id?: string;
          price_cop?: number;
          student_user_id?: string;
          token?: string;
          used?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "custom_hours_grants_student_user_id_fkey";
            columns: ["student_user_id"];
            isOneToOne: false;
            referencedRelation: "teacher_public_catalog";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "custom_hours_grants_student_user_id_fkey";
            columns: ["student_user_id"];
            isOneToOne: false;
            referencedRelation: "teacher_public_profile";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "custom_hours_grants_student_user_id_fkey";
            columns: ["student_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      express_sessions: {
        Row: {
          created_at: string;
          description: string | null;
          duration_min: number | null;
          ended_at: string | null;
          expires_at: string | null;
          id: string;
          meet_link: string | null;
          modality: string;
          price: number | null;
          price_max: number | null;
          price_min: number | null;
          started_at: string | null;
          status: string;
          student_id: string;
          subject_id: string | null;
          teacher_id: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          duration_min?: number | null;
          ended_at?: string | null;
          expires_at?: string | null;
          id?: string;
          meet_link?: string | null;
          modality?: string;
          price?: number | null;
          price_max?: number | null;
          price_min?: number | null;
          started_at?: string | null;
          status?: string;
          student_id: string;
          subject_id?: string | null;
          teacher_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          duration_min?: number | null;
          ended_at?: string | null;
          expires_at?: string | null;
          id?: string;
          meet_link?: string | null;
          modality?: string;
          price?: number | null;
          price_max?: number | null;
          price_min?: number | null;
          started_at?: string | null;
          status?: string;
          student_id?: string;
          subject_id?: string | null;
          teacher_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "express_sessions_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "express_sessions_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "express_sessions_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "teacher_dashboard_summary";
            referencedColumns: ["teacher_id"];
          },
          {
            foreignKeyName: "express_sessions_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "teacher_public_catalog";
            referencedColumns: ["teacher_id"];
          },
          {
            foreignKeyName: "express_sessions_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "teacher_public_profile";
            referencedColumns: ["teacher_id"];
          },
          {
            foreignKeyName: "express_sessions_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "teachers";
            referencedColumns: ["id"];
          },
        ];
      };
      membership_activation_grants: {
        Row: {
          created_at: string;
          expires_at: string;
          id: string;
          mp_payment_id: string;
          plan_slug: string;
          student_user_id: string;
          token: string;
          used: boolean;
        };
        Insert: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          mp_payment_id: string;
          plan_slug: string;
          student_user_id: string;
          token?: string;
          used?: boolean;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          mp_payment_id?: string;
          plan_slug?: string;
          student_user_id?: string;
          token?: string;
          used?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "membership_activation_grants_student_user_id_fkey";
            columns: ["student_user_id"];
            isOneToOne: false;
            referencedRelation: "teacher_public_catalog";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "membership_activation_grants_student_user_id_fkey";
            columns: ["student_user_id"];
            isOneToOne: false;
            referencedRelation: "teacher_public_profile";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "membership_activation_grants_student_user_id_fkey";
            columns: ["student_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      membership_plans: {
        Row: {
          category: string | null;
          classes_per_month: number | null;
          created_at: string;
          currency: string;
          discount_pct: number | null;
          express_discount: number;
          free_express_per_month: number;
          hours_included: number;
          id: string;
          is_active: boolean;
          name: string;
          price: number;
          reschedules_per_month: number;
          rollover_classes: number;
          slug: string | null;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          category?: string | null;
          classes_per_month?: number | null;
          created_at?: string;
          currency?: string;
          discount_pct?: number | null;
          express_discount?: number;
          free_express_per_month?: number;
          hours_included?: number;
          id?: string;
          is_active?: boolean;
          name: string;
          price: number;
          reschedules_per_month?: number;
          rollover_classes?: number;
          slug?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          category?: string | null;
          classes_per_month?: number | null;
          created_at?: string;
          currency?: string;
          discount_pct?: number | null;
          express_discount?: number;
          free_express_per_month?: number;
          hours_included?: number;
          id?: string;
          is_active?: boolean;
          name?: string;
          price?: number;
          reschedules_per_month?: number;
          rollover_classes?: number;
          slug?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      memberships: {
        Row: {
          created_at: string;
          expires_at: string | null;
          id: string;
          mp_payment_id: string | null;
          plan_id: string;
          remaining_classes: number;
          remaining_free_express: number;
          remaining_hours: number;
          remaining_reschedules: number;
          renewed_at: string | null;
          started_at: string | null;
          status: string;
          student_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          mp_payment_id?: string | null;
          plan_id: string;
          remaining_classes?: number;
          remaining_free_express?: number;
          remaining_hours?: number;
          remaining_reschedules?: number;
          renewed_at?: string | null;
          started_at?: string | null;
          status?: string;
          student_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          mp_payment_id?: string | null;
          plan_id?: string;
          remaining_classes?: number;
          remaining_free_express?: number;
          remaining_hours?: number;
          remaining_reschedules?: number;
          renewed_at?: string | null;
          started_at?: string | null;
          status?: string;
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "memberships_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "membership_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "memberships_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          body: string;
          conversation_id: string;
          created_at: string;
          id: string;
          is_read: boolean;
          sender_id: string;
          updated_at: string;
        };
        Insert: {
          body: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          is_read?: boolean;
          sender_id: string;
          updated_at?: string;
        };
        Update: {
          body?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          is_read?: boolean;
          sender_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "teacher_public_catalog";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "teacher_public_profile";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      mp_webhook_logs: {
        Row: {
          action: string;
          created_at: string;
          id: string;
          mp_event_id: string;
          payload: Json;
          processed_at: string;
          status: number;
        };
        Insert: {
          action: string;
          created_at?: string;
          id?: string;
          mp_event_id: string;
          payload: Json;
          processed_at?: string;
          status: number;
        };
        Update: {
          action?: string;
          created_at?: string;
          id?: string;
          mp_event_id?: string;
          payload?: Json;
          processed_at?: string;
          status?: number;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          body: string;
          created_at: string;
          data: Json;
          id: string;
          is_read: boolean;
          title: string;
          type: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          data?: Json;
          id?: string;
          is_read?: boolean;
          title: string;
          type: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          data?: Json;
          id?: string;
          is_read?: boolean;
          title?: string;
          type?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "teacher_public_catalog";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "teacher_public_profile";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount: number;
          booking_id: string | null;
          created_at: string;
          currency: string;
          express_session_id: string | null;
          id: string;
          mp_payment_id: string | null;
          mp_preference_id: string | null;
          payment_method: string | null;
          platform_fee: number | null;
          refund_amount: number | null;
          status: string;
          student_id: string;
          teacher_payout: number | null;
          updated_at: string;
        };
        Insert: {
          amount: number;
          booking_id?: string | null;
          created_at?: string;
          currency?: string;
          express_session_id?: string | null;
          id?: string;
          mp_payment_id?: string | null;
          mp_preference_id?: string | null;
          payment_method?: string | null;
          platform_fee?: number | null;
          refund_amount?: number | null;
          status?: string;
          student_id: string;
          teacher_payout?: number | null;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          booking_id?: string | null;
          created_at?: string;
          currency?: string;
          express_session_id?: string | null;
          id?: string;
          mp_payment_id?: string | null;
          mp_preference_id?: string | null;
          payment_method?: string | null;
          platform_fee?: number | null;
          refund_amount?: number | null;
          status?: string;
          student_id?: string;
          teacher_payout?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "teacher_pending_bookings";
            referencedColumns: ["booking_id"];
          },
          {
            foreignKeyName: "payments_express_session_id_fkey";
            columns: ["express_session_id"];
            isOneToOne: false;
            referencedRelation: "express_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          booking_id: string;
          comment: string | null;
          created_at: string;
          id: string;
          is_public: boolean;
          rating: number;
          student_id: string;
          teacher_id: string;
          updated_at: string;
        };
        Insert: {
          booking_id: string;
          comment?: string | null;
          created_at?: string;
          id?: string;
          is_public?: boolean;
          rating: number;
          student_id: string;
          teacher_id: string;
          updated_at?: string;
        };
        Update: {
          booking_id?: string;
          comment?: string | null;
          created_at?: string;
          id?: string;
          is_public?: boolean;
          rating?: number;
          student_id?: string;
          teacher_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: true;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: true;
            referencedRelation: "teacher_pending_bookings";
            referencedColumns: ["booking_id"];
          },
          {
            foreignKeyName: "reviews_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "teacher_dashboard_summary";
            referencedColumns: ["teacher_id"];
          },
          {
            foreignKeyName: "reviews_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "teacher_public_catalog";
            referencedColumns: ["teacher_id"];
          },
          {
            foreignKeyName: "reviews_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "teacher_public_profile";
            referencedColumns: ["teacher_id"];
          },
          {
            foreignKeyName: "reviews_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "teachers";
            referencedColumns: ["id"];
          },
        ];
      };
      sessions: {
        Row: {
          booking_id: string;
          created_at: string;
          ended_at: string | null;
          id: string;
          started_at: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          booking_id: string;
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          started_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          booking_id?: string;
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          started_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: true;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sessions_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: true;
            referencedRelation: "teacher_pending_bookings";
            referencedColumns: ["booking_id"];
          },
        ];
      };
      students: {
        Row: {
          created_at: string;
          id: string;
          learning_goals: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          learning_goals?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          learning_goals?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "students_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "teacher_public_catalog";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "students_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "teacher_public_profile";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "students_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      subjects: {
        Row: {
          category: string | null;
          created_at: string;
          icon_url: string | null;
          id: string;
          is_active: boolean;
          name: string;
          updated_at: string;
        };
        Insert: {
          category?: string | null;
          created_at?: string;
          icon_url?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          updated_at?: string;
        };
        Update: {
          category?: string | null;
          created_at?: string;
          icon_url?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      teacher_availabilities: {
        Row: {
          created_at: string;
          day_of_week: number;
          end_time: string;
          id: string;
          is_active: boolean;
          start_time: string;
          teacher_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          day_of_week: number;
          end_time: string;
          id?: string;
          is_active?: boolean;
          start_time: string;
          teacher_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          day_of_week?: number;
          end_time?: string;
          id?: string;
          is_active?: boolean;
          start_time?: string;
          teacher_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "teacher_availabilities_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "teacher_dashboard_summary";
            referencedColumns: ["teacher_id"];
          },
          {
            foreignKeyName: "teacher_availabilities_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "teacher_public_catalog";
            referencedColumns: ["teacher_id"];
          },
          {
            foreignKeyName: "teacher_availabilities_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "teacher_public_profile";
            referencedColumns: ["teacher_id"];
          },
          {
            foreignKeyName: "teacher_availabilities_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "teachers";
            referencedColumns: ["id"];
          },
        ];
      };
      teacher_calendar_connections: {
        Row: {
          access_token: string | null;
          created_at: string;
          google_email: string;
          id: string;
          refresh_token: string;
          teacher_id: string;
          token_expires_at: string | null;
          updated_at: string;
        };
        Insert: {
          access_token?: string | null;
          created_at?: string;
          google_email: string;
          id?: string;
          refresh_token: string;
          teacher_id: string;
          token_expires_at?: string | null;
          updated_at?: string;
        };
        Update: {
          access_token?: string | null;
          created_at?: string;
          google_email?: string;
          id?: string;
          refresh_token?: string;
          teacher_id?: string;
          token_expires_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "teacher_calendar_connections_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: true;
            referencedRelation: "teacher_dashboard_summary";
            referencedColumns: ["teacher_id"];
          },
          {
            foreignKeyName: "teacher_calendar_connections_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: true;
            referencedRelation: "teacher_public_catalog";
            referencedColumns: ["teacher_id"];
          },
          {
            foreignKeyName: "teacher_calendar_connections_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: true;
            referencedRelation: "teacher_public_profile";
            referencedColumns: ["teacher_id"];
          },
          {
            foreignKeyName: "teacher_calendar_connections_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: true;
            referencedRelation: "teachers";
            referencedColumns: ["id"];
          },
        ];
      };
      teacher_status: {
        Row: {
          created_at: string;
          id: string;
          last_seen: string;
          status: string;
          teacher_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          last_seen?: string;
          status?: string;
          teacher_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          last_seen?: string;
          status?: string;
          teacher_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "teacher_status_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: true;
            referencedRelation: "teacher_dashboard_summary";
            referencedColumns: ["teacher_id"];
          },
          {
            foreignKeyName: "teacher_status_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: true;
            referencedRelation: "teacher_public_catalog";
            referencedColumns: ["teacher_id"];
          },
          {
            foreignKeyName: "teacher_status_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: true;
            referencedRelation: "teacher_public_profile";
            referencedColumns: ["teacher_id"];
          },
          {
            foreignKeyName: "teacher_status_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: true;
            referencedRelation: "teachers";
            referencedColumns: ["id"];
          },
        ];
      };
      teacher_subjects: {
        Row: {
          created_at: string;
          id: string;
          subject_id: string;
          teacher_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          subject_id: string;
          teacher_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          subject_id?: string;
          teacher_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "teacher_subjects_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "teacher_subjects_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "teacher_dashboard_summary";
            referencedColumns: ["teacher_id"];
          },
          {
            foreignKeyName: "teacher_subjects_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "teacher_public_catalog";
            referencedColumns: ["teacher_id"];
          },
          {
            foreignKeyName: "teacher_subjects_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "teacher_public_profile";
            referencedColumns: ["teacher_id"];
          },
          {
            foreignKeyName: "teacher_subjects_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "teachers";
            referencedColumns: ["id"];
          },
        ];
      };
      teachers: {
        Row: {
          bio: string | null;
          certifications: Json;
          created_at: string;
          currency: string;
          documents_urls: Json;
          google_calendar_connected: boolean;
          google_calendar_email: string | null;
          headline: string | null;
          hourly_rate: number | null;
          id: string;
          languages: string[];
          onboarding_step: string;
          rating_avg: number;
          rejection_reason: string | null;
          status: string;
          submitted_at: string | null;
          title: string | null;
          total_hours_taught: number;
          total_reviews: number;
          updated_at: string;
          user_id: string;
          verification_notes: string | null;
          verification_score: number | null;
          verified_at: string | null;
          video_intro_url: string | null;
          years_experience: number | null;
        };
        Insert: {
          bio?: string | null;
          certifications?: Json;
          created_at?: string;
          currency?: string;
          documents_urls?: Json;
          google_calendar_connected?: boolean;
          google_calendar_email?: string | null;
          headline?: string | null;
          hourly_rate?: number | null;
          id?: string;
          languages?: string[];
          onboarding_step?: string;
          rating_avg?: number;
          rejection_reason?: string | null;
          status?: string;
          submitted_at?: string | null;
          title?: string | null;
          total_hours_taught?: number;
          total_reviews?: number;
          updated_at?: string;
          user_id: string;
          verification_notes?: string | null;
          verification_score?: number | null;
          verified_at?: string | null;
          video_intro_url?: string | null;
          years_experience?: number | null;
        };
        Update: {
          bio?: string | null;
          certifications?: Json;
          created_at?: string;
          currency?: string;
          documents_urls?: Json;
          google_calendar_connected?: boolean;
          google_calendar_email?: string | null;
          headline?: string | null;
          hourly_rate?: number | null;
          id?: string;
          languages?: string[];
          onboarding_step?: string;
          rating_avg?: number;
          rejection_reason?: string | null;
          status?: string;
          submitted_at?: string | null;
          title?: string | null;
          total_hours_taught?: number;
          total_reviews?: number;
          updated_at?: string;
          user_id?: string;
          verification_notes?: string | null;
          verification_score?: number | null;
          verified_at?: string | null;
          video_intro_url?: string | null;
          years_experience?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "teachers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "teacher_public_catalog";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "teachers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "teacher_public_profile";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "teachers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          phone: string | null;
          role: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          full_name?: string;
          id: string;
          phone?: string | null;
          role?: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          phone?: string | null;
          role?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      teacher_dashboard_summary: {
        Row: {
          classes_this_week: number | null;
          earnings_this_month: number | null;
          pending_confirmations: number | null;
          rating_avg: number | null;
          teacher_id: string | null;
          total_reviews: number | null;
        };
        Insert: {
          classes_this_week?: never;
          earnings_this_month?: never;
          pending_confirmations?: never;
          rating_avg?: number | null;
          teacher_id?: string | null;
          total_reviews?: number | null;
        };
        Update: {
          classes_this_week?: never;
          earnings_this_month?: never;
          pending_confirmations?: never;
          rating_avg?: number | null;
          teacher_id?: string | null;
          total_reviews?: number | null;
        };
        Relationships: [];
      };
      teacher_earnings_detail: {
        Row: {
          amount: number | null;
          class_date: string | null;
          created_at: string | null;
          currency: string | null;
          payment_id: string | null;
          platform_fee: number | null;
          status: string | null;
          student_name: string | null;
          subject_name: string | null;
          teacher_payout: number | null;
        };
        Relationships: [];
      };
      teacher_pending_bookings: {
        Row: {
          booking_id: string | null;
          created_at: string | null;
          duration_min: number | null;
          price: number | null;
          scheduled_at: string | null;
          student_avatar: string | null;
          student_name: string | null;
          subject_name: string | null;
        };
        Relationships: [];
      };
      teacher_public_catalog: {
        Row: {
          avatar_url: string | null;
          currency: string | null;
          full_name: string | null;
          headline: string | null;
          hourly_rate: number | null;
          is_verified: boolean | null;
          languages: string[] | null;
          rating_avg: number | null;
          subjects: Json | null;
          teacher_id: string | null;
          total_reviews: number | null;
          user_id: string | null;
        };
        Relationships: [];
      };
      teacher_public_profile: {
        Row: {
          availability: Json | null;
          avatar_url: string | null;
          bio: string | null;
          currency: string | null;
          full_name: string | null;
          headline: string | null;
          hourly_rate: number | null;
          languages: string[] | null;
          rating_avg: number | null;
          recent_reviews: Json | null;
          subjects: Json | null;
          teacher_id: string | null;
          total_hours_taught: number | null;
          total_reviews: number | null;
          user_id: string | null;
          video_intro_url: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      accept_express_session: {
        Args: { p_session_id: string; p_teacher_user_id: string };
        Returns: Json;
      };
      activate_custom_hours: {
        Args: {
          p_category: string;
          p_grant_token: string;
          p_hours: number;
          p_mp_payment_id: string;
        };
        Returns: string;
      };
      activate_membership: {
        Args: {
          p_grant_token: string;
          p_mp_payment_id: string;
          p_plan_slug: string;
        };
        Returns: string;
      };
      calculate_custom_hours_price: {
        Args: { p_category: string; p_hours: number };
        Returns: number;
      };
      create_auto_assigned_booking: {
        Args: {
          p_duration_min: number;
          p_modality?: string;
          p_notes?: string;
          p_recipient_age?: number;
          p_recipient_first_name?: string;
          p_recipient_last_name?: string;
          p_recipient_relationship?: string;
          p_recipient_type?: string;
          p_scheduled_at: string;
          p_subject_id: string;
        };
        Returns: string;
      };
      create_custom_hours_grant: {
        Args: { p_category: string; p_hours: number; p_mp_payment_id: string };
        Returns: {
          price_cop: number;
          token: string;
        }[];
      };
      create_membership_activation_grant: {
        Args: { p_mp_payment_id: string; p_plan_slug: string };
        Returns: string;
      };
      create_notification: {
        Args: {
          p_body: string;
          p_data?: Json;
          p_title: string;
          p_type: string;
          p_user_id: string;
        };
        Returns: undefined;
      };
      create_scheduled_booking: {
        Args: {
          p_duration_min: number;
          p_modality?: string;
          p_notes?: string;
          p_recipient_age?: number;
          p_recipient_first_name?: string;
          p_recipient_last_name?: string;
          p_recipient_relationship?: string;
          p_recipient_type?: string;
          p_scheduled_at: string;
          p_subject_id: string;
          p_teacher_id: string;
        };
        Returns: string;
      };
      get_active_plan: {
        Args: { p_user_id: string };
        Returns: {
          expires_at: string;
          express_discount: number;
          free_express_per_month: number;
          hours_included: number;
          membership_id: string;
          plan_name: string;
          plan_slug: string;
          price_cop: number;
          remaining_free_express: number;
          remaining_hours: number;
          remaining_reschedules: number;
          reschedules_per_month: number;
        }[];
      };
      get_available_slots: {
        Args: { p_date: string; p_duration_min: number; p_teacher_id: string };
        Returns: {
          is_available: boolean;
          slot_end: string;
          slot_start: string;
        }[];
      };
      get_or_create_conversation: {
        Args: { p_booking_id: string };
        Returns: string;
      };
      get_user_role: { Args: never; Returns: string };
      grant_test_package_hours: { Args: { p_hours?: number }; Returns: string };
      process_teacher_verification: {
        Args: {
          p_auto_threshold?: number;
          p_notes: string;
          p_recommendation: string;
          p_score: number;
          p_teacher_id: string;
        };
        Returns: string;
      };
      reassign_or_cancel_auto_booking: {
        Args: { p_booking_id: string };
        Returns: Json;
      };
      refund_membership_hours: {
        Args: { p_hours: number; p_membership_id: string };
        Returns: undefined;
      };
      restore_booking_class: {
        Args: { p_booking_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
