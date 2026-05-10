"use client";

import { Bell } from "lucide-react";
import { SectionCard } from "@/components/shared/SectionCard";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { UserProfile } from "@/types/user.types";

const NOTIFICATION_ITEMS = [
  { key: "email" as const, label: "Notificaciones por email", description: "Recibe actualizaciones en tu correo" },
  { key: "push" as const, label: "Notificaciones push", description: "Alertas en tu navegador o app" },
  { key: "sms" as const, label: "SMS", description: "Mensajes de texto a tu celular" },
] satisfies Array<{ key: keyof UserProfile["preferences"]["notifications"]; label: string; description: string }>;

const CLASS_NOTIFICATION_ITEMS = [
  { key: "classReminder" as const, label: "Recordatorio de clase", description: "15 minutos antes de cada sesión" },
  { key: "bookingConfirmation" as const, label: "Confirmación de reserva", description: "Cuando una reserva es aceptada" },
  { key: "weeklyReport" as const, label: "Reporte semanal", description: "Resumen de tu progreso cada semana" },
] satisfies Array<{ key: keyof UserProfile["preferences"]["notifications"]; label: string; description: string }>;

type Props = { user: UserProfile };

export function NotificationsSection({ user }: Props) {
  const { notifications } = user.preferences;

  return (
    <SectionCard
      title="Configuración de notificaciones"
      description="Decide qué comunicaciones recibir"
      icon={Bell}
    >
      <div className="space-y-6">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Canales</p>
          <div className="space-y-4">
            {NOTIFICATION_ITEMS.map(({ key, label, description }) => (
              <div key={key} className="flex items-start justify-between gap-4">
                <div>
                  <Label htmlFor={`notif-${key}`} className="text-sm font-medium">{label}</Label>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <Switch id={`notif-${key}`} checked={notifications[key]} />
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Clases y reservas</p>
          <div className="space-y-4">
            {CLASS_NOTIFICATION_ITEMS.map(({ key, label, description }) => (
              <div key={key} className="flex items-start justify-between gap-4">
                <div>
                  <Label htmlFor={`notif-${key}`} className="text-sm font-medium">{label}</Label>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <Switch id={`notif-${key}`} checked={notifications[key]} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
