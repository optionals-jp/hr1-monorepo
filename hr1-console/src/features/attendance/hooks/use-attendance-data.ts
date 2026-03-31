"use client";

import { getSupabase } from "@/lib/supabase/browser";
import { useOrg } from "@/lib/org-context";
import { useQuery } from "@/lib/use-query";
import * as attendanceRepo from "@/lib/repositories/attendance-repository";
import type { AttendanceSettingsRow, Department, Project } from "@/types/database";
import type { Employee } from "@/features/attendance/types";

export function useAttendanceData() {
  const { organization } = useOrg();

  const { data: employees = [] } = useQuery<Employee[]>(
    organization ? `employees-list-${organization.id}` : null,
    async () => attendanceRepo.findEmployees(getSupabase(), organization!.id)
  );

  const { data: departments = [] } = useQuery<Department[]>(
    organization ? `departments-list-${organization.id}` : null,
    async () => attendanceRepo.findDepartments(getSupabase(), organization!.id)
  );

  const { data: projects = [] } = useQuery<Project[]>(
    organization ? `projects-list-${organization.id}` : null,
    async () => attendanceRepo.findActiveProjects(getSupabase(), organization!.id)
  );

  const { data: settings, mutate: mutateSettings } = useQuery<AttendanceSettingsRow | null>(
    organization ? `attendance-settings-${organization.id}` : null,
    async () => attendanceRepo.findSettings(getSupabase(), organization!.id)
  );

  return {
    organization,
    employees,
    departments,
    projects,
    settings,
    mutateSettings,
  };
}
