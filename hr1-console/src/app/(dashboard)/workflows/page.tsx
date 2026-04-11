"use client";

import React from "react";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Label } from "@hr1/shared-ui/components/ui/label";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { SectionCard } from "@hr1/shared-ui/components/ui/section-card";
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
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Switch } from "@hr1/shared-ui/components/ui/switch";
import { Checkbox } from "@hr1/shared-ui/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@hr1/shared-ui/components/ui/dropdown-menu";
import { SearchBar } from "@hr1/shared-ui/components/ui/search-bar";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import {
  useWorkflowsPage,
  formatRequestSummary,
  FIELD_TYPE_LABELS,
  type TabValue,
} from "@/lib/hooks/use-workflows-page";
import { StickyFilterBar } from "@hr1/shared-ui/components/layout/sticky-filter-bar";
import { TabBar } from "@hr1/shared-ui/components/layout/tab-bar";
import { cn } from "@/lib/utils";
import {
  workflowRequestTypeColors,
  workflowStatusLabels,
  workflowStatusColors,
} from "@/lib/constants";
import {
  FileCheck,
  Settings2,
  SlidersHorizontal,
  X,
  Bell,
  Loader2,
  Save,
  Plus,
  Pencil,
  LayoutTemplate,
  Trash2,
} from "lucide-react";

