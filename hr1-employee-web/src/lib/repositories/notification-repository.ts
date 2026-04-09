import type { SupabaseClient } from "@supabase/supabase-js";
import type { Notification } from "@/types/database";

export async function fetchNotifications(
  client: SupabaseClient,
  userId: string,
  organizationId: string
) {
  const { data, error } = await client
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as Notification[];
}

export async function markAsRead(client: SupabaseClient, id: string, userId: string) {
  const { error } = await client
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function createNotification(
  client: SupabaseClient,
  data: {
    user_id: string;
    organization_id: string;
    title: string;
    body: string;
    type: string;
    resource_type?: string;
    resource_id?: string;
  }
) {
  const { error } = await client.from("notifications").insert(data);
  if (error) throw error;
}

export async function markAllAsRead(
  client: SupabaseClient,
  userId: string,
  organizationId: string
) {
  const { error } = await client
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .is("read_at", null);
  if (error) throw error;
}
