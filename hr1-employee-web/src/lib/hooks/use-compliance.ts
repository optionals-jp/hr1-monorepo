"use client";

import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@/lib/use-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as complianceRepository from "@/lib/repositories/compliance-repository";
import type { ComplianceAlert } from "@/types/database";

export function useMyComplianceAlerts() {
  const { user } = useAuth();
  const { organization } = useOrg();
  const key = user && organization ? `my-compliance-${organization.id}-${user.id}` : null;

  return useQuery<ComplianceAlert[]>(key, () =>
    complianceRepository.fetchMyAlerts(getSupabase(), organization!.id, user!.id)
  );
}
