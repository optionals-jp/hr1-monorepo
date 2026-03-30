"use client";

import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as repo from "@/lib/repositories/project-repository";
import type { Project, ProjectTeam, ProjectTeamMember, Profile } from "@/types/database";

export interface TeamWithMembers extends ProjectTeam {
  members: (ProjectTeamMember & { profiles: Profile })[];
}

export function useProjects() {
  return useOrgQuery<(Project & { team_count: number })[]>("projects", async (orgId) => {
    const data = await repo.fetchProjects(getSupabase(), orgId);
    return data.map((p) => ({
      ...p,
      team_count: ((p as Record<string, unknown>).project_teams as { id: string }[])?.length ?? 0,
    }));
  });
}

export async function loadProjectDetail(
  id: string,
  orgId: string
): Promise<{ project: Project | null; teams: TeamWithMembers[] }> {
  const client = getSupabase();

  const { data: proj } = await repo.fetchProjectById(client, id, orgId);

  let teams: TeamWithMembers[] = [];
  if (proj) {
    const { data: teamData } = await repo.fetchTeams(client, id);
    const teamIds = (teamData ?? []).map((t) => t.id);

    let membersData: Record<string, unknown>[] = [];
    if (teamIds.length > 0) {
      const { data } = await repo.fetchTeamMembers(client, teamIds);
      membersData = (data ?? []) as Record<string, unknown>[];
    }

    teams = (teamData ?? []).map((team) => ({
      ...team,
      members: membersData
        .filter((m) => (m as { team_id: string }).team_id === team.id)
        .map((m) => m as unknown as ProjectTeamMember & { profiles: Profile }),
    }));
  }

  return { project: proj, teams };
}

export async function createProject(
  orgId: string,
  data: {
    name: string;
    description: string;
    status: string;
    startDate: string;
    endDate: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await repo.insertProject(getSupabase(), {
      id: crypto.randomUUID(),
      organization_id: orgId,
      name: data.name.trim(),
      description: data.description.trim() || null,
      status: data.status,
      start_date: data.startDate || null,
      end_date: data.endDate || null,
    });
    if (error) throw error;
    return { success: true };
  } catch {
    return { success: false, error: "プロジェクトの作成に失敗しました" };
  }
}

export async function updateProjectById(
  id: string,
  organizationId: string,
  data: {
    name: string;
    description: string;
    status: string;
    startDate: string;
    endDate: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await repo.updateProject(getSupabase(), id, organizationId, {
      name: data.name.trim(),
      description: data.description.trim() || null,
      status: data.status,
      start_date: data.startDate || null,
      end_date: data.endDate || null,
    });
    if (error) throw error;
    return { success: true };
  } catch {
    return { success: false, error: "プロジェクトの更新に失敗しました" };
  }
}

export async function deleteProjectById(
  id: string,
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await repo.deleteProject(getSupabase(), id, organizationId);
    if (error) throw error;
    return { success: true };
  } catch {
    return { success: false, error: "プロジェクトの削除に失敗しました" };
  }
}

export async function addTeam(
  projectId: string,
  data: { name: string; description: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await repo.insertTeam(getSupabase(), {
      id: crypto.randomUUID(),
      project_id: projectId,
      name: data.name.trim(),
      description: data.description.trim() || null,
    });
    if (error) throw error;
    return { success: true };
  } catch {
    return { success: false, error: "チームの追加に失敗しました" };
  }
}

export async function deleteTeamById(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await repo.deleteTeam(getSupabase(), id);
    if (error) throw error;
    return { success: true };
  } catch {
    return { success: false, error: "チームの削除に失敗しました" };
  }
}

export async function addTeamMembers(
  teamId: string,
  employeeIds: string[],
  role: string,
  joinedAt: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const rows = employeeIds.map((userId) => ({
      id: crypto.randomUUID(),
      team_id: teamId,
      user_id: userId,
      role,
      joined_at: joinedAt || new Date().toISOString(),
    }));
    const { error } = await repo.insertTeamMembers(getSupabase(), rows);
    if (error) throw error;
    return { success: true };
  } catch {
    return { success: false, error: "メンバーの追加に失敗しました" };
  }
}

export async function updateTeamMember(
  id: string,
  data: { role: string; joinedAt: string; leftAt: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await repo.updateTeamMember(getSupabase(), id, {
      role: data.role,
      joined_at: data.joinedAt || new Date().toISOString(),
      left_at: data.leftAt || null,
    });
    if (error) throw error;
    return { success: true };
  } catch {
    return { success: false, error: "メンバー情報の更新に失敗しました" };
  }
}

export async function removeTeamMember(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await repo.deleteTeamMember(getSupabase(), id);
    if (error) throw error;
    return { success: true };
  } catch {
    return { success: false, error: "メンバーの削除に失敗しました" };
  }
}

export async function fetchOrgEmployeesForTeam(
  orgId: string,
  existingIds: Set<string>
): Promise<Profile[]> {
  const { data } = await repo.fetchOrgEmployees(getSupabase(), orgId);
  const profiles = (data ?? [])
    .map((row) => (row as unknown as { profiles: Profile }).profiles)
    .filter(Boolean);
  return profiles.filter((p) => !existingIds.has(p.id));
}
