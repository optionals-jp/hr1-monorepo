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

// --- Production-level RPCs (HR-27) ---

export interface AttachmentInput {
  storage_path: string;
  file_name: string;
  mime_type: string;
  byte_size: number;
  width?: number | null;
  height?: number | null;
}

export async function sendMessageV2(
  client: SupabaseClient,
  params: {
    thread_id: string;
    content: string;
    parent_message_id?: string | null;
    mentioned_user_ids?: string[];
    attachments?: AttachmentInput[];
  }
) {
  return client.rpc("send_message_v2", {
    p_thread_id: params.thread_id,
    p_content: params.content,
    p_parent_message_id: params.parent_message_id ?? null,
    p_mentioned_user_ids: params.mentioned_user_ids ?? null,
    p_attachments: params.attachments ? JSON.stringify(params.attachments) : null,
  });
}

export async function getThreadMessages(
  client: SupabaseClient,
  threadId: string,
  opts?: { before?: string; limit?: number }
) {
  return client.rpc("get_thread_messages", {
    p_thread_id: threadId,
    p_before: opts?.before ?? null,
    p_limit: opts?.limit ?? 30,
  });
}

export async function markThreadRead(client: SupabaseClient, threadId: string) {
  return client.rpc("mark_thread_read", { p_thread_id: threadId });
}

export async function toggleMessageReaction(
  client: SupabaseClient,
  messageId: string,
  emoji: string
) {
  return client.rpc("toggle_message_reaction", {
    p_message_id: messageId,
    p_emoji: emoji,
  });
}

export async function searchMessages(
  client: SupabaseClient,
  query: string,
  opts?: { threadId?: string; limit?: number }
) {
  return client.rpc("search_messages", {
    p_query: query,
    p_thread_id: opts?.threadId ?? null,
    p_limit: opts?.limit ?? 50,
  });
}

export async function getUnreadMentionCount(client: SupabaseClient) {
  return client.rpc("get_unread_mention_count");
}

export async function softDeleteMessage(
  client: SupabaseClient,
  messageId: string,
  senderId: string
) {
  return client
    .from("messages")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("sender_id", senderId);
}

// --- Storage helper for attachment upload ---

export async function uploadMessageAttachment(
  client: SupabaseClient,
  params: {
    organizationId: string;
    threadId: string;
    messageId: string;
    file: File;
  }
) {
  const safeName = params.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${params.organizationId}/${params.threadId}/${params.messageId}/${Date.now()}_${safeName}`;
  return client.storage.from("message-attachments").upload(path, params.file, {
    cacheControl: "3600",
    upsert: false,
  });
}

export async function createAttachmentSignedUrl(
  client: SupabaseClient,
  storagePath: string,
  expiresInSeconds: number = 3600
) {
  return client.storage.from("message-attachments").createSignedUrl(storagePath, expiresInSeconds);
}
