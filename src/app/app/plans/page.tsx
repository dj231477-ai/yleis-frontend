import { PlanCard } from "@/components/custom/plans/PlanCard";
import { createClient } from "@/lib/supabase/server";
import { getActivePlan, getAllPlans } from "@/services/plans";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  activated?: string;
  payment?: string;
}>;

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

  return (
    <div className="flex w-full flex-col items-start gap-8 px-6 py-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-heading-2 font-heading-2 text-default-font">Planes</h1>
        <p className="text-body font-body text-subtext-color">
          Elige el plan que mejor se adapte a tu ritmo de aprendizaje.
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
              Plan actual: {activePlan.plan_name}
            </span>
            <span className="text-caption font-caption text-subtext-color">
              Vence el{" "}
              {new Date(activePlan.expires_at).toLocaleDateString("es-CO", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              {" · "}
              {activePlan.remaining_classes} clase
              {activePlan.remaining_classes !== 1 ? "s" : ""} disponible
              {activePlan.remaining_classes !== 1 ? "s" : ""}
              {activePlan.remaining_free_express > 0 &&
                ` · ${activePlan.remaining_free_express} Express gratis`}
            </span>
          </div>
        </div>
      )}

      {/* Grid de planes */}
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} isCurrent={plan.slug === currentSlug} />
        ))}
      </div>

      {/* Nota al pie */}
      <p className="text-caption font-caption text-neutral-400">
        Los planes se renuevan automáticamente cada 30 días. Las clases no usadas no son
        reembolsables. Estándar y Premium acumulan hasta{" "}
        {plans.find((p) => p.slug === "standard")?.rollover_classes ?? 1}/
        {plans.find((p) => p.slug === "premium")?.rollover_classes ?? 2} clase al renovar.
      </p>
    </div>
  );
}
