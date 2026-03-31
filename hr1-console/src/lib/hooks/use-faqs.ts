"use client";

import { useState, useCallback } from "react";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase/browser";
import * as repository from "@/lib/repositories/faq-repository";
import type { Faq } from "@/types/database";

export function useFaqs() {
  return useOrgQuery("faqs", (orgId) => repository.findByOrg(getSupabase(), orgId));
}

export function useFaqPanel() {
  const { organization } = useOrg();
  const { data: faqs = [], mutate: mutateFaqs } = useFaqs();

  const [editOpen, setEditOpen] = useState(false);
  const [editFaq, setEditFaq] = useState<Faq | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("general");
  const [target, setTarget] = useState<string>("both");

  const openCreate = useCallback(() => {
    setEditFaq(null);
    setQuestion("");
    setAnswer("");
    setCategory("general");
    setTarget("both");
    setEditOpen(true);
  }, []);

  const openEdit = useCallback((faq: Faq) => {
    setEditFaq(faq);
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setCategory(faq.category);
    setTarget(faq.target);
    setEditOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!organization || !question.trim() || !answer.trim()) return;
    setSaving(true);
    try {
      const maxOrder = faqs.length > 0 ? Math.max(...faqs.map((f) => f.sort_order)) + 1 : 0;
      await saveFaq({
        organizationId: organization.id,
        editFaqId: editFaq?.id ?? null,
        question: question.trim(),
        answer: answer.trim(),
        category,
        target,
        maxSortOrder: maxOrder,
      });
      await mutateFaqs();
      setEditOpen(false);
    } finally {
      setSaving(false);
    }
  }, [organization, question, answer, category, target, editFaq, faqs, mutateFaqs]);

  const handleDelete = useCallback(async () => {
    if (!editFaq) return;
    setDeleting(true);
    try {
      if (!organization) return;
      await deleteFaq(editFaq.id, organization.id);
      await mutateFaqs();
      setEditOpen(false);
    } finally {
      setDeleting(false);
    }
  }, [editFaq, organization, mutateFaqs]);

  const handleTogglePublished = useCallback(
    async (faq: Faq) => {
      if (!organization) return;
      await toggleFaqPublished(faq.id, organization.id, faq.is_published);
      await mutateFaqs();
    },
    [organization, mutateFaqs]
  );

  return {
    editOpen,
    setEditOpen,
    editFaq,
    saving,
    deleting,
    question,
    setQuestion,
    answer,
    setAnswer,
    category,
    setCategory,
    target,
    setTarget,
    openCreate,
    openEdit,
    handleSave,
    handleDelete,
    handleTogglePublished,
  };
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
