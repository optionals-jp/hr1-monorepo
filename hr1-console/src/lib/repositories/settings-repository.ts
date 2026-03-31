import type { SupabaseClient } from "@supabase/supabase-js";
import type { Organization, Department, SkillMaster, CertificationMaster } from "@/types/database";

// --- Organization ---

export async function fetchOrganization(client: SupabaseClient, organizationId: string) {
  const { data } = await client.from("organizations").select("*").eq("id", organizationId).single();
  return data as Organization | null;
}

export async function updateOrganization(
  client: SupabaseClient,
  organizationId: string,
  data: {
    name: string;
    industry: string | null;
    location: string | null;
    mission: string | null;
    employee_count: string | null;
    founded_year: number | null;
    website_url: string | null;
  }
) {
  return client.from("organizations").update(data).eq("id", organizationId).select().single();
}

// --- Profile (settings) ---

export async function fetchProfileDepartments(client: SupabaseClient, userId: string) {
  const { data } = await client
    .from("employee_departments")
    .select("department_id, departments(id, name)")
    .eq("user_id", userId);
  return (data ?? [])
    .map((row) => (row as unknown as { departments: Department }).departments)
    .filter(Boolean) as Department[];
}

export async function fetchAllDepartments(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("departments")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name");
  return (data ?? []) as Department[];
}

export async function updateProfile(
  client: SupabaseClient,
  userId: string,
  data: Record<string, unknown>
) {
  return client.from("profiles").update(data).eq("id", userId);
}

export async function replaceEmployeeDepartments(
  client: SupabaseClient,
  userId: string,
  departmentIds: string[]
) {
  await client.from("employee_departments").delete().eq("user_id", userId);
  if (departmentIds.length > 0) {
    await client
      .from("employee_departments")
      .insert(departmentIds.map((deptId) => ({ user_id: userId, department_id: deptId })));
  }
}

// --- Skills ---

export async function fetchSkillMasters(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("skill_masters")
    .select("*")
    .eq("organization_id", organizationId)
    .order("category", { nullsFirst: false })
    .order("name");
  return (data ?? []) as SkillMaster[];
}

export async function createSkillMaster(
  client: SupabaseClient,
  data: { organization_id: string; name: string; category: string | null }
) {
  return client.from("skill_masters").insert(data);
}

export async function deleteSkillMaster(
  client: SupabaseClient,
  id: string,
  organizationId: string
) {
  return client.from("skill_masters").delete().eq("id", id).eq("organization_id", organizationId);
}

// --- Certifications ---

export async function fetchCertificationMasters(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("certification_masters")
    .select("*")
    .eq("organization_id", organizationId)
    .order("category", { nullsFirst: false })
    .order("name");
  return (data ?? []) as CertificationMaster[];
}

export async function createCertificationMaster(
  client: SupabaseClient,
  data: { organization_id: string; name: string; category: string | null }
) {
  return client.from("certification_masters").insert(data);
}

export async function deleteCertificationMaster(
  client: SupabaseClient,
  id: string,
  organizationId: string
) {
  return client
    .from("certification_masters")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);
}

// --- Home Design ---

export async function fetchPageTabs(client: SupabaseClient, organizationId: string) {
  const { data, error } = await client
    .from("page_tabs")
    .select("*, page_sections(*)")
    .eq("organization_id", organizationId)
    .order("sort_order", { ascending: true });
  return { data, error };
}

export async function createPageTab(
  client: SupabaseClient,
  data: { organization_id: string; label: string; sort_order: number }
) {
  return client.from("page_tabs").insert(data).select().single();
}

export async function updatePageTab(
  client: SupabaseClient,
  id: string,
  organizationId: string,
  data: { label: string }
) {
  return client
    .from("page_tabs")
    .update(data)
    .eq("id", id)
    .eq("organization_id", organizationId)
    .select("id");
}

export async function deletePageTab(client: SupabaseClient, id: string, organizationId: string) {
  return client.from("page_tabs").delete().eq("id", id).eq("organization_id", organizationId);
}

export async function updatePageTabSortOrder(
  client: SupabaseClient,
  id: string,
  organizationId: string,
  sortOrder: number
) {
  return client
    .from("page_tabs")
    .update({ sort_order: sortOrder })
    .eq("id", id)
    .eq("organization_id", organizationId);
}

export async function createPageSection(
  client: SupabaseClient,
  data: {
    tab_id: string;
    type: string;
    title: string;
    content: string | null;
    items: Record<string, string>[] | null;
    sort_order: number;
  }
) {
  return client.from("page_sections").insert(data).select("id");
}

export async function updatePageSection(
  client: SupabaseClient,
  id: string,
  data: {
    type: string;
    title: string;
    content: string | null;
    items: Record<string, string>[] | null;
  }
) {
  return client.from("page_sections").update(data).eq("id", id).select("id");
}

export async function deletePageSection(client: SupabaseClient, id: string) {
  return client.from("page_sections").delete().eq("id", id);
}

export async function updatePageSectionSortOrder(
  client: SupabaseClient,
  id: string,
  sortOrder: number
) {
  return client.from("page_sections").update({ sort_order: sortOrder }).eq("id", id);
}
