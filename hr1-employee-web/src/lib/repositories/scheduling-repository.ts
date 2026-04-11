import type { SupabaseClient } from "@supabase/supabase-js";
import type { Interview, InterviewSlot } from "@/types/database";

export async function findByOrg(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("interviews")
    .select("*, interview_slots(*)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  return (data ?? []) as (Interview & { interview_slots: InterviewSlot[] })[];
}

/**
 * interviews に行を作成し、DB 側で採番された id を返す。
 * id を渡してはならない（uuid カラムに非 UUID 文字列を入れるとキャストエラー）。
 */
export async function createInterview(
  client: SupabaseClient,
  data: {
    organization_id: string;
    title: string;
    location: string | null;
    notes: string | null;
    status: string;
  }
): Promise<string> {
  const { data: inserted, error } = await client
    .from("interviews")
    .insert(data)
    .select("id")
    .single();
  if (error) throw error;
  return (inserted as { id: string }).id;
}

/**
 * interview_slots に行を一括作成する。id は DB 側で採番される。
 */
export async function createSlots(
  client: SupabaseClient,
  slots: {
    interview_id: string;
    start_at: string;
    end_at: string;
    is_selected: boolean;
    max_applicants: number;
  }[]
) {
  return client.from("interview_slots").insert(slots);
}

export async function fetchDetail(client: SupabaseClient, id: string, organizationId: string) {
  const { data } = await client
    .from("interviews")
    .select(
      "*, interview_slots(*, applications:application_id(id, profiles:applicant_id(display_name, email)))"
    )
    .eq("id", id)
    .eq("organization_id", organizationId)
    .single();
  return { data };
}

export async function updateInterviewStatus(
  client: SupabaseClient,
  id: string,
  organizationId: string,
  status: string
) {
  return client
    .from("interviews")
    .update({ status })
    .eq("id", id)
    .eq("organization_id", organizationId);
}

export async function updateInterview(
  client: SupabaseClient,
  id: string,
  organizationId: string,
  data: { title: string; location: string | null; notes: string | null }
) {
  return client.from("interviews").update(data).eq("id", id).eq("organization_id", organizationId);
}

export async function deleteSlots(client: SupabaseClient, ids: string[]) {
  return client.from("interview_slots").delete().in("id", ids);
}

export async function updateSlot(
  client: SupabaseClient,
  id: string,
  data: Record<string, unknown>
) {
  return client.from("interview_slots").update(data).eq("id", id);
}
