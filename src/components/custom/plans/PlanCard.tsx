"use client";

import type { Plan } from "@/services/plans";
import { Badge } from "@/ui/components/Badge";
import { Button } from "@/ui/components/Button";
import { FeatherCheck, FeatherStar, FeatherZap } from "@subframe/core";

type Props = {
  plan: Plan;
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

const PLAN_FEATURES: Record<string, string[]> = {
  free: ["Clases Express ilimitadas", "Acceso al catálogo de profesores", "Perfil de estudiante"],
  basic: [
    "3 clases de suscripción/mes",
    "1 reprogramación/mes",
    "Clases Express ilimitadas",
    "Chat con el profesor",
  ],
  standard: [
    "5 clases de suscripción/mes",
    "1 Express gratis/mes",
    "2 reprogramaciones/mes",
    "10% descuento en Express",
    "Prioridad en matching",
    "Acumula 1 clase al renovar",
  ],
  premium: [
    "8 clases de suscripción/mes",
    "2 Express gratis/mes",
    "3 reprogramaciones/mes",
    "15% descuento en Express",
    "Profesor dedicado",
    "Acumula 2 clases al renovar",
  ],
};

const PLAN_ACCENT: Record<string, string> = {
  free: "neutral",
  basic: "brand",
  standard: "success",
  premium: "warning",
};

export function PlanCard({ plan, isCurrent }: Props) {
  const features = PLAN_FEATURES[plan.slug] ?? [];
  const isPopular = plan.slug === "standard";
  const isPremium = plan.slug === "premium";

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
      {/* Badge popular */}
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
          <span className="text-heading-3 font-heading-3 text-default-font">{plan.name}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-heading-2 font-heading-2 text-default-font">
            {formatCOP(plan.price_cop)}
          </span>
          {plan.price_cop > 0 && (
            <span className="text-body font-body text-subtext-color">/mes</span>
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
      <div className="mt-auto">
        {isCurrent ? (
          <Button variant="neutral-secondary" size="medium" className="w-full" disabled>
            Plan activo
          </Button>
        ) : plan.price_cop === 0 ? (
          <Button variant="neutral-secondary" size="medium" className="w-full" disabled>
            Plan por defecto
          </Button>
        ) : (
          <Button
            variant={isPopular ? "brand-primary" : "brand-secondary"}
            size="medium"
            className="w-full"
            onClick={() => {
              // TODO: conectar con MP Checkout cuando pagos estén activos
              alert(`Próximamente: activar plan ${plan.name}`);
            }}
          >
            {isPremium ? "Activar Premium" : `Activar ${plan.name}`}
          </Button>
        )}
      </div>
    </div>
  );
}
