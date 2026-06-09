"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/ui/components/Button";
import { useState } from "react";

export function PasswordForm() {
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPass.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (newPass !== confirmPass) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.updateUser({ password: newPass });

    if (authError) {
      setError("Error al cambiar la contraseña. Intenta de nuevo.");
    } else {
      setSuccess(true);
      setNewPass("");
      setConfirmPass("");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-600">Nueva contraseña</label>
        <input
          type="password"
          value={newPass}
          onChange={(e) => setNewPass(e.target.value)}
          placeholder="Mínimo 6 caracteres"
          autoComplete="new-password"
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-colors"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-600">Confirmar contraseña</label>
        <input
          type="password"
          value={confirmPass}
          onChange={(e) => setConfirmPass(e.target.value)}
          placeholder="Repite la nueva contraseña"
          autoComplete="new-password"
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-colors"
        />
      </div>

      {error && <p className="text-sm text-error">{error}</p>}
      {success && <p className="text-sm text-success">Contraseña actualizada correctamente</p>}

      <div className="flex justify-end">
        <Button variant="neutral-secondary" size="small" loading={loading} type="submit">
          Cambiar contraseña
        </Button>
      </div>
    </form>
  );
}
