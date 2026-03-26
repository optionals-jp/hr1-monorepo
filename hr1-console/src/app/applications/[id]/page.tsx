"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase";
import type {
  Application,
  ApplicationStep,
  CustomForm,
  FormField,
  Interview,
} from "@/types/database";
import {
  Check,
  Circle,
  SkipForward,
  FileText,
  Calendar,
  ExternalLink,
  UserCheck,
} from "lucide-react";
import { format } from "date-fns";
import {
  applicationStatusLabels as statusLabels,
  stepStatusLabels,
  stepTypeLabels,
} from "@/lib/constants";
import { AuditLogPanel } from "@/components/ui/audit-log-panel";

/** リソース選択が必要なステップ種別 */
const RESOURCE_STEP_TYPES = ["form", "interview"] as const;

type ResourceStepType = (typeof RESOURCE_STEP_TYPES)[number];

function isResourceStepType(type: string): type is ResourceStepType {
  return (RESOURCE_STEP_TYPES as readonly string[]).includes(type);
}

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { organization } = useOrg();
  const [application, setApplication] = useState<Application | null>(null);
  const [steps, setSteps] = useState<ApplicationStep[]>([]);
  const [loading, setLoading] = useState(true);

  // フォーム回答シートの状態
  const [formSheetOpen, setFormSheetOpen] = useState(false);
  const [formSheetStep, setFormSheetStep] = useState<ApplicationStep | null>(null);
  const [formSheetFields, setFormSheetFields] = useState<{ field: FormField; value: string }[]>([]);
  const [formSheetLoading, setFormSheetLoading] = useState(false);

  // リソース選択ダイアログの状態
  const [activeTab, setActiveTab] = useState<"dashboard" | "steps" | "history" | "audit">(
    "dashboard"
  );
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const [resourceDialogStep, setResourceDialogStep] = useState<ApplicationStep | null>(null);
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);

  // 入社確定ダイアログの状態
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [hireDate, setHireDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [converting, setConverting] = useState(false);
  const { showToast } = useToast();

  const load = async () => {
    if (!organization) return;
    setLoading(true);
    const { data } = await getSupabase()
      .from("applications")
      .select(
        "*, jobs(*), profiles:applicant_id(id, email, display_name, role), application_steps(*)"
      )
      .eq("id", id)
      .eq("organization_id", organization.id)
      .single();

    if (data) {
      setApplication(data as unknown as Application);
      const sortedSteps = (data.application_steps ?? []).sort(
        (a: ApplicationStep, b: ApplicationStep) => a.step_order - b.step_order
      );
      setSteps(sortedSteps);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!organization) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, organization]);

  // Realtime: application_steps の変更をリッスンして自動リロード
  useEffect(() => {
    const channel = getSupabase()
      .channel(`application_steps:${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "application_steps",
          filter: `application_id=eq.${id}`,
        },
        () => {
          load();
        }
      )
      .subscribe();

    return () => {
      getSupabase().removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, organization]);

  /** リソース選択ダイアログを開き、フォームまたは面接一覧を取得 */
  const openResourceDialog = async (step: ApplicationStep) => {
    if (!organization) return;

    setResourceDialogStep(step);
    setResourcesLoading(true);
    setResourceDialogOpen(true);

    if (step.step_type === "form") {
      const { data } = await getSupabase()
        .from("custom_forms")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });
      setForms(data ?? []);
    } else if (step.step_type === "interview") {
      const { data } = await getSupabase()
        .from("interviews")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });
      setInterviews(data ?? []);
    }

    setResourcesLoading(false);
  };

  /** リソースを選択してステップを開始 */
  const startStepWithResource = async (resourceId: string) => {
    if (!resourceDialogStep) return;

    await getSupabase()
      .from("application_steps")
      .update({
        status: "in_progress",
        related_id: resourceId,
        started_at: new Date().toISOString(),
      })
      .eq("id", resourceDialogStep.id);

    setResourceDialogOpen(false);
    setResourceDialogStep(null);
    load();
  };

  /** ステップを進行させる */
  const advanceStep = async (step: ApplicationStep) => {
    try {
      if (step.status === "pending") {
        // リソース選択が必要なステップ種別の場合はダイアログを開く
        if (isResourceStepType(step.step_type)) {
          openResourceDialog(step);
          return;
        }

        // その他のステップは直接開始
        const { error } = await getSupabase()
          .from("application_steps")
          .update({
            status: "in_progress",
            started_at: new Date().toISOString(),
          })
          .eq("id", step.id);
        if (error) throw error;
      } else if (step.status === "in_progress") {
        const { error } = await getSupabase()
          .from("application_steps")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", step.id);
        if (error) throw error;

        // 次のステップを自動開始（step_order が連番でない場合にも対応）
        const nextStep = steps
          .filter((s) => s.step_order > step.step_order && s.status === "pending")
          .sort((a, b) => a.step_order - b.step_order)[0];
        if (nextStep) {
          // 次ステップがリソース選択を必要としない場合のみ自動開始
          if (!isResourceStepType(nextStep.step_type)) {
            await getSupabase()
              .from("application_steps")
              .update({
                status: "in_progress",
                started_at: new Date().toISOString(),
              })
              .eq("id", nextStep.id);
          }
        }
      }
      load();
    } catch (err) {
      console.error("ステップ更新エラー:", err);
    }
  };

  const skipStep = async (step: ApplicationStep) => {
    const { error } = await getSupabase()
      .from("application_steps")
      .update({ status: "skipped", completed_at: new Date().toISOString() })
      .eq("id", step.id);
    if (error) {
      console.error("ステップスキップエラー:", error);
      return;
    }
    load();
  };

  const unskipStep = async (step: ApplicationStep) => {
    const { error } = await getSupabase()
      .from("application_steps")
      .update({ status: "pending", started_at: null, completed_at: null })
      .eq("id", step.id);
    if (error) {
      console.error("ステップ復元エラー:", error);
      return;
    }
    load();
  };

  /** 現在アクション可能なステップを判定（順序を強制） */
  const currentStepOrder = (() => {
    // 進行中のステップがあればそれが現在のステップ
    const inProgress = steps.find((s) => s.status === "in_progress");
    if (inProgress) return inProgress.step_order;
    // なければ、最初の pending ステップ（skipped は飛ばす）
    const firstPending = steps.find((s) => s.status === "pending");
    if (firstPending) return firstPending.step_order;
    return null;
  })();

  const canActOnStep = (step: ApplicationStep) => {
    if (step.status === "completed") return false;
    if (step.status === "skipped") return true; // 元に戻すボタンのみ表示
    return step.step_order === currentStepOrder;
  };

  /** フォーム回答シートを開く */
  const openFormResponses = async (step: ApplicationStep) => {
    if (!step.related_id || !application) return;
    setFormSheetStep(step);
    setFormSheetLoading(true);
    setFormSheetOpen(true);

    const [{ data: fieldsData }, { data: responsesData }] = await Promise.all([
      getSupabase()
        .from("form_fields")
        .select("*")
        .eq("form_id", step.related_id)
        .order("sort_order"),
      getSupabase()
        .from("form_responses")
        .select("*")
        .eq("form_id", step.related_id)
        .eq("applicant_id", application.applicant_id),
    ]);

    const answerMap: Record<string, string> = {};
    for (const r of responsesData ?? []) {
      answerMap[r.field_id] = Array.isArray(r.value)
        ? (r.value as string[]).join(", ")
        : String(r.value ?? "");
    }

    setFormSheetFields(
      (fieldsData ?? []).map((f) => ({ field: f as FormField, value: answerMap[f.id] ?? "-" }))
    );
    setFormSheetLoading(false);
  };

  const updateApplicationStatus = async (status: string | null) => {
    if (!status) return;
    await getSupabase().from("applications").update({ status }).eq("id", id);
    setApplication((prev) => (prev ? { ...prev, status: status as Application["status"] } : prev));
  };

  const handleConvertToEmployee = async () => {
    if (!application || !organization) return;
    setConverting(true);
    try {
      const supabase = getSupabase();
      const applicantId = application.applicant_id;

      // 1. プロフィールのロールを employee に変更し、入社日を設定
      await supabase
        .from("profiles")
        .update({ role: "employee", hire_date: hireDate })
        .eq("id", applicantId);

      // 2. user_organizations に登録されていなければ追加
      await supabase
        .from("user_organizations")
        .upsert(
          { user_id: applicantId, organization_id: organization.id },
          { onConflict: "user_id,organization_id" }
        );

      // 3. 通知を作成
      await supabase.from("notifications").insert({
        organization_id: organization.id,
        user_id: applicantId,
        type: "general",
        title: "入社が確定しました",
        body: `${hireDate} 付けで社員として登録されました。社員アプリからログインできます。`,
        is_read: false,
      });

      showToast("入社確定しました。応募者が社員として登録されました。");
      setConvertDialogOpen(false);
      load();
    } catch (e) {
      showToast(`エラーが発生しました: ${String(e)}`, "error");
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if (!application) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        応募が見つかりません
      </div>
    );
  }

  const profile = application.profiles as unknown as {
    display_name: string | null;
    email: string;
  };

  const tabs = [
    { value: "dashboard" as const, label: "ダッシュボード" },
    { value: "steps" as const, label: "選考ステップ", count: steps.length },
    { value: "history" as const, label: "選考履歴" },
    { value: "audit" as const, label: "変更履歴" },
  ];

  return (
    <>
      <PageHeader
        title={`${profile?.display_name ?? profile?.email ?? "不明"} の応募`}
        description={application.jobs?.title ?? ""}
        breadcrumb={[{ label: "応募管理", href: "/applications" }]}
        sticky={false}
        action={
          <Select value={application.status} onValueChange={updateApplicationStatus}>
            <SelectTrigger className="w-32">
              <SelectValue>{(v: string) => statusLabels[v] ?? v}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">選考中</SelectItem>
              <SelectItem value="offered">内定</SelectItem>
              <SelectItem value="rejected">不採用</SelectItem>
              <SelectItem value="withdrawn">辞退</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* タブナビゲーション（sticky） */}
      <div className="sticky top-14 z-10 bg-white">
        <div className="flex items-center gap-6 border-b px-4 sm:px-6 md:px-8">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "relative pb-2.5 pt-2 text-[15px] font-medium transition-colors",
                activeTab === tab.value
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {"count" in tab && tab.count !== undefined && (
                <span className="ml-1.5 text-xs text-muted-foreground">{tab.count}</span>
              )}
              {activeTab === tab.value && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 sm:px-6 md:px-8 md:py-6">
        {/* ===== ダッシュボードタブ ===== */}
        {activeTab === "dashboard" && (
          <div className="space-y-6 max-w-3xl">
            {/* 応募者情報 */}
            <section>
              <div className="rounded-lg bg-white border">
                <div className="px-5 pt-4 pb-2">
                  <h2 className="text-sm font-semibold text-muted-foreground">応募者情報</h2>
                </div>
                <div className="px-5 py-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">名前</span>
                    <span className="font-medium">{profile?.display_name ?? "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">メール</span>
                    <span>{profile?.email ?? "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">応募日</span>
                    <span>{format(new Date(application.applied_at), "yyyy/MM/dd")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ステータス</span>
                    <Badge>{statusLabels[application.status]}</Badge>
                  </div>
                </div>
              </div>
            </section>

            {/* 選考ステップ概要 */}
            <section>
              <div className="rounded-lg bg-white border">
                <div className="px-5 pt-4 pb-2">
                  <h2 className="text-sm font-semibold text-muted-foreground">
                    選考ステップ
                    <span className="ml-1.5 text-xs font-normal">{steps.length}</span>
                  </h2>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <StepList
                    steps={steps}
                    canActOnStep={canActOnStep}
                    advanceStep={advanceStep}
                    skipStep={skipStep}
                    unskipStep={unskipStep}
                    onViewFormResponses={openFormResponses}
                  />
                </div>
              </div>
            </section>

            {/* 入社確定セクション */}
            {application?.status === "offered" && (
              <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-green-900">内定者を社員として登録</h4>
                    <p className="text-xs text-green-700 mt-1">
                      この応募者を社員に変換し、社員アプリへのアクセスを許可します
                    </p>
                  </div>
                  <Button
                    onClick={() => setConvertDialogOpen(true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <UserCheck className="mr-2 h-4 w-4" />
                    入社確定
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== 選考ステップタブ ===== */}
        {activeTab === "steps" && (
          <div className="space-y-6 max-w-3xl">
            <section>
              <div className="rounded-lg bg-white border">
                <div className="px-5 pt-4 pb-2">
                  <h2 className="text-sm font-semibold text-muted-foreground">
                    選考ステップ
                    <span className="ml-1.5 text-xs font-normal">{steps.length}</span>
                  </h2>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <StepList
                    steps={steps}
                    canActOnStep={canActOnStep}
                    advanceStep={advanceStep}
                    skipStep={skipStep}
                    unskipStep={unskipStep}
                    onViewFormResponses={openFormResponses}
                  />
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ===== 選考履歴タブ ===== */}
        {activeTab === "history" && (
          <div className="space-y-6 max-w-3xl">
            <section>
              <div className="rounded-lg bg-white border">
                <div className="px-5 pt-4 pb-2">
                  <h2 className="text-sm font-semibold text-muted-foreground">選考履歴</h2>
                </div>
                <div className="px-5 py-4">
                  <StepHistory steps={steps} />
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === "audit" && organization && (
          <AuditLogPanel organizationId={organization.id} tableName="applications" recordId={id} />
        )}
      </div>

      {/* フォーム回答ダイアログ */}
      <Dialog open={formSheetOpen} onOpenChange={setFormSheetOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{formSheetStep?.label ?? "フォーム回答"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {formSheetLoading ? (
              <p className="text-sm text-muted-foreground text-center py-8">読み込み中...</p>
            ) : formSheetFields.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">回答がありません</p>
            ) : (
              formSheetFields.map(({ field, value }) => (
                <div key={field.id} className="rounded-lg border p-4 space-y-1">
                  <p className="text-sm font-medium">{field.label}</p>
                  {field.description && (
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                  )}
                  <p className="text-sm pt-1 whitespace-pre-wrap">{value}</p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* リソース選択ダイアログ */}
      <ResourceSelectDialog
        open={resourceDialogOpen}
        onOpenChange={setResourceDialogOpen}
        step={resourceDialogStep}
        forms={forms}
        interviews={interviews}
        loading={resourcesLoading}
        onSelect={startStepWithResource}
      />

      {/* 入社確定ダイアログ */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>入社確定</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            この応募者を社員として登録します。プロフィールのロールが「社員」に変更され、社員アプリからログインできるようになります。
          </p>
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-sm font-medium">入社日</label>
              <Input
                type="date"
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConvertDialogOpen(false)}>
              キャンセル
            </Button>
            <Button
              onClick={handleConvertToEmployee}
              disabled={converting}
              className="bg-green-600 hover:bg-green-700"
            >
              {converting ? "処理中..." : "入社確定"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** ステップ一覧コンポーネント */
function StepList({
  steps,
  canActOnStep,
  advanceStep,
  skipStep,
  unskipStep,
  onViewFormResponses,
}: {
  steps: ApplicationStep[];
  canActOnStep: (step: ApplicationStep) => boolean;
  advanceStep: (step: ApplicationStep) => void;
  skipStep: (step: ApplicationStep) => void;
  unskipStep: (step: ApplicationStep) => void;
  onViewFormResponses?: (step: ApplicationStep) => void;
}) {
  if (steps.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">選考ステップがありません</p>
    );
  }

  return (
    <>
      {steps.map((step) => (
        <div
          key={step.id}
          className={`flex items-center gap-3 rounded-lg border p-4 ${
            step.status === "in_progress" ? "border-primary bg-primary/5" : ""
          }`}
        >
          {/* Icon */}
          <div className="shrink-0">
            {step.status === "completed" ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
                <Check className="h-4 w-4" />
              </div>
            ) : step.status === "in_progress" ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Circle className="h-4 w-4 fill-current" />
              </div>
            ) : step.status === "skipped" ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-500">
                <SkipForward className="h-4 w-4" />
              </div>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <span className="text-xs font-bold">{step.step_order}</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{step.label}</p>
              <Badge variant="outline" className="text-xs">
                {stepTypeLabels[step.step_type] ?? step.step_type}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {stepStatusLabels[step.status]}
              {step.started_at &&
                step.status === "in_progress" &&
                ` (開始: ${format(new Date(step.started_at), "yyyy/MM/dd")})`}
              {step.completed_at &&
                step.status === "completed" &&
                ` (完了: ${format(new Date(step.completed_at), "yyyy/MM/dd")})`}
            </p>
            {/* 紐付けリソースへのリンク */}
            {step.related_id && <ResourceLink step={step} />}
          </div>

          {/* Actions */}
          <div className="flex gap-2 shrink-0">
            {step.step_type === "form" &&
              step.status === "completed" &&
              step.related_id &&
              onViewFormResponses && (
                <Button size="sm" variant="outline" onClick={() => onViewFormResponses(step)}>
                  回答を確認
                </Button>
              )}
            {step.status === "skipped" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => unskipStep(step)}
                className="text-orange-600 hover:text-orange-700"
              >
                元に戻す
              </Button>
            )}
            {canActOnStep(step) && step.status !== "skipped" && (
              <>
                <Button
                  size="sm"
                  variant={step.status === "in_progress" ? "default" : "outline"}
                  onClick={() => advanceStep(step)}
                >
                  {step.status === "pending" ? "開始" : "完了"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => skipStep(step)}
                  className="text-muted-foreground"
                >
                  スキップ
                </Button>
              </>
            )}
          </div>
        </div>
      ))}
    </>
  );
}

/** ステップの履歴タイムライン */
function StepHistory({ steps }: { steps: ApplicationStep[] }) {
  // 各ステップの started_at / completed_at からイベントを生成
  const events: { date: string; label: string; stepLabel: string; type: string }[] = [];

  for (const step of steps) {
    if (step.started_at) {
      events.push({
        date: step.started_at,
        label: step.status === "skipped" ? "スキップ" : "開始",
        stepLabel: step.label,
        type: step.status === "skipped" ? "skipped" : "started",
      });
    }
    if (step.completed_at && step.status === "completed") {
      events.push({
        date: step.completed_at,
        label: "完了",
        stepLabel: step.label,
        type: "completed",
      });
    }
    if (step.completed_at && step.status === "skipped") {
      events.push({
        date: step.completed_at,
        label: "スキップ",
        stepLabel: step.label,
        type: "skipped",
      });
    }
  }

  // 日時の新しい順にソート
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">まだ履歴がありません</p>;
  }

  return (
    <div className="relative space-y-0">
      {events.map((event, i) => (
        <div key={`${event.date}-${event.stepLabel}-${event.type}`} className="flex gap-3 pb-4">
          {/* タイムラインの線とドット */}
          <div className="flex flex-col items-center">
            <div
              className={`h-3 w-3 rounded-full shrink-0 mt-1 ${
                event.type === "completed"
                  ? "bg-green-500"
                  : event.type === "skipped"
                    ? "bg-orange-400"
                    : "bg-primary"
              }`}
            />
            {i < events.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
          </div>
          {/* 内容 */}
          <div className="pb-2">
            <p className="text-sm font-medium">
              {event.stepLabel}
              <span className="ml-2 text-muted-foreground font-normal">— {event.label}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(event.date), "yyyy/MM/dd HH:mm")}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/** ステップに紐付いたリソースへのリンク */
function ResourceLink({ step }: { step: ApplicationStep }) {
  if (step.step_type === "form" && step.related_id) {
    return (
      <Link
        href={`/forms/${step.related_id}`}
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
        onClick={(e) => e.stopPropagation()}
      >
        <FileText className="h-3 w-3" />
        フォームを確認
        <ExternalLink className="h-3 w-3" />
      </Link>
    );
  }

  if (step.step_type === "interview" && step.related_id) {
    return (
      <Link
        href={`/scheduling/${step.related_id}`}
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
        onClick={(e) => e.stopPropagation()}
      >
        <Calendar className="h-3 w-3" />
        面接詳細を確認
        <ExternalLink className="h-3 w-3" />
      </Link>
    );
  }

  return null;
}

/** フォーム/面接 選択ダイアログ */
function ResourceSelectDialog({
  open,
  onOpenChange,
  step,
  forms,
  interviews,
  loading,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step: ApplicationStep | null;
  forms: CustomForm[];
  interviews: Interview[];
  loading: boolean;
  onSelect: (resourceId: string) => void;
}) {
  if (!step) return null;

  const isForm = step.step_type === "form";
  const title = isForm ? "フォームを選択" : "面接を選択";
  const description = isForm
    ? "このステップに紐付けるフォームを選択してください"
    : "このステップに紐付ける面接を選択してください";
  const items = isForm ? forms : interviews;
  const createHref = isForm ? "/forms/new" : "/scheduling";
  const createLabel = isForm ? "新しいフォームを作成" : "新しい面接を作成";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </DialogHeader>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto pt-2">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-4">読み込み中...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {isForm ? "フォームがありません" : "面接がありません"}
            </p>
          ) : isForm ? (
            forms.map((form) => (
              <button
                key={form.id}
                type="button"
                onClick={() => onSelect(form.id)}
                className="w-full text-left rounded-lg border p-3 hover:bg-accent transition-colors"
              >
                <p className="text-sm font-medium">{form.title}</p>
                {form.description && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">{form.description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  作成日: {format(new Date(form.created_at), "yyyy/MM/dd")}
                </p>
              </button>
            ))
          ) : (
            interviews.map((interview) => (
              <button
                key={interview.id}
                type="button"
                onClick={() => onSelect(interview.id)}
                className="w-full text-left rounded-lg border p-3 hover:bg-accent transition-colors"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{interview.title}</p>
                  <Badge
                    variant={interview.status === "confirmed" ? "default" : "outline"}
                    className="text-xs"
                  >
                    {interview.status === "scheduling"
                      ? "未確定"
                      : interview.status === "confirmed"
                        ? "確定済み"
                        : interview.status}
                  </Badge>
                </div>
                {interview.location && (
                  <p className="text-xs text-muted-foreground mt-1">{interview.location}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  作成日: {format(new Date(interview.created_at), "yyyy/MM/dd")}
                </p>
              </button>
            ))
          )}
        </div>

        <div className="pt-2 border-t">
          <Link href={createHref}>
            <Button variant="outline" size="sm" className="w-full">
              {createLabel}
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
