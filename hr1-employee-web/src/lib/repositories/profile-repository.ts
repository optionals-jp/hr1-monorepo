import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile, Department } from "@/types/database";

export async function updateMyProfile(
  client: SupabaseClient,
  userId: string,
  fields: Partial<
    Pick<Profile, "display_name" | "name_kana" | "phone" | "position" | "birth_date" | "gender">
  >
) {
  const { error } = await client.from("profiles").update(fields).eq("id", userId);
  if (error) throw error;
}

export async function uploadAvatar(
  client: SupabaseClient,
  userId: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error: uploadError } = await client.storage
    .from("avatars")
    .upload(path, file, { upsert: true });
  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = client.storage.from("avatars").getPublicUrl(path);

  const { error: updateError } = await client
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", userId);
  if (updateError) throw updateError;

  return publicUrl;
}

export async function fetchEmployees(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("user_organizations")
    .select("user_id, profiles!user_organizations_user_id_fkey(id, email, display_name, position)")
    .eq("organization_id", organizationId);
  return (data ?? [])
    .map((row) => (row as unknown as { profiles: Profile }).profiles)
    .filter((p): p is Profile => p != null && p.role !== "applicant")
    .map((p) => ({
      id: p.id,
      email: p.email,
      display_name: p.display_name,
      position: p.position,
    }));
}

export async function fetchDepartments(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("departments")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name");
  return (data ?? []) as Department[];
}
