"use client";

import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as employeeRepository from "@/lib/repositories/employee-repository";
import * as departmentRepository from "@/lib/repositories/department-repository";
import type { Profile } from "@/types/database";

export interface EmployeeWithDepts {
  id: string;
  email: string;
  display_name: string | null;
  name_kana: string | null;
  position: string | null;
  phone: string | null;
  hire_date: string | null;
  birth_date: string | null;
  gender: Profile["gender"];
  current_postal_code: string | null;
  current_prefecture: string | null;
  current_city: string | null;
  current_street_address: string | null;
  current_building: string | null;
  registered_postal_code: string | null;
  registered_prefecture: string | null;
  registered_city: string | null;
  registered_street_address: string | null;
  registered_building: string | null;
  departments: { id: string; name: string }[];
}

export function useEmployeesPage() {
  const { data: departments = [] } = useOrgQuery("departments", (orgId) =>
    departmentRepository.findByOrg(getSupabase(), orgId)
  );

  const {
    data: employees = [],
    isLoading,
    error: employeesError,
    mutate,
  } = useOrgQuery<EmployeeWithDepts[]>("employees", (orgId) =>
    employeeRepository.findEmployeesWithDepartments(getSupabase(), orgId)
  );

  const addEmployee = async (
    organizationId: string,
    params: {
      email: string;
      display_name: string | null;
      position: string | null;
      department_ids: string[];
    }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await employeeRepository.createEmployee(getSupabase(), {
        email: params.email,
        display_name: params.display_name,
        organization_id: organizationId,
        position: params.position,
        department_ids: params.department_ids,
      });
      mutate();
      return { success: true };
    } catch {
      return { success: false, error: "社員の追加に失敗しました" };
    }
  };

  const deleteEmployee = async (
    organizationId: string,
    emp: EmployeeWithDepts
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await employeeRepository.deleteEmployee(getSupabase(), {
        userId: emp.id,
        organizationId,
        departmentIds: emp.departments.map((d) => d.id),
      });
      mutate();
      return { success: true };
    } catch {
      return { success: false, error: "削除に失敗しました" };
    }
  };

  return {
    departments,
    employees,
    isLoading,
    employeesError,
    mutate,
    addEmployee,
    deleteEmployee,
  };
}
