"use client";

import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@/lib/use-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as payslipRepository from "@/lib/repositories/payslip-repository";
import type { Payslip } from "@/types/database";

export function useMyPayslips() {
  const { user } = useAuth();
  const { organization } = useOrg();
  const key = user && organization ? `my-payslips-${organization.id}-${user.id}` : null;

  return useQuery<Payslip[]>(key, () =>
    payslipRepository.fetchMyPayslips(getSupabase(), organization!.id, user!.id)
  );
}
