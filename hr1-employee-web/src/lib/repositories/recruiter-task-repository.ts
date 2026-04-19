import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 採用担当者が作成する応募者向け一括タスクの親レコード。
 * 子 applicant_todos は DB の RPC 経由で作成・削除され、直接触らない。
 */
export type RecruiterTaskActionType =
  | "none"
  | "form"
  | "interview"
  | "survey"
  | "announcement"
  | "custom_url";

export interface RecruiterTask {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  action_type: RecruiterTaskActionType;
  action_ref_id: string | null;
  action_url: string | null;
  target_mode: "individual" | "filter";
  target_criteria: RecruiterTaskCriteria;
  target_count: number;
  created_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecruiterTaskCriteria {
  applicant_ids?: string[];
  hiring_type?: "new_grad" | "mid_career" | "none";
  job_id?: string;
  application_status?: string;
  selection_step?: {
    mode: "current" | "passed";
    step_type: "screening" | "form" | "interview" | "external_test" | "offer";
    min_step_order?: number;
  };
}

export interface RecruiterTaskTarget {
  user_id: string;
  display_name: string | null;
  email: string;
  avatar_url: string | null;
  is_completed: boolean;
  completed_at: string | null;
  due_date: string | null;
}

export interface RecruiterTaskDetail {
  task: RecruiterTask;
  targets: RecruiterTaskTarget[];
}

export interface CreateRecruiterTaskParams {
  organization_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  action_type: RecruiterTaskActionType;
  action_ref_id: string | null;
  action_url: string | null;
  target_mode: "individual" | "filter";
  target_criteria: RecruiterTaskCriteria;
}

export interface CreateRecruiterTaskResult {
  task_id: string;
  target_count: number;
  created_count: number;
}

export async function fetchRecruiterTasks(
  client: SupabaseClient,
  organizationId: string
): Promise<RecruiterTask[]> {
  const { data, error } = await client
    .from("recruiter_tasks")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as RecruiterTask[];
}

export async function previewRecruiterTaskTargets(
  client: SupabaseClient,
  params: {
    organization_id: string;
    target_mode: "individual" | "filter";
    target_criteria: RecruiterTaskCriteria;
  }
): Promise<number> {
  const { data, error } = await client.rpc("preview_recruiter_task_targets", {
    p_organization_id: params.organization_id,
    p_target_mode: params.target_mode,
    p_target_criteria: params.target_criteria,
  });
  if (error) throw error;
  return (data as number) ?? 0;
}

export async function createRecruiterTask(
  client: SupabaseClient,
  params: CreateRecruiterTaskParams
): Promise<CreateRecruiterTaskResult> {
  const { data, error } = await client.rpc("create_recruiter_task", {
    p_organization_id: params.organization_id,
    p_title: params.title,
    p_description: params.description,
    p_due_date: params.due_date,
    p_action_type: params.action_type,
    p_action_ref_id: params.action_ref_id,
    p_action_url: params.action_url,
    p_target_mode: params.target_mode,
    p_target_criteria: params.target_criteria,
  });
  if (error) throw error;
  if (!data) throw new Error("create_recruiter_task returned no result");
  return data as CreateRecruiterTaskResult;
}

export async function deleteRecruiterTask(client: SupabaseClient, taskId: string): Promise<void> {
  const { error } = await client.rpc("delete_recruiter_task", { p_task_id: taskId });
  if (error) throw error;
}

export async function fetchRecruiterTaskDetail(
  client: SupabaseClient,
  taskId: string
): Promise<RecruiterTaskDetail | null> {
  const { data, error } = await client.rpc("get_recruiter_task_detail", { p_task_id: taskId });
  if (error) throw error;
  if (!data) return null;
  return data as RecruiterTaskDetail;
}
