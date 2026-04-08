import type { SupabaseClient } from "@supabase/supabase-js";
import type { BcDealContact, DealContactRole } from "@/types/database";

export async function fetchDealContacts(
  client: SupabaseClient,
  dealId: string,
  organizationId: string
) {
  const { data, error } = await client
    .from("bc_deal_contacts")
    .select(
      "*, bc_contacts(id, last_name, first_name, email, phone, department, position, company_id, bc_companies(name))"
    )
    .eq("deal_id", dealId)
    .eq("organization_id", organizationId)
    .order("is_primary", { ascending: false })
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as BcDealContact[];
}

export async function fetchContactDeals(
  client: SupabaseClient,
  contactId: string,
  organizationId: string
) {
  const { data, error } = await client
    .from("bc_deal_contacts")
    .select("*, bc_deals:deal_id(id, title, amount, status, stage)")
    .eq("contact_id", contactId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addDealContact(
  client: SupabaseClient,
  params: {
    organization_id: string;
    deal_id: string;
    contact_id: string;
    role: DealContactRole;
    is_primary?: boolean;
    notes?: string | null;
  }
) {
  const { data, error } = await client.from("bc_deal_contacts").insert(params).select().single();
  if (error) throw error;
  return data as BcDealContact;
}

export async function updateDealContact(
  client: SupabaseClient,
  id: string,
  organizationId: string,
  data: Partial<Pick<BcDealContact, "role" | "is_primary" | "notes">>
) {
  const { error } = await client
    .from("bc_deal_contacts")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) throw error;
}

export async function removeDealContact(
  client: SupabaseClient,
  id: string,
  organizationId: string
) {
  const { error } = await client
    .from("bc_deal_contacts")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) throw error;
}

/**
 * プライマリ連絡先を設定（既存のプライマリを解除してから設定）
 */
export async function setPrimaryContact(
  client: SupabaseClient,
  dealId: string,
  dealContactId: string,
  organizationId: string
) {
  // 既存のプライマリを解除
  const { error: resetError } = await client
    .from("bc_deal_contacts")
    .update({ is_primary: false, updated_at: new Date().toISOString() })
    .eq("deal_id", dealId)
    .eq("organization_id", organizationId)
    .eq("is_primary", true);
  if (resetError) throw resetError;

  // 新しいプライマリを設定
  const { error } = await client
    .from("bc_deal_contacts")
    .update({ is_primary: true, updated_at: new Date().toISOString() })
    .eq("id", dealContactId)
    .eq("organization_id", organizationId);
  if (error) throw error;
}
