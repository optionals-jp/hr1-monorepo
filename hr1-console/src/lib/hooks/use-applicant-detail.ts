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
  return applicantRepo.fetchLinkedForms(getSupabase(), formIds);
}

export async function fetchLinkedInterviews(interviewIds: string[]) {
  return applicantRepo.fetchLinkedInterviews(getSupabase(), interviewIds);
}
