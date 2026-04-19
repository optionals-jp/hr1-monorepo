"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import { useOrg } from "@/lib/org-context";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { useQuery } from "@/lib/use-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as repo from "@/lib/repositories/recruiter-task-repository";
import type {
  RecruiterTask,
  RecruiterTaskDetail,
  RecruiterTaskCriteria,
  RecruiterTaskActionType,
  RecruiterTaskPreviewTarget,
  CreateRecruiterTaskResult,
} from "@/lib/repositories/recruiter-task-repository";

export function useRecruiterTasks() {
  return useOrgQuery<RecruiterTask[]>("recruiter-tasks", (orgId) =>
    repo.fetchRecruiterTasks(getSupabase(), orgId)
  );
}

export function useRecruiterTaskDetail(taskId: string | null) {
  return useQuery<RecruiterTaskDetail | null>(
    taskId ? `recruiter-task-detail-${taskId}` : null,
    async () => (taskId ? repo.fetchRecruiterTaskDetail(getSupabase(), taskId) : null)
  );
}

export function usePreviewRecruiterTaskTargets() {
  const { organization } = useOrg();
  const [targets, setTargets] = useState<RecruiterTaskPreviewTarget[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = async (params: {
    target_mode: "individual" | "filter";
    target_criteria: RecruiterTaskCriteria;
  }) => {
    if (!organization) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await repo.previewRecruiterTaskTargets(getSupabase(), {
        organization_id: organization.id,
        ...params,
      });
      setTargets(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setTargets(null);
    } finally {
      setLoading(false);
    }
  };

  return { targets, loading, error, preview, reset: () => setTargets(null) };
}

export function useCreateRecruiterTask() {
  const { organization } = useOrg();
  const { mutate } = useSWRConfig();
  const [saving, setSaving] = useState(false);

  const create = async (params: {
    title: string;
    description: string | null;
    due_date: string | null;
    action_type: RecruiterTaskActionType;
    action_ref_id: string | null;
    action_url: string | null;
    target_mode: "individual" | "filter";
    target_criteria: RecruiterTaskCriteria;
  }): Promise<CreateRecruiterTaskResult> => {
    if (!organization) throw new Error("organization not loaded");
    setSaving(true);
    try {
      const result = await repo.createRecruiterTask(getSupabase(), {
        organization_id: organization.id,
        ...params,
      });
      await mutate(`recruiter-tasks-${organization.id}`);
      return result;
    } finally {
      setSaving(false);
    }
  };

  return { create, saving };
}

export function useDeleteRecruiterTask() {
  const [deleting, setDeleting] = useState(false);

  const remove = async (taskId: string) => {
    setDeleting(true);
    try {
      await repo.deleteRecruiterTask(getSupabase(), taskId);
    } finally {
      setDeleting(false);
    }
  };

  return { remove, deleting };
}
