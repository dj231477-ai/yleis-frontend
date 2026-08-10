export const BUSINESS = {
  PLATFORM_FEE: 0.15,
  TEACHER_PAYOUT: 0.85,
  MIN_CLASS_PRICE_COP: 500,
  CURRENCY: "COP",

  REFUND_100_BEFORE_HOURS: 24,
  REFUND_50_BEFORE_HOURS: 2,

  CONFIRMATION_WINDOW_HOURS: 24,
  CLASS_DURATIONS_MIN: [30, 60, 90] as const,

  DEFAULT_TIMEZONE: "America/Colombia/Buenos_Aires",
  MEET_MODE: "manual" as "manual" | "automated",

  EXPRESS_SESSION_DURATION_MIN: 30,
  ONLINE_TIMEOUT_MIN: 60,
} as const;

export type ClassDuration = (typeof BUSINESS.CLASS_DURATIONS_MIN)[number];
