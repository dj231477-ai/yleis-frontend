import type { Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Plan = {
  id: string;
  slug: string;
  name: string;
  price_cop: number;
  hours_included: number;
  free_express_per_month: number;
  reschedules_per_month: number;
  express_discount: number;
  sort_order: number;
};

export type ActivePlan = {
  membership_id: string;
  plan_slug: string;
  plan_name: string;
  price_cop: number;
  hours_included: number;
  free_express_per_month: number;
  reschedules_per_month: number;
  express_discount: number;
  remaining_hours: number;
  remaining_free_express: number;
  remaining_reschedules: number;
  expires_at: string;
} | null;

export const FREE_PLAN_DEFAULTS = {
  plan_slug: "free",
  plan_name: "Gratuito",
  price_cop: 0,
  hours_included: 0,
  free_express_per_month: 0,
  reschedules_per_month: 0,
  express_discount: 0,
  remaining_hours: 0,
  remaining_free_express: 0,
  remaining_reschedules: 0,
} as const;

export async function getAllPlans(supabase: SupabaseClient<Database>): Promise<Plan[]> {
  const { data } = await supabase
    .from("membership_plans")
    .select(
      "id, slug, name, price, hours_included, free_express_per_month, reschedules_per_month, express_discount, sort_order"
    )
    .eq("is_active", true)
    .order("sort_order");

  return (data ?? []).map((p) => ({
    id: p.id,
    slug: p.slug ?? "",
    name: p.name,
    price_cop: Number(p.price),
    hours_included: Number(p.hours_included ?? 0),
    free_express_per_month: p.free_express_per_month ?? 0,
    reschedules_per_month: p.reschedules_per_month ?? 0,
    express_discount: Number(p.express_discount ?? 0),
    sort_order: p.sort_order ?? 0,
  }));
}

export async function getActivePlan(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<ActivePlan> {
  const { data } = await supabase.rpc("get_active_plan", {
    p_user_id: userId,
  });

  if (!data || data.length === 0) return null;
  const row = data[0];
  return {
    membership_id: row.membership_id,
    plan_slug: row.plan_slug ?? "free",
    plan_name: row.plan_name ?? "Gratuito",
    price_cop: Number(row.price_cop ?? 0),
    hours_included: Number(row.hours_included ?? 0),
    free_express_per_month: row.free_express_per_month ?? 0,
    reschedules_per_month: row.reschedules_per_month ?? 0,
    express_discount: Number(row.express_discount ?? 0),
    remaining_hours: Number(row.remaining_hours ?? 0),
    remaining_free_express: row.remaining_free_express ?? 0,
    remaining_reschedules: row.remaining_reschedules ?? 0,
    expires_at: row.expires_at ?? "",
  };
}
