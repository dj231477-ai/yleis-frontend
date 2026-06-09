"use client";

import { SectionCard } from "@/components/shared/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type PersonalInfoFormValues, personalInfoSchema } from "@/lib/validations/profile";
import { profileService } from "@/services/profile.service";
import type { UserProfile } from "@/types/user.types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Clock, Globe2, Loader2, Mail, MapPin, Phone, User } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

type Props = {
  user: UserProfile;
  onUpdate: (updated: UserProfile) => void;
};

type FieldRowProps = {
  label: string;
  icon: React.ReactNode;
  value: string;
};

function InfoRow({ label, icon, value }: FieldRowProps) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm text-foreground">{value || "—"}</p>
      </div>
    </div>
  );
}

export function PersonalInfoSection({ user, onUpdate }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const form = useForm<PersonalInfoFormValues>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? "",
      city: user.city,
      country: user.country,
      timezone: user.timezone,
      bio: user.bio ?? "",
    },
  });

  async function onSubmit(values: PersonalInfoFormValues) {
    setIsSaving(true);
    try {
      const updated = await profileService.updateProfile(values);
      onUpdate(updated);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setIsEditing(false);
      }, 1500);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    form.reset();
    setIsEditing(false);
  }

  return (
    <SectionCard
      title="Información personal"
      description="Tu información básica de cuenta"
      icon={User}
      action={
        !isEditing ? (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            Editar
          </Button>
        ) : null
      }
    >
      {!isEditing ? (
        <div className="divide-y divide-border">
          <InfoRow
            label="Nombre completo"
            icon={<User className="h-4 w-4" />}
            value={`${user.firstName} ${user.lastName}`}
          />
          <InfoRow
            label="Correo electrónico"
            icon={<Mail className="h-4 w-4" />}
            value={user.email}
          />
          <InfoRow
            label="Teléfono"
            icon={<Phone className="h-4 w-4" />}
            value={user.phone ?? "No registrado"}
          />
          <InfoRow
            label="Ciudad"
            icon={<MapPin className="h-4 w-4" />}
            value={`${user.city}, ${user.country}`}
          />
          <InfoRow
            label="Zona horaria"
            icon={<Clock className="h-4 w-4" />}
            value={user.timezone}
          />
          {user.languages.length > 0 && (
            <InfoRow
              label="Idiomas"
              icon={<Globe2 className="h-4 w-4" />}
              value={user.languages
                .map((l) => `${l.flag} ${l.name}${l.level ? ` (${l.level})` : ""}`)
                .join(" · ")}
            />
          )}
        </div>
      ) : (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">Nombre</Label>
              <Input id="firstName" {...form.register("firstName")} />
              {form.formState.errors.firstName && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.firstName.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Apellido</Label>
              <Input id="lastName" {...form.register("lastName")} />
              {form.formState.errors.lastName && (
                <p className="text-xs text-destructive">{form.formState.errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" placeholder="+57 300 000 0000" {...form.register("phone")} />
            {form.formState.errors.phone && (
              <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="city">Ciudad</Label>
              <Input id="city" {...form.register("city")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="country">País</Label>
              <Input id="country" {...form.register("country")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="timezone">Zona horaria</Label>
            <Input id="timezone" placeholder="America/Bogota" {...form.register("timezone")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio">Biografía</Label>
            <Textarea
              id="bio"
              rows={3}
              placeholder="Cuéntanos un poco sobre ti..."
              {...form.register("bio")}
            />
            <p className="text-right text-xs text-muted-foreground">
              {form.watch("bio")?.length ?? 0}/500
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
                </>
              ) : saved ? (
                <>
                  <Check className="h-4 w-4" /> Guardado
                </>
              ) : (
                "Guardar cambios"
              )}
            </Button>
          </div>
        </form>
      )}
    </SectionCard>
  );
}