const tabList: { value: TabValue; label: string; icon: React.ElementType }[] = [
  { value: "requests", label: "申請一覧", icon: FileCheck },
  { value: "templates", label: "テンプレート", icon: LayoutTemplate },
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
                      種別：{h.getRequestTypeLabel(h.filterType)}
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
              {Object.entries(workflowStatusLabels).length > 0 &&
                h.templates
                  .filter((t) => t.is_active)
                  .map((t) => (
                    <DropdownMenuItem
                      className="py-2"
                      key={t.id}
                      onClick={() => h.setFilterType(t.id)}
                    >
                      <span className={cn(h.filterType === t.id && "font-medium")}>
                        {t.icon} {t.name}
                      </span>
                    </DropdownMenuItem>
                  ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </StickyFilterBar>

      {/* ===== 申請一覧タブ ===== */}
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
                          {h.getRequestTypeLabel(req.request_type)}
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

      {/* ===== テンプレートタブ ===== */}
      {h.activeTab === "templates" && (
        <div className="px-4 py-4 sm:px-6 md:px-8 md:py-6">
          <div className="max-w-3xl space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                カスタムワークフローのテンプレートを作成・管理します。
              </p>
              <Button onClick={h.openAddTemplate}>
                <Plus className="h-4 w-4 mr-1.5" />
                テンプレート作成
              </Button>
            </div>

            {/* 組み込みワークフロー */}
            <SectionCard>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">
                組み込みワークフロー
              </h2>
              <div className="space-y-2">
                {[
                  { icon: "🏖️", name: "有給休暇", desc: "有給休暇の申請" },
                  { icon: "⏰", name: "残業申請", desc: "残業時間の申請" },
                  { icon: "✈️", name: "出張申請", desc: "出張の申請" },
                  { icon: "💰", name: "経費申請", desc: "経費精算の申請" },
                ].map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center gap-3 rounded-lg border border-transparent bg-white/60 px-3 py-2.5"
                  >
                    <span className="text-lg">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Badge variant="outline">組み込み</Badge>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* カスタムテンプレート */}
            {h.templatesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <SectionCard>
                <h2 className="text-sm font-semibold text-muted-foreground mb-3">
                  カスタムテンプレート
                </h2>
                {h.templates.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    カスタムテンプレートはまだありません
                  </p>
                ) : (
                  <div className="space-y-2">
                    {h.templates.map((tpl) => (
                      <div
                        key={tpl.id}
                        className="group flex items-center gap-3 rounded-lg border border-transparent bg-white/60 px-3 py-2.5 cursor-pointer hover:bg-white transition-colors"
                        onClick={() => h.openEditTemplate(tpl)}
                      >
                        <span className="text-lg">{tpl.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{tpl.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {tpl.description || `${tpl.fields.length}個のフィールド`}
                          </p>
                        </div>
                        {!tpl.is_active && <Badge variant="secondary">無効</Badge>}
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            )}
          </div>
        </div>
      )}

      {/* ===== 設定タブ ===== */}
      {h.activeTab === "settings" && (
        <div className="px-4 py-4 sm:px-6 md:px-8 md:py-6">
          <div className="max-w-xl space-y-6">
            {h.rulesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <SectionCard>
                  <h2 className="text-sm font-semibold text-muted-foreground mb-4">
                    自動承認ルール
                  </h2>
                  <div className="space-y-5">
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
                  </div>
                </SectionCard>

                <SectionCard>
                  <h2 className="text-sm font-semibold text-muted-foreground mb-4">通知設定</h2>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">申請時に管理者へ通知</p>
                    </div>
                    <Switch checked={h.notifyAdmins} onCheckedChange={h.setNotifyAdmins} />
                  </div>
                </SectionCard>

                <SectionCard>
                  <p className="text-sm text-muted-foreground">
                    承認者の設定は勤怠管理の承認者設定を共有します。
                  </p>
                  <Button variant="outline" className="mt-3" onClick={h.navigateToAttendance}>
                    <Settings2 className="h-4 w-4 mr-1.5" />
                    勤怠管理の承認者設定へ
                  </Button>
                </SectionCard>

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

      {/* ===== 申請確認パネル ===== */}
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
                  {h.getRequestTypeLabel(h.selectedRequest.request_type)}
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

      {/* ===== テンプレート編集パネル ===== */}
      <EditPanel
        open={h.templatePanelOpen}
        onOpenChange={h.setTemplatePanelOpen}
        title={h.editingTemplate ? "テンプレートを編集" : "テンプレートを作成"}
        onSave={async () => {
          const result = await h.handleSaveTemplate();
          if (result.success) {
            showToast(
              h.editingTemplate ? "テンプレートを更新しました" : "テンプレートを作成しました",
              "success"
            );
          } else {
            showToast(result.error ?? "保存に失敗しました", "error");
          }
        }}
        saving={h.savingTemplate}
        saveDisabled={!h.editTemplateName.trim()}
        onDelete={
          h.editingTemplate
            ? async () => {
                const result = await h.handleDeleteTemplate();
                if (result.success) {
                  showToast("テンプレートを削除しました", "success");
                } else {
                  showToast(result.error ?? "削除に失敗しました", "error");
                }
              }
            : undefined
        }
        deleteLabel="テンプレートを削除"
        deleting={h.deletingTemplate}
      >
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="space-y-2 w-16">
              <Label>アイコン</Label>
              <Input
                value={h.editTemplateIcon}
                onChange={(e) => h.setEditTemplateIcon(e.target.value)}
                className="text-center text-lg"
                maxLength={2}
              />
            </div>
            <div className="space-y-2 flex-1">
              <Label>テンプレート名 *</Label>
              <Input
                value={h.editTemplateName}
                onChange={(e) => h.setEditTemplateName(e.target.value)}
                placeholder="例：備品購入申請、在宅勤務申請"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>説明</Label>
            <Textarea
              value={h.editTemplateDescription}
              onChange={(e) => h.setEditTemplateDescription(e.target.value)}
              placeholder="このワークフローの説明"
              rows={2}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>有効</Label>
            <Switch checked={h.editTemplateActive} onCheckedChange={h.setEditTemplateActive} />
          </div>

          {/* フィールド定義 */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label>入力フィールド</Label>
              <Button variant="outline" size="sm" onClick={h.addTemplateField}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                フィールド追加
              </Button>
            </div>

            {h.editTemplateFields.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-3">
                フィールドがありません。追加してください。
              </p>
            )}

            {h.editTemplateFields.map((field, idx) => (
              <div key={idx} className="rounded-lg border p-3 space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    フィールド #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => h.removeTemplateField(idx)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">ラベル *</label>
                    <Input
                      value={field.label}
                      onChange={(e) => h.updateTemplateField(idx, { label: e.target.value })}
                      placeholder="例：金額"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">種類</label>
                    <Select
                      value={field.type}
                      onValueChange={(v) =>
                        h.updateTemplateField(idx, {
                          type: v as "text" | "number" | "date" | "textarea" | "select",
                        })
                      }
                    >
                      <SelectTrigger size="sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(FIELD_TYPE_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {field.type === "select" && (
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">選択肢（カンマ区切り）</label>
                    <Input
                      value={(field.options ?? []).join(", ")}
                      onChange={(e) =>
                        h.updateTemplateField(idx, {
                          options: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="選択肢A, 選択肢B, 選択肢C"
                      className="h-8 text-sm"
                    />
                  </div>
                )}
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={field.required ?? false}
                    onCheckedChange={(checked) =>
                      h.updateTemplateField(idx, { required: !!checked })
                    }
                  />
                  <span className="text-xs text-muted-foreground">必須</span>
                </label>
              </div>
            ))}
          </div>
        </div>
      </EditPanel>
    </div>
  );
}
