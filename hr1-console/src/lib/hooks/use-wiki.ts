"use client";

import { useState, useMemo, useCallback } from "react";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as repository from "@/lib/repositories/wiki-repository";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";
import { useQuery } from "@/lib/use-query";
import type { WikiPage } from "@/types/database";

export function useWikiPages() {
  return useOrgQuery("wiki-pages", (orgId) => repository.findByOrg(getSupabase(), orgId));
}

export function useWikiPage(id: string) {
  const { organization } = useOrg();
  return useQuery(organization && id ? `wiki-page-${organization.id}-${id}` : null, () =>
    repository.findById(getSupabase(), id, organization!.id)
  );
}

export function useWikiPageDetail(id: string) {
  const { organization } = useOrg();
  const { user } = useAuth();
  const { showToast } = useToast();

  const { data: page, isLoading, error: pageError, mutate: mutatePage } = useWikiPage(id);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  function startEdit() {
    if (!page) return;
    setEditTitle(page.title);
    setEditContent(page.content);
    setEditing(true);
  }

  async function handleSave() {
    if (!page || !user) return;
    setSaving(true);
    try {
      const result = await updateWikiPageInline(page.id, organization!.id, {
        title: editTitle.trim(),
        content: editContent,
        updated_by: user.id,
      });
      if (!result.success) {
        showToast(result.error!, "error");
        return;
      }
      await mutatePage();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished() {
    if (!page || !user) return;
    const result = await updateWikiPageInline(page.id, organization!.id, {
      title: page.title,
      content: page.content,
      is_published: !page.is_published,
      updated_by: user.id,
    });
    if (!result.success) {
      showToast(result.error!, "error");
      return;
    }
    await mutatePage();
  }

  return {
    page,
    isLoading,
    pageError,
    mutatePage,
    editing,
    setEditing,
    saving,
    editTitle,
    setEditTitle,
    editContent,
    setEditContent,
    startEdit,
    handleSave,
    togglePublished,
  };
}

export async function saveWikiPage(params: {
  organizationId: string;
  userId: string;
  editPageId: string | null;
  title: string;
  content: string;
  category: string | null;
  parentId: string | null;
  maxSortOrder: number;
}): Promise<{ success: boolean; error?: string }> {
  const client = getSupabase();
  if (params.editPageId) {
    const { error } = await repository.update(client, params.editPageId, params.organizationId, {
      title: params.title,
      content: params.content,
      category: params.category,
      parent_id: params.parentId,
      updated_by: params.userId,
    });
    if (error) return { success: false, error: "操作に失敗しました" };
  } else {
    const { error } = await repository.create(client, {
      organization_id: params.organizationId,
      title: params.title,
      content: params.content,
      category: params.category,
      parent_id: params.parentId,
      created_by: params.userId,
      sort_order: params.maxSortOrder,
    });
    if (error) return { success: false, error: "操作に失敗しました" };
  }
  return { success: true };
}

export async function deleteWikiPage(
  id: string,
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await repository.remove(getSupabase(), id, organizationId);
  if (error) return { success: false, error: "操作に失敗しました" };
  return { success: true };
}

export async function toggleWikiPublished(
  id: string,
  organizationId: string,
  isPublished: boolean,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await repository.update(getSupabase(), id, organizationId, {
    title: "",
    content: "",
    is_published: isPublished,
    updated_by: userId,
  });
  if (error) return { success: false, error: "操作に失敗しました" };
  return { success: true };
}

export async function updateWikiPageInline(
  id: string,
  organizationId: string,
  data: { title: string; content: string; updated_by: string; is_published?: boolean }
): Promise<{ success: boolean; error?: string }> {
  const { error } = await repository.update(getSupabase(), id, organizationId, data);
  if (error) return { success: false, error: "操作に失敗しました" };
  return { success: true };
}

export function useWikiPageEditor() {
  const { organization } = useOrg();
  const { user } = useAuth();
  const { data: pages = [], isLoading, error: pagesError, mutate: mutatePages } = useWikiPages();

  const [editOpen, setEditOpen] = useState(false);
  const [editPage, setEditPage] = useState<WikiPage | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [parentId, setParentId] = useState<string>("none");

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const categories = useMemo(() => {
    const cats = new Set<string>();
    pages.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, [pages]);

  const filteredPages = useMemo(() => {
    let result = pages;
    if (filterCategory !== "all") {
      result = result.filter((p) => p.category === filterCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q)
      );
    }
    return result;
  }, [pages, filterCategory, searchQuery]);

  const openCreate = useCallback(() => {
    setEditPage(null);
    setTitle("");
    setContent("");
    setCategory("");
    setNewCategory("");
    setParentId("none");
    setEditOpen(true);
  }, []);

  const openEdit = useCallback((page: WikiPage) => {
    setEditPage(page);
    setTitle(page.title);
    setContent(page.content);
    setCategory(page.category ?? "");
    setNewCategory("");
    setParentId(page.parent_id ?? "none");
    setEditOpen(true);
  }, []);

  const handleSave = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!organization || !user || !title.trim())
      return { success: false, error: "入力が不足しています" };
    setSaving(true);
    const resolvedCategory = newCategory.trim() || category || null;
    try {
      const maxOrder = pages.length > 0 ? Math.max(...pages.map((p) => p.sort_order)) + 1 : 0;
      const result = await saveWikiPage({
        organizationId: organization.id,
        userId: user.id,
        editPageId: editPage?.id ?? null,
        title: title.trim(),
        content,
        category: resolvedCategory,
        parentId: parentId === "none" ? null : parentId,
        maxSortOrder: maxOrder,
      });
      if (!result.success) {
        return { success: false, error: result.error };
      }
      await mutatePages();
      setEditOpen(false);
      return { success: true };
    } finally {
      setSaving(false);
    }
  }, [
    organization,
    user,
    title,
    newCategory,
    category,
    pages,
    editPage,
    content,
    parentId,
    mutatePages,
  ]);

  const handleDelete = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!editPage || !organization) return { success: false, error: "削除対象が見つかりません" };
    setDeleting(true);
    try {
      const result = await deleteWikiPage(editPage.id, organization.id);
      if (!result.success) {
        return { success: false, error: result.error };
      }
      await mutatePages();
      setEditOpen(false);
      return { success: true };
    } finally {
      setDeleting(false);
    }
  }, [editPage, organization, mutatePages]);

  const togglePublished = useCallback(
    async (page: WikiPage): Promise<{ success: boolean; error?: string }> => {
      if (!organization) return { success: false, error: "組織が見つかりません" };
      const result = await updateWikiPageInline(page.id, organization.id, {
        title: page.title,
        content: page.content,
        is_published: !page.is_published,
        updated_by: user?.id ?? "",
      });
      if (!result.success) {
        return { success: false, error: result.error };
      }
      await mutatePages();
      return { success: true };
    },
    [organization, user, mutatePages]
  );

  const getParentTitle = useCallback(
    (pid: string | null) => {
      if (!pid) return null;
      const parent = pages.find((p) => p.id === pid);
      return parent?.title ?? null;
    },
    [pages]
  );

  return {
    pages,
    isLoading,
    pagesError,
    mutatePages,
    editOpen,
    setEditOpen,
    editPage,
    saving,
    deleting,
    title,
    setTitle,
    content,
    setContent,
    category,
    setCategory,
    newCategory,
    setNewCategory,
    parentId,
    setParentId,
    searchQuery,
    setSearchQuery,
    filterCategory,
    setFilterCategory,
    categories,
    filteredPages,
    openCreate,
    openEdit,
    handleSave,
    handleDelete,
    togglePublished,
    getParentTitle,
  };
}
