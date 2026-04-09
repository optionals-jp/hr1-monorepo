import type { SupabaseClient } from "@supabase/supabase-js";
import type { Payslip } from "@/types/database";

export async function fetchMyPayslips(
  client: SupabaseClient,
  organizationId: string,
  userId: string
) {
  const { data, error } = await client
    .from("payslips")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .limit(120);
  if (error) throw error;
  return (data ?? []) as Payslip[];
}
