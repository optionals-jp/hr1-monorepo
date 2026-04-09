"use client";

import { useState, useMemo } from "react";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Card, CardContent } from "@hr1/shared-ui/components/ui/card";
import { Label } from "@hr1/shared-ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { useMyWorkflows } from "@/lib/hooks/use-workflows";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { cn } from "@hr1/shared-ui/lib/utils";
import { FileInput, Clock, CheckCircle2, XCircle, Ban, Plus } from "lucide-react";
import { format } from "date-fns";
import type { WorkflowRequestStatus, WorkflowRequestType } from "@/types/database";

const statusConfig: Record<
  WorkflowRequestStatus,
  {
    label: string;
    icon: typeof Clock;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  pending: { label: "申請中", icon: Clock, variant: "secondary" },
  approved: { label: "承認済", icon: CheckCircle2, variant: "default" },
  rejected: { label: "却下", icon: XCircle, variant: "destructive" },
  cancelled: { label: "取消", icon: Ban, variant: "outline" },
};

const typeLabels: Record<string, string> = {
  paid_leave: "有給休暇",
  overtime: "残業申請",
  business_trip: "出張申請",
  expense: "経費精算",
};

export default function WorkflowsPage() {
  const { showToast } = useToast();
  const {
    data: requests = [],
    isLoading,
    error,
    mutate,
    cancelRequest,
    createRequest,
  } = useMyWorkflows();
  const [filter, setFilter] = useState<WorkflowRequestStatus | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [requestType, setRequestType] = useState<WorkflowRequestType>("paid_leave");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      await createRequest(requestType, {}, reason.trim());
      setShowForm(false);
      setReason("");
      showToast("申請しました");
    } catch {
      showToast("申請に失敗しました", "error");
    }
    setSubmitting(false);
  };

  const filtered = useMemo(() => {
    if (filter === "all") return requests;
    return requests.filter((r) => r.status === filter);
  }, [requests, filter]);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="各種申請"
        description="ワークフロー申請の確認・提出"
        sticky={false}
        border={false}
        action={
          !showForm ? (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              新規申請
            </Button>
          ) : undefined
        }
      />
      {error && <QueryErrorBanner error={error} onRetry={() => mutate()} />}

      <PageContent>
        <div className="space-y-4 max-w-2xl">
          {showForm && (
            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <Label>申請種別</Label>
                  <Select
                    value={requestType}
                    onValueChange={(v) => setRequestType(v as WorkflowRequestType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>理由</Label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="申請理由を入力してください"
                    rows={3}
                    className="w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                    キャンセル
                  </Button>
                  <Button size="sm" onClick={handleSubmit} disabled={!reason.trim() || submitting}>
                    申請
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="flex flex-wrap gap-2">
            {(["all", "pending", "approved", "rejected", "cancelled"] as const).map((s) => (
              <Badge
                key={s}
                variant={filter === s ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setFilter(s)}
              >
                {s === "all" ? "すべて" : statusConfig[s].label}
              </Badge>
            ))}
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">読み込み中...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
              <FileInput className="h-10 w-10 opacity-40" />
              <p className="text-sm">申請がありません</p>
            </div>
          ) : (
            <div className="divide-y rounded-lg border">
              {filtered.map((req) => {
                const config = statusConfig[req.status];
                const Icon = config.icon;
                return (
                  <div key={req.id} className="flex items-start gap-3 px-4 py-3">
                    <Icon
                      className={cn(
                        "h-5 w-5 shrink-0 mt-0.5",
                        req.status === "approved"
                          ? "text-green-600"
                          : req.status === "rejected"
                            ? "text-red-600"
                            : req.status === "pending"
                              ? "text-amber-600"
                              : "text-gray-400"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {typeLabels[req.request_type] ?? req.request_type}
                        </p>
                        <Badge variant={config.variant} className="text-[10px]">
                          {config.label}
                        </Badge>
                      </div>
                      {req.reason && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {req.reason}
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {format(new Date(req.created_at), "yyyy/MM/dd HH:mm")}
                      </p>
                      {req.review_comment && (
                        <p className="text-xs mt-1 px-2 py-1 bg-muted rounded text-muted-foreground">
                          {req.review_comment}
                        </p>
                      )}
                    </div>
                    {req.status === "pending" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 shrink-0"
                        onClick={async () => {
                          try {
                            await cancelRequest(req.id);
                            showToast("申請を取り消しました");
                          } catch {
                            showToast("取消に失敗しました", "error");
                          }
                        }}
                      >
                        取消
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PageContent>
    </div>
  );
}
