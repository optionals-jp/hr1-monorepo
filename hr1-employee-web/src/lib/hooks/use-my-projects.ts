"use client";

import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@/lib/use-query";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as projectRepo from "@/lib/repositories/project-repository";
import type { Project } from "@/types/database";

export function useMyProjects() {
  const { user } = useAuth();
  const { organization } = useOrg();
  const key = user && organization ? `my-projects-${organization.id}-${user.id}` : null;

  return useQuery<Project[]>(key, () =>
    projectRepo.fetchMyProjects(getSupabase(), organization!.id, user!.id)
  );
}

export function useAllProjects() {
  return useOrgQuery<Project[]>("all-projects", (orgId) =>
    projectRepo.fetchAllProjects(getSupabase(), orgId)
  );
}
