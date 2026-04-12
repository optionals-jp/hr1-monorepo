import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationTemplate } from "@/types/database";

export async function fetchTemplates(client: SupabaseClient, orgId: string) {
  const { data } = await client
    .from("notification_templates")
    .select("*")
    .eq("organization_id", orgId)
    .order("trigger_event");
  return (data ?? []) as NotificationTemplate[];
}

export async function upsertTemplate(
  client: SupabaseClient,
  orgId: string,
  triggerEvent: string,
  titleTemplate: string,
  bodyTemplate: string,
  isActive: boolean
) {
  return client.from("notification_templates").upsert(
    {
      organization_id: orgId,
      trigger_event: triggerEvent,
      title_template: titleTemplate,
      body_template: bodyTemplate,
      is_active: isActive,
    },
    { onConflict: "organization_id,trigger_event" }
  );
}
