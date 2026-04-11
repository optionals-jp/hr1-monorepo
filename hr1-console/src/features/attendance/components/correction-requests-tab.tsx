"use client";

import { useState, useMemo } from "react";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Label } from "@hr1/shared-ui/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { TableEmptyState } from "@hr1/shared-ui/components/ui/table-empty-state";
import { EditPanel } from "@hr1/shared-ui/components/ui/edit-panel";
import { Avatar, AvatarFallback } from "@hr1/shared-ui/components/ui/avatar";
import { Textarea } from "@hr1/shared-ui/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@hr1/shared-ui/components/ui/dropdown-menu";
import { StickyFilterBar } from "@hr1/shared-ui/components/layout/sticky-filter-bar";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import { cn, formatTime } from "@/lib/utils";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import {
  useCorrections,
  reviewCorrection as reviewCorrectionAction,
} from "@/features/attendance/hooks/use-attendance-queries";
import { correctionStatusLabels, correctionStatusColors } from "@/lib/constants";
import { SlidersHorizontal, X } from "lucide-react";
import type { CorrectionRow } from "@/features/attendance/types";

export function CorrectionRequestsTab() {
  const { showToast } = useToast();
  const { organization } = useOrg();
  const { user } = useAuth();
  const [correctionFilter, setCorrectionFilter] = useState("all");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<CorrectionRow | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [savingReview, setSavingReview] = useState(false);

  const {
    data: corrections = [],
    isLoading: correctionsLoading,
    mutate: mutateCorrections,
  } = useCorrections();

  const filteredCorrections = useMemo(() => {
    if (correctionFilter === "all") return corrections;
    return corrections.filter((c) => c.status === correctionFilter);
  }, [corrections, correctionFilter]);

  const handleReview = async (status: "approved" | "rejected") => {
    if (!reviewTarget) return;
    setSavingReview(true);
    try {
      if (!organization) return;
      await reviewCorrectionAction(
        reviewTarget.id,
        organization.id,
        status,
        reviewComment || null,
        reviewTarget.record_id,
        reviewTarget.requested_clock_in,
        reviewTarget.requested_clock_out,
        user!.id
      );

      await mutateCorrections();
      showToast(status === "approved" ? "承認しました" : "却下しました", "success");
      setReviewDialogOpen(false);
      setReviewTarget(null);
      setReviewComment("");
    } catch {
      showToast("処理に失敗しました", "error");
    } finally {
      setSavingReview(false);
    }
  };

  return (
    <>
      <StickyFilterBar>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 w-full h-12 bg-white px-4 sm:px-6 md:px-8 cursor-pointer">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground shrink-0">フィルター</span>
            {correctionFilter !== "all" && (
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <Badge variant="secondary" className="shrink-0 gap-1 text-sm py-3 px-3">
                  ステータス：{correctionStatusLabels[correctionFilter]}
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCorrectionFilter("all");
                    }}
                    className="ml-0.5 hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </span>
                </Badge>
              </div>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-auto py-2">
            <DropdownMenuItem className="py-2" onClick={() => setCorrectionFilter("all")}>
              <span className={cn(correctionFilter === "all" && "font-medium")}>すべて</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {Object.entries(correctionStatusLabels).map(([k, v]) => (
              <DropdownMenuItem className="py-2" key={k} onClick={() => setCorrectionFilter(k)}>
                <span className={cn(correctionFilter === k && "font-medium")}>{v}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </StickyFilterBar>

      <TableSection>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40">申請者</TableHead>
              <TableHead>対象日</TableHead>
              <TableHead>変更前（出勤）</TableHead>
              <TableHead>変更前（退勤）</TableHead>
              <TableHead>変更後（出勤）</TableHead>
              <TableHead>変更後（退勤）</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={8}
              isLoading={correctionsLoading}
              isEmpty={filteredCorrections.length === 0}
              emptyMessage="修正依頼はありません"
            >
              {filteredCorrections.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {(c.requester?.display_name ?? c.requester?.email ?? "?")[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm truncate">
                        {c.requester?.display_name ?? c.requester?.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{c.attendance_records?.date ?? "-"}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatTime(c.original_clock_in)}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatTime(c.original_clock_out)}
                  </TableCell>
                  <TableCell className="font-mono text-sm font-medium text-blue-600">
                    {formatTime(c.requested_clock_in)}
                  </TableCell>
                  <TableCell className="font-mono text-sm font-medium text-blue-600">
                    {formatTime(c.requested_clock_out)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={correctionStatusColors[c.status] ?? "outline"}>
                      {correctionStatusLabels[c.status] ?? c.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {c.status === "pending" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setReviewTarget(c);
                          setReviewComment("");
                          setReviewDialogOpen(true);
                        }}
                      >
                        確認
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableEmptyState>
          </TableBody>
        </Table>
      </TableSection>

      <EditPanel
        open={reviewDialogOpen}
        onOpenChange={(open) => {
          setReviewDialogOpen(open);
          if (!open) setReviewTarget(null);
        }}
        title="修正依頼の確認"
        saving={savingReview}
        onSave={() => handleReview("approved")}
        saveLabel="承認"
      >
        {reviewTarget && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">申請者</Label>
              <p className="text-sm font-medium mt-0.5">
                {reviewTarget.requester?.display_name ?? reviewTarget.requester?.email}
              </p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">対象日</Label>
              <p className="text-sm font-medium mt-0.5">
                {reviewTarget.attendance_records?.date ?? "-"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">変更前（出勤）</Label>
                <p className="text-sm font-mono mt-0.5">
                  {formatTime(reviewTarget.original_clock_in)}
                </p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">変更前（退勤）</Label>
                <p className="text-sm font-mono mt-0.5">
                  {formatTime(reviewTarget.original_clock_out)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-blue-600">変更後（出勤）</Label>
                <p className="text-sm font-mono font-medium text-blue-600 mt-0.5">
                  {formatTime(reviewTarget.requested_clock_in)}
                </p>
              </div>
              <div>
                <Label className="text-sm text-blue-600">変更後（退勤）</Label>
                <p className="text-sm font-mono font-medium text-blue-600 mt-0.5">
                  {formatTime(reviewTarget.requested_clock_out)}
                </p>
              </div>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">修正理由</Label>
              <p className="text-sm mt-0.5 bg-muted/50 rounded-md p-2">{reviewTarget.reason}</p>
            </div>
            <div>
              <Label>コメント（任意）</Label>
              <Textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="承認・却下の理由を入力"
                rows={3}
                className="mt-1.5"
              />
            </div>
            <div className="pt-2">
              <Button
                variant="destructive"
                className="w-full"
                disabled={savingReview}
                onClick={() => handleReview("rejected")}
              >
                <X className="h-4 w-4 mr-1.5" />
                却下
              </Button>
            </div>
          </div>
        )}
      </EditPanel>
    </>
  );
}
