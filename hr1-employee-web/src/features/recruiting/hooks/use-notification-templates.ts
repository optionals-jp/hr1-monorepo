"use client";

import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase/browser";
import * as repo from "@/lib/repositories/notification-template-repository";
import { useCallback } from "react";

export function useNotificationTemplates() {
  const { organization } = useOrg();
  const { data: templates = [], mutate } = useOrgQuery("notification-templates", (orgId) =>
    repo.fetchTemplates(getSupabase(), orgId)
  );

  const saveTemplate = useCallback(
    async (
      triggerEvent: string,
      titleTemplate: string,
      bodyTemplate: string,
      isActive: boolean
    ) => {
      if (!organization) return;
      await repo.upsertTemplate(
        getSupabase(),
        organization.id,
        triggerEvent,
        titleTemplate,
        bodyTemplate,
        isActive
      );
      mutate();
    },
    [organization, mutate]
  );

  return { templates, saveTemplate };
}
