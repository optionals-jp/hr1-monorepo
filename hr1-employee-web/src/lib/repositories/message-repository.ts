import type { SupabaseClient } from "@supabase/supabase-js";

type ParticipantType = "applicant" | "employee";

export async function findThreadByParticipant(
  client: SupabaseClient,
  organizationId: string,
  participantId: string,
  participantType: ParticipantType
) {
  return client
    .from("message_threads")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("participant_id", participantId)
    .eq("participant_type", participantType)
    .maybeSingle();
}

export async function createThread(
  client: SupabaseClient,
  data: {
    organization_id: string;
    participant_id: string;
    participant_type: ParticipantType;
  }
) {
  return client.from("message_threads").insert(data).select("id").single();
}

// --- Thread lists (RPC) ---

export async function getThreadsWithDetails(client: SupabaseClient, orgId: string, userId: string) {
  return client.rpc("get_threads_with_details", { p_org_id: orgId, p_user_id: userId });
}

export async function getChannelsWithDetails(client: SupabaseClient, orgId: string) {
  return client.rpc("get_channels_with_details", { p_org_id: orgId });
}

// --- Messages ---

export async function fetchMessages(
  client: SupabaseClient,
  threadId: string,
  rangeStart: number,
  rangeEnd: number
) {
  return client
    .from("messages")
    .select("*, sender:sender_id(id, display_name, avatar_url, role)", { count: "exact" })
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .range(rangeStart, rangeEnd);
}

export async function fetchMessagesSince(
  client: SupabaseClient,
  threadId: string,
  sinceCreatedAt: string
) {
  return client
    .from("messages")
    .select("*, sender:sender_id(id, display_name, avatar_url, role)")
    .eq("thread_id", threadId)
    .gt("created_at", sinceCreatedAt)
    .order("created_at", { ascending: true });
}

export async function fetchOlderMessages(
  client: SupabaseClient,
  threadId: string,
  beforeCreatedAt: string,
  rangeEnd: number
) {
  return client
    .from("messages")
    .select("*, sender:sender_id(id, display_name, avatar_url, role)")
    .eq("thread_id", threadId)
    .lt("created_at", beforeCreatedAt)
    .order("created_at", { ascending: false })
    .range(0, rangeEnd);
}

export async function markAsRead(client: SupabaseClient, threadId: string, currentUserId: string) {
  return client
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("thread_id", threadId)
    .neq("sender_id", currentUserId)
    .is("read_at", null);
}

export async function sendMessage(
  client: SupabaseClient,
  data: { thread_id: string; content: string }
) {
  return client.from("messages").insert(data);
}

export async function editMessage(
  client: SupabaseClient,
  messageId: string,
  senderId: string,
  content: string
) {
  return client
    .from("messages")
    .update({ content, edited_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("sender_id", senderId);
}

export async function deleteMessage(client: SupabaseClient, messageId: string, senderId: string) {
  return client.from("messages").delete().eq("id", messageId).eq("sender_id", senderId);
}

// messages はorganization_idカラムを持たない（親テーブル message_threads 経由でテナント分離）
export async function markSingleAsRead(client: SupabaseClient, messageId: string) {
  return client.from("messages").update({ read_at: new Date().toISOString() }).eq("id", messageId);
}

export async function fetchSenderProfile(client: SupabaseClient, senderId: string) {
  return client
    .from("profiles")
    .select("id, display_name, avatar_url, role")
    .eq("id", senderId)
    .single();
}

// --- New thread panel ---

export async function fetchExistingThreadParticipants(
  client: SupabaseClient,
  organizationId: string,
  participantType: ParticipantType
) {
  const { data } = await client
    .from("message_threads")
    .select("participant_id")
    .eq("organization_id", organizationId)
    .eq("participant_type", participantType);
  return (data ?? []).map((t) => t.participant_id);
}

export async function fetchActiveApplicants(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("applications")
    .select(
      "applicant_id, profiles:applicant_id(id, display_name, email, avatar_url, role), jobs(title)"
    )
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .order("applied_at", { ascending: false });
  return data ?? [];
}

export async function fetchOrgEmployees(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("user_organizations")
    .select(
      "user_id, profiles:user_id(id, display_name, email, role, avatar_url, department, position)"
    )
    .eq("organization_id", organizationId);
  return data ?? [];
}

// --- Channel ---

export async function createChannel(
  client: SupabaseClient,
  data: {
    organization_id: string;
    is_channel: boolean;
    channel_name: string;
    channel_type: string;
    channel_source_id: string | null;
    title: string;
  }
) {
  return client.from("message_threads").insert(data).select("id").single();
}

export async function fetchDeptMembers(client: SupabaseClient, departmentId: string) {
  const { data } = await client
    .from("employee_departments")
    .select("user_id")
    .eq("department_id", departmentId);
  return data ?? [];
}

export async function addChannelMembers(
  client: SupabaseClient,
  members: { thread_id: string; user_id: string }[]
) {
  return client.from("channel_members").insert(members);
}

export async function createDepartmentChannels(client: SupabaseClient, organizationId: string) {
  return client.rpc("create_department_channels", { p_organization_id: organizationId });
}

export async function fetchDepartments(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("departments")
    .select("id, name")
    .eq("organization_id", organizationId)
    .order("name");
  return (data ?? []) as { id: string; name: string }[];
}

export async function fetchProjects(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("projects")
    .select("id, name")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .order("name");
  return (data ?? []) as { id: string; name: string }[];
}

// --- Channel members ---

export async function getChannelMembers(client: SupabaseClient, threadId: string) {
  return client.rpc("get_channel_members", { p_thread_id: threadId });
}

export async function fetchOrgUsersForChannel(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("user_organizations")
    .select("user_id, profiles:user_id(id, display_name, email, avatar_url)")
    .eq("organization_id", organizationId);
  return data ?? [];
}

export async function addChannelMember(client: SupabaseClient, threadId: string, userId: string) {
  return client.from("channel_members").insert({ thread_id: threadId, user_id: userId });
}

export async function removeChannelMember(
  client: SupabaseClient,
  threadId: string,
  userId: string
) {
  return client.from("channel_members").delete().eq("thread_id", threadId).eq("user_id", userId);
}
