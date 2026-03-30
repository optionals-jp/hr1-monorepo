"use client";

import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as repository from "@/lib/repositories/announcement-repository";

export function useAnnouncements() {
  return useOrgQuery("announcements", (orgId) => repository.findByOrg(getSupabase(), orgId));
}

export async function saveAnnouncement(params: {
  organizationId: string;
  userId: string;
  editItemId: string | null;
  title: string;
  body: string;
  target: string;
  isPinned: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const client = getSupabase();
  if (params.editItemId) {
    const { error } = await repository.update(client, params.editItemId, params.organizationId, {
      title: params.title,
      body: params.body,
      target: params.target,
      is_pinned: params.isPinned,
    });
    if (error) return { success: false, error: "操作に失敗しました" };
  } else {
    const { error } = await repository.create(client, {
      organization_id: params.organizationId,
      title: params.title,
      body: params.body,
      target: params.target,
      is_pinned: params.isPinned,
      created_by: params.userId,
    });
    if (error) return { success: false, error: "操作に失敗しました" };
  }
  return { success: true };
}

export async function deleteAnnouncement(
  id: string,
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await repository.remove(getSupabase(), id, organizationId);
  if (error) return { success: false, error: "操作に失敗しました" };
  return { success: true };
}

export async function toggleAnnouncementPublish(
  id: string,
  organizationId: string,
  currentlyPublished: boolean
): Promise<{ success: boolean; error?: string }> {
  const publishedAt = currentlyPublished ? null : new Date().toISOString();
  const { error } = await repository.updatePublishedAt(
    getSupabase(),
    id,
    organizationId,
    publishedAt
  );
  if (error) return { success: false, error: "操作に失敗しました" };
  return { success: true };
}

export async function toggleAnnouncementPin(
  id: string,
  organizationId: string,
  currentlyPinned: boolean
): Promise<{ success: boolean; error?: string }> {
  const { error } = await repository.updatePin(getSupabase(), id, organizationId, !currentlyPinned);
  if (error) return { success: false, error: "操作に失敗しました" };
  return { success: true };
}
