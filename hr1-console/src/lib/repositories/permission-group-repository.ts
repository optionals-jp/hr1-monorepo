import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PermissionGroup,
  PermissionGroupPermission,
  PermissionAction,
} from "@/types/database";

// ========================================
// 権限グループ CRUD
// ========================================

export async function findGroups(client: SupabaseClient, organizationId: string) {
  const { data, error } = await client
    .from("permission_groups")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as PermissionGroup[];
}

export async function findGroupWithPermissions(client: SupabaseClient, groupId: string) {
  const { data, error } = await client
    .from("permission_groups")
    .select("*, permission_group_permissions(*)")
    .eq("id", groupId)
    .single();
  if (error) throw error;
  return data as PermissionGroup & { permission_group_permissions: PermissionGroupPermission[] };
}

export async function createGroup(
  client: SupabaseClient,
  params: { organization_id: string; name: string; description: string | null }
) {
  const { data, error } = await client.from("permission_groups").insert(params).select().single();
  if (error) throw error;
  return data as PermissionGroup;
}

export async function updateGroup(
  client: SupabaseClient,
  groupId: string,
  params: { name: string; description: string | null }
) {
  const { data, error } = await client
    .from("permission_groups")
    .update({ ...params, updated_at: new Date().toISOString() })
    .eq("id", groupId)
    .select()
    .single();
  if (error) throw error;
  return data as PermissionGroup;
}

export async function deleteGroup(client: SupabaseClient, groupId: string) {
  const { error } = await client.from("permission_groups").delete().eq("id", groupId);
  if (error) throw error;
}

// ========================================
// グループ権限の設定
// ========================================

export async function findPermissionsByGroup(client: SupabaseClient, groupId: string) {
  const { data, error } = await client
    .from("permission_group_permissions")
    .select("*")
    .eq("group_id", groupId);
  if (error) throw error;
  return (data ?? []) as PermissionGroupPermission[];
}

export async function replacePermissions(
  client: SupabaseClient,
  groupId: string,
  permissions: { resource: string; actions: PermissionAction[] }[]
) {
  // 既存を全削除して再挿入
  const { error: deleteError } = await client
    .from("permission_group_permissions")
    .delete()
    .eq("group_id", groupId);
  if (deleteError) throw deleteError;

  const rows = permissions
    .filter((p) => p.actions.length > 0)
    .map((p) => ({
      group_id: groupId,
      resource: p.resource,
      actions: p.actions,
    }));

  if (rows.length > 0) {
    const { error: insertError } = await client.from("permission_group_permissions").insert(rows);
    if (insertError) throw insertError;
  }
}

// ========================================
// メンバーへのグループ割り当て
// ========================================

export interface MemberGroupRow {
  user_id: string;
  group_id: string;
  permission_groups: { id: string; name: string };
}

export async function findMemberGroups(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from("member_permission_groups")
    .select("group_id, permission_groups(id, name)")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []) as unknown as MemberGroupRow[];
}

/** 複数ユーザーのグループ割り当てを一括取得 */
export async function findMemberGroupsBulk(client: SupabaseClient, userIds: string[]) {
  if (userIds.length === 0) return [];
  const { data, error } = await client
    .from("member_permission_groups")
    .select("user_id, group_id, permission_groups(id, name)")
    .in("user_id", userIds);
  if (error) throw error;
  return (data ?? []) as unknown as MemberGroupRow[];
}

export async function findGroupMembers(client: SupabaseClient, groupId: string) {
  const { data, error } = await client
    .from("member_permission_groups")
    .select("user_id")
    .eq("group_id", groupId);
  if (error) throw error;
  return (data ?? []).map((d) => d.user_id);
}

export async function replaceMemberGroups(
  client: SupabaseClient,
  userId: string,
  groupIds: string[]
) {
  const { error: deleteError } = await client
    .from("member_permission_groups")
    .delete()
    .eq("user_id", userId);
  if (deleteError) throw deleteError;

  if (groupIds.length > 0) {
    const rows = groupIds.map((gid) => ({ user_id: userId, group_id: gid }));
    const { error: insertError } = await client.from("member_permission_groups").insert(rows);
    if (insertError) throw insertError;
  }
}

// ========================================
// 自分の権限一括取得（RPC）
// ========================================

export async function fetchMyPermissions(client: SupabaseClient) {
  const { data, error } = await client.rpc("get_my_permissions");
  if (error) throw error;
  return (data ?? []) as { resource: string; actions: string[] }[];
}
