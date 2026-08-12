import { BuyHoursForm } from "@/components/custom/plans/BuyHoursForm";
import { PlanCard } from "@/components/custom/plans/PlanCard";
import { createClient } from "@/lib/supabase/server";
import type { Plan } from "@/services/plans";
import { getActivePlan, getAllPlans } from "@/services/plans";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  activated?: string;
  payment?: string;
}>;

// Agrupa los planes en: [{ plan, partner? }]
// Los pares basico_a/basico_b, estandar_a/b, premium_a/b se muestran como una sola card con toggle
function groupPlans(plans: Plan[]): Array<{ plan: Plan; partner?: Plan }> {
  const result: Array<{ plan: Plan; partner?: Plan }> = [];
  const seen = new Set<string>();

  for (const plan of plans) {
    if (seen.has(plan.id)) continue;
    seen.add(plan.id);

    if (plan.slug.endsWith("_a")) {
      const partnerSlug = plan.slug.replace(/_a$/, "_b");
      const partner = plans.find((p) => p.slug === partnerSlug);
      if (partner) {
        seen.add(partner.id);
        result.push({ plan, partner });
        continue;
      }
    }
    // Slug sin par (free, legacy)
    if (!plan.slug.endsWith("_b")) {
      result.push({ plan });
    }
  }

  return result;
}

export default async function PlansPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [plans, activePlan] = await Promise.all([
    getAllPlans(supabase),
    getActivePlan(supabase, user.id),
  ]);

  const currentSlug = activePlan?.plan_slug ?? "free";
  const grouped = groupPlans(plans.filter((p) => p.slug !== "free"));

  // Para encontrar cuál grupo contiene el plan activo
  function isCurrentGroup(plan: Plan, partner?: Plan): boolean {
    return plan.slug === currentSlug || (!!partner && partner.slug === currentSlug);
  }

  // El plan del par que es el activo (para inicializar el toggle en el correcto)
  function currentPlanInGroup(plan: Plan, partner?: Plan): Plan {
    if (partner?.slug === currentSlug) return partner;
    return plan;
  }

  return (
    <div className="flex w-full flex-col items-start gap-8 px-6 py-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-heading-2 font-heading-2 text-default-font">Paquetes</h1>
        <p className="text-body font-body text-subtext-color">
          Compra un paquete de horas para solicitar clases y paquetes con tu profesor asignado.
        </p>
      </div>

      {/* Feedback de pago */}
      {sp.activated === "1" && (
        <div className="flex w-full items-center gap-3 rounded-xl border border-success-200 bg-success-50 px-4 py-3">
          <span className="text-body-bold font-body-bold text-success-700">
            ¡Plan activado con éxito! Tus clases ya están disponibles.
          </span>
        </div>
      )}
      {sp.payment === "pending" && (
        <div className="flex w-full items-center gap-3 rounded-xl border border-warning-200 bg-warning-50 px-4 py-3">
          <span className="text-body font-body text-warning-700">
            Tu pago está en proceso. Recibirás una notificación cuando se confirme.
          </span>
        </div>
      )}
      {(sp.payment === "failed" || sp.payment === "error") && (
        <div className="flex w-full items-center gap-3 rounded-xl border border-error-200 bg-error-50 px-4 py-3">
          <span className="text-body font-body text-error-700">
            El pago no pudo procesarse. Intenta de nuevo o contacta soporte.
          </span>
        </div>
      )}

      {/* Plan actual */}
      {activePlan && (
        <div className="flex w-full items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
          <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-brand-100">
            <span className="text-caption-bold font-caption-bold text-brand-700">
              {activePlan.plan_name[0]}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-body-bold font-body-bold text-default-font">
              Paquete actual: {activePlan.plan_name}
            </span>
            <span className="text-caption font-caption text-subtext-color">
              Vence el{" "}
              {new Date(activePlan.expires_at).toLocaleDateString("es-CO", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              {" · "}
              {activePlan.remaining_hours}h disponibles
              {activePlan.remaining_free_express > 0 &&
                ` · ${activePlan.remaining_free_express} Express gratis`}
            </span>
          </div>
        </div>
      )}

      {/* Nota categorías */}
      <div className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3">
        <p className="text-sm text-neutral-600">
          <strong className="text-neutral-800">Categoría A</strong> — Profesores a $65.000/hora ·{" "}
          <strong className="text-neutral-800">Categoría B</strong> — Profesores a $80.000/hora.
          Elige según el nivel y experiencia que buscas.
        </p>
      </div>

      {/* Grid de planes */}
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {grouped.map(({ plan, partner }) => {
          const isCurrent = isCurrentGroup(plan, partner);
          const displayPlan = isCurrent ? currentPlanInGroup(plan, partner) : plan;
          return (
            <PlanCard key={plan.id} plan={displayPlan} partner={partner} isCurrent={isCurrent} />
          );
        })}
      </div>

      {/* Compra de horas sueltas (cantidad libre) */}
      <BuyHoursForm plans={plans} />

      {/* Nota al pie */}
      <p className="text-caption font-caption text-neutral-400">
        Los paquetes vencen a los 30 días de la compra — no se renuevan automáticamente. Si comprás
        uno nuevo antes de que venza el actual, las horas restantes se suman y el vencimiento se
        extiende 30 días desde la nueva compra. Las horas no usadas al vencer un paquete no son
        reembolsables.
      </p>
    </div>
  );
}
