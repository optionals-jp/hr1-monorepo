import type { SupabaseClient } from "@supabase/supabase-js";

export async function fetchInterviewSlots(
  client: SupabaseClient,
  organizationId: string,
  rangeStart: string,
  rangeEnd: string
) {
  const { data } = await client
    .from("interview_slots")
    .select(
      `*,
       interviews!inner(id, title, organization_id, status, location, notes),
       applications:application_id(
         id,
         job_id,
         profiles:applicant_id(display_name, email),
         jobs:job_id(title)
       )`
    )
    .eq("interviews.organization_id", organizationId)
    .gte("start_at", rangeStart)
    .lte("start_at", rangeEnd)
    .order("start_at");

  return data ?? [];
}
