"use client";

import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import { useOrg } from "@/lib/org-context";
import { useQuery } from "@/lib/use-query";
import * as repo from "@/lib/repositories/task-repository";
import type { Task, Project, ProjectTeam } from "@/types/database";

interface Employee {
  id: string;
  email: string;
  display_name: string | null;
}

export type TaskRow = Task & {
  creator?: { display_name: string | null; email: string } | null;
  projects?: { id: string; name: string } | null;
  project_teams?: { id: string; name: string } | null;
  assignee_count?: number;
  completed_count?: number;
};

export function useTasks() {
  return useOrgQuery<TaskRow[]>("tasks", async (orgId) => {
    const data = await repo.fetchTasks(getSupabase(), orgId);
    return data.map((t) => {
      const assignees = (t as unknown as { task_assignees: { id: string; status: string }[] })
        .task_assignees;
      return {
        ...t,
        assignee_count: assignees?.length ?? 0,
        completed_count: assignees?.filter((a) => a.status === "completed").length ?? 0,
      } as TaskRow;
    });
  });
}

export function useTaskEmployees() {
  return useOrgQuery<Employee[]>("employees-list", async (orgId) =>
    repo.fetchEmployees(getSupabase(), orgId)
  );
}

export function useTaskProjects() {
  return useOrgQuery<Project[]>("projects-list", async (orgId) =>
    repo.fetchActiveProjects(getSupabase(), orgId)
  );
}

export function useTaskTeams(projectId: string, scope: string) {
  const { organization } = useOrg();
  return useQuery<(ProjectTeam & { project_name?: string })[]>(
    organization && scope === "team" && projectId ? `teams-${projectId}` : null,
    async () => repo.fetchProjectTeams(getSupabase(), projectId)
  );
}

export async function createTask(
  orgId: string,
  userId: string,
  data: {
    title: string;
    description: string;
    priority: string;
    scope: string;
    projectId: string;
    teamId: string;
    dueDate: string;
    assignAll: boolean;
    assigneeIds: string[];
  },
  employees: Employee[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getSupabase();
    const { data: inserted, error } = await repo.insertTask(client, {
      organization_id: orgId,
      title: data.title.trim(),
      description: data.description.trim() || null,
      status: "open",
      priority: data.priority,
      scope: data.scope,
      project_id: data.scope === "project" || data.scope === "team" ? data.projectId || null : null,
      team_id: data.scope === "team" ? data.teamId || null : null,
      due_date: data.dueDate || null,
      assign_to_all: data.assignAll,
      created_by: userId,
      source: "console",
    });
    if (error || !inserted) throw error;

    const taskId = inserted.id;

    if (data.assignAll) {
      const assignees = employees.map((e) => ({
        task_id: taskId,
        user_id: e.id,
      }));
      if (assignees.length > 0) {
        const { error: aErr } = await repo.insertAssignees(client, assignees);
        if (aErr) {
          await repo.deleteTask(client, taskId, orgId);
          throw aErr;
        }
      }
    } else if (data.assigneeIds.length > 0) {
      const assignees = data.assigneeIds.map((uid) => ({
        task_id: taskId,
        user_id: uid,
      }));
      const { error: aErr } = await repo.insertAssignees(client, assignees);
      if (aErr) {
        await repo.deleteTask(client, taskId, orgId);
        throw aErr;
      }
    }

    return { success: true };
  } catch {
    return { success: false, error: "タスクの作成に失敗しました" };
  }
}

export async function updateTaskStatus(
  taskId: string,
  organizationId: string,
  newStatus: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await repo.updateTask(getSupabase(), taskId, organizationId, {
    status: newStatus,
    updated_at: new Date().toISOString(),
  });
  if (error) return { success: false, error: "更新に失敗しました" };
  return { success: true };
}

export async function loadTaskDetail(id: string, orgId: string) {
  const client = getSupabase();
  const { data: taskData } = await repo.fetchTaskById(client, id, orgId);
  if (!taskData) return { task: null, assignees: [] };

  const { data: assigneeData } = await repo.fetchAssignees(client, id);
  return { task: taskData, assignees: assigneeData ?? [] };
}

export async function updateTaskById(
  id: string,
  organizationId: string,
  data: {
    title: string;
    description: string;
    priority: string;
    dueDate: string;
    scope: string;
    projectId: string;
    teamId: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await repo.updateTask(getSupabase(), id, organizationId, {
      title: data.title.trim(),
      description: data.description.trim() || null,
      priority: data.priority,
      due_date: data.dueDate || null,
      scope: data.scope,
      project_id: data.scope === "project" || data.scope === "team" ? data.projectId || null : null,
      team_id: data.scope === "team" ? data.teamId || null : null,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return { success: true };
  } catch {
    return { success: false, error: "更新に失敗しました" };
  }
}

export async function deleteTaskById(
  id: string,
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await repo.deleteTask(getSupabase(), id, organizationId);
  if (error) return { success: false, error: "削除に失敗しました" };
  return { success: true };
}

export async function updateAssigneeStatus(
  assigneeId: string,
  newStatus: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await repo.updateAssignee(getSupabase(), assigneeId, {
    status: newStatus,
    completed_at: newStatus === "completed" ? new Date().toISOString() : null,
  });
  if (error) return { success: false, error: "更新に失敗しました" };
  return { success: true };
}

export async function removeAssignee(id: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await repo.deleteAssignee(getSupabase(), id);
  if (error) return { success: false, error: "削除に失敗しました" };
  return { success: true };
}

export async function addAssignees(
  taskId: string,
  userIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const rows = userIds.map((uid) => ({
      task_id: taskId,
      user_id: uid,
    }));
    const { error } = await repo.insertAssignees(getSupabase(), rows);
    if (error) throw error;
    return { success: true };
  } catch {
    return { success: false, error: "追加に失敗しました" };
  }
}

export async function fetchEmployeesForAssign(orgId: string, existingUserIds: Set<string>) {
  const employees = await repo.fetchEmployees(getSupabase(), orgId);
  return employees.filter((e) => !existingUserIds.has(e.id));
}

export async function fetchProjectsForEdit(orgId: string) {
  return repo.fetchActiveProjects(getSupabase(), orgId);
}

export async function fetchTeamsForEdit(projectId: string) {
  return repo.fetchProjectTeams(getSupabase(), projectId);
}
