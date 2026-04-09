"use client";

import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@/lib/use-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as leaveRepo from "@/lib/repositories/leave-repository";
import type { LeaveBalance } from "@/types/database";

export function useMyLeave() {
  const { user } = useAuth();
  const { organization } = useOrg();
  const key = user && organization ? `my-leave-${organization.id}-${user.id}` : null;

  return useQuery<LeaveBalance[]>(key, () =>
    leaveRepo.fetchMyBalances(getSupabase(), organization!.id, user!.id)
  );
}
