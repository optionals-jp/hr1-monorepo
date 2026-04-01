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
 * 途中で失敗した場合、作成済みのレコードをクリーンアップする
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
  let companyId: string | null = null;
  let contactId: string | null = null;
  let dealId: string | null = null;

  try {
    // 1. 企業作成
    const { data: company, error: companyErr } = await client
      .from("bc_companies")
      .insert({ organization_id: organizationId, name: options.companyName })
      .select("id")
      .single();
    if (companyErr) throw companyErr;
    companyId = company.id;

    // 2. 連絡先作成
    const { data: contact, error: contactErr } = await client
      .from("bc_contacts")
      .insert({
        organization_id: organizationId,
        company_id: companyId,
        last_name: options.contactName,
        email: options.contactEmail,
        phone: options.contactPhone,
      })
      .select("id")
      .single();
    if (contactErr) throw contactErr;
    contactId = contact.id;

    // 3. 商談作成
    const { data: deal, error: dealErr } = await client
      .from("bc_deals")
      .insert({
        organization_id: organizationId,
        company_id: companyId,
        contact_id: contactId,
        title: options.dealTitle,
        stage: options.dealStage ?? "initial",
        stage_id: options.dealStageId ?? null,
        pipeline_id: options.dealPipelineId ?? null,
        status: "open",
      })
      .select("id")
      .single();
    if (dealErr) throw dealErr;
    dealId = deal.id;

    // 4. リードをコンバート済に更新
    const { error: leadErr } = await client
      .from("bc_leads")
      .update({
        status: "converted",
        converted_company_id: companyId,
        converted_contact_id: contactId,
        converted_deal_id: dealId,
        converted_at: new Date().toISOString(),
      })
      .eq("id", leadId)
      .eq("organization_id", organizationId);
    if (leadErr) throw leadErr;

    return { companyId, contactId, dealId };
  } catch (err) {
    // 途中で失敗した場合、作成済みレコードをクリーンアップ（ベストエフォート）
    if (dealId) {
      await client.from("bc_deals").delete().eq("id", dealId).eq("organization_id", organizationId);
    }
    if (contactId) {
      await client
        .from("bc_contacts")
        .delete()
        .eq("id", contactId)
        .eq("organization_id", organizationId);
    }
    if (companyId) {
      await client
        .from("bc_companies")
        .delete()
        .eq("id", companyId)
        .eq("organization_id", organizationId);
    }
    throw err;
  }
}
