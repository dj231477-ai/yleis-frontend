"use client";

import { SectionCard } from "@/components/shared/SectionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { profileService } from "@/services/profile.service";
import type { UserProfile } from "@/types/user.types";
import { Check, GraduationCap, Loader2 } from "lucide-react";
import { useState } from "react";

const DAY_LABELS: Record<string, string> = {
  monday: "Lun",
  tuesday: "Mar",
  wednesday: "Mié",
  thursday: "Jue",
  friday: "Vie",
  saturday: "Sáb",
  sunday: "Dom",
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

const ALL_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DURATIONS = [30, 60, 90] as const;

type Props = { user: UserProfile; onUpdate: (u: UserProfile) => void };

export function ClassPreferencesSection({ user, onUpdate }: Props) {
  const [schedule, setSchedule] = useState(user.preferences.schedule);
  const [learning, setLearning] = useState(user.preferences.learning);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggleDay(day: string) {
    setSaved(false);
    setSchedule((prev) => ({
      ...prev,
      preferredDays: prev.preferredDays.includes(day)
        ? prev.preferredDays.filter((d) => d !== day)
        : [...prev.preferredDays, day],
    }));
  }

  function toggleTimeSlot(slot: string) {
    setSaved(false);
    setSchedule((prev) => ({
      ...prev,
      preferredTimeSlots: prev.preferredTimeSlots.includes(slot)
        ? prev.preferredTimeSlots.filter((s) => s !== slot)
        : [...prev.preferredTimeSlots, slot],
    }));
  }

  function setDuration(duration: 30 | 60 | 90) {
    setSaved(false);
    setSchedule((prev) => ({ ...prev, sessionDuration: duration }));
  }

  function setPace(pace: "relaxed" | "standard" | "intensive") {
    setSaved(false);
    setLearning((prev) => ({ ...prev, pace }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updatedPrefs = { ...user.preferences, schedule, learning };
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
      title="Preferencias de clases"
      description="Configura cómo quieres aprender"
      icon={GraduationCap}
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
        {/* Días preferidos */}
        <div>
          <p className="mb-3 text-sm font-medium text-foreground">Días preferidos</p>
          <div className="flex flex-wrap gap-2">
            {ALL_DAYS.map((day) => {
              const selected = schedule.preferredDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
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
              const selected = schedule.preferredTimeSlots.includes(key);
              return (
                <div key={key} className="flex items-center justify-between">
                  <Label htmlFor={`time-${key}`} className="cursor-pointer text-sm font-normal">
                    {label}
                  </Label>
                  <Switch
                    id={`time-${key}`}
                    checked={selected}
                    onCheckedChange={() => toggleTimeSlot(key)}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Duración de sesión */}
        <div>
          <p className="mb-3 text-sm font-medium text-foreground">Duración de sesión</p>
          <div className="flex gap-2">
            {DURATIONS.map((duration) => (
              <button
                key={duration}
                type="button"
                onClick={() => setDuration(duration)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  schedule.sessionDuration === duration
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
              <label
                key={key}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                  learning.pace === key
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:bg-accent"
                }`}
              >
                <input
                  type="radio"
                  name="pace"
                  value={key}
                  checked={learning.pace === key}
                  onChange={() => setPace(key as "relaxed" | "standard" | "intensive")}
                  className="sr-only"
                />
                <div
                  className={`h-4 w-4 rounded-full border-2 ${
                    learning.pace === key
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/40"
                  }`}
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Objetivos */}
        {learning.goals.length > 0 && (
          <div>
            <p className="mb-3 text-sm font-medium text-foreground">Objetivos de aprendizaje</p>
            <div className="flex flex-wrap gap-2">
              {learning.goals.map((goal) => (
                <Badge key={goal} variant="secondary">
                  {goal}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
