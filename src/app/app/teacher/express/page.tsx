import { ExpressRequestList } from "@/components/custom/express/ExpressRequestList";
import { createClient } from "@/lib/supabase/server";
import { getTeacherProfile } from "@/services/teachers";
import { FeatherZap } from "@subframe/core";
import { redirect } from "next/navigation";

export const metadata = { title: "Solicitudes Express — Yleis" };
export const dynamic = "force-dynamic";

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

export type ExpressRequestItem = {
  id: string;
  description: string | null;
  price_min: number;
  price_max: number;
  expires_at: string;
  subject_name: string;
};

export default async function TeacherExpressPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const teacher = await getTeacherProfile(supabase, user.id);
  if (!teacher || teacher.onboarding_step !== "verified") redirect("/app/teacher/onboarding");

  const now = new Date().toISOString();
  // biome-ignore lint/suspicious/noExplicitAny: express_sessions not in typed schema
  const { data: raw } = await (supabase as any)
    .from("express_sessions")
    .select("id, description, price_min, price_max, expires_at, subjects(name)")
    .eq("status", "searching")
    .gt("expires_at", now)
    .lte("price_min", teacher.hourly_rate ?? 0)
    .gte("price_max", teacher.hourly_rate ?? 0)
    .order("expires_at", { ascending: true });

  // biome-ignore lint/suspicious/noExplicitAny: raw row
  const requests: ExpressRequestItem[] = (raw ?? []).map((r: any) => ({
    id: r.id as string,
    description: (r.description as string | null) ?? null,
    price_min: r.price_min as number,
    price_max: r.price_max as number,
    expires_at: r.expires_at as string,
    subject_name: (r.subjects?.name as string) ?? "Clase",
  }));

  return (
    <div className="bg-neutral-50 min-h-full">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100">
            <FeatherZap className="h-5 w-5 text-brand-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Solicitudes Express</h1>
            <p className="mt-0.5 text-sm text-neutral-500">
              Solicitudes activas que coinciden con tu tarifa de{" "}
              {teacher.hourly_rate ? formatCOP(teacher.hourly_rate) : "—"}/hora
            </p>
          </div>
        </div>

        <ExpressRequestList initialRequests={requests} />
      </div>
    </div>
  );
}
