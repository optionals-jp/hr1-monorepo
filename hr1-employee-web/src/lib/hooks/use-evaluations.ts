"use client";

import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@/lib/use-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as evalRepo from "@/lib/repositories/evaluation-repository";
import type { EvaluationCycle, EvaluationAssignment } from "@/types/database";

export function useEvaluationCycles() {
  return useOrgQuery<EvaluationCycle[]>("evaluation-cycles", (orgId) =>
    evalRepo.fetchActiveCycles(getSupabase(), orgId)
  );
}

export function useMyAssignments(cycleId: string | null) {
  const { user } = useAuth();
  const { organization } = useOrg();
  const key =
    cycleId && user && organization
      ? `my-eval-assignments-${organization.id}-${cycleId}-${user.id}`
      : null;

  return useQuery<EvaluationAssignment[]>(key, () =>
    evalRepo.fetchMyAssignments(getSupabase(), cycleId!, user!.id)
  );
}
