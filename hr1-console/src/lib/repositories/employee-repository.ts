import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/types/database";

export async function findEmployeesWithDepartments(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("user_organizations")
    .select(
      "profiles!inner(id, email, display_name, name_kana, position, phone, hire_date, birth_date, gender, current_postal_code, current_prefecture, current_city, current_street_address, current_building, registered_postal_code, registered_prefecture, registered_city, registered_street_address, registered_building)"
    )
    .eq("organization_id", organizationId)
    .eq("profiles.role", "employee");

  const profiles = (data ?? [])
    .map(
      (row) =>
        (
          row as unknown as {
            profiles: {
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
            };
          }
        ).profiles
    )
    .filter(Boolean);

  if (profiles.length === 0) return [];

  const { data: edData } = await client
    .from("employee_departments")
    .select("user_id, departments(id, name)")
    .in(
      "user_id",
      profiles.map((p) => p.id)
    );

  const deptMap = new Map<string, { id: string; name: string }[]>();
  for (const ed of edData ?? []) {
    const dept = ed as unknown as {
      user_id: string;
      departments: { id: string; name: string };
    };
    if (!dept.departments) continue;
    const list = deptMap.get(dept.user_id) ?? [];
    list.push(dept.departments);
    deptMap.set(dept.user_id, list);
  }

  return profiles.map((p) => ({
    ...p,
    departments: deptMap.get(p.id) ?? [],
  }));
}

export async function createEmployee(
  client: SupabaseClient,
  params: {
    email: string;
    display_name: string | null;
    organization_id: string;
    position: string | null;
    department_ids?: string[];
  }
) {
  const { data, error } = await client.functions.invoke("create-user", {
    body: {
      email: params.email,
      display_name: params.display_name,
      role: "employee",
      organization_id: params.organization_id,
      position: params.position,
      department_ids:
        params.department_ids && params.department_ids.length > 0
          ? params.department_ids
          : undefined,
    },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}

export async function deleteEmployee(
  client: SupabaseClient,
  params: {
    userId: string;
    organizationId: string;
    departmentIds: string[];
  }
) {
  if (params.departmentIds.length > 0) {
    await client
      .from("employee_departments")
      .delete()
      .eq("user_id", params.userId)
      .in("department_id", params.departmentIds);
  }
  const { error } = await client
    .from("user_organizations")
    .delete()
    .eq("user_id", params.userId)
    .eq("organization_id", params.organizationId);
  if (error) throw error;
}

export async function checkMembership(
  client: SupabaseClient,
  userId: string,
  organizationId: string
) {
  const { data } = await client
    .from("user_organizations")
    .select("user_id")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  return data;
}

export async function findProfile(client: SupabaseClient, userId: string) {
  const { data } = await client.from("profiles").select("*").eq("id", userId).single();
  return data;
}

export async function findEmployeeDepartments(client: SupabaseClient, userId: string) {
  const { data } = await client
    .from("employee_departments")
    .select("department_id, departments(id, name)")
    .eq("user_id", userId);
  return (data ?? [])
    .map((row) => (row as unknown as { departments: { id: string; name: string } }).departments)
    .filter(Boolean);
}

export async function findMemberships(client: SupabaseClient, userId: string) {
  const { data } = await client
    .from("project_team_members")
    .select("id, role, joined_at, left_at, project_teams(id, name, projects(id, name, status))")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false });

  return (data ?? []).map((row) => {
    const r = row as unknown as {
      id: string;
      role: "leader" | "member";
      joined_at: string;
      left_at: string | null;
      project_teams: {
        id: string;
        name: string;
        projects: { id: string; name: string; status: string };
      };
    };
    return {
      id: r.id,
      role: r.role,
      joined_at: r.joined_at,
      left_at: r.left_at,
      team: {
        id: r.project_teams.id,
        name: r.project_teams.name,
        project: r.project_teams.projects,
      },
    };
  });
}

export async function findSkillsAndCertifications(client: SupabaseClient, userId: string) {
  const [{ data: skillsData }, { data: certsData }] = await Promise.all([
    client.from("employee_skills").select("*").eq("user_id", userId).order("sort_order"),
    client.from("employee_certifications").select("*").eq("user_id", userId).order("sort_order"),
  ]);
  return { skills: skillsData ?? [], certifications: certsData ?? [] };
}

export async function updateProfile(
  client: SupabaseClient,
  profileId: string,
  data: Record<string, unknown>
) {
  return client.from("profiles").update(data).eq("id", profileId);
}

export async function replaceEmployeeDepartments(
  client: SupabaseClient,
  userId: string,
  departmentIds: string[]
) {
  await client.from("employee_departments").delete().eq("user_id", userId);
  if (departmentIds.length > 0) {
    await client.from("employee_departments").insert(
      departmentIds.map((deptId) => ({
        user_id: userId,
        department_id: deptId,
      }))
    );
  }
}
