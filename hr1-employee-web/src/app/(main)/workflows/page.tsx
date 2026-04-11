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
import { useMyWorkflows, useWorkflowTemplates } from "@/lib/hooks/use-workflows";
import { useTabParam } from "@/lib/hooks/use-tab-param";
import { useAuth } from "@/lib/auth-context";
import { TabBar } from "@hr1/shared-ui/components/layout/tab-bar";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { cn } from "@hr1/shared-ui/lib/utils";
import { FileInput, Plus } from "lucide-react";
import { format } from "date-fns";
import { canApproveWorkflows } from "@/lib/role-utils";
import { WORKFLOW_TYPE_LABELS, WORKFLOW_STATUS_CONFIG } from "@/lib/workflow-utils";
import { PendingApprovalsTab } from "./pending-approvals-tab";
import { CustomTemplateForm } from "./custom-template-form";
import type {
  WorkflowRequestStatus,
  WorkflowRequestType,
  WorkflowTemplate,
} from "@/types/database";

type Tab = "my-requests" | "pending-approvals";

/** 組み込み種別のキー一覧 */
const BUILTIN_TYPES = Object.keys(WORKFLOW_TYPE_LABELS) as WorkflowRequestType[];

export default function WorkflowsPage() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const {
    data: requests = [],
    isLoading,
    error,
    mutate,
    cancelRequest,
    createRequest,
  } = useMyWorkflows();
  const { data: templates = [] } = useWorkflowTemplates();
  // URL ?tab= でタブ状態、?status= でステータスフィルタを保持。
  const [activeTab, setActiveTab] = useTabParam<Tab>("my-requests");
  const [filter, setFilter] = useTabParam<WorkflowRequestStatus | "all">("all", "status");
  const [showForm, setShowForm] = useState(false);
  const [requestType, setRequestType] = useState<string>("paid_leave");
  const [reason, setReason] = useState("");
  const [templateValues, setTemplateValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const showApprovalTab = canApproveWorkflows(profile?.role ?? null);

  /** 現在選択中のカスタムテンプレート（組み込み種別の場合は null） */
  const selectedTemplate: WorkflowTemplate | null = useMemo(() => {
    if (BUILTIN_TYPES.includes(requestType as WorkflowRequestType)) return null;
    return templates.find((t) => t.id === requestType) ?? null;
  }, [requestType, templates]);

  /** カスタムテンプレートの必須バリデーション */
  const isTemplateValid = useMemo(() => {
    if (!selectedTemplate) return true;
    return selectedTemplate.fields
      .filter((f) => f.required)
      .every((f) => (templateValues[f.key] ?? "").trim() !== "");
  }, [selectedTemplate, templateValues]);

  const handleSubmit = async () => {
    if (!selectedTemplate && !reason.trim()) return;
    if (selectedTemplate && !isTemplateValid) {
      showToast("必須項目を入力してください", "error");
      return;
    }
    setSubmitting(true);
    try {
      if (selectedTemplate) {
        // カスタムテンプレート: request_type にテンプレート ID を格納
        await createRequest(
          selectedTemplate.id as WorkflowRequestType,
          {
            template_id: selectedTemplate.id,
            template_name: selectedTemplate.name,
            ...templateValues,
          },
          reason.trim() || null
        );
      } else {
        await createRequest(requestType as WorkflowRequestType, {}, reason.trim());
      }
      setShowForm(false);
      setReason("");
      setTemplateValues({});
      showToast("申請しました");
    } catch {
      showToast("申請に失敗しました", "error");
    }
    setSubmitting(false);
  };

  /** 種別変更時にテンプレート値をリセット */
  const handleTypeChange = (value: string | null) => {
    if (!value) return;
    setRequestType(value);
    setTemplateValues({});
  };

  const filtered = useMemo(() => {
    if (filter === "all") return requests;
    return requests.filter((r) => r.status === filter);
  }, [requests, filter]);

  /** request_type のラベル解決: 組み込み or カスタムテンプレート名 */
  const resolveTypeLabel = (type: string): string => {
    if (WORKFLOW_TYPE_LABELS[type as WorkflowRequestType]) {
      return WORKFLOW_TYPE_LABELS[type as WorkflowRequestType];
    }
    const tpl = templates.find((t) => t.id === type);
    return tpl?.name ?? type;
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        title="各種申請"
        description="ワークフロー申請の確認・提出"
        sticky={false}
        border={false}
        action={
          activeTab === "my-requests" && !showForm ? (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              新規申請
            </Button>
          ) : undefined
        }
      />

      {showApprovalTab && (
        <TabBar
          tabs={[
            { value: "my-requests", label: "自分の申請" },
            { value: "pending-approvals", label: "承認待ち" },
          ]}
          activeTab={activeTab}
          onTabChange={(v) => setActiveTab(v as Tab)}
        />
      )}

      <PageContent>
        <div className="space-y-4 max-w-2xl">
          {activeTab === "pending-approvals" && showApprovalTab ? (
            <PendingApprovalsTab />
          ) : (
            <>
              {error && <QueryErrorBanner error={error} onRetry={() => mutate()} />}

              {showForm && (
                <Card>
                  <CardContent className="pt-4 space-y-4">
                    <div className="space-y-2">
                      <Label>申請種別</Label>
                      <Select value={requestType} onValueChange={handleTypeChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {/* 組み込み種別 */}
                          {Object.entries(WORKFLOW_TYPE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                          {/* カスタムテンプレート */}
                          {templates.map((tpl) => (
                            <SelectItem key={tpl.id} value={tpl.id}>
                              {tpl.icon ? `${tpl.icon} ` : ""}
                              {tpl.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* カスタムテンプレートの動的フォーム */}
                    {selectedTemplate && (
                      <CustomTemplateForm
                        template={selectedTemplate}
                        values={templateValues}
                        onChange={setTemplateValues}
                      />
                    )}

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
                      <Button
                        size="sm"
                        onClick={handleSubmit}
                        disabled={
                          submitting ||
                          (!selectedTemplate && !reason.trim()) ||
                          (!!selectedTemplate && !isTemplateValid)
                        }
                      >
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
                    {s === "all" ? "すべて" : WORKFLOW_STATUS_CONFIG[s].label}
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
                    const config = WORKFLOW_STATUS_CONFIG[req.status];
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
                              {resolveTypeLabel(req.request_type)}
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
            </>
          )}
        </div>
      </PageContent>
    </div>
  );
}
