"use client";

import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as wikiRepository from "@/lib/repositories/wiki-repository";
import type { WikiPage } from "@/types/database";

export function useWikiPages() {
  return useOrgQuery<WikiPage[]>("wiki-pages", (orgId) =>
    wikiRepository.fetchPublishedPages(getSupabase(), orgId)
  );
}

export function useWikiPage(id: string) {
  return useOrgQuery<WikiPage | null>(`wiki-page-${id}`, (orgId) =>
    wikiRepository.findById(getSupabase(), id, orgId)
  );
}
