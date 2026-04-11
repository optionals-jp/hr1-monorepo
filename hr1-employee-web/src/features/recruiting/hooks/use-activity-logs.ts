"use client";

import { useEffect, useState, useCallback } from "react";
import { getSupabase } from "@/lib/supabase/browser";
import * as jobRepo from "@/lib/repositories/job-repository";
import type { ActivityLog } from "@/types/database";

interface UseActivityLogsOptions {
  parentType?: string;
  parentId?: string;
}

export function useActivityLogs(organizationId: string | undefined, opts: UseActivityLogsOptions) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const parentType = opts.parentType;
  const parentId = opts.parentId;
  const load = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const data = await jobRepo.fetchActivityLogs(getSupabase(), organizationId, {
        parentType,
        parentId,
      });
      setLogs(data as ActivityLog[]);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [organizationId, parentType, parentId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { logs, loading, reload: load };
}
