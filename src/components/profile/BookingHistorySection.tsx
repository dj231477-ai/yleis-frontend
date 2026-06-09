"use client";

import { SectionCard } from "@/components/shared/SectionCard";
import { StarRating } from "@/components/shared/StarRating";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Booking, BookingStatus } from "@/types/booking.types";
import { BookOpen, Clock, Users, Video } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

const STATUS_CONFIG: Record<BookingStatus, { label: string; variant: BadgeProps["variant"] }> = {
  confirmed: { label: "Confirmada", variant: "info" },
  pending: { label: "Pendiente", variant: "warning" },
  completed: { label: "Completada", variant: "success" },
  cancelled: { label: "Cancelada", variant: "secondary" },
  "no-show": { label: "No asistió", variant: "destructive" },
};

const PAGE_SIZE = 3;

type Props = { bookings: Booking[] };

export function BookingHistorySection({ bookings }: Props) {
  const [page, setPage] = useState(1);
  const visible = bookings.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < bookings.length;

  return (
    <SectionCard
      title="Historial de reservas"
      description={`${bookings.length} sesiones en total`}
      icon={BookOpen}
    >
      {bookings.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No tienes reservas aún.</p>
      ) : (
        <div className="space-y-3">
          {visible.map((booking) => (
            <BookingRow key={booking.id} booking={booking} />
          ))}
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => setPage((p) => p + 1)}
            >
              Cargar más
            </Button>
          )}
        </div>
      )}
    </SectionCard>
  );
}

function BookingRow({ booking }: { booking: Booking }) {
  const { label, variant } = STATUS_CONFIG[booking.status];

  return (
    <div className="flex items-start gap-4 rounded-lg border border-border bg-background p-4">
      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-muted">
        {booking.teacherAvatar ? (
          <Image
            src={booking.teacherAvatar}
            alt={booking.teacherName}
            width={36}
            height={36}
            unoptimized
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-muted-foreground">
            {booking.teacherName.charAt(0)}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-foreground">{booking.subject}</p>
            <p className="text-xs text-muted-foreground">{booking.teacherName}</p>
          </div>
          <Badge variant={variant} className="shrink-0 text-[10px]">
            {label}
          </Badge>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>
            {formatDate(booking.date)} · {booking.startTime}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {booking.duration} min
          </span>
          <span className="flex items-center gap-1">
            {booking.sessionType === "group" ? (
              <Users className="h-3 w-3" />
            ) : (
              <Video className="h-3 w-3" />
            )}
            {booking.sessionType === "group" ? "Grupal" : "Privada"}
          </span>
          <span className="font-medium text-foreground">
            {formatCurrency(booking.price, booking.currency)}
          </span>
        </div>

        {booking.rating && (
          <div className="mt-2 flex items-center gap-2">
            <StarRating rating={booking.rating} />
            {booking.review && (
              <span className="text-xs text-muted-foreground italic">"{booking.review}"</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
