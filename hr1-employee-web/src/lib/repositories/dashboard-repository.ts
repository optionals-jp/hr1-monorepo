import type { SupabaseClient } from "@supabase/supabase-js";
import type { DashboardWidgetConfig, DashboardWidgetPreference } from "@/types/database";

export async function fetchWidgetPreferences(
  client: SupabaseClient,
  organizationId: string,
  userId: string
) {
  const { data, error } = await client
    .from("dashboard_widget_preferences")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as DashboardWidgetPreference | null;
}

export async function upsertWidgetPreferences(
  client: SupabaseClient,
  data: {
    organization_id: string;
    user_id: string;
    product_tab: DashboardWidgetPreference["product_tab"];
    widget_config: DashboardWidgetConfig[];
  }
) {
  const { error } = await client.from("dashboard_widget_preferences").upsert(data, {
    onConflict: "user_id,organization_id,product_tab",
  });
  if (error) throw error;
}
