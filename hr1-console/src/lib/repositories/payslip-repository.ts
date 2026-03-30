import type { SupabaseClient } from "@supabase/supabase-js";
import type { Payslip } from "@/types/database";

export async function findByOrg(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("payslips")
    .select("*")
    .eq("organization_id", organizationId)
    .order("year", { ascending: false })
    .order("month", { ascending: false });
  return (data ?? []) as Payslip[];
}

export async function findMembers(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("user_organizations")
    .select(
      "user_id, profiles!user_organizations_user_id_fkey(id, display_name, email, avatar_url)"
    )
    .eq("organization_id", organizationId);
  return (data ?? []) as unknown as {
    user_id: string;
    profiles: {
      id: string;
      display_name: string | null;
      email: string;
      avatar_url: string | null;
    };
  }[];
}

export async function create(client: SupabaseClient, payload: Record<string, unknown>) {
  const { error } = await client.from("payslips").insert(payload);
  if (error) throw error;
}

export async function update(
  client: SupabaseClient,
  id: string,
  organizationId: string,
  payload: Record<string, unknown>
) {
  const { error } = await client
    .from("payslips")
    .update(payload)
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) throw error;
}

export async function remove(client: SupabaseClient, id: string, organizationId: string) {
  const { error } = await client
    .from("payslips")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) throw error;
}

export async function findProfilesByEmails(client: SupabaseClient, emails: string[]) {
  const { data } = await client.from("profiles").select("id, email").in("email", emails);
  return data ?? [];
}

export async function upsertBatch(client: SupabaseClient, records: Record<string, unknown>[]) {
  const { error } = await client
    .from("payslips")
    .upsert(records, { onConflict: "organization_id,user_id,year,month" });
  if (error) throw error;
}
