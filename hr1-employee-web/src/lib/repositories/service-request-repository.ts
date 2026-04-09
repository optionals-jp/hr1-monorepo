import type { SupabaseClient } from "@supabase/supabase-js";
import type { ServiceRequest } from "@/types/database";

export async function fetchMyRequests(
  client: SupabaseClient,
  organizationId: string,
  userId: string
) {
  const { data, error } = await client
    .from("service_requests")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as ServiceRequest[];
}

export async function createRequest(
  client: SupabaseClient,
  data: {
    organization_id: string;
    user_id: string;
    category: string;
    title: string;
    description: string;
  }
) {
  const { error } = await client.from("service_requests").insert(data);
  if (error) throw error;
}
