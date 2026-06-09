"use client";

import { SectionCard } from "@/components/shared/SectionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type ChangePasswordFormValues, changePasswordSchema } from "@/lib/validations/profile";
import { profileService } from "@/services/profile.service";
import type { UserProfile } from "@/types/user.types";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Check, Eye, EyeOff, Loader2, Shield } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

type Props = { user: UserProfile };

function PasswordInput({
  id,
  label,
  error,
  ...props
}: { id: string; label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input id={id} type={show ? "text" : "password"} className="pr-10" {...props} />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function SecuritySection({ user }: Props) {
  const [isChanging, setIsChanging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState("");

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
  });

  async function onSubmit(values: ChangePasswordFormValues) {
    setIsSaving(true);
    setServerError("");
    try {
      await profileService.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      setSuccess(true);
      form.reset();
      setTimeout(() => {
        setSuccess(false);
        setIsChanging(false);
      }, 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al cambiar contraseña";
      setServerError(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SectionCard title="Seguridad" description="Administra tu contraseña y acceso" icon={Shield}>
      <div className="space-y-4">
        {/* Estado email */}
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <p className="text-sm font-medium text-foreground">Correo electrónico</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          {user.isEmailVerified ? (
            <Badge variant="success">Verificado</Badge>
          ) : (
            <Badge variant="warning">Sin verificar</Badge>
          )}
        </div>

        {/* Cambiar contraseña */}
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Contraseña</p>
              <p className="text-xs text-muted-foreground">Última actualización hace 3 meses</p>
            </div>
            {!isChanging && (
              <Button variant="outline" size="sm" onClick={() => setIsChanging(true)}>
                Cambiar
              </Button>
            )}
          </div>

          {isChanging && (
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4">
              {serverError && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {serverError}
                </div>
              )}

              <PasswordInput
                id="currentPassword"
                label="Contraseña actual"
                error={form.formState.errors.currentPassword?.message}
                {...form.register("currentPassword")}
              />
              <PasswordInput
                id="newPassword"
                label="Nueva contraseña"
                error={form.formState.errors.newPassword?.message}
                {...form.register("newPassword")}
              />
              <PasswordInput
                id="confirmPassword"
                label="Confirmar contraseña"
                error={form.formState.errors.confirmPassword?.message}
                {...form.register("confirmPassword")}
              />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsChanging(false);
                    form.reset();
                    setServerError("");
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
                    </>
                  ) : success ? (
                    <>
                      <Check className="h-4 w-4" /> Actualizada
                    </>
                  ) : (
                    "Actualizar contraseña"
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* 2FA placeholder */}
        <div className="flex items-center justify-between rounded-lg border border-border p-4 opacity-60">
          <div>
            <p className="text-sm font-medium text-foreground">Autenticación de dos factores</p>
            <p className="text-xs text-muted-foreground">Próximamente disponible</p>
          </div>
          <Badge variant="secondary">Próximamente</Badge>
        </div>
      </div>
    </SectionCard>
  );
}
