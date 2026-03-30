"use client";

import { getSupabase } from "@/lib/supabase/browser";
import * as applicantRepo from "@/lib/repositories/applicant-repository";

export async function loadApplicantDetail(applicantId: string, organizationId: string) {
  const client = getSupabase();
  const appsData = await applicantRepo.fetchApplicantApplications(
    client,
    applicantId,
    organizationId
  );

  if (appsData.length === 0) {
    return { profile: null, applications: [] };
  }

  const profileData = await applicantRepo.fetchProfile(client, applicantId);

  return { profile: profileData, applications: appsData };
}

export async function fetchLinkedForms(formIds: string[]) {
  const { data } = await getSupabase().from("custom_forms").select("id, title").in("id", formIds);
  return new Map((data ?? []).map((f) => [f.id, f.title]));
}

export async function fetchLinkedInterviews(interviewIds: string[]) {
  const { data } = await getSupabase()
    .from("interviews")
    .select("id, title, status")
    .in("id", interviewIds);
  return new Map((data ?? []).map((i) => [i.id, i]));
}
