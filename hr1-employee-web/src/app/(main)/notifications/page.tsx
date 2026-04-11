"use client";

import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { cn } from "@hr1/shared-ui/lib/utils";
import { Bell, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { useRouter } from "next/navigation";

const RESOURCE_ROUTES: Record<string, { path: string; hasDetail: boolean }> = {
  announcement: { path: "/announcements", hasDetail: false },
  leave_request: { path: "/my-leave", hasDetail: false },
  attendance: { path: "/my-attendance", hasDetail: false },
  task: { path: "/tasks", hasDetail: false },
  message: { path: "/messages", hasDetail: false },
  evaluation: { path: "/evaluation-cycles", hasDetail: false },
  survey: { path: "/surveys", hasDetail: true },
  workflow: { path: "/workflows", hasDetail: false },
  project: { path: "/projects", hasDetail: false },
  wiki: { path: "/wiki", hasDetail: true },
};

export default function NotificationsPage() {
  const router = useRouter();
  const {
    data: notifications,
    isLoading,
    error,
    mutate,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const handleClick = async (n: (typeof notifications)[number]) => {
    if (!n.read_at) await markAsRead(n.id);
    if (n.resource_type) {
      const config = RESOURCE_ROUTES[n.resource_type];
      if (config) {
        const url =
          config.hasDetail && n.resource_id ? `${config.path}/${n.resource_id}` : config.path;
        router.push(url);
      }
    }
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        title="通知"
        description={unreadCount > 0 ? `未読 ${unreadCount}件` : "すべて既読"}
        sticky={false}
        border={false}
        action={
          unreadCount > 0 ? (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-1.5" />
              すべて既読にする
            </Button>
          ) : undefined
        }
      />
      {error && <QueryErrorBanner error={error} onRetry={() => mutate()} />}

      <PageContent>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">読み込み中...</div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <Bell className="h-10 w-10 opacity-40" />
            <p className="text-sm">通知はありません</p>
          </div>
        ) : (
          <div className="divide-y rounded-lg border max-w-2xl">
            {notifications.map((n) => {
              const isUnread = !n.read_at;
              return (
                <button
                  key={n.id}
                  type="button"
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent/50",
                    isUnread && "bg-primary/5"
                  )}
                  onClick={() => handleClick(n)}
                >
                  <div
                    className={cn(
                      "mt-1.5 h-2 w-2 rounded-full shrink-0",
                      isUnread ? "bg-primary" : "bg-transparent"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm truncate",
                        isUnread ? "font-semibold" : "font-medium text-muted-foreground"
                      )}
                    >
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{n.body}</p>
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0 mt-0.5">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ja })}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </PageContent>
    </div>
  );
}
