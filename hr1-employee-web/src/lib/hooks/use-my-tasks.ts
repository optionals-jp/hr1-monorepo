"use client";

import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@/lib/use-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as taskRepo from "@/lib/repositories/task-repository";
import type { EmployeeTask } from "@/types/database";

export function useMyTasks() {
  const { user } = useAuth();
  const { organization } = useOrg();
  const key = user && organization ? `my-tasks-${organization.id}-${user.id}` : null;

  const result = useQuery<EmployeeTask[]>(key, () =>
    taskRepo.fetchMyTasks(getSupabase(), organization!.id, user!.id)
  );

  const updateStatus = async (
    assigneeId: string,
    status: "pending" | "in_progress" | "completed"
  ) => {
    await taskRepo.updateAssigneeStatus(getSupabase(), assigneeId, user!.id, status);
    result.mutate();
  };

  return { ...result, updateStatus };
}
