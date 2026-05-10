"use client";

import { GraduationCap } from "lucide-react";
import { SectionCard } from "@/components/shared/SectionCard";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { UserProfile } from "@/types/user.types";

const DAY_LABELS: Record<string, string> = {
  monday: "Lun", tuesday: "Mar", wednesday: "Mié",
  thursday: "Jue", friday: "Vie", saturday: "Sáb", sunday: "Dom",
};

const TIME_LABELS: Record<string, string> = {
  morning: "Mañana (6–12h)",
  afternoon: "Tarde (12–18h)",
  evening: "Noche (18–22h)",
};

const PACE_LABELS: Record<string, string> = {
  relaxed: "Relajado · 1 clase/semana",
  standard: "Estándar · 2–3 clases/semana",
  intensive: "Intensivo · 4+ clases/semana",
};

type Props = { user: UserProfile };

export function ClassPreferencesSection({ user }: Props) {
  const { preferences } = user;
  const allDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

  return (
    <SectionCard
      title="Preferencias de clases"
      description="Configura cómo quieres aprender"
      icon={GraduationCap}
    >
      <div className="space-y-6">
        {/* Días preferidos */}
        <div>
          <p className="mb-3 text-sm font-medium text-foreground">Días preferidos</p>
          <div className="flex flex-wrap gap-2">
            {allDays.map((day) => {
              const selected = preferences.schedule.preferredDays.includes(day);
              return (
                <button
                  key={day}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-background text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {DAY_LABELS[day]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Horarios */}
        <div>
          <p className="mb-3 text-sm font-medium text-foreground">Franja horaria</p>
          <div className="space-y-2">
            {Object.entries(TIME_LABELS).map(([key, label]) => {
              const selected = preferences.schedule.preferredTimeSlots.includes(key);
              return (
                <div key={key} className="flex items-center justify-between">
                  <Label htmlFor={`time-${key}`} className="cursor-pointer text-sm font-normal">
                    {label}
                  </Label>
                  <Switch id={`time-${key}`} checked={selected} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Duración de sesión */}
        <div>
          <p className="mb-3 text-sm font-medium text-foreground">Duración de sesión</p>
          <div className="flex gap-2">
            {[30, 60, 90].map((duration) => (
              <button
                key={duration}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  preferences.schedule.sessionDuration === duration
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-background text-muted-foreground hover:bg-accent"
                }`}
              >
                {duration} min
              </button>
            ))}
          </div>
        </div>

        {/* Ritmo */}
        <div>
          <p className="mb-3 text-sm font-medium text-foreground">Ritmo de aprendizaje</p>
          <div className="space-y-2">
            {Object.entries(PACE_LABELS).map(([key, label]) => (
              <div
                key={key}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                  preferences.learning.pace === key
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:bg-accent"
                }`}
              >
                <div className={`h-4 w-4 rounded-full border-2 ${
                  preferences.learning.pace === key
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/40"
                }`} />
                <span className="text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Objetivos */}
        {preferences.learning.goals.length > 0 && (
          <div>
            <p className="mb-3 text-sm font-medium text-foreground">Objetivos de aprendizaje</p>
            <div className="flex flex-wrap gap-2">
              {preferences.learning.goals.map((goal) => (
                <Badge key={goal} variant="secondary">{goal}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
