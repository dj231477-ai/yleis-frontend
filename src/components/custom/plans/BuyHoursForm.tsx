"use client";

import type { Plan } from "@/services/plans";
import { Button } from "@/ui/components/Button";
import { useMemo, useState } from "react";

type Props = {
  plans: Plan[];
};

function formatCOP(amount: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

// Misma tarifa escalonada que calculate_custom_hours_price en la base de
// datos (fuente de verdad real) — esto es solo para la vista previa en
// vivo antes de pagar, el precio final se calcula server-side.
function tierRate(plans: Plan[], category: "A" | "B", hours: number): number {
  const suffix = category.toLowerCase();
  const basico = plans.find((p) => p.slug === `basico_${suffix}`);
  const estandar = plans.find((p) => p.slug === `estandar_${suffix}`);
  const premium = plans.find((p) => p.slug === `premium_${suffix}`);
  if (!basico || !estandar || !premium) return 0;

  const basicoRate = basico.price_cop / basico.hours_included;
  const estandarRate = estandar.price_cop / estandar.hours_included;
  const premiumRate = premium.price_cop / premium.hours_included;

  if (hours >= premium.hours_included) return premiumRate;
  if (hours >= estandar.hours_included) return estandarRate;
  return basicoRate;
}

export function BuyHoursForm({ plans }: Props) {
  const [category, setCategory] = useState<"A" | "B">("A");
  const [hours, setHours] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rate = useMemo(() => tierRate(plans, category, hours), [plans, category, hours]);
  const price = Math.round(rate * hours);

  function handleHoursChange(raw: string) {
    const n = Math.trunc(Number(raw));
    setHours(Number.isFinite(n) && n > 0 ? Math.min(n, 200) : 1);
  }

  async function handleBuy() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/payments/create-hours-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, hours }),
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
      data-testid="buy-hours-form"
      className="w-full rounded-xl border border-neutral-200 bg-white p-5"
    >
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-heading-3 font-heading-3 text-default-font">
          ¿Prefieres una cantidad distinta de horas?
        </h2>
        <p className="text-body font-body text-subtext-color">
          Compra directamente la cantidad de horas que necesites, con la misma tarifa escalonada por
          volumen que los paquetes.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-1">
          <span className="text-caption-bold font-caption-bold text-subtext-color">Categoría</span>
          <div className="flex gap-1">
            {(["A", "B"] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  category === cat
                    ? "border-brand-400 bg-brand-50 text-brand-700"
                    : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300"
                }`}
              >
                {cat === "A" ? "Cat. A · $65.000/h" : "Cat. B · $80.000/h"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="custom-hours"
            className="text-caption-bold font-caption-bold text-subtext-color"
          >
            Horas
          </label>
          <input
            id="custom-hours"
            type="number"
            min={1}
            max={200}
            step={1}
            value={hours}
            onChange={(e) => handleHoursChange(e.target.value)}
            className="w-24 rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <span className="text-caption-bold font-caption-bold text-subtext-color">Total</span>
          <span className="text-heading-3 font-heading-3 text-default-font">
            {formatCOP(price)}
          </span>
        </div>

        <Button variant="brand-secondary" size="medium" loading={loading} onClick={handleBuy}>
          Comprar {hours}h
        </Button>
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-center text-xs text-error-700">
          {error}
        </p>
      )}
    </div>
  );
}
