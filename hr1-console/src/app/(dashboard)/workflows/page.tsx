"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase/browser";
import { useQuery } from "@/lib/use-query";
import { cn } from "@/lib/utils";
import type { WorkflowRequest, WorkflowRule } from "@/types/database";
import {
  workflowRequestTypeLabels,
  workflowRequestTypeColors,
  workflowStatusLabels,
  workflowStatusColors,
} from "@/lib/constants";
import { FileCheck, Settings2, SlidersHorizontal, X, Bell, Loader2, Save } from "lucide-react";

type TabValue = "requests" | "settings";

const tabList: { value: TabValue; label: string; icon: React.ElementType }[] = [
  { value: "requests", label: "申請一覧", icon: FileCheck },
  { value: "settings", label: "設定", icon: Settings2 },
];

interface Employee {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface AutoApproveConfig {
  paid_leave: { is_active: boolean; max_days: number };
  overtime: { is_active: boolean; max_hours: number };
  expense: { is_active: boolean; max_amount: number };
  business_trip: { is_active: boolean };
}

const defaultAutoApproveConfig: AutoApproveConfig = {
  paid_leave: { is_active: false, max_days: 3 },
  overtime: { is_active: false, max_hours: 2 },
  expense: { is_active: false, max_amount: 10000 },
  business_trip: { is_active: false },
};

function formatRequestSummary(req: WorkflowRequest): string {
  const data = req.request_data ?? {};
  switch (req.request_type) {
    case "paid_leave": {
      const startDate = data.start_date as string | undefined;
      const endDate = data.end_date as string | undefined;
      const days = data.days as number | undefined;
      if (startDate && endDate && startDate !== endDate) {
        return `${new Date(startDate).toLocaleDateString("ja-JP")} 〜 ${new Date(endDate).toLocaleDateString("ja-JP")}（${days ?? 1}日間）`;
      }
      if (startDate) {
        return `${new Date(startDate).toLocaleDateString("ja-JP")}（${days ?? 1}日間）`;
      }
      return `${days ?? 1}日間`;
    }
    case "overtime": {
      const hours = data.hours as number | undefined;
      const date = data.date as string | undefined;
      const parts: string[] = [];
      if (date) parts.push(new Date(date).toLocaleDateString("ja-JP"));
      if (hours) parts.push(`${hours}時間`);
      return parts.length > 0 ? parts.join(" / ") : "-";
    }
    case "business_trip": {
      const destination = data.destination as string | undefined;
      const startDate = data.start_date as string | undefined;
      const endDate = data.end_date as string | undefined;
      const parts: string[] = [];
      if (destination) parts.push(destination);
      if (startDate && endDate) {
        parts.push(
          `${new Date(startDate).toLocaleDateString("ja-JP")} 〜 ${new Date(endDate).toLocaleDateString("ja-JP")}`
        );
      } else if (startDate) {
        parts.push(new Date(startDate).toLocaleDateString("ja-JP"));
      }
      return parts.length > 0 ? parts.join(" / ") : "-";
    }
    case "expense": {
      const amount = data.amount as number | undefined;
      const description = data.description as string | undefined;
      const parts: string[] = [];
      if (amount) parts.push(`¥${amount.toLocaleString("ja-JP")}`);
      if (description) parts.push(description);
      return parts.length > 0 ? parts.join(" / ") : "-";
    }
    default:
      return "-";
  }
}

export default function WorkflowsPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const { organization } = useOrg();
  const [activeTab, setActiveTab] = useState<TabValue>("requests");

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<WorkflowRequest | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [savingReview, setSavingReview] = useState(false);

  const [autoApproveConfig, setAutoApproveConfig] =
    useState<AutoApproveConfig>(defaultAutoApproveConfig);
  const [notifyAdmins, setNotifyAdmins] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const { data: employees = [] } = useQuery<Employee[]>(
    organization ? `employees-list-${organization.id}` : null,
    async () => {
      const { data } = await getSupabase()
        .from("user_organizations")
        .select(
          "user_id, profiles!user_organizations_user_id_fkey(id, email, display_name, avatar_url)"
        )
        .eq("organization_id", organization!.id);
      return (data ?? []).map((d) => {
        const p = d.profiles as unknown as Employee;
        return {
          id: p.id,
          email: p.email,
          display_name: p.display_name,
          avatar_url: p.avatar_url,
        };
      });
    }
  );

