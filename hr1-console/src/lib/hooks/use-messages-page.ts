"use client";

import { useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase/browser";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@/lib/use-query";
import * as messageRepo from "@/lib/repositories/message-repository";
import type { MessageThread, Profile, ChannelMember } from "@/types/database";
import type { MessageCache } from "@/features/messages/components/thread-chat";

export function useThreadsList() {
  const { organization } = useOrg();
  const { user } = useAuth();
  return useQuery<MessageThread[]>(
    organization && user ? `message-threads-${organization.id}` : null,
    async () => {
      const { data } = await messageRepo.getThreadsWithDetails(
        getSupabase(),
        organization!.id,
        user!.id
      );

      if (!data) return [];

      return (data as Record<string, unknown>[]).map((row) => ({
        id: row.id as string,
        organization_id: row.organization_id as string,
        participant_id: row.participant_id as string,
        participant_type: (row.participant_type as "applicant" | "employee") ?? "applicant",
        title: row.title as string | null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        participant: {
          id: row.participant_id as string,
          display_name: row.participant_display_name as string | null,
          email: row.participant_email as string,
          avatar_url: row.participant_avatar_url as string | null,
          department: row.participant_department as string | null,
          position: row.participant_position as string | null,
        },
        job_titles: (row.job_titles as string | null) ?? null,
        application_count: Number(row.application_count ?? 0),
        latest_message: row.latest_message_id
          ? {
              id: row.latest_message_id as string,
              thread_id: row.id as string,
              sender_id: row.latest_message_sender_id as string,
              content: row.latest_message_content as string,
              read_at: null,
              created_at: row.latest_message_created_at as string,
              sender: { display_name: row.latest_message_sender_name as string | null },
            }
          : undefined,
        unread_count: Number(row.unread_count ?? 0),
      })) as MessageThread[];
    }
  );
}

export function useChannelsList() {
  const { organization } = useOrg();
  return useQuery<MessageThread[]>(
    organization ? `channels-${organization.id}` : null,
    async () => {
      const { data } = await messageRepo.getChannelsWithDetails(getSupabase(), organization!.id);
      if (!data) return [];
      return (data as Record<string, unknown>[]).map((row) => ({
        id: row.id as string,
        organization_id: row.organization_id as string,
        participant_id: "",
        participant_type: "employee" as const,
        is_channel: true,
        channel_name: row.channel_name as string | null,
        channel_type: row.channel_type as "department" | "project" | "custom" | null,
        channel_source_id: row.channel_source_id as string | null,
        title: row.title as string | null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        member_count: Number(row.member_count ?? 0),
        latest_message: row.latest_message_id
          ? {
              id: row.latest_message_id as string,
              thread_id: row.id as string,
              sender_id: "",
              content: row.latest_message_content as string,
              read_at: null,
              edited_at: null,
              created_at: row.latest_message_created_at as string,
              sender: { display_name: row.latest_message_sender_name as string | null },
            }
          : undefined,
      })) as MessageThread[];
    }
  );
}

export function getSupabaseClient() {
  return getSupabase();
}

export async function fetchMessagesPage(threadId: string, rangeStart: number, rangeEnd: number) {
  return messageRepo.fetchMessages(getSupabase(), threadId, rangeStart, rangeEnd);
}

export async function fetchMessagesSince(threadId: string, sinceCreatedAt: string) {
  return messageRepo.fetchMessagesSince(getSupabase(), threadId, sinceCreatedAt);
}

export async function markAsRead(threadId: string, currentUserId: string) {
  return messageRepo.markAsRead(getSupabase(), threadId, currentUserId);
}

export async function fetchOlderMessages(
  threadId: string,
  beforeCreatedAt: string,
  rangeEnd: number
) {
  return messageRepo.fetchOlderMessages(getSupabase(), threadId, beforeCreatedAt, rangeEnd);
}

export async function sendMessage(data: { thread_id: string; content: string }) {
  return messageRepo.sendMessage(getSupabase(), data);
}

export async function editMessage(messageId: string, senderId: string, content: string) {
  return messageRepo.editMessage(getSupabase(), messageId, senderId, content);
}

export async function deleteMessage(messageId: string, senderId: string) {
  return messageRepo.deleteMessage(getSupabase(), messageId, senderId);
}

// --- New thread panel ---

type ApplicantWithJobTitles = Profile & { job_titles: string };

export function useUnthreadedApplicants() {
  const { organization } = useOrg();
  return useQuery<ApplicantWithJobTitles[]>(
    organization ? `unthreaded-applicants-${organization.id}` : null,
    async () => {
      const client = getSupabase();
      const existingIds = await messageRepo.fetchExistingThreadParticipants(
        client,
        organization!.id,
        "applicant"
      );
      const apps = await messageRepo.fetchActiveApplicants(client, organization!.id);

      const map = new Map<string, ApplicantWithJobTitles>();
      for (const app of apps as unknown as {
        applicant_id: string;
        profiles: Profile;
        jobs: { title: string };
      }[]) {
        if (!app.profiles || existingIds.includes(app.applicant_id)) continue;
        const existing = map.get(app.applicant_id);
        if (existing) {
          existing.job_titles += `, ${app.jobs?.title ?? ""}`;
        } else {
          map.set(app.applicant_id, { ...app.profiles, job_titles: app.jobs?.title ?? "" });
        }
      }
      return Array.from(map.values());
    }
  );
}

export function useUnthreadedEmployees() {
  const { organization } = useOrg();
  return useQuery<Profile[]>(
    organization ? `unthreaded-emps-${organization.id}` : null,
    async () => {
      const client = getSupabase();
      const existingParticipantIds = await messageRepo.fetchExistingThreadParticipants(
        client,
        organization!.id,
        "employee"
      );
      const orgEmployees = await messageRepo.fetchOrgEmployees(client, organization!.id);
      const empProfiles = (
        orgEmployees.map((u) => (u as unknown as { profiles: Profile }).profiles) as Profile[]
      ).filter((p) => p && p.role === "employee");
      if (existingParticipantIds.length > 0) {
        return empProfiles.filter((p) => !existingParticipantIds.includes(p.id));
      }
      return empProfiles;
    }
  );
}

export async function createThread(data: {
  organization_id: string;
  participant_id: string;
  participant_type: "applicant" | "employee";
}) {
  return messageRepo.createThread(getSupabase(), data);
}

// --- Channel ---

export function useDepartmentsForChannel(enabled: boolean) {
  const { organization } = useOrg();
  return useQuery<{ id: string; name: string }[]>(
    organization && enabled ? `departments-${organization.id}` : null,
    async () => messageRepo.fetchDepartments(getSupabase(), organization!.id)
  );
}

export function useProjectsForChannel(enabled: boolean) {
  const { organization } = useOrg();
  return useQuery<{ id: string; name: string }[]>(
    organization && enabled ? `projects-${organization.id}` : null,
    async () => messageRepo.fetchProjects(getSupabase(), organization!.id)
  );
}

export async function createChannel(data: {
  organization_id: string;
  is_channel: boolean;
  channel_name: string;
  channel_type: string;
  channel_source_id: string | null;
  title: string;
}) {
  return messageRepo.createChannel(getSupabase(), data);
}

export async function addChannelMembers(members: { thread_id: string; user_id: string }[]) {
  return messageRepo.addChannelMembers(getSupabase(), members);
}

export async function fetchDeptMembers(departmentId: string) {
  return messageRepo.fetchDeptMembers(getSupabase(), departmentId);
}

export async function createDepartmentChannels(organizationId: string) {
  return messageRepo.createDepartmentChannels(getSupabase(), organizationId);
}

// --- Channel members ---

export function useChannelMembers(threadId: string) {
  const { organization } = useOrg();
  return useQuery<ChannelMember[]>(
    organization ? `channel-members-${organization.id}-${threadId}` : null,
    async () => {
      const { data } = await messageRepo.getChannelMembers(getSupabase(), threadId);
      return (data ?? []) as ChannelMember[];
    }
  );
}

export function useOrgUsersForChannel(enabled: boolean) {
  const { organization } = useOrg();
  return useQuery<Profile[]>(
    enabled && organization ? `org-users-for-channel-${organization.id}` : null,
    async () => {
      const data = await messageRepo.fetchOrgUsersForChannel(getSupabase(), organization!.id);
      return (
        data.map((u) => (u as unknown as { profiles: Profile }).profiles) as Profile[]
      ).filter(Boolean);
    }
  );
}

export async function addChannelMember(threadId: string, userId: string) {
  return messageRepo.addChannelMember(getSupabase(), threadId, userId);
}

export async function removeChannelMember(threadId: string, userId: string) {
  return messageRepo.removeChannelMember(getSupabase(), threadId, userId);
}

export async function fetchSenderProfile(senderId: string) {
  return messageRepo.fetchSenderProfile(getSupabase(), senderId);
}

export async function markSingleAsRead(messageId: string) {
  return messageRepo.markSingleAsRead(getSupabase(), messageId);
}

export function useMessagesPage() {
  const searchParams = useSearchParams();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(
    searchParams.get("thread")
  );
  const [search, setSearch] = useState("");
  const [showNewThread, setShowNewThread] = useState(false);
  const [mainTab, setMainTab] = useState<"dm" | "channels">("dm");
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showChannelMembers, setShowChannelMembers] = useState(false);
  const messageCache = useRef<MessageCache>(new Map());

  const {
    data: threads = [],
    isLoading: threadsLoading,
    error: threadsError,
    mutate: mutateThreads,
  } = useThreadsList();

  const {
    data: channels = [],
    isLoading: channelsLoading,
    error: channelsError,
    mutate: mutateChannels,
  } = useChannelsList();

  const filtered = threads.filter((t) => {
    if (!search) return true;
    const s = search.toLowerCase();
    const name = t.participant?.display_name?.toLowerCase() ?? "";
    const email = t.participant?.email?.toLowerCase() ?? "";
    const jobTitles = t.job_titles?.toLowerCase() ?? "";
    return name.includes(s) || email.includes(s) || jobTitles.includes(s);
  });

  const filteredChannels = channels.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (c.channel_name?.toLowerCase() ?? "").includes(s);
  });

  const selectedThread =
    mainTab === "dm"
      ? threads.find((t) => t.id === selectedThreadId)
      : channels.find((c) => c.id === selectedThreadId);

  return {
    selectedThreadId,
    setSelectedThreadId,
    search,
    setSearch,
    showNewThread,
    setShowNewThread,
    mainTab,
    setMainTab,
    showCreateChannel,
    setShowCreateChannel,
    showChannelMembers,
    setShowChannelMembers,
    messageCache,
    threads,
    threadsLoading,
    threadsError,
    mutateThreads,
    channels,
    channelsLoading,
    channelsError,
    mutateChannels,
    filtered,
    filteredChannels,
    selectedThread,
  };
}
