"use client";

import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { useOrg } from "@/lib/org-context";
import { useQuery } from "@/lib/use-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as departmentRepository from "@/lib/repositories/department-repository";
import type { Department } from "@/types/database";

interface DeptMember {
  id: string;
  email: string;
  display_name: string | null;
  position: string | null;
}

export interface DeptWithMembers extends Department {
  members: DeptMember[];
}

export function useDepartmentsPage(activeTab: string) {
  const { organization } = useOrg();

  const {
    data: departments = [],
    isLoading,
    error: departmentsError,
    mutate,
  } = useOrgQuery<Department[]>("departments", (orgId) =>
    departmentRepository.findByOrg(getSupabase(), orgId)
  );

  const {
    data: deptWithMembers = [],
    isLoading: orgLoading,
    mutate: mutateOrg,
  } = useQuery<DeptWithMembers[]>(
    organization && activeTab === "orgchart" ? `dept-members-${organization.id}` : null,
    () => departmentRepository.findWithMembers(getSupabase(), organization!.id)
  );

  const addDepartment = async (
    organizationId: string,
    name: string,
    parentId: string | null
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await departmentRepository.create(getSupabase(), {
        organizationId,
        name,
        parentId,
      });
      mutate();
      mutateOrg();
      return { success: true };
    } catch {
      return { success: false, error: "部署の追加に失敗しました" };
    }
  };

  const updateDepartment = async (
    id: string,
    name: string,
    parentId: string | null
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await departmentRepository.update(getSupabase(), id, organization!.id, {
        name,
        parent_id: parentId,
      });
      mutate();
      mutateOrg();
      return { success: true };
    } catch {
      return { success: false, error: "部署の更新に失敗しました" };
    }
  };

  const deleteDepartment = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await departmentRepository.remove(getSupabase(), id, organization!.id);
      mutate();
      mutateOrg();
      return { success: true };
    } catch {
      return { success: false, error: "部署の削除に失敗しました" };
    }
  };

  return {
    departments,
    isLoading,
    departmentsError,
    mutate,
    deptWithMembers,
    orgLoading,
    mutateOrg,
    addDepartment,
    updateDepartment,
    deleteDepartment,
  };
}
