import type { SupabaseClient } from "@supabase/supabase-js";
import type { CrmEmailTemplate } from "@/types/database";

export async function fetchTemplates(
  client: SupabaseClient,
  organizationId: string
): Promise<CrmEmailTemplate[]> {
  const { data, error } = await client
    .from("crm_email_templates")
    .select("*")
    .eq("organization_id", organizationId)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as CrmEmailTemplate[];
}

export async function createTemplate(
  client: SupabaseClient,
  template: Omit<CrmEmailTemplate, "id" | "created_at" | "updated_at">
): Promise<CrmEmailTemplate> {
  const { data, error } = await client
    .from("crm_email_templates")
    .insert(template)
    .select()
    .single();
  if (error) throw error;
  return data as CrmEmailTemplate;
}

export async function updateTemplate(
  client: SupabaseClient,
  templateId: string,
  organizationId: string,
  updates: Partial<Pick<CrmEmailTemplate, "name" | "subject" | "body" | "category" | "is_active">>
): Promise<void> {
  const { error } = await client
    .from("crm_email_templates")
    .update(updates)
    .eq("id", templateId)
    .eq("organization_id", organizationId);
  if (error) throw error;
}

export async function deleteTemplate(
  client: SupabaseClient,
  templateId: string,
  organizationId: string
): Promise<void> {
  const { error } = await client
    .from("crm_email_templates")
    .delete()
    .eq("id", templateId)
    .eq("organization_id", organizationId);
  if (error) throw error;
}

/**
 * テンプレート変数を置換する
 * {{contact_name}}, {{company_name}}, {{deal_title}}, {{deal_amount}} 等
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string | null | undefined>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = variables[key as string];
    return value ?? match;
  });
}
