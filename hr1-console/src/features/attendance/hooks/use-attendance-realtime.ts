"use client";

import { useEffect } from "react";
import { getSupabase } from "@/lib/supabase/browser";
import { useOrg } from "@/lib/org-context";

export function useAttendanceRealtime(mutateDaily: () => void, mutateMonthly: () => void) {
  const { organization } = useOrg();

  useEffect(() => {
    if (!organization) return;

    const channel = getSupabase()
      .channel(`attendance_records:${organization.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "attendance_records",
          filter: `organization_id=eq.${organization.id}`,
        },
        () => {
          mutateDaily();
          mutateMonthly();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "attendance_records",
          filter: `organization_id=eq.${organization.id}`,
        },
        () => {
          mutateDaily();
          mutateMonthly();
        }
      )
      .subscribe();

    return () => {
      getSupabase().removeChannel(channel);
    };
  }, [organization, mutateDaily, mutateMonthly]);
}
