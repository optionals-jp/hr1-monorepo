"use client";

import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as repository from "@/lib/repositories/faq-repository";

export function useFaqs() {
  return useOrgQuery("faqs", (orgId) => repository.findByOrg(getSupabase(), orgId));
}

export async function saveFaq(params: {
  organizationId: string;
  editFaqId: string | null;
  question: string;
  answer: string;
  category: string;
  target: string;
  maxSortOrder: number;
}): Promise<{ success: boolean }> {
  const client = getSupabase();
  if (params.editFaqId) {
    await repository.update(client, params.editFaqId, params.organizationId, {
      question: params.question,
      answer: params.answer,
      category: params.category,
      target: params.target,
      updated_at: new Date().toISOString(),
    });
  } else {
    await repository.create(client, {
      organization_id: params.organizationId,
      question: params.question,
      answer: params.answer,
      category: params.category,
      target: params.target,
      sort_order: params.maxSortOrder,
    });
  }
  return { success: true };
}

export async function deleteFaq(id: string, organizationId: string): Promise<{ success: boolean }> {
  await repository.remove(getSupabase(), id, organizationId);
  return { success: true };
}

export async function toggleFaqPublished(
  id: string,
  organizationId: string,
  isPublished: boolean
): Promise<{ success: boolean }> {
  await repository.togglePublished(getSupabase(), id, organizationId, !isPublished);
  return { success: true };
}
