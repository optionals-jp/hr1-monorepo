import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActivityLog } from "@/types/database";

export interface CreateActivityLogParams {
  organization_id: string;
  actor_id?: string | null;
  actor_name?: string | null;
  action: string;
  category: string;
  target_type: string;
  target_id: string;
  parent_type?: string | null;
  parent_id?: string | null;
  summary: string;
  detail?: Record<string, unknown>;
}

export async function createActivityLog(client: SupabaseClient, params: CreateActivityLogParams) {
  const { error } = await client.from("activity_logs").insert(params);
  if (error) throw error;
}

export async function createActivityLogs(
  client: SupabaseClient,
  params: CreateActivityLogParams[]
) {
  if (params.length === 0) return;
  const { error } = await client.from("activity_logs").insert(params);
  if (error) throw error;
}

export async function fetchActivityLogs(
  client: SupabaseClient,
  organizationId: string,
  opts: {
    targetType?: string;
    targetId?: string;
    parentType?: string;
    parentId?: string;
    category?: string;
    limit?: number;
  } = {}
): Promise<ActivityLog[]> {
  let query = client
    .from("activity_logs")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (opts.targetType) query = query.eq("target_type", opts.targetType);
  if (opts.targetId) query = query.eq("target_id", opts.targetId);
  if (opts.parentType) query = query.eq("parent_type", opts.parentType);
  if (opts.parentId) query = query.eq("parent_id", opts.parentId);
  if (opts.category) query = query.eq("category", opts.category);
  query = query.limit(opts.limit ?? 200);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ActivityLog[];
}
