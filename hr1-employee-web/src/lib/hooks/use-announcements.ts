"use client";

import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as announcementRepository from "@/lib/repositories/announcement-repository";
import type { Announcement } from "@/types/database";

export function useAnnouncements() {
  return useOrgQuery<Announcement[]>("announcements", (orgId) =>
    announcementRepository.fetchPublishedAnnouncements(getSupabase(), orgId)
  );
}
