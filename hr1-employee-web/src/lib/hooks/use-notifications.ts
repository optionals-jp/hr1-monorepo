"use client";

import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@/lib/use-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as notificationRepository from "@/lib/repositories/notification-repository";
import type { Notification } from "@/types/database";

export function useNotifications() {
  const { user } = useAuth();
  const { organization } = useOrg();
  const key = user && organization ? `notifications-${organization.id}-${user.id}` : null;

  const {
    data = [],
    error,
    isLoading,
    mutate,
  } = useQuery<Notification[]>(key, () =>
    notificationRepository.fetchNotifications(getSupabase(), user!.id, organization!.id)
  );

  const unreadCount = data.filter((n) => !n.read_at).length;

  const markAsRead = async (id: string) => {
    await notificationRepository.markAsRead(getSupabase(), id, user!.id);
    mutate();
  };

  const markAllAsRead = async () => {
    await notificationRepository.markAllAsRead(getSupabase(), user!.id, organization!.id);
    mutate();
  };

  return { data, error, isLoading, mutate, unreadCount, markAsRead, markAllAsRead };
}
