"use client";

import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@/lib/use-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as serviceRequestRepo from "@/lib/repositories/service-request-repository";
import type { ServiceRequest } from "@/types/database";

export function useMyServiceRequests() {
  const { user } = useAuth();
  const { organization } = useOrg();
  const key = user && organization ? `my-service-requests-${organization.id}-${user.id}` : null;

  const result = useQuery<ServiceRequest[]>(key, () =>
    serviceRequestRepo.fetchMyRequests(getSupabase(), organization!.id, user!.id)
  );

  const createRequest = async (category: string, title: string, description: string) => {
    await serviceRequestRepo.createRequest(getSupabase(), {
      organization_id: organization!.id,
      user_id: user!.id,
      category,
      title,
      description,
    });
    result.mutate();
  };

  return { ...result, createRequest };
}
