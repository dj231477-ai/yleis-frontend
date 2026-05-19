"use client";

import { SectionCard } from "@/components/shared/SectionCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { profileService } from "@/services/profile.service";
import type { UserProfile } from "@/types/user.types";
import { Bell, Check, Loader2 } from "lucide-react";
import { useState } from "react";

const CHANNEL_ITEMS = [
  {
    key: "email" as const,
    label: "Notificaciones por email",
    description: "Recibe actualizaciones en tu correo",
  },
  {
    key: "push" as const,
    label: "Notificaciones push",
    description: "Alertas en tu navegador o app",
  },
  { key: "sms" as const, label: "SMS", description: "Mensajes de texto a tu celular" },
] satisfies Array<{
  key: keyof UserProfile["preferences"]["notifications"];
  label: string;
  description: string;
}>;

const CLASS_ITEMS = [
  {
    key: "classReminder" as const,
    label: "Recordatorio de clase",
    description: "15 minutos antes de cada sesión",
  },
  {
    key: "bookingConfirmation" as const,
    label: "Confirmación de reserva",
    description: "Cuando una reserva es aceptada",
  },
  {
    key: "weeklyReport" as const,
    label: "Reporte semanal",
    description: "Resumen de tu progreso cada semana",
  },
] satisfies Array<{
  key: keyof UserProfile["preferences"]["notifications"];
  label: string;
  description: string;
}>;

type Props = { user: UserProfile; onUpdate: (u: UserProfile) => void };

export function NotificationsSection({ user, onUpdate }: Props) {
  const [notifications, setNotifications] = useState(user.preferences.notifications);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggle(key: keyof typeof notifications) {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updatedPrefs = { ...user.preferences, notifications };
      const updated = await profileService.updateProfile({ preferences: updatedPrefs });
      onUpdate(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // mantener estado local aunque falle
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard
      title="Configuración de notificaciones"
      description="Decide qué comunicaciones recibir"
      icon={Bell}
      action={
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : saved ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            "Guardar"
          )}
        </Button>
      }
    >
      <div className="space-y-6">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Canales
          </p>
          <div className="space-y-4">
            {CHANNEL_ITEMS.map(({ key, label, description }) => (
              <div key={key} className="flex items-start justify-between gap-4">
                <div>
                  <Label htmlFor={`notif-${key}`} className="text-sm font-medium cursor-pointer">
                    {label}
                  </Label>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <Switch
                  id={`notif-${key}`}
                  checked={notifications[key]}
                  onCheckedChange={() => toggle(key)}
                />
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Clases y reservas
          </p>
          <div className="space-y-4">
            {CLASS_ITEMS.map(({ key, label, description }) => (
              <div key={key} className="flex items-start justify-between gap-4">
                <div>
                  <Label
                    htmlFor={`notif-class-${key}`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {label}
                  </Label>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <Switch
                  id={`notif-class-${key}`}
                  checked={notifications[key]}
                  onCheckedChange={() => toggle(key)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
