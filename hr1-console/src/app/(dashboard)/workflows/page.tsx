"use client";

import React from "react";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableEmptyState } from "@/components/ui/table-empty-state";
import { EditPanel } from "@/components/ui/edit-panel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { SearchBar } from "@/components/ui/search-bar";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { TableSection } from "@/components/layout/table-section";
import {
  useWorkflowsPage,
  formatRequestSummary,
  type TabValue,
} from "@/lib/hooks/use-workflows-page";
import { StickyFilterBar } from "@/components/layout/sticky-filter-bar";
import { TabBar } from "@/components/layout/tab-bar";
import { cn } from "@/lib/utils";
import {
  workflowRequestTypeLabels,
  workflowRequestTypeColors,
  workflowStatusLabels,
  workflowStatusColors,
} from "@/lib/constants";
import { FileCheck, Settings2, SlidersHorizontal, X, Bell, Loader2, Save } from "lucide-react";

const tabList: { value: TabValue; label: string; icon: React.ElementType }[] = [
  { value: "requests", label: "申請一覧", icon: FileCheck },
  { value: "settings", label: "設定", icon: Settings2 },
];

export default function WorkflowsPage() {
  const { showToast } = useToast();
  const h = useWorkflowsPage();

  return (
    <div className="flex flex-col">
      <PageHeader
        title="ワークフロー"
        description="各種申請の承認・管理を行います"
        sticky={false}
        border={false}
      />

      <QueryErrorBanner error={h.requestsError} onRetry={() => h.mutate()} />

      <StickyFilterBar>
        <TabBar
          tabs={tabList}
          activeTab={h.activeTab}
          onTabChange={(v) => h.setActiveTab(v as TabValue)}
        />
        {h.activeTab === "requests" && (
          <SearchBar value={h.search} onChange={h.setSearch} placeholder="社員名・メールで検索" />
        )}
        {h.activeTab === "requests" && (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 w-full h-12 bg-white px-4 sm:px-6 md:px-8 cursor-pointer">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground shrink-0">フィルター</span>
              {h.activeFilterCount > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {h.filterStatus !== "all" && (
                    <Badge variant="secondary" className="shrink-0 gap-1 text-sm py-3 px-3">
                      ステータス：{workflowStatusLabels[h.filterStatus]}
                      <span
                        role="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          h.setFilterStatus("all");
                        }}
                        className="ml-0.5 hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </span>
                    </Badge>
                  )}
                  {h.filterType !== "all" && (
                    <Badge variant="secondary" className="shrink-0 gap-1 text-sm py-3 px-3">
                      種別：{workflowRequestTypeLabels[h.filterType]}
                      <span
                        role="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          h.setFilterType("all");
                        }}
                        className="ml-0.5 hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </span>
                    </Badge>
                  )}
                </div>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-auto py-2">
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                ステータス
              </div>
              <DropdownMenuItem className="py-2" onClick={() => h.setFilterStatus("all")}>
                <span className={cn(h.filterStatus === "all" && "font-medium")}>すべて</span>
              </DropdownMenuItem>
              {Object.entries(workflowStatusLabels).map(([k, v]) => (
                <DropdownMenuItem className="py-2" key={k} onClick={() => h.setFilterStatus(k)}>
                  <span className={cn(h.filterStatus === k && "font-medium")}>{v}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">種別</div>
              <DropdownMenuItem className="py-2" onClick={() => h.setFilterType("all")}>
                <span className={cn(h.filterType === "all" && "font-medium")}>すべて</span>
              </DropdownMenuItem>
              {Object.entries(workflowRequestTypeLabels).map(([k, v]) => (
                <DropdownMenuItem className="py-2" key={k} onClick={() => h.setFilterType(k)}>
                  <span className={cn(h.filterType === k && "font-medium")}>{v}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </StickyFilterBar>

      {h.activeTab === "requests" && (
        <TableSection>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">申請者</TableHead>
                <TableHead>種別</TableHead>
                <TableHead>申請内容</TableHead>
                <TableHead>申請日</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead className="w-20">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableEmptyState
                colSpan={6}
                isLoading={h.requestsLoading}
                isEmpty={h.filteredRequests.length === 0}
                emptyMessage="申請はありません"
              >
                {h.filteredRequests.map((req) => {
                  const emp = h.getEmployee(req.user_id);
                  return (
                    <TableRow key={req.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {(emp?.display_name ?? emp?.email ?? "?")[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm truncate">
                            {emp?.display_name ?? emp?.email ?? req.user_id}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={workflowRequestTypeColors[req.request_type] ?? "outline"}>
                          {workflowRequestTypeLabels[req.request_type] ?? req.request_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-60 truncate">
                        {formatRequestSummary(req)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(req.created_at).toLocaleDateString("ja-JP")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={workflowStatusColors[req.status] ?? "outline"}>
                          {workflowStatusLabels[req.status] ?? req.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {req.status === "pending" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => h.openReviewDialog(req)}
                          >
                            確認
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableEmptyState>
            </TableBody>
          </Table>
        </TableSection>
      )}

      {h.activeTab === "settings" && (
        <div className="px-4 py-4 sm:px-6 md:px-8 md:py-6">
          <div className="max-w-xl space-y-6">
            {h.rulesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>自動承認ルール</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">有給休暇の自動承認</p>
                        {h.autoApproveConfig.paid_leave.is_active && (
                          <div className="flex items-center gap-2 mt-2">
                            <Input
                              type="number"
                              min={1}
                              className="w-20"
                              value={h.autoApproveConfig.paid_leave.max_days}
                              onChange={(e) =>
                                h.setAutoApproveConfig((prev) => ({
                                  ...prev,
                                  paid_leave: {
                                    ...prev.paid_leave,
                                    max_days: Number(e.target.value) || 1,
                                  },
                                }))
                              }
                            />
                            <span className="text-sm text-muted-foreground">日以内は自動承認</span>
                          </div>
                        )}
                      </div>
                      <Switch
                        checked={h.autoApproveConfig.paid_leave.is_active}
                        onCheckedChange={(checked) =>
                          h.setAutoApproveConfig((prev) => ({
                            ...prev,
                            paid_leave: { ...prev.paid_leave, is_active: checked },
                          }))
                        }
                      />
                    </div>

                    <div className="border-t" />

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">残業申請の自動承認</p>
                        {h.autoApproveConfig.overtime.is_active && (
                          <div className="flex items-center gap-2 mt-2">
                            <Input
                              type="number"
                              min={1}
                              className="w-20"
                              value={h.autoApproveConfig.overtime.max_hours}
                              onChange={(e) =>
                                h.setAutoApproveConfig((prev) => ({
                                  ...prev,
                                  overtime: {
                                    ...prev.overtime,
                                    max_hours: Number(e.target.value) || 1,
                                  },
                                }))
                              }
                            />
                            <span className="text-sm text-muted-foreground">
                              時間以下は自動承認
                            </span>
                          </div>
                        )}
                      </div>
                      <Switch
                        checked={h.autoApproveConfig.overtime.is_active}
                        onCheckedChange={(checked) =>
                          h.setAutoApproveConfig((prev) => ({
                            ...prev,
                            overtime: { ...prev.overtime, is_active: checked },
                          }))
                        }
                      />
                    </div>

                    <div className="border-t" />

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">経費申請の自動承認</p>
                        {h.autoApproveConfig.expense.is_active && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-sm text-muted-foreground">¥</span>
                            <Input
                              type="number"
                              min={1}
                              className="w-28"
                              value={h.autoApproveConfig.expense.max_amount}
                              onChange={(e) =>
                                h.setAutoApproveConfig((prev) => ({
                                  ...prev,
                                  expense: {
                                    ...prev.expense,
                                    max_amount: Number(e.target.value) || 1,
                                  },
                                }))
                              }
                            />
                            <span className="text-sm text-muted-foreground">以下は自動承認</span>
                          </div>
                        )}
                      </div>
                      <Switch
                        checked={h.autoApproveConfig.expense.is_active}
                        onCheckedChange={(checked) =>
                          h.setAutoApproveConfig((prev) => ({
                            ...prev,
                            expense: { ...prev.expense, is_active: checked },
                          }))
                        }
                      />
                    </div>

                    <div className="border-t" />

                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">出張申請の自動承認</p>
                      <Switch
                        checked={h.autoApproveConfig.business_trip.is_active}
                        onCheckedChange={(checked) =>
                          h.setAutoApproveConfig((prev) => ({
                            ...prev,
                            business_trip: { is_active: checked },
                          }))
                        }
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>通知設定</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium">申請時に管理者へ通知</p>
                      </div>
                      <Switch checked={h.notifyAdmins} onCheckedChange={h.setNotifyAdmins} />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6 space-y-3">
                    <p className="text-sm text-muted-foreground">
                      承認者の設定は勤怠管理の承認者設定を共有します。
                    </p>
                    <Button variant="outline" onClick={h.navigateToAttendance}>
                      <Settings2 className="h-4 w-4 mr-1.5" />
                      勤怠管理の承認者設定へ
                    </Button>
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button
                    onClick={async () => {
                      const result = await h.handleSaveSettings();
                      if (result.success) {
                        showToast("設定を保存しました", "success");
                      } else {
                        showToast(result.error ?? "設定の保存に失敗しました", "error");
                      }
                    }}
                    disabled={h.savingSettings}
                  >
                    {h.savingSettings ? (
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-1.5" />
                    )}
                    設定を保存
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <EditPanel
        open={h.reviewDialogOpen}
        onOpenChange={h.handleReviewDialogOpenChange}
        title="申請の確認"
        saving={h.savingReview}
        onSave={async () => {
          const result = await h.handleReview("approved");
          if (result.success) {
            showToast("承認しました", "success");
          } else {
            showToast(result.error ?? "処理に失敗しました", "error");
          }
        }}
        saveLabel="承認"
      >
        {h.selectedRequest && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">申請者</Label>
              <p className="text-sm font-medium mt-0.5">
                {h.getEmployee(h.selectedRequest.user_id)?.display_name ??
                  h.getEmployee(h.selectedRequest.user_id)?.email ??
                  h.selectedRequest.user_id}
              </p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">種別</Label>
              <p className="text-sm font-medium mt-0.5">
                <Badge
                  variant={workflowRequestTypeColors[h.selectedRequest.request_type] ?? "outline"}
                >
                  {workflowRequestTypeLabels[h.selectedRequest.request_type] ??
                    h.selectedRequest.request_type}
                </Badge>
              </p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">申請内容</Label>
              <p className="text-sm mt-0.5 bg-muted/50 rounded-md p-2">
                {formatRequestSummary(h.selectedRequest)}
              </p>
            </div>
            {h.selectedRequest.reason && (
              <div>
                <Label className="text-sm text-muted-foreground">申請理由</Label>
                <p className="text-sm mt-0.5 bg-muted/50 rounded-md p-2">
                  {h.selectedRequest.reason}
                </p>
              </div>
            )}
            <div>
              <Label className="text-sm text-muted-foreground">申請日</Label>
              <p className="text-sm font-medium mt-0.5">
                {new Date(h.selectedRequest.created_at).toLocaleDateString("ja-JP")}
              </p>
            </div>
            <div>
              <Label>コメント（任意）</Label>
              <Textarea
                value={h.reviewComment}
                onChange={(e) => h.setReviewComment(e.target.value)}
                placeholder="承認・却下の理由を入力"
                rows={3}
                className="mt-1.5"
              />
            </div>
            <div className="pt-2">
              <Button
                variant="destructive"
                className="w-full"
                disabled={h.savingReview}
                onClick={async () => {
                  const result = await h.handleReview("rejected");
                  if (result.success) {
                    showToast("却下しました", "success");
                  } else {
                    showToast(result.error ?? "処理に失敗しました", "error");
                  }
                }}
              >
                <X className="h-4 w-4 mr-1.5" />
                却下
              </Button>
            </div>
          </div>
        )}
      </EditPanel>
    </div>
  );
}
