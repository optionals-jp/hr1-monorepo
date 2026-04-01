"use client";

import { useState, useCallback } from "react";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { getSupabase } from "@/lib/supabase/browser";
import * as repository from "@/lib/repositories/announcement-repository";
import type { Announcement } from "@/types/database";

export function useAnnouncements() {
  return useOrgQuery("announcements", (orgId) => repository.findByOrg(getSupabase(), orgId));
}

export function useAnnouncementPanel() {
  const { organization } = useOrg();
  const { user } = useAuth();
  const { mutate: mutateAnnouncements } = useAnnouncements();

  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<Announcement | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<string>("all");
  const [isPinned, setIsPinned] = useState(false);

  const openCreate = useCallback(() => {
    setEditItem(null);
    setTitle("");
    setBody("");
    setTarget("all");
    setIsPinned(false);
    setEditOpen(true);
  }, []);

  const openEdit = useCallback((a: Announcement) => {
    setEditItem(a);
    setTitle(a.title);
    setBody(a.body);
    setTarget(a.target);
    setIsPinned(a.is_pinned);
    setEditOpen(true);
  }, []);

  const handleSave = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!organization || !user || !title.trim() || !body.trim()) return { success: false };
    setSaving(true);
    try {
      const result = await saveAnnouncement({
        organizationId: organization.id,
        userId: user.id,
        editItemId: editItem?.id ?? null,
        title: title.trim(),
        body: body.trim(),
        target,
        isPinned,
      });
      if (!result.success) {
        return { success: false, error: result.error };
      }
      await mutateAnnouncements();
      setEditOpen(false);
      return { success: true };
    } finally {
      setSaving(false);
    }
  }, [organization, user, title, body, target, isPinned, editItem, mutateAnnouncements]);

  const handleDelete = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!editItem || !organization) return { success: false };
    setDeleting(true);
    try {
      const result = await deleteAnnouncement(editItem.id, organization.id);
      if (!result.success) {
        return { success: false, error: result.error };
      }
      await mutateAnnouncements();
      setEditOpen(false);
      return { success: true };
    } finally {
      setDeleting(false);
    }
  }, [editItem, organization, mutateAnnouncements]);

  const togglePublish = useCallback(
    async (a: Announcement): Promise<{ success: boolean; error?: string }> => {
      if (!organization) return { success: false };
      const result = await toggleAnnouncementPublish(a.id, organization.id, !!a.published_at);
      if (!result.success) {
        return { success: false, error: result.error };
      }
      await mutateAnnouncements();
      return { success: true };
    },
    [organization, mutateAnnouncements]
  );

  const togglePin = useCallback(
    async (a: Announcement): Promise<{ success: boolean; error?: string }> => {
      if (!organization) return { success: false };
      const result = await toggleAnnouncementPin(a.id, organization.id, a.is_pinned);
      if (!result.success) {
        return { success: false, error: result.error };
      }
      await mutateAnnouncements();
      return { success: true };
    },
    [organization, mutateAnnouncements]
  );

  return {
    editOpen,
    setEditOpen,
    editItem,
    saving,
    deleting,
    title,
    setTitle,
    body,
    setBody,
    target,
    setTarget,
    isPinned,
    setIsPinned,
    openCreate,
    openEdit,
    handleSave,
    handleDelete,
    togglePublish,
    togglePin,
  };
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
