import type { SupabaseClient } from "@supabase/supabase-js";
import type { Project, ProjectTeam, ProjectTeamMember } from "@/types/database";

export async function fetchMyProjects(
  client: SupabaseClient,
  organizationId: string,
  userId: string
) {
  const { data: memberRows, error: memberError } = await client
    .from("project_team_members")
    .select("team_id, project_teams!inner(project_id)")
    .eq("user_id", userId);
  if (memberError) throw memberError;

  const projectIds = [
    ...new Set(
      (memberRows ?? []).map(
        (r) => (r.project_teams as unknown as { project_id: string }).project_id
      )
    ),
  ];
  if (projectIds.length === 0) return [];

  const { data, error } = await client
    .from("projects")
    .select("*")
    .eq("organization_id", organizationId)
    .in("id", projectIds)
    .in("status", ["active", "completed"])
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Project[];
}

export async function fetchAllProjects(client: SupabaseClient, organizationId: string) {
  const { data, error } = await client
    .from("projects")
    .select("*")
    .eq("organization_id", organizationId)
    .in("status", ["active", "completed"])
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Project[];
}

export async function fetchTeams(client: SupabaseClient, projectId: string) {
  const { data, error } = await client
    .from("project_teams")
    .select("*")
    .eq("project_id", projectId)
    .order("name");
  if (error) throw error;
  return (data ?? []) as ProjectTeam[];
}

export async function fetchTeamMembers(client: SupabaseClient, teamIds: string[]) {
  if (teamIds.length === 0) return [];
  const { data, error } = await client
    .from("project_team_members")
    .select("*, profiles:user_id(display_name, email, avatar_url)")
    .in("team_id", teamIds)
    .order("joined_at");
  if (error) throw error;
  return (data ?? []) as ProjectTeamMember[];
}
