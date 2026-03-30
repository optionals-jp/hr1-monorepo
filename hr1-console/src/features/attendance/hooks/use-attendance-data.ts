"use client";

import { getSupabase } from "@/lib/supabase/browser";
import { useOrg } from "@/lib/org-context";
import { useQuery } from "@/lib/use-query";
import type { AttendanceSettingsRow, Department, Project } from "@/types/database";
import type { Employee } from "@/features/attendance/types";

export function useAttendanceData() {
  const { organization } = useOrg();

  const { data: employees = [] } = useQuery<Employee[]>(
    organization ? `employees-list-${organization.id}` : null,
    async () => {
      const { data } = await getSupabase()
        .from("user_organizations")
        .select("user_id, profiles!user_organizations_user_id_fkey(id, email, display_name)")
        .eq("organization_id", organization!.id);
      return (data ?? []).map((d) => {
        const p = d.profiles as unknown as Employee;
        return { id: p.id, email: p.email, display_name: p.display_name };
      });
    }
  );

  const { data: departments = [] } = useQuery<Department[]>(
    organization ? `departments-list-${organization.id}` : null,
    async () => {
      const { data } = await getSupabase()
        .from("departments")
        .select("*")
        .eq("organization_id", organization!.id)
        .order("name");
      return data ?? [];
    }
  );

  const { data: projects = [] } = useQuery<Project[]>(
    organization ? `projects-list-${organization.id}` : null,
    async () => {
      const { data } = await getSupabase()
        .from("projects")
        .select("*")
        .eq("organization_id", organization!.id)
        .in("status", ["active"])
        .order("name");
      return data ?? [];
    }
  );

  const { data: settings, mutate: mutateSettings } = useQuery<AttendanceSettingsRow | null>(
    organization ? `attendance-settings-${organization.id}` : null,
    async () => {
      const { data } = await getSupabase()
        .from("attendance_settings")
        .select("*")
        .eq("organization_id", organization!.id)
        .maybeSingle();
      return data as AttendanceSettingsRow | null;
    }
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
