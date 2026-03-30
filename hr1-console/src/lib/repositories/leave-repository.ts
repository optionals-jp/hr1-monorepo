import type { SupabaseClient } from "@supabase/supabase-js";
import type { LeaveBalance } from "@/types/database";

export async function findBalances(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("leave_balances")
    .select("*")
    .eq("organization_id", organizationId)
    .order("fiscal_year", { ascending: false });
  return (data ?? []) as LeaveBalance[];
}

export async function findMembers(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("user_organizations")
    .select(
      "user_id, profiles!user_organizations_user_id_fkey(id, display_name, email, avatar_url, hire_date)"
    )
    .eq("organization_id", organizationId);
  return (data ?? []) as unknown as {
    user_id: string;
    profiles: {
      id: string;
      display_name: string | null;
      email: string;
      avatar_url: string | null;
      hire_date: string | null;
    };
  }[];
}

export async function updateBalance(
  client: SupabaseClient,
  id: string,
  organizationId: string,
  data: {
    granted_days: number;
    used_days: number;
    carried_over_days: number;
    expired_days: number;
    grant_date: string;
    expiry_date: string;
  }
) {
  const { error } = await client
    .from("leave_balances")
    .update(data)
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) throw error;
}

export async function upsertBalance(client: SupabaseClient, data: Record<string, unknown>) {
  const { error } = await client
    .from("leave_balances")
    .upsert(data, { onConflict: "user_id,organization_id,fiscal_year" });
  if (error) throw error;
}

export async function upsertBalances(client: SupabaseClient, rows: Record<string, unknown>[]) {
  const { error } = await client
    .from("leave_balances")
    .upsert(rows, { onConflict: "user_id,organization_id,fiscal_year" });
  if (error) throw error;
}
