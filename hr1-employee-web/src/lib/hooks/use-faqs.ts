"use client";

import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as faqRepository from "@/lib/repositories/faq-repository";
import type { Faq } from "@/types/database";

export function useFaqs() {
  return useOrgQuery<Faq[]>("faqs", (orgId) =>
    faqRepository.fetchPublishedFaqs(getSupabase(), orgId)
  );
}
