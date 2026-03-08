"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader, PageContent } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useOrg } from "@/lib/org-context";
import { supabase } from "@/lib/supabase";
import type { Application, ApplicationStep, CustomForm, Interview } from "@/types/database";
import {
  Check,
  Circle,
  SkipForward,
  ArrowRight,
  FileText,
  Calendar,
  ExternalLink,
  Plus,
} from "lucide-react";
import { format } from "date-fns";

const statusLabels: Record<string, string> = {
  active: "選考中",
  offered: "内定",
  rejected: "不採用",
  withdrawn: "辞退",
};

const stepStatusLabels: Record<string, string> = {
  pending: "未開始",
  in_progress: "進行中",
  completed: "完了",
  skipped: "スキップ",
};

const stepTypeLabels: Record<string, string> = {
  screening: "書類選考",
  form: "アンケート/フォーム",
  interview: "面接",
  external_test: "外部テスト",
  offer: "内定",
};

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

  // リソース選択ダイアログの状態
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const [resourceDialogStep, setResourceDialogStep] = useState<ApplicationStep | null>(null);
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("applications")
      .select(
        "*, jobs(*), profiles:applicant_id(id, email, display_name, role), application_steps(*)"
      )
      .eq("id", id)
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
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /** リソース選択ダイアログを開き、フォームまたは面接一覧を取得 */
  const openResourceDialog = async (step: ApplicationStep) => {
    if (!organization) return;

    setResourceDialogStep(step);
    setResourcesLoading(true);
    setResourceDialogOpen(true);

    if (step.step_type === "form") {
      const { data } = await supabase
        .from("custom_forms")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });
      setForms(data ?? []);
    } else if (step.step_type === "interview") {
      const { data } = await supabase
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

    await supabase
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
    if (step.status === "pending") {
      // リソース選択が必要なステップ種別の場合はダイアログを開く
      if (isResourceStepType(step.step_type)) {
        openResourceDialog(step);
        return;
      }

      // その他のステップは直接開始
      await supabase
        .from("application_steps")
        .update({
          status: "in_progress",
          started_at: new Date().toISOString(),
        })
        .eq("id", step.id);
    } else if (step.status === "in_progress") {
      await supabase
        .from("application_steps")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", step.id);

      // 次のステップを自動開始
      const nextStep = steps.find(
        (s) => s.step_order === step.step_order + 1 && s.status === "pending"
      );
      if (nextStep) {
        // 次ステップがリソース選択を必要としない場合のみ自動開始
        if (!isResourceStepType(nextStep.step_type)) {
          await supabase
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
  };

  const skipStep = async (step: ApplicationStep) => {
    await supabase.from("application_steps").update({ status: "skipped" }).eq("id", step.id);
    load();
  };

  const updateApplicationStatus = async (status: string | null) => {
    if (!status) return;
    await supabase.from("applications").update({ status }).eq("id", id);
    setApplication((prev) => (prev ? { ...prev, status: status as Application["status"] } : prev));
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

  return (
    <>
      <PageHeader
        title={`${profile?.display_name ?? profile?.email ?? "不明"} の応募`}
        description={application.jobs?.title ?? ""}
        action={
          <Select value={application.status} onValueChange={updateApplicationStatus}>
            <SelectTrigger className="w-32">
              <SelectValue />
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

      <PageContent>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* 応募者情報 */}
          <Card>
            <CardHeader>
              <CardTitle>応募者情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">名前</span>
                <span>{profile?.display_name ?? "-"}</span>
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
            </CardContent>
          </Card>

          {/* 選考ステップ */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>選考ステップ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {steps.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  選考ステップがありません
                </p>
              ) : (
                steps.map((step) => (
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
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
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
                        {step.completed_at &&
                          ` (${format(new Date(step.completed_at), "yyyy/MM/dd")})`}
                      </p>
                      {/* 紐付けリソースへのリンク */}
                      {step.related_id && <ResourceLink step={step} />}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 shrink-0">
                      {(step.status === "pending" || step.status === "in_progress") && (
                        <>
                          <Button
                            size="sm"
                            variant={step.status === "in_progress" ? "default" : "outline"}
                            onClick={() => advanceStep(step)}
                          >
                            {step.status === "pending" ? (
                              <>
                                開始
                                <ArrowRight className="ml-1 h-3 w-3" />
                              </>
                            ) : (
                              <>
                                完了
                                <Check className="ml-1 h-3 w-3" />
                              </>
                            )}
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
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </PageContent>

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
    </>
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
              <Plus className="mr-1 h-4 w-4" />
              {createLabel}
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
