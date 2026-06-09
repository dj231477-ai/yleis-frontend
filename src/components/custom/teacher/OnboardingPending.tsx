"use client";

import { Button } from "@/ui/components/Button";
import { IconWithBackground } from "@/ui/components/IconWithBackground";
import { FeatherClock, FeatherMail } from "@subframe/core";
import Link from "next/link";

export function OnboardingPending() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 p-6">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <div className="mb-6 flex justify-center">
          <IconWithBackground variant="warning" size="x-large" icon={<FeatherClock />} square />
        </div>

        <h1 className="text-xl font-bold text-neutral-900">Solicitud en revisión</h1>
        <p className="mt-2 text-sm text-neutral-500 leading-relaxed">
          Recibimos tu solicitud. Nuestro equipo está revisando tu perfil y documentos. Te
          notificaremos por email cuando el proceso termine.
        </p>

        <div className="mt-6 rounded-xl bg-warning-50 border border-warning-200 p-4 text-left">
          <p className="text-xs font-semibold text-warning-700 mb-2">¿Qué sigue?</p>
          <ul className="space-y-1.5 text-xs text-warning-600">
            <li className="flex items-start gap-1.5">
              <span className="mt-0.5">1.</span>
              <span>Revisamos tus documentos y perfil (1–2 días hábiles)</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="mt-0.5">2.</span>
              <span>Recibirás un email con el resultado</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="mt-0.5">3.</span>
              <span>Si eres aprobado, accedes a tu dashboard y puedes recibir alumnos</span>
            </li>
          </ul>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <Link href="/dashboard/profile">
            <Button
              variant="neutral-secondary"
              size="medium"
              icon={<FeatherMail />}
              className="w-full"
            >
              Ver mi perfil
            </Button>
          </Link>
          <Link href="/app/student/dashboard">
            <Button variant="neutral-tertiary" size="medium" className="w-full">
              Ir al dashboard de alumno
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
