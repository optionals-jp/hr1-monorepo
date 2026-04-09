import type { SupabaseClient } from "@supabase/supabase-js";
import type { LeaveBalance } from "@/types/database";

export async function fetchMyBalances(
  client: SupabaseClient,
  organizationId: string,
  userId: string
) {
  const { data, error } = await client
    .from("leave_balances")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .order("fiscal_year", { ascending: false });
  if (error) throw error;
  return (data ?? []) as LeaveBalance[];
}
