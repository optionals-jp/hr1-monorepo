"use client";

import { useState, useCallback, useMemo } from "react";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import {
  fetchQuotes,
  fetchCompanies,
  fetchDealsAll,
  createQuote,
} from "@/lib/repositories/crm-repository";
import { generateQuoteNumber } from "@/features/crm/rules";
import type { BcQuote, BcCompany, BcDeal } from "@/types/database";

export function useCrmQuotesPage() {
  const { organization } = useOrg();
  const { user } = useAuth();

  const { data: quotes, mutate } = useOrgQuery<BcQuote[]>("crm-quotes", (orgId) =>
    fetchQuotes(getSupabase(), orgId)
  );

  const { data: companies } = useOrgQuery<BcCompany[]>("crm-companies", (orgId) =>
    fetchCompanies(getSupabase(), orgId)
  );

  const { data: deals } = useOrgQuery<BcDeal[]>("crm-deals-all", (orgId) =>
    fetchDealsAll(getSupabase(), orgId)
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);

  // Add form state
  const [formTitle, setFormTitle] = useState("");
  const [formCompanyId, setFormCompanyId] = useState("");
  const [formDealId, setFormDealId] = useState("");
  const [formIssueDate, setFormIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [formExpiryDate, setFormExpiryDate] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const filtered = useMemo(() => {
    return (quotes ?? []).filter((q) => {
      if (statusFilter !== "all" && q.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const companyName = (q.crm_companies as { name: string } | undefined)?.name ?? "";
        return (
          q.title.toLowerCase().includes(s) ||
          q.quote_number.toLowerCase().includes(s) ||
          companyName.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [quotes, statusFilter, search]);

  const handleCreate = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!organization || !formTitle.trim()) {
      return { success: false, error: "タイトルを入力してください" };
    }
    try {
      await createQuote(getSupabase(), {
        organization_id: organization.id,
        quote_number: generateQuoteNumber(),
        title: formTitle,
        company_id: formCompanyId || null,
        deal_id: formDealId || null,
        issue_date: formIssueDate,
        expiry_date: formExpiryDate || null,
        notes: formNotes || null,
        status: "draft",
        created_by: user?.id ?? null,
      });
      setAddOpen(false);
      setFormTitle("");
      setFormCompanyId("");
      setFormDealId("");
      setFormNotes("");
      mutate();
      return { success: true };
    } catch {
      return { success: false, error: "見積書の作成に失敗しました" };
    }
  }, [
    organization,
    formTitle,
    formCompanyId,
    formDealId,
    formIssueDate,
    formExpiryDate,
    formNotes,
    user,
    mutate,
  ]);

  return {
    quotes,
    companies,
    deals,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    addOpen,
    setAddOpen,
    formTitle,
    setFormTitle,
    formCompanyId,
    setFormCompanyId,
    formDealId,
    setFormDealId,
    formIssueDate,
    setFormIssueDate,
    formExpiryDate,
    setFormExpiryDate,
    formNotes,
    setFormNotes,
    filtered,
    handleCreate,
  };
}