  const {
    data: requests = [],
    isLoading: requestsLoading,
    error: requestsError,
    mutate,
  } = useQuery<WorkflowRequest[]>(
    organization && activeTab === "requests" ? `workflow-requests-${organization.id}` : null,
    async () => {
      const { data } = await getSupabase()
        .from("workflow_requests")
        .select("*")
        .eq("organization_id", organization!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as WorkflowRequest[];
    }
  );

  const {
    data: rules = [],
    isLoading: rulesLoading,
    mutate: mutateRules,
  } = useQuery<WorkflowRule[]>(
    organization && activeTab === "settings" ? `workflow-rules-${organization.id}` : null,
    async () => {
      const { data } = await getSupabase()
        .from("workflow_rules")
        .select("*")
        .eq("organization_id", organization!.id);
      return (data ?? []) as WorkflowRule[];
    }
  );

  useEffect(() => {
    if (rules.length === 0) return;
    const config = { ...defaultAutoApproveConfig };
    for (const rule of rules) {
      if (rule.rule_type === "auto_approve") {
        const reqType = rule.request_type as keyof AutoApproveConfig;
        if (reqType === "paid_leave") {
          config.paid_leave = {
            is_active: rule.is_active,
            max_days: (rule.conditions?.max_days as number) ?? 3,
          };
        } else if (reqType === "overtime") {
          config.overtime = {
            is_active: rule.is_active,
            max_hours: (rule.conditions?.max_hours as number) ?? 2,
          };
        } else if (reqType === "expense") {
          config.expense = {
            is_active: rule.is_active,
            max_amount: (rule.conditions?.max_amount as number) ?? 10000,
          };
        } else if (reqType === "business_trip") {
          config.business_trip = { is_active: rule.is_active };
        }
      }
      if (rule.rule_type === "notify") {
        setNotifyAdmins(rule.is_active);
      }
    }
    setAutoApproveConfig(config);
  }, [rules]);

  const getEmployee = (userId: string): Employee | undefined =>
    employees.find((e) => e.id === userId);

  const filteredRequests = useMemo(() => {
    let rows = requests;
    if (filterStatus !== "all") {
      rows = rows.filter((r) => r.status === filterStatus);
    }
    if (filterType !== "all") {
      rows = rows.filter((r) => r.request_type === filterType);
    }
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => {
        const emp = employees.find((e) => e.id === r.user_id);
        return (
          (emp?.display_name ?? "").toLowerCase().includes(q) ||
          (emp?.email ?? "").toLowerCase().includes(q)
        );
      });
    }
    return rows;
  }, [requests, filterStatus, filterType, search, employees]);

  const handleReview = async (status: "approved" | "rejected") => {
    if (!selectedRequest) return;
    setSavingReview(true);
    try {
      const supabase = getSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (status === "approved" && selectedRequest.request_type === "paid_leave") {
        const { data: result } = await supabase.rpc("approve_leave_request", {
          p_request_id: selectedRequest.id,
          p_reviewer_id: user?.id ?? "",
          p_comment: reviewComment || null,
        });

        if (result?.error) {
          showToast(result.error as string, "error");
          setSavingReview(false);
          return;
        }
      } else {
        await supabase
          .from("workflow_requests")
          .update({
            status,
            reviewed_by: user?.id ?? null,
            reviewed_at: new Date().toISOString(),
            review_comment: reviewComment || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedRequest.id);
      }

      const typeLabel =
        workflowRequestTypeLabels[selectedRequest.request_type] || selectedRequest.request_type;
      await supabase.from("notifications").insert({
        organization_id: organization!.id,
        user_id: selectedRequest.user_id,
        type: "general",
        title: status === "approved" ? "申請が承認されました" : "申請が却下されました",
        body:
          status === "approved"
            ? `${typeLabel}の申請が承認されました。`
            : `${typeLabel}の申請が却下されました。${reviewComment ? `理由: ${reviewComment}` : ""}`,
        is_read: false,
        action_url: "/workflow",
      });

      await mutate();
      showToast(status === "approved" ? "承認しました" : "却下しました", "success");
      setReviewDialogOpen(false);
      setSelectedRequest(null);
      setReviewComment("");
    } catch {
      showToast("処理に失敗しました", "error");
    } finally {
      setSavingReview(false);
    }
  };

  const handleSaveSettings = useCallback(async () => {
    if (!organization) return;
    setSavingSettings(true);
    try {
      const supabase = getSupabase();
      const orgId = organization.id;

      const upserts: {
        organization_id: string;
        request_type: string;
        rule_type: string;
        conditions: Record<string, unknown>;
        is_active: boolean;
      }[] = [];

      upserts.push({
        organization_id: orgId,
        request_type: "paid_leave",
        rule_type: "auto_approve",
        conditions: { max_days: autoApproveConfig.paid_leave.max_days },
        is_active: autoApproveConfig.paid_leave.is_active,
      });
      upserts.push({
        organization_id: orgId,
        request_type: "overtime",
        rule_type: "auto_approve",
        conditions: { max_hours: autoApproveConfig.overtime.max_hours },
        is_active: autoApproveConfig.overtime.is_active,
      });
      upserts.push({
        organization_id: orgId,
        request_type: "expense",
        rule_type: "auto_approve",
        conditions: { max_amount: autoApproveConfig.expense.max_amount },
        is_active: autoApproveConfig.expense.is_active,
      });
      upserts.push({
        organization_id: orgId,
        request_type: "business_trip",
        rule_type: "auto_approve",
        conditions: {},
        is_active: autoApproveConfig.business_trip.is_active,
      });
      upserts.push({
        organization_id: orgId,
        request_type: "_all",
        rule_type: "notify",
        conditions: {},
        is_active: notifyAdmins,
      });

      for (const upsert of upserts) {
        const existing = rules.find(
          (r) => r.request_type === upsert.request_type && r.rule_type === upsert.rule_type
        );
        if (existing) {
          await supabase
            .from("workflow_rules")
            .update({
              conditions: upsert.conditions,
              is_active: upsert.is_active,
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("workflow_rules").insert(upsert);
        }
      }

      await mutateRules();
      showToast("設定を保存しました", "success");
    } catch {
      showToast("設定の保存に失敗しました", "error");
    } finally {
      setSavingSettings(false);
    }
  }, [organization, autoApproveConfig, notifyAdmins, rules, mutateRules, showToast]);

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const activeFilterCount = [filterStatus !== "all", filterType !== "all"].filter(Boolean).length;

  return (
    <div className="flex flex-col">
      <PageHeader
        title="ワークフロー"
        description="各種申請の承認・管理を行います"
        sticky={false}
        border={false}
        tabs={
          <div className="flex gap-1 border-b -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8">
            {tabList.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.value}
                  onClick={() => setActiveTab(t.value)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 pb-2.5 pt-1 text-sm font-medium border-b-2 transition-colors -mb-px",
                    activeTab === t.value
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                  {t.value === "requests" && pendingCount > 0 && (
                    <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-[10px]">
                      {pendingCount}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        }
      />

      <QueryErrorBanner error={requestsError} onRetry={() => mutate()} />

      {activeTab === "requests" && (
        <>
          <div className="sticky top-14 z-10">
            <SearchBar value={search} onChange={setSearch} placeholder="社員名・メールで検索" />
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 w-full h-12 bg-white border-b px-4 sm:px-6 md:px-8 cursor-pointer">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground shrink-0">フィルター</span>
                {activeFilterCount > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    {filterStatus !== "all" && (
                      <Badge variant="secondary" className="shrink-0 gap-1 text-sm py-3 px-3">
                        ステータス：{workflowStatusLabels[filterStatus]}
                        <span
                          role="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFilterStatus("all");
                          }}
                          className="ml-0.5 hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </span>
                      </Badge>
                    )}
                    {filterType !== "all" && (
                      <Badge variant="secondary" className="shrink-0 gap-1 text-sm py-3 px-3">
                        種別：{workflowRequestTypeLabels[filterType]}
                        <span
                          role="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFilterType("all");
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
                <DropdownMenuItem className="py-2" onClick={() => setFilterStatus("all")}>
                  <span className={cn(filterStatus === "all" && "font-medium")}>すべて</span>
                </DropdownMenuItem>
                {Object.entries(workflowStatusLabels).map(([k, v]) => (
                  <DropdownMenuItem className="py-2" key={k} onClick={() => setFilterStatus(k)}>
                    <span className={cn(filterStatus === k && "font-medium")}>{v}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">種別</div>
                <DropdownMenuItem className="py-2" onClick={() => setFilterType("all")}>
                  <span className={cn(filterType === "all" && "font-medium")}>すべて</span>
                </DropdownMenuItem>
                {Object.entries(workflowRequestTypeLabels).map(([k, v]) => (
                  <DropdownMenuItem className="py-2" key={k} onClick={() => setFilterType(k)}>
                    <span className={cn(filterType === k && "font-medium")}>{v}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="bg-white">
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
                  isLoading={requestsLoading}
                  isEmpty={filteredRequests.length === 0}
                  emptyMessage="申請はありません"
                >
                  {filteredRequests.map((req) => {
                    const emp = getEmployee(req.user_id);
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
                              onClick={() => {
                                setSelectedRequest(req);
                                setReviewComment("");
                                setReviewDialogOpen(true);
                              }}
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
          </div>
        </>
      )}

      {activeTab === "settings" && (
        <div className="px-4 py-4 sm:px-6 md:px-8 md:py-6">
          <div className="max-w-xl space-y-6">
            {rulesLoading ? (
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
                        {autoApproveConfig.paid_leave.is_active && (
                          <div className="flex items-center gap-2 mt-2">
                            <Input
                              type="number"
                              min={1}
                              className="w-20"
                              value={autoApproveConfig.paid_leave.max_days}
                              onChange={(e) =>
                                setAutoApproveConfig((prev) => ({
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
                        checked={autoApproveConfig.paid_leave.is_active}
                        onCheckedChange={(checked) =>
                          setAutoApproveConfig((prev) => ({
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
                        {autoApproveConfig.overtime.is_active && (
                          <div className="flex items-center gap-2 mt-2">
                            <Input
                              type="number"
                              min={1}
                              className="w-20"
                              value={autoApproveConfig.overtime.max_hours}
                              onChange={(e) =>
                                setAutoApproveConfig((prev) => ({
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
                        checked={autoApproveConfig.overtime.is_active}
                        onCheckedChange={(checked) =>
                          setAutoApproveConfig((prev) => ({
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
                        {autoApproveConfig.expense.is_active && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-sm text-muted-foreground">¥</span>
                            <Input
                              type="number"
                              min={1}
                              className="w-28"
                              value={autoApproveConfig.expense.max_amount}
                              onChange={(e) =>
                                setAutoApproveConfig((prev) => ({
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
                        checked={autoApproveConfig.expense.is_active}
                        onCheckedChange={(checked) =>
                          setAutoApproveConfig((prev) => ({
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
                        checked={autoApproveConfig.business_trip.is_active}
                        onCheckedChange={(checked) =>
                          setAutoApproveConfig((prev) => ({
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
                      <Switch checked={notifyAdmins} onCheckedChange={setNotifyAdmins} />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6 space-y-3">
                    <p className="text-sm text-muted-foreground">
                      承認者の設定は勤怠管理の承認者設定を共有します。
                    </p>
                    <Button variant="outline" onClick={() => router.push("/attendance")}>
                      <Settings2 className="h-4 w-4 mr-1.5" />
                      勤怠管理の承認者設定へ
                    </Button>
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button onClick={handleSaveSettings} disabled={savingSettings}>
                    {savingSettings ? (
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
        open={reviewDialogOpen}
        onOpenChange={(open) => {
          setReviewDialogOpen(open);
          if (!open) setSelectedRequest(null);
        }}
        title="申請の確認"
        saving={savingReview}
        onSave={() => handleReview("approved")}
        saveLabel="承認"
      >
        {selectedRequest && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">申請者</Label>
              <p className="text-sm font-medium mt-0.5">
                {getEmployee(selectedRequest.user_id)?.display_name ??
                  getEmployee(selectedRequest.user_id)?.email ??
                  selectedRequest.user_id}
              </p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">種別</Label>
              <p className="text-sm font-medium mt-0.5">
                <Badge
                  variant={workflowRequestTypeColors[selectedRequest.request_type] ?? "outline"}
                >
                  {workflowRequestTypeLabels[selectedRequest.request_type] ??
                    selectedRequest.request_type}
                </Badge>
              </p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">申請内容</Label>
              <p className="text-sm mt-0.5 bg-muted/50 rounded-md p-2">
                {formatRequestSummary(selectedRequest)}
              </p>
            </div>
            {selectedRequest.reason && (
              <div>
                <Label className="text-sm text-muted-foreground">申請理由</Label>
                <p className="text-sm mt-0.5 bg-muted/50 rounded-md p-2">
                  {selectedRequest.reason}
                </p>
              </div>
            )}
            <div>
              <Label className="text-sm text-muted-foreground">申請日</Label>
              <p className="text-sm font-medium mt-0.5">
                {new Date(selectedRequest.created_at).toLocaleDateString("ja-JP")}
              </p>
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
    </div>
  );
}
