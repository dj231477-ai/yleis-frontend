"use client";

import { useState } from "react";
import { CalendarDays, CheckCircle2, XCircle, Loader2, Link2, Unlink2 } from "lucide-react";
import { SectionCard } from "@/components/shared/SectionCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { profileService } from "@/services/profile.service";
import type { UserProfile } from "@/types/user.types";

type Props = {
  user: UserProfile;
  onUpdate: (updated: Partial<UserProfile>) => void;
};

export function GoogleCalendarSection({ user, onUpdate }: Props) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleConnect() {
    setIsLoading(true);
    try {
      const { authUrl } = await profileService.connectGoogleCalendar();
      // En producción: window.location.href = authUrl (OAuth redirect)
      // En mock: simulamos conexión exitosa
      if (authUrl === "#mock-google-oauth") {
        onUpdate({ googleCalendarConnected: true, googleCalendarEmail: "mock@gmail.com" });
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDisconnect() {
    setIsLoading(true);
    try {
      await profileService.disconnectGoogleCalendar();
      onUpdate({ googleCalendarConnected: false, googleCalendarEmail: undefined });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SectionCard
      title="Google Calendar"
      description="Sincroniza tus clases con tu calendario"
      icon={CalendarDays}
    >
      <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
        <div className="flex items-center gap-3">
          {/* Google icon SVG */}
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
            <svg viewBox="0 0 24 24" className="h-6 w-6">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground">Google Calendar</p>
            {user.googleCalendarConnected ? (
              <div className="flex items-center gap-1.5 mt-0.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs text-muted-foreground">{user.googleCalendarEmail}</span>
                <Badge variant="success" className="text-[10px]">Conectado</Badge>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 mt-0.5">
                <XCircle className="h-3.5 w-3.5 text-muted-foreground/60" />
                <span className="text-xs text-muted-foreground">No conectado</span>
              </div>
            )}
          </div>
        </div>

        {user.googleCalendarConnected ? (
          <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink2 className="h-4 w-4" />}
            Desconectar
          </Button>
        ) : (
          <Button size="sm" onClick={handleConnect} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            Conectar
          </Button>
        )}
      </div>

      {user.googleCalendarConnected && (
        <p className="mt-3 text-xs text-muted-foreground">
          Tus próximas clases se sincronizan automáticamente con tu Google Calendar.
        </p>
      )}
    </SectionCard>
  );
}
