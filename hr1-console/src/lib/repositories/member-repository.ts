import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/types/database";
import { assertNotUnauthorized } from "@/lib/supabase/browser";

export interface MemberWithRole {
  id: string;
  email: string;
  display_name: string | null;
  role: Profile["role"];
  position: string | null;
  created_at: string;
  invited_at: string | null;
}

export async function findMembers(
  client: SupabaseClient,
  organizationId: string
): Promise<MemberWithRole[]> {
  const { data } = await client
    .from("user_organizations")
    .select("profiles!inner(id, email, display_name, role, position, created_at, invited_at)")
    .eq("organization_id", organizationId)
    .in("profiles.role", ["admin", "employee"]);

  return (data ?? [])
    .map(
      (row) =>
        (
          row as unknown as {
            profiles: MemberWithRole;
          }
        ).profiles
    )
    .filter(Boolean);
}

export async function inviteMember(
  client: SupabaseClient,
  params: {
    email: string;
    role: "admin" | "employee";
    organization_id: string;
  }
) {
  const { data, error } = await client.functions.invoke("create-user", {
    body: {
      email: params.email,
      role: params.role,
      organization_id: params.organization_id,
      send_invite: true,
    },
  });

  if (error) assertNotUnauthorized(error);
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function updateMemberRole(
  client: SupabaseClient,
  userId: string,
  role: "admin" | "employee"
) {
  const { error } = await client.from("profiles").update({ role }).eq("id", userId);
  if (error) throw error;
}
