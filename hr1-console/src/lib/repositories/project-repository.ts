import type { SupabaseClient } from "@supabase/supabase-js";

// ─── Projects ───

export async function fetchProjects(client: SupabaseClient, orgId: string) {
  const { data } = await client
    .from("projects")
    .select("*, project_teams(id)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function fetchActiveProjects(client: SupabaseClient, orgId: string) {
  const { data } = await client
    .from("projects")
    .select("*")
    .eq("organization_id", orgId)
    .in("status", ["active"])
    .order("name");
  return data ?? [];
}

export async function fetchProjectById(client: SupabaseClient, id: string, orgId: string) {
  return client.from("projects").select("*").eq("id", id).eq("organization_id", orgId).single();
}

export async function insertProject(client: SupabaseClient, row: Record<string, unknown>) {
  return client.from("projects").insert(row);
}

export async function updateProject(
  client: SupabaseClient,
  id: string,
  organizationId: string,
  data: Record<string, unknown>
) {
  return client.from("projects").update(data).eq("id", id).eq("organization_id", organizationId);
}

export async function deleteProject(client: SupabaseClient, id: string, organizationId: string) {
  return client.from("projects").delete().eq("id", id).eq("organization_id", organizationId);
}

// ─── Teams ───

export async function fetchTeams(client: SupabaseClient, projectId: string) {
  return client.from("project_teams").select("*").eq("project_id", projectId).order("created_at");
}

export async function fetchTeamsByProjectId(client: SupabaseClient, projectId: string) {
  const { data } = await client
    .from("project_teams")
    .select("*")
    .eq("project_id", projectId)
    .order("name");
  return data ?? [];
}

export async function insertTeam(client: SupabaseClient, row: Record<string, unknown>) {
  return client.from("project_teams").insert(row);
}

// project_teams はorganization_idカラムを持たない（親テーブル projects 経由でテナント分離）
export async function deleteTeam(client: SupabaseClient, id: string) {
  return client.from("project_teams").delete().eq("id", id);
}

// ─── Team Members ───

export async function fetchTeamMembers(client: SupabaseClient, teamIds: string[]) {
  return client
    .from("project_team_members")
    .select("*, profiles:user_id(id, email, display_name, avatar_url, position, department)")
    .in("team_id", teamIds);
}

export async function insertTeamMembers(client: SupabaseClient, rows: Record<string, unknown>[]) {
  return client.from("project_team_members").insert(rows);
}

// project_team_members はorganization_idカラムを持たない（親テーブル project_teams 経由でテナント分離）
export async function updateTeamMember(
  client: SupabaseClient,
  id: string,
  data: Record<string, unknown>
) {
  return client.from("project_team_members").update(data).eq("id", id);
}

// project_team_members はorganization_idカラムを持たない（親テーブル project_teams 経由でテナント分離）
export async function deleteTeamMember(client: SupabaseClient, id: string) {
  return client.from("project_team_members").delete().eq("id", id);
}

// ─── Org employees ───

export async function fetchOrgEmployees(client: SupabaseClient, orgId: string) {
  return client
    .from("user_organizations")
    .select("profiles!inner(id, email, display_name, position)")
    .eq("organization_id", orgId)
    .eq("profiles.role", "employee");
}
