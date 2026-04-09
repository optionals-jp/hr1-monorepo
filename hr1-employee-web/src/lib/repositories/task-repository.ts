import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmployeeTask } from "@/types/database";

export async function fetchMyTasks(client: SupabaseClient, organizationId: string, userId: string) {
  const { data, error } = await client
    .from("tasks")
    .select("*, task_assignees!inner(id, task_id, user_id, status, completed_at, created_at)")
    .eq("organization_id", organizationId)
    .eq("task_assignees.user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as EmployeeTask[];
}

export async function updateAssigneeStatus(
  client: SupabaseClient,
  assigneeId: string,
  userId: string,
  status: "pending" | "in_progress" | "completed"
) {
  const { error } = await client
    .from("task_assignees")
    .update({
      status,
      completed_at: status === "completed" ? new Date().toISOString() : null,
    })
    .eq("id", assigneeId)
    .eq("user_id", userId);
  if (error) throw error;
}
