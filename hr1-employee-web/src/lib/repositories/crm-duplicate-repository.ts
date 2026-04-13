import type { SupabaseClient } from "@supabase/supabase-js";

export interface CompanyDuplicate {
  id: string;
  name: string;
  name_kana: string | null;
  corporate_number: string | null;
  similarity_score: number;
  match_type: string;
}

export interface ContactDuplicate {
  id: string;
  last_name: string;
  first_name: string | null;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  match_type: string;
}

export async function findSimilarCompanies(
  client: SupabaseClient,
  orgId: string,
  name: string,
  corporateNumber?: string | null
): Promise<CompanyDuplicate[]> {
  const { data, error } = await client.rpc("crm_find_similar_companies", {
    p_org_id: orgId,
    p_name: name,
    p_corporate_number: corporateNumber ?? null,
    p_threshold: 0.3,
  });
  if (error) throw error;
  return (data ?? []) as CompanyDuplicate[];
}

export async function findSimilarContacts(
  client: SupabaseClient,
  orgId: string,
  params: { email?: string; phone?: string; lastName?: string; firstName?: string }
): Promise<ContactDuplicate[]> {
  const { data, error } = await client.rpc("crm_find_similar_contacts", {
    p_org_id: orgId,
    p_email: params.email ?? null,
    p_phone: params.phone ?? null,
    p_last_name: params.lastName ?? null,
    p_first_name: params.firstName ?? null,
  });
  if (error) throw error;
  return (data ?? []) as ContactDuplicate[];
}
