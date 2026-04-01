import type { SupabaseClient } from "@supabase/supabase-js";
import type { BcCompany, BcContact, BcDeal, BcActivity, BcCard, BcTodo } from "@/types/database";

// --- Dashboard ---

export async function fetchDeals(client: SupabaseClient, organizationId: string) {
  const { data, error } = await client
    .from("bc_deals")
    .select("*, bc_companies(*), bc_contacts(*), profiles(display_name)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BcDeal[];
}

export async function fetchCompanyIds(client: SupabaseClient, organizationId: string) {
  const { data, error } = await client
    .from("bc_companies")
    .select("id")
    .eq("organization_id", organizationId);
  if (error) throw error;
  return (data ?? []) as { id: string }[];
}

export async function fetchContactIds(client: SupabaseClient, organizationId: string) {
  const { data, error } = await client
    .from("bc_contacts")
    .select("id")
    .eq("organization_id", organizationId);
  if (error) throw error;
  return (data ?? []) as { id: string }[];
}

// --- Companies ---

export async function fetchCompanies(client: SupabaseClient, organizationId: string) {
  const { data, error } = await client
    .from("bc_companies")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name");
  if (error) throw error;
  return (data ?? []) as BcCompany[];
}

export async function fetchCompany(client: SupabaseClient, id: string, organizationId: string) {
  const { data, error } = await client
    .from("bc_companies")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .single();
  if (error) throw error;
  return data as BcCompany | null;
}

export async function createCompany(
  client: SupabaseClient,
  data: Partial<BcCompany> & { organization_id: string; name: string }
) {
  const { error } = await client.from("bc_companies").insert(data);
  if (error) throw error;
}

export async function updateCompany(
  client: SupabaseClient,
  id: string,
  organizationId: string,
  data: Partial<BcCompany>
) {
  const { error } = await client
    .from("bc_companies")
    .update(data)
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) throw error;
}

export async function deleteCompany(client: SupabaseClient, id: string, organizationId: string) {
  const { error } = await client
    .from("bc_companies")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) throw error;
}

// --- Contacts ---

export async function fetchContacts(client: SupabaseClient, organizationId: string) {
  const { data, error } = await client
    .from("bc_contacts")
    .select("*, bc_companies(name)")
    .eq("organization_id", organizationId)
    .order("last_name");
  if (error) throw error;
  return (data ?? []) as BcContact[];
}

export async function fetchContact(client: SupabaseClient, id: string, organizationId: string) {
  const { data, error } = await client
    .from("bc_contacts")
    .select("*, bc_companies(*)")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .single();
  if (error) throw error;
  return data as BcContact | null;
}

export async function fetchContactsByCompany(
  client: SupabaseClient,
  companyId: string,
  organizationId: string
) {
  const { data, error } = await client
    .from("bc_contacts")
    .select("*")
    .eq("company_id", companyId)
    .eq("organization_id", organizationId)
    .order("last_name");
  if (error) throw error;
  return (data ?? []) as BcContact[];
}

// --- Deals ---

export async function fetchDealsAll(client: SupabaseClient, organizationId: string) {
  const { data, error } = await client
    .from("bc_deals")
    .select("*, bc_companies(name), bc_contacts(last_name, first_name)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BcDeal[];
}

export async function fetchDeal(client: SupabaseClient, id: string, organizationId: string) {
  const { data, error } = await client
    .from("bc_deals")
    .select("*, bc_companies(*), bc_contacts(*)")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .single();
  if (error) throw error;
  return data as BcDeal | null;
}

export async function fetchDealsByCompany(
  client: SupabaseClient,
  companyId: string,
  organizationId: string
) {
  const { data, error } = await client
    .from("bc_deals")
    .select("*")
    .eq("company_id", companyId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BcDeal[];
}

export async function fetchDealsByContact(
  client: SupabaseClient,
  contactId: string,
  organizationId: string
) {
  const { data, error } = await client
    .from("bc_deals")
    .select("*")
    .eq("contact_id", contactId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BcDeal[];
}

export async function createDeal(
  client: SupabaseClient,
  data: Partial<BcDeal> & { organization_id: string; title: string }
) {
  const { error } = await client.from("bc_deals").insert(data);
  if (error) throw error;
}

export async function updateDeal(
  client: SupabaseClient,
  id: string,
  organizationId: string,
  data: Partial<BcDeal>
) {
  const { error } = await client
    .from("bc_deals")
    .update(data)
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) throw error;
}

export async function deleteDeal(client: SupabaseClient, id: string, organizationId: string) {
  const { error } = await client
    .from("bc_deals")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) throw error;
}

// --- Activities ---

export async function fetchActivitiesByContact(
  client: SupabaseClient,
  contactId: string,
  organizationId: string
) {
  const { data, error } = await client
    .from("bc_activities")
    .select("*")
    .eq("contact_id", contactId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BcActivity[];
}

export async function fetchActivitiesByDeal(
  client: SupabaseClient,
  dealId: string,
  organizationId: string
) {
  const { data, error } = await client
    .from("bc_activities")
    .select("*")
    .eq("deal_id", dealId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BcActivity[];
}

// --- Cards ---

export async function fetchCardsByContact(
  client: SupabaseClient,
  contactId: string,
  organizationId: string
) {
  const { data, error } = await client
    .from("bc_cards")
    .select("*")
    .eq("contact_id", contactId)
    .eq("organization_id", organizationId)
    .order("scanned_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BcCard[];
}

// --- Todos ---

export async function fetchTodosByDeal(
  client: SupabaseClient,
  dealId: string,
  organizationId: string
) {
  const { data, error } = await client
    .from("bc_todos")
    .select("*")
    .eq("deal_id", dealId)
    .eq("organization_id", organizationId)
    .order("due_date");
  if (error) throw error;
  return (data ?? []) as BcTodo[];
}
