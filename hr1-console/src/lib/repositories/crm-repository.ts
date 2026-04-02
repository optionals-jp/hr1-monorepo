import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BcCompany,
  BcContact,
  BcDeal,
  BcActivity,
  BcCard,
  BcTodo,
  CrmDealStageHistory,
} from "@/types/database";

// --- Stage History ---

export async function createStageHistory(
  client: SupabaseClient,
  data: {
    organization_id: string;
    deal_id: string;
    from_stage_id: string | null;
    to_stage_id: string;
    from_stage_name: string | null;
    to_stage_name: string;
    changed_by: string | null;
  }
) {
  const { error } = await client.from("crm_deal_stage_history").insert(data);
  if (error) throw error;
}

export async function fetchStageHistory(
  client: SupabaseClient,
  organizationId: string,
  dealId?: string
) {
  let query = client
    .from("crm_deal_stage_history")
    .select("*, profiles:changed_by(display_name, email)")
    .eq("organization_id", organizationId)
    .order("changed_at", { ascending: false });
  if (dealId) {
    query = query.eq("deal_id", dealId);
  }
  const { data, error } = await query.limit(500);
  if (error) throw error;
  return (data ?? []) as CrmDealStageHistory[];
}

// --- Dashboard aggregation ---

export async function fetchRecentActivities(
  client: SupabaseClient,
  organizationId: string,
  limit = 10
) {
  const { data, error } = await client
    .from("bc_activities")
    .select("*, profiles:created_by(display_name, email)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as BcActivity[];
}

export async function fetchUpcomingTodos(client: SupabaseClient, organizationId: string) {
  const { data, error } = await client
    .from("bc_todos")
    .select("*, profiles:assigned_to(display_name, email)")
    .eq("organization_id", organizationId)
    .eq("is_completed", false)
    .order("due_date", { ascending: true })
    .limit(10);
  if (error) throw error;
  return (data ?? []) as BcTodo[];
}

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
): Promise<BcDeal> {
  const { data: created, error } = await client.from("bc_deals").insert(data).select().single();
  if (error) throw error;
  return created as BcDeal;
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
    .select("*, profiles:created_by(display_name, email)")
    .eq("contact_id", contactId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BcActivity[];
}

export async function fetchActivitiesByCompany(
  client: SupabaseClient,
  companyId: string,
  organizationId: string
) {
  const { data, error } = await client
    .from("bc_activities")
    .select("*, profiles:created_by(display_name, email)")
    .eq("company_id", companyId)
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
    .select("*, profiles:created_by(display_name, email)")
    .eq("deal_id", dealId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BcActivity[];
}

export async function createActivity(
  client: SupabaseClient,
  data: {
    organization_id: string;
    activity_type: string;
    title: string;
    description?: string | null;
    deal_id?: string | null;
    lead_id?: string | null;
    company_id?: string | null;
    contact_id?: string | null;
    activity_date: string;
    created_by?: string | null;
  }
): Promise<BcActivity> {
  const { data: created, error } = await client
    .from("bc_activities")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return created as BcActivity;
}

export async function createTodo(
  client: SupabaseClient,
  data: {
    organization_id: string;
    title: string;
    description?: string | null;
    deal_id?: string | null;
    lead_id?: string | null;
    company_id?: string | null;
    contact_id?: string | null;
    due_date?: string | null;
    assigned_to?: string | null;
    created_by?: string | null;
  }
): Promise<BcTodo> {
  const { data: created, error } = await client.from("bc_todos").insert(data).select().single();
  if (error) throw error;
  return created as BcTodo;
}

export async function toggleTodoComplete(
  client: SupabaseClient,
  todoId: string,
  organizationId: string,
  isCompleted: boolean
): Promise<void> {
  const { error } = await client
    .from("bc_todos")
    .update({
      is_completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : null,
    })
    .eq("id", todoId)
    .eq("organization_id", organizationId);
  if (error) throw error;
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

export async function fetchActivitiesByLead(
  client: SupabaseClient,
  leadId: string,
  organizationId: string
) {
  const { data, error } = await client
    .from("bc_activities")
    .select("*, profiles:created_by(display_name, email)")
    .eq("lead_id", leadId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BcActivity[];
}

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
