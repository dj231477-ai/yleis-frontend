"use client";

import type { Plan } from "@/services/plans";
import { Badge } from "@/ui/components/Badge";
import { Button } from "@/ui/components/Button";
import { FeatherCheck, FeatherStar, FeatherZap } from "@subframe/core";
import { useState } from "react";

type Props = {
  plan: Plan;
  partner?: Plan;
  isCurrent: boolean;
};

function formatCOP(amount: number) {
  if (amount === 0) return "Gratis";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

// Tier derivado del slug para obtener features comunes
function tierFromSlug(slug: string) {
  if (slug === "free") return "free";
  if (slug.startsWith("basico")) return "basico";
  if (slug.startsWith("estandar")) return "estandar";
  if (slug.startsWith("premium")) return "premium";
  // Legacy slugs
  if (slug === "basic") return "basico";
  if (slug === "standard") return "estandar";
  return slug;
}

const PLAN_FEATURES: Record<string, string[]> = {
  free: ["Clases Express ilimitadas", "Acceso al catálogo de profesores", "Perfil de estudiante"],
  basico: ["5 horas para solicitar clases o paquetes", "Vence a los 30 días de la compra"],
  estandar: [
    "8 horas para solicitar clases o paquetes",
    "1 Express gratis",
    "8% descuento en Express",
    "Vence a los 30 días de la compra",
  ],
  premium: [
    "12 horas para solicitar clases o paquetes",
    "2 Express gratis",
    "12% descuento en Express",
    "Vence a los 30 días de la compra",
  ],
};

export function PlanCard({ plan, partner, isCurrent }: Props) {
  // Si hay par A/B, comenzar en la categoría A (plan actual o primero)
  const [selected, setSelected] = useState<Plan>(isCurrent ? plan : (plan ?? plan));
  const activePlan = partner ? selected : plan;

  const tier = tierFromSlug(activePlan.slug);
  const features = PLAN_FEATURES[tier] ?? [];
  const isPopular = tier === "estandar";
  const isPremium = tier === "premium";
  const hasPair = !!partner;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleActivate() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/payments/create-plan-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planSlug: activePlan.slug }),
      });
      const data = (await res.json()) as { init_point?: string; error?: string };
      if (!res.ok || !data.init_point) {
        setError(data.error ?? "No se pudo iniciar el pago. Intenta de nuevo.");
        setLoading(false);
        return;
      }
      window.location.href = data.init_point;
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setLoading(false);
    }
  }

  return (
    <div
      className={`relative flex flex-col rounded-xl border p-5 transition-shadow hover:shadow-md ${
        isCurrent
          ? "border-brand-300 bg-brand-50 shadow-sm"
          : isPopular
            ? "border-success-300 bg-white shadow-sm"
            : "border-neutral-200 bg-white"
      }`}
    >
      {/* Badge popular / activo */}
      {isPopular && !isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge variant="success" icon={<FeatherStar />}>
            Más popular
          </Badge>
        </div>
      )}
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge variant="brand">Plan actual</Badge>
        </div>
      )}

      {/* Nombre y precio */}
      <div className="mb-4 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          {isPremium && <FeatherZap className="text-warning-600" />}
          <span className="text-heading-3 font-heading-3 text-default-font">
            {hasPair
              ? /* mostrar solo el tier sin la letra */ activePlan.name.replace(/ [AB]$/, "")
              : activePlan.name}
          </span>
        </div>

        {/* Toggle A/B si hay par */}
        {hasPair && partner && (
          <div className="flex gap-1 mt-1">
            {[plan, partner].map((p) => {
              const cat = p.slug.endsWith("_a") ? "A" : "B";
              const catLabel = cat === "A" ? "Cat. A · $65.000/h" : "Cat. B · $80.000/h";
              const isActive = selected.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelected(p)}
                  className={`flex-1 rounded-lg border px-2 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? "border-brand-400 bg-brand-50 text-brand-700"
                      : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300"
                  }`}
                >
                  {catLabel}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-heading-2 font-heading-2 text-default-font">
            {formatCOP(activePlan.price_cop)}
          </span>
          {activePlan.price_cop > 0 && (
            <span className="text-body font-body text-subtext-color">
              · {activePlan.hours_included}h
            </span>
          )}
        </div>
      </div>

      {/* Features */}
      <ul className="mb-6 flex flex-col gap-2">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <FeatherCheck className="mt-0.5 flex-none text-success-600" />
            <span className="text-body font-body text-default-font">{f}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="mt-auto flex flex-col gap-2">
        {error && (
          <p className="rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-center text-xs text-error-700">
            {error}
          </p>
        )}
        {isCurrent ? (
          <Button variant="neutral-secondary" size="medium" className="w-full" disabled>
            Paquete activo
          </Button>
        ) : activePlan.price_cop === 0 ? (
          <Button variant="neutral-secondary" size="medium" className="w-full" disabled>
            Sin costo
          </Button>
        ) : (
          <Button
            variant={isPopular ? "brand-primary" : "brand-secondary"}
            size="medium"
            className="w-full"
            loading={loading}
            onClick={handleActivate}
          >
            {isPremium ? "Comprar Premium" : `Comprar ${activePlan.name.replace(/ [AB]$/, "")}`}
          </Button>
        )}
      </div>
    </div>
  );
}
