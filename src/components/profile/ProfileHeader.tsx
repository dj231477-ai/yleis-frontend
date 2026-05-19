"use client";

import { RoleBadge } from "@/components/shared/RoleBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, getInitials } from "@/lib/utils";
import type { UserProfile } from "@/types/user.types";
import { ArrowRightLeft, Calendar, Camera, CheckCircle2, Loader2, MapPin } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

type ProfileHeaderProps = {
  user: UserProfile;
  onEditClick: () => void;
  onAvatarChange: (file: File) => Promise<void>;
};

export function ProfileHeader({ user, onEditClick, onAvatarChange }: ProfileHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onAvatarChange(file);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card">
      {/* Banner */}
      <div className="h-28 bg-gradient-to-br from-primary/30 via-primary/10 to-background" />

      <div className="px-6 pb-6">
        {/* Avatar + actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="relative -mt-14 flex items-end gap-4">
            <div className="relative">
              <div className="h-24 w-24 overflow-hidden rounded-2xl border-4 border-background bg-muted shadow-lg">
                {user.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt={`${user.firstName} ${user.lastName}`}
                    width={96}
                    height={96}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-primary">
                    {getInitials(user.firstName, user.lastName)}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-md transition-transform hover:scale-110 disabled:opacity-70"
                title="Cambiar foto"
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <div className="mb-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-foreground">
                  {user.firstName} {user.lastName}
                </h2>
                {user.isEmailVerified && <CheckCircle2 className="h-5 w-5 text-primary" />}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <RoleBadge role={user.role} />
                {user.isActive ? (
                  <Badge variant="success">Activo</Badge>
                ) : (
                  <Badge variant="secondary">Inactivo</Badge>
                )}
              </div>
            </div>
          </div>

          <Button onClick={onEditClick} className="sm:mb-1">
            Editar perfil
          </Button>
        </div>

        {/* Info rápida */}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            {user.city}, {user.country}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Miembro desde {formatDate(user.joinedAt)}
          </span>

          {user.languages.length > 0 && !user.languagePairs && (
            <span className="flex items-center gap-1.5">
              {user.languages.map((l) => (
                <span key={l.code} title={`${l.name}${l.level ? ` · ${l.level}` : ""}`}>
                  {l.flag}
                </span>
              ))}
              {user.languages.map((l) => l.name).join(" · ")}
            </span>
          )}

          {user.languagePairs && user.languagePairs.length > 0 && (
            <span className="flex items-center gap-1.5">
              <ArrowRightLeft className="h-3.5 w-3.5" />
              {user.languagePairs
                .map((p) => `${p.source.flag} ${p.source.name} → ${p.target.flag} ${p.target.name}`)
                .join(" · ")}
            </span>
          )}

          {user.specializations && user.specializations.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {user.specializations.join(" · ")}
            </span>
          )}
        </div>

        {user.bio && (
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">{user.bio}</p>
        )}
      </div>
    </div>
  );
}
