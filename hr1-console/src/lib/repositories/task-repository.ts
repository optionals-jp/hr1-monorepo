import type { SupabaseClient } from "@supabase/supabase-js";

// ─── Tasks ───

export async function fetchTasks(client: SupabaseClient, orgId: string) {
  const { data } = await client
    .from("tasks")
    .select(
      "*, creator:profiles!tasks_created_by_fkey(display_name, email), projects(id, name), project_teams(id, name), task_assignees(id, status)"
    )
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function fetchTaskById(client: SupabaseClient, id: string, orgId: string) {
  return client
    .from("tasks")
    .select(
      "*, creator:profiles!tasks_created_by_fkey(display_name, email), projects(id, name), project_teams(id, name)"
    )
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();
}

/**
 * タスク詳細データを取得する
 */
export async function fetchTaskDetail(
  client: SupabaseClient,
  taskId: string,
  organizationId: string
) {
  const { data, error } = await client
    .from("tasks")
    .select(
      "*, creator:profiles!tasks_created_by_fkey(display_name, email), projects(id, name), project_teams(id, name)"
    )
    .eq("id", taskId)
    .eq("organization_id", organizationId)
    .single();

  if (error) return null;
  return data;
}

export async function insertTask(client: SupabaseClient, row: Record<string, unknown>) {
  return client.from("tasks").insert(row).select("id").single();
}

export async function updateTask(
  client: SupabaseClient,
  id: string,
  organizationId: string,
  data: Record<string, unknown>
) {
  return client.from("tasks").update(data).eq("id", id).eq("organization_id", organizationId);
}

export async function deleteTask(client: SupabaseClient, id: string, organizationId: string) {
  return client.from("tasks").delete().eq("id", id).eq("organization_id", organizationId);
}

// ─── Assignees ───

export async function fetchAssignees(client: SupabaseClient, taskId: string) {
  return client
    .from("task_assignees")
    .select("*, profiles(display_name, email, position)")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });
}

export async function insertAssignees(client: SupabaseClient, rows: Record<string, unknown>[]) {
  return client.from("task_assignees").insert(rows);
}

export async function updateAssignee(
  client: SupabaseClient,
  id: string,
  data: Record<string, unknown>
) {
  return client.from("task_assignees").update(data).eq("id", id);
}

// task_assignees はorganization_idカラムを持たない（親テーブル tasks 経由でテナント分離）
export async function deleteAssignee(client: SupabaseClient, id: string) {
  return client.from("task_assignees").delete().eq("id", id);
}

// ─── Employees ───

export async function fetchEmployees(client: SupabaseClient, orgId: string) {
  const { data } = await client
    .from("user_organizations")
    .select("user_id, profiles!user_organizations_user_id_fkey(id, email, display_name)")
    .eq("organization_id", orgId);
  return (data ?? []).map((d) => {
    const p = d.profiles as unknown as {
      id: string;
      email: string;
      display_name: string | null;
    };
    return { id: p.id, email: p.email, display_name: p.display_name };
  });
}

// ─── Projects/Teams for scope selection ───

export async function fetchActiveProjects(client: SupabaseClient, orgId: string) {
  const { data } = await client
    .from("projects")
    .select("*")
    .eq("organization_id", orgId)
    .in("status", ["active"])
    .order("name");
  return data ?? [];
}

export async function fetchProjectTeams(client: SupabaseClient, projectId: string) {
  const { data } = await client
    .from("project_teams")
    .select("*")
    .eq("project_id", projectId)
    .order("name");
  return data ?? [];
}
