import type { SupabaseClient } from "@supabase/supabase-js";
import type { Department } from "@/types/database";

export async function findByOrg(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("departments")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name");
  return (data ?? []) as Department[];
}

export async function findWithMembers(client: SupabaseClient, organizationId: string) {
  const [{ data: deptData }, deptIds] = await Promise.all([
    client.from("departments").select("*").eq("organization_id", organizationId).order("name"),
    client
      .from("departments")
      .select("id")
      .eq("organization_id", organizationId)
      .then((r) => r.data?.map((d) => d.id) ?? []),
  ]);

  const { data: edData } = await client
    .from("employee_departments")
    .select("department_id, profiles:user_id(id, email, display_name, position)")
    .in("department_id", deptIds.length > 0 ? deptIds : ["__none__"]);

  const memberMap = new Map<
    string,
    { id: string; email: string; display_name: string | null; position: string | null }[]
  >();
  for (const row of edData ?? []) {
    const ed = row as unknown as {
      department_id: string;
      profiles: {
        id: string;
        email: string;
        display_name: string | null;
        position: string | null;
      };
    };
    if (!ed.profiles) continue;
    const list = memberMap.get(ed.department_id) ?? [];
    list.push(ed.profiles);
    memberMap.set(ed.department_id, list);
  }

  return ((deptData ?? []) as Department[]).map((dept) => ({
    ...dept,
    members: memberMap.get(dept.id) ?? [],
  }));
}

export async function create(
  client: SupabaseClient,
  params: {
    organizationId: string;
    name: string;
    parentId: string | null;
  }
) {
  const { error } = await client.from("departments").insert({
    id: crypto.randomUUID(),
    organization_id: params.organizationId,
    name: params.name,
    parent_id: params.parentId,
  });
  if (error) throw error;
}

export async function update(
  client: SupabaseClient,
  id: string,
  organizationId: string,
  params: { name: string; parent_id: string | null }
) {
  const { error } = await client
    .from("departments")
    .update(params)
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) throw error;
}

export async function remove(client: SupabaseClient, id: string, organizationId: string) {
  const { error } = await client
    .from("departments")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) throw error;
}

export async function findDetailWithMembers(
  client: SupabaseClient,
  departmentId: string,
  organizationId: string
) {
  const [{ data: dept }, { data: edData }] = await Promise.all([
    client
      .from("departments")
      .select("*")
      .eq("id", departmentId)
      .eq("organization_id", organizationId)
      .single(),
    client
      .from("employee_departments")
      .select("profiles:user_id(id, email, display_name, position, birth_date, gender, hire_date)")
      .eq("department_id", departmentId),
  ]);

  const members = (edData ?? [])
    .map(
      (row) =>
        (
          row as unknown as {
            profiles: {
              id: string;
              email: string;
              display_name: string | null;
              position: string | null;
              birth_date: string | null;
              gender: string | null;
              hire_date: string | null;
            };
          }
        ).profiles
    )
    .filter(Boolean);

  return { department: dept as Department | null, members };
}

export async function updateName(
  client: SupabaseClient,
  departmentId: string,
  organizationId: string,
  name: string
) {
  return client
    .from("departments")
    .update({ name })
    .eq("id", departmentId)
    .eq("organization_id", organizationId);
}
