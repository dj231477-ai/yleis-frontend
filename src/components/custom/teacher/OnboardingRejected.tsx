"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/ui/components/Button";
import { IconWithBackground } from "@/ui/components/IconWithBackground";
import { FeatherAlertCircle, FeatherLoader, FeatherRefreshCw } from "@subframe/core";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function OnboardingRejected() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleReapply() {
    setIsLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    await supabase.from("teachers").update({ onboarding_step: "profile" }).eq("user_id", user.id);

    router.push("/app/teacher/onboarding");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 p-6">
      <div className="w-full max-w-md rounded-2xl border border-error-200 bg-white p-8 text-center shadow-sm">
        <div className="mb-6 flex justify-center">
          <IconWithBackground variant="error" size="x-large" icon={<FeatherAlertCircle />} square />
        </div>

        <h1 className="text-xl font-bold text-neutral-900">Solicitud no aprobada</h1>
        <p className="mt-2 text-sm text-neutral-500 leading-relaxed">
          Tu solicitud de verificación no fue aprobada en esta ocasión. Puedes actualizar tu
          información y volver a intentarlo.
        </p>

        <div className="mt-6 rounded-xl bg-neutral-50 border border-neutral-200 p-4 text-left">
          <p className="text-xs font-semibold text-neutral-700 mb-1">Motivos frecuentes</p>
          <ul className="space-y-1 text-xs text-neutral-500">
            <li>• Documentos ilegibles o incompletos</li>
            <li>• Información del perfil insuficiente</li>
            <li>• Experiencia no acreditable con los documentos adjuntos</li>
          </ul>
        </div>

        <div className="mt-6">
          <Button
            variant="brand-primary"
            size="medium"
            icon={isLoading ? <FeatherLoader className="animate-spin" /> : <FeatherRefreshCw />}
            className="w-full"
            onClick={handleReapply}
            disabled={isLoading}
          >
            {isLoading ? "Actualizando..." : "Actualizar y volver a aplicar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
