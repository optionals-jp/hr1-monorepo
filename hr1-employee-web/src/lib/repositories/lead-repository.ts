import type { SupabaseClient } from "@supabase/supabase-js";
import type { BcLead } from "@/types/database";

export async function fetchLeads(client: SupabaseClient, organizationId: string) {
  const { data, error } = await client
    .from("crm_leads")
    .select("*, profiles:assigned_to(display_name, email)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BcLead[];
}

export async function fetchLead(client: SupabaseClient, id: string, organizationId: string) {
  const { data, error } = await client
    .from("crm_leads")
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
): Promise<BcLead> {
  const { data: created, error } = await client.from("crm_leads").insert(data).select().single();
  if (error) throw error;
  return created as BcLead;
}

export async function updateLead(
  client: SupabaseClient,
  id: string,
  organizationId: string,
  data: Partial<BcLead>
) {
  const { error } = await client
    .from("crm_leads")
    .update(data)
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) throw error;
}

export async function deleteLead(client: SupabaseClient, id: string, organizationId: string) {
  const { error } = await client
    .from("crm_leads")
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
    existingCompanyId?: string | null;
    companyName: string;
    contactName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    dealTitle: string;
    dealStageId?: string;
    dealPipelineId?: string;
  }
) {
  let companyId: string | null = null;
  let createdCompany = false;
  let contactId: string | null = null;
  let dealId: string | null = null;

  try {
    // 1. 企業: 既存を使用 or 新規作成
    if (options.existingCompanyId) {
      companyId = options.existingCompanyId;
    } else {
      const { data: company, error: companyErr } = await client
        .from("crm_companies")
        .insert({ organization_id: organizationId, name: options.companyName })
        .select("id")
        .single();
      if (companyErr) throw companyErr;
      companyId = company.id;
      createdCompany = true;
    }

    // 2. 連絡先作成（担当者名がある場合のみ）
    if (options.contactName) {
      const { data: contact, error: contactErr } = await client
        .from("crm_contacts")
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
    }

    // 3. 商談作成
    const { data: deal, error: dealErr } = await client
      .from("crm_deals")
      .insert({
        organization_id: organizationId,
        company_id: companyId,
        contact_id: contactId,
        title: options.dealTitle,
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
      .from("crm_leads")
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
      await client.from("crm_deals").delete().eq("id", dealId).eq("organization_id", organizationId);
    }
    if (contactId) {
      await client
        .from("crm_contacts")
        .delete()
        .eq("id", contactId)
        .eq("organization_id", organizationId);
    }
    if (companyId && createdCompany) {
      await client
        .from("crm_companies")
        .delete()
        .eq("id", companyId)
        .eq("organization_id", organizationId);
    }
    throw err;
  }
}
