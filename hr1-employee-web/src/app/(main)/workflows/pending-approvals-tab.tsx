"use client";

import { useState } from "react";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { usePendingApprovals } from "@/lib/hooks/use-workflows";
import { WORKFLOW_TYPE_LABELS } from "@/lib/workflow-utils";
import { ReviewDialog } from "./review-dialog";
import { Clock, CheckCircle2, XCircle, Inbox } from "lucide-react";
import { format } from "date-fns";

export function PendingApprovalsTab() {
  const { showToast } = useToast();
  const { data: requests = [], isLoading, error, mutate, reviewRequest } = usePendingApprovals();
  const [reviewTarget, setReviewTarget] = useState<{
    id: string;
    type: string;
    action: "approved" | "rejected";
  } | null>(null);

  const handleReview = async (comment: string | null) => {
    if (!reviewTarget) return;
    try {
      await reviewRequest(reviewTarget.id, reviewTarget.type, reviewTarget.action, comment);
      showToast(reviewTarget.action === "approved" ? "承認しました" : "却下しました");
    } catch {
      showToast("処理に失敗しました", "error");
    }
  };

  return (
    <div className="space-y-4">
      {error && <QueryErrorBanner error={error} onRetry={() => mutate()} />}

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">読み込み中...</div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <Inbox className="h-10 w-10 opacity-40" />
          <p className="text-sm">承認待ちの申請はありません</p>
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {requests.map((req) => (
            <div key={req.id} className="px-4 py-3">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">
                      {WORKFLOW_TYPE_LABELS[req.request_type] ?? req.request_type}
                    </p>
                    <Badge variant="secondary" className="text-[10px]">
                      申請中
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    申請者: {req.requester?.display_name ?? req.requester?.email ?? "不明"}
                  </p>
                  {req.reason && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{req.reason}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {format(new Date(req.created_at), "yyyy/MM/dd HH:mm")}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-700 border-green-300 hover:bg-green-50"
                    onClick={() =>
                      setReviewTarget({ id: req.id, type: req.request_type, action: "approved" })
                    }
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    承認
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-700 border-red-300 hover:bg-red-50"
                    onClick={() =>
                      setReviewTarget({ id: req.id, type: req.request_type, action: "rejected" })
                    }
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    却下
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {reviewTarget && (
        <ReviewDialog
          open={!!reviewTarget}
          onOpenChange={(open) => !open && setReviewTarget(null)}
          action={reviewTarget.action}
          onSubmit={handleReview}
        />
      )}
    </div>
  );
}
