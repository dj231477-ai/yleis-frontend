"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/ui/components/Button";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  fullName: string;
  email: string;
  phone: string;
};

export function PersonalInfoForm({ fullName, email, phone }: Props) {
  const router = useRouter();
  const [phoneVal, setPhoneVal] = useState(phone);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("No autenticado");
      setLoading(false);
      return;
    }

    const { error: dbError } = await supabase
      .from("users")
      .update({ phone: phoneVal.trim() || null })
      .eq("id", user.id);

    if (dbError) {
      setError("Error al guardar los cambios");
    } else {
      setSuccess(true);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Nombre — solo lectura */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-600">Nombre completo</label>
        <input
          value={fullName}
          disabled
          className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-400 outline-none cursor-not-allowed"
        />
        <p className="text-xs text-neutral-400">El nombre no es editable.</p>
      </div>

      {/* Email — solo lectura */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-600">Correo electrónico</label>
        <input
          value={email}
          disabled
          className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-400 outline-none cursor-not-allowed"
        />
        <p className="text-xs text-neutral-400">El correo no es editable.</p>
      </div>

      {/* Teléfono — editable */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-600">Teléfono</label>
        <input
          type="tel"
          value={phoneVal}
          onChange={(e) => setPhoneVal(e.target.value)}
          placeholder="+54 9 11 1234-5678"
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-colors"
        />
      </div>

      {error && <p className="text-sm text-error">{error}</p>}
      {success && <p className="text-sm text-success">Cambios guardados correctamente</p>}

      <div className="flex justify-end">
        <Button variant="brand-primary" size="small" loading={loading} type="submit">
          Guardar
        </Button>
      </div>
    </form>
  );
}
