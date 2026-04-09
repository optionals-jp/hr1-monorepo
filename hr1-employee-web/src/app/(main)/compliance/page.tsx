"use client";

import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Card, CardContent } from "@hr1/shared-ui/components/ui/card";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { useMyComplianceAlerts } from "@/lib/hooks/use-compliance";
import { cn } from "@hr1/shared-ui/lib/utils";
import { ShieldCheck, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { format } from "date-fns";

const severityConfig = {
  critical: {
    icon: AlertTriangle,
    color: "text-red-600",
    bg: "bg-red-50",
    badge: "destructive" as const,
    label: "重要",
  },
  warning: {
    icon: AlertCircle,
    color: "text-amber-600",
    bg: "bg-amber-50",
    badge: "secondary" as const,
    label: "警告",
  },
  info: {
    icon: Info,
    color: "text-blue-600",
    bg: "bg-blue-50",
    badge: "outline" as const,
    label: "情報",
  },
};

export default function CompliancePage() {
  const { data: alerts = [], isLoading, error, mutate } = useMyComplianceAlerts();

  const unresolved = alerts.filter((a) => !a.is_resolved);
  const resolved = alerts.filter((a) => a.is_resolved);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="コンプライアンス"
        description={unresolved.length > 0 ? `未対応 ${unresolved.length}件` : "問題ありません"}
        sticky={false}
        border={false}
      />
      {error && <QueryErrorBanner error={error} onRetry={() => mutate()} />}

      <PageContent>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">読み込み中...</div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <ShieldCheck className="h-10 w-10 opacity-40" />
            <p className="text-sm">コンプライアンスアラートはありません</p>
          </div>
        ) : (
          <div className="space-y-6 max-w-2xl">
            {unresolved.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">未対応のアラート</h3>
                {unresolved.map((alert) => {
                  const config = severityConfig[alert.severity];
                  const Icon = config.icon;
                  return (
                    <Card
                      key={alert.id}
                      className={cn(
                        "border-l-4",
                        alert.severity === "critical"
                          ? "border-l-red-500"
                          : alert.severity === "warning"
                            ? "border-l-amber-500"
                            : "border-l-blue-500"
                      )}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <div className={cn("p-1.5 rounded", config.bg)}>
                            <Icon className={cn("h-4 w-4", config.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{alert.title}</p>
                              <Badge variant={config.badge} className="text-[10px]">
                                {config.label}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {alert.description}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-2">
                              {format(new Date(alert.created_at), "yyyy/MM/dd")}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {resolved.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground">対応済み</h3>
                {resolved.map((alert) => (
                  <Card key={alert.id} className="opacity-60">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <ShieldCheck className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium line-through">{alert.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            対応済み:{" "}
                            {alert.resolved_at && format(new Date(alert.resolved_at), "yyyy/MM/dd")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </PageContent>
    </div>
  );
}
