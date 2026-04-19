"use client";

import { useState } from "react";
import { useOrg } from "@/lib/org-context";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { useQuery } from "@/lib/use-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as repo from "@/lib/repositories/recruiter-task-repository";
import type {
  RecruiterTask,
  RecruiterTaskDetail,
  RecruiterTaskCriteria,
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
  const [count, setCount] = useState<number | null>(null);
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
      const n = await repo.previewRecruiterTaskTargets(getSupabase(), {
        organization_id: organization.id,
        ...params,
      });
      setCount(n);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setCount(null);
    } finally {
      setLoading(false);
    }
  };

  return { count, loading, error, preview, reset: () => setCount(null) };
}

export function useCreateRecruiterTask() {
  const { organization } = useOrg();
  const [saving, setSaving] = useState(false);

  const create = async (params: {
    title: string;
    description: string | null;
    due_date: string | null;
    action_url: string | null;
    target_mode: "individual" | "filter";
    target_criteria: RecruiterTaskCriteria;
  }): Promise<CreateRecruiterTaskResult> => {
    if (!organization) throw new Error("organization not loaded");
    setSaving(true);
    try {
      return await repo.createRecruiterTask(getSupabase(), {
        organization_id: organization.id,
        ...params,
      });
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
