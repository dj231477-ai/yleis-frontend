export type BookingStatus = "confirmed" | "pending" | "completed" | "cancelled" | "no-show";

export type Booking = {
  id: string;
  teacherName: string;
  teacherAvatar?: string;
  subject: string;
  language: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: BookingStatus;
  price: number;
  currency: string;
  sessionType: "group" | "private";
  meetingUrl?: string;
  notes?: string;
  rating?: number;
  review?: string;
};

export type UpcomingClass = {
  id: string;
  teacherName: string;
  teacherAvatar?: string;
  subject: string;
  language: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  sessionType: "group" | "private";
  meetingUrl: string;
  participantsCount?: number;
  maxParticipants?: number;
  status: "confirmed" | "pending";
};
