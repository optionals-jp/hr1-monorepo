"use client";

import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as repository from "@/lib/repositories/wiki-repository";
import { useOrg } from "@/lib/org-context";
import { useQuery } from "@/lib/use-query";

export function useWikiPages() {
  return useOrgQuery("wiki-pages", (orgId) => repository.findByOrg(getSupabase(), orgId));
}

export function useWikiPage(id: string) {
  const { organization } = useOrg();
  return useQuery(organization && id ? `wiki-page-${organization.id}-${id}` : null, () =>
    repository.findById(getSupabase(), id, organization!.id)
  );
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
    title: "", // not actually used, but needed for the function signature
    content: "", // same
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
