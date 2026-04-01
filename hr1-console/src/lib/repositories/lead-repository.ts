import type { SupabaseClient } from "@supabase/supabase-js";
import type { BcLead } from "@/types/database";

export async function fetchLeads(client: SupabaseClient, organizationId: string) {
  const { data, error } = await client
    .from("bc_leads")
    .select("*, profiles:assigned_to(display_name, email)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BcLead[];
}

export async function fetchLead(client: SupabaseClient, id: string, organizationId: string) {
  const { data, error } = await client
    .from("bc_leads")
    .select("*, profiles:assigned_to(display_name, email)")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .single();
  if (error) throw error;
  return data as BcLead | null;
}

export async function createLead(
  client: SupabaseClient,
  data: Partial<BcLead> & { organization_id: string; name: string }
) {
  const { error } = await client.from("bc_leads").insert(data);
  if (error) throw error;
}

export async function updateLead(
  client: SupabaseClient,
  id: string,
  organizationId: string,
  data: Partial<BcLead>
) {
  const { error } = await client
    .from("bc_leads")
    .update(data)
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) throw error;
}

export async function deleteLead(client: SupabaseClient, id: string, organizationId: string) {
  const { error } = await client
    .from("bc_leads")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) throw error;
}

/**
 * リードコンバージョン: リード→企業+連絡先+商談を一括作成
 */
export async function convertLead(
  client: SupabaseClient,
  leadId: string,
  organizationId: string,
  options: {
    companyName: string;
    contactName: string;
    contactEmail: string | null;
    contactPhone: string | null;
    dealTitle: string;
    dealStage?: string;
    dealStageId?: string;
    dealPipelineId?: string;
  }
) {
  // 1. 企業作成
  const { data: company, error: companyErr } = await client
    .from("bc_companies")
    .insert({
      organization_id: organizationId,
      name: options.companyName,
    })
    .select("id")
    .single();
  if (companyErr) throw companyErr;

  // 2. 連絡先作成
  const { data: contact, error: contactErr } = await client
    .from("bc_contacts")
    .insert({
      organization_id: organizationId,
      company_id: company.id,
      last_name: options.contactName,
      email: options.contactEmail,
      phone: options.contactPhone,
    })
    .select("id")
    .single();
  if (contactErr) throw contactErr;

  // 3. 商談作成
  const { data: deal, error: dealErr } = await client
    .from("bc_deals")
    .insert({
      organization_id: organizationId,
      company_id: company.id,
      contact_id: contact.id,
      title: options.dealTitle,
      stage: options.dealStage ?? "initial",
      stage_id: options.dealStageId ?? null,
      pipeline_id: options.dealPipelineId ?? null,
      status: "open",
    })
    .select("id")
    .single();
  if (dealErr) throw dealErr;

  // 4. リードをコンバート済に更新
  const { error: leadErr } = await client
    .from("bc_leads")
    .update({
      status: "converted",
      converted_company_id: company.id,
      converted_contact_id: contact.id,
      converted_deal_id: deal.id,
      converted_at: new Date().toISOString(),
    })
    .eq("id", leadId)
    .eq("organization_id", organizationId);
  if (leadErr) throw leadErr;

  return { companyId: company.id, contactId: contact.id, dealId: deal.id };
}
