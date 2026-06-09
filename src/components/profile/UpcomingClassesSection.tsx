import { SectionCard } from "@/components/shared/SectionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateRelative } from "@/lib/utils";
import type { UpcomingClass } from "@/types/booking.types";
import { CalendarDays, Clock, ExternalLink, Users, Video } from "lucide-react";
import Image from "next/image";

type Props = {
  classes: UpcomingClass[];
};

export function UpcomingClassesSection({ classes }: Props) {
  return (
    <SectionCard
      title="Próximas clases"
      description="Tus sesiones programadas"
      icon={CalendarDays}
      action={
        <Button variant="outline" size="sm" asChild>
          <a href="/dashboard/classes">Ver todas</a>
        </Button>
      }
    >
      {classes.length === 0 ? (
        <div className="py-8 text-center">
          <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-2 text-sm text-muted-foreground">No tienes clases programadas</p>
          <Button size="sm" className="mt-4">
            Reservar clase
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {classes.map((cls) => (
            <ClassCard key={cls.id} cls={cls} />
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function ClassCard({ cls }: { cls: UpcomingClass }) {
  const dateLabel = formatDateRelative(cls.date);
  const isToday = dateLabel === "Hoy";
  const isTomorrow = dateLabel === "Mañana";

  return (
    <div className="flex items-start gap-4 rounded-lg border border-border bg-background p-4 transition-colors hover:bg-accent/40">
      {/* Teacher avatar */}
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
        {cls.teacherAvatar ? (
          <Image
            src={cls.teacherAvatar}
            alt={cls.teacherName}
            width={40}
            height={40}
            unoptimized
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-bold text-muted-foreground">
            {cls.teacherName.charAt(0)}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-foreground">{cls.subject}</p>
            <p className="text-xs text-muted-foreground">{cls.teacherName}</p>
          </div>
          <Badge
            variant={cls.status === "confirmed" ? "success" : "warning"}
            className="shrink-0 text-[10px]"
          >
            {cls.status === "confirmed" ? "Confirmada" : "Pendiente"}
          </Badge>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            <span
              className={
                isToday
                  ? "font-semibold text-primary"
                  : isTomorrow
                    ? "font-medium text-foreground"
                    : ""
              }
            >
              {dateLabel}
            </span>
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {cls.startTime} – {cls.endTime}
          </span>
          <span className="flex items-center gap-1">
            {cls.sessionType === "group" ? (
              <Users className="h-3 w-3" />
            ) : (
              <Video className="h-3 w-3" />
            )}
            {cls.sessionType === "group"
              ? `Grupal · ${cls.participantsCount}/${cls.maxParticipants}`
              : "Privada"}
          </span>
        </div>
      </div>

      {/* Join button */}
      {cls.status === "confirmed" && (
        <Button asChild size="sm" className="shrink-0 self-center">
          <a href={cls.meetingUrl} target="_blank" rel="noopener noreferrer">
            <Video className="h-3.5 w-3.5" />
            <ExternalLink className="h-3 w-3" />
          </a>
        </Button>
      )}
    </div>
  );
}
