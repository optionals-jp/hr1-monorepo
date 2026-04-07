"use client";

import { useEffect, useState, useCallback } from "react";
import { getSupabase } from "@/lib/supabase/browser";
import * as activityLogRepo from "@/lib/repositories/activity-log-repository";
import type { ActivityLog } from "@/types/database";

interface UseActivityLogsOptions {
  targetType?: string;
  targetId?: string;
  parentType?: string;
  parentId?: string;
  category?: string;
}

export function useActivityLogs(organizationId: string | undefined, opts: UseActivityLogsOptions) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const data = await activityLogRepo.fetchActivityLogs(getSupabase(), organizationId, opts);
      setLogs(data);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [
    organizationId,
    opts.targetType,
    opts.targetId,
    opts.parentType,
    opts.parentId,
    opts.category,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  return { logs, loading, reload: load };
}
