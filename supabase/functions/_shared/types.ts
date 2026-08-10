export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  code?: string;
}

export interface BookingRow {
  id: string;
  student_id: string;
  teacher_id: string;
  subject_id: string;
  scheduled_at: string;
  duration_min: number;
  status: string;
  price: number;
  meet_link: string | null;
}

export interface PaymentRow {
  id: string;
  booking_id: string;
  student_id: string;
  status: string;
  amount: number;
  platform_fee: number | null;
  teacher_payout: number | null;
  mp_payment_id: string | null;
  mp_preference_id: string | null;
}

export type RefundPolicy = "full" | "partial" | "none";

export interface CancellationResult {
  refund_policy: RefundPolicy;
  refund_amount: number;
  hours_until_class: number;
}
