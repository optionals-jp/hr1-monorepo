"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { SectionCard } from "@hr1/shared-ui/components/ui/section-card";
import { FormField, FormInput, FormTextarea } from "@hr1/shared-ui/components/ui/form-field";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Checkbox } from "@hr1/shared-ui/components/ui/checkbox";
import { SegmentControl } from "@hr1/shared-ui/components/ui/segment-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import { SearchBar } from "@hr1/shared-ui/components/ui/search-bar";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@hr1/shared-ui/components/ui/avatar";
import { DialogPanel } from "@hr1/shared-ui/components/ui/dialog";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import {
  useCreateRecruiterTask,
  usePreviewRecruiterTaskTargets,
} from "@/features/recruiting/hooks/use-recruiter-tasks";
import { useApplicantsList } from "@/features/recruiting/hooks/use-applicants-page";
import { useJobsList } from "@/features/recruiting/hooks/use-jobs-page";
import { useForms } from "@/features/recruiting/hooks/use-forms";
import { useSchedulingList } from "@/features/recruiting/hooks/use-scheduling";
import { useApplicantSurveys } from "@/features/recruiting/hooks/use-applicant-surveys";
import {
  applicationStatusLabels,
  stepTypeLabels,
  selectableStepTypes,
  StepType,
} from "@/lib/constants";
import type {
  RecruiterTaskCriteria,
  RecruiterTaskActionType,
} from "@/lib/repositories/recruiter-task-repository";

type TargetMode = "individual" | "filter";
type HiringType = "new_grad" | "mid_career" | "none";
type StepMode = "current" | "passed";
type SelectionStepType = "screening" | "form" | "interview" | "external_test" | "offer";

export default function NewRecruitingTaskPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const presetJobId = searchParams.get("job_id") ?? "";
  const presetMode = searchParams.get("mode");
  const initialMode: TargetMode = presetMode === "individual" ? "individual" : "filter";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [actionType, setActionType] = useState<RecruiterTaskActionType>("none");
  const [actionRefId, setActionRefId] = useState("");
  const [actionUrl, setActionUrl] = useState("");

  const [mode, setMode] = useState<TargetMode>(initialMode);
  const [selectedApplicantIds, setSelectedApplicantIds] = useState<Set<string>>(new Set());
  const [applicantSearch, setApplicantSearch] = useState("");

  const [filterHiringType, setFilterHiringType] = useState<HiringType | "">("");
  const [filterJobId, setFilterJobId] = useState<string>(presetJobId);
  const [filterAppStatus, setFilterAppStatus] = useState<string>("");
  const [stepEnabled, setStepEnabled] = useState(false);
  const [stepMode, setStepMode] = useState<StepMode>("passed");
  const [stepType, setStepType] = useState<SelectionStepType>("interview");
  const [minStepOrder, setMinStepOrder] = useState<string>("");

  const { data: applicants = [] } = useApplicantsList();
  const { data: jobs = [] } = useJobsList();
  const { data: forms = [] } = useForms();
  const { data: interviews = [] } = useSchedulingList();
  const { data: applicantSurveys = [] } = useApplicantSurveys();

  const preview = usePreviewRecruiterTaskTargets();
  const { create, saving } = useCreateRecruiterTask();

  const filteredApplicants = useMemo(() => {
    const q = applicantSearch.trim().toLowerCase();
    if (!q) return applicants;
    return applicants.filter(
      (a) => a.email.toLowerCase().includes(q) || a.display_name?.toLowerCase().includes(q)
    );
  }, [applicants, applicantSearch]);

  const criteria: RecruiterTaskCriteria = useMemo(() => {
    if (mode === "individual") {
      return { applicant_ids: Array.from(selectedApplicantIds) };
    }
    const c: RecruiterTaskCriteria = {};
    if (filterHiringType) c.hiring_type = filterHiringType;
    if (filterJobId) c.job_id = filterJobId;
    if (filterAppStatus) c.application_status = filterAppStatus;
    if (stepEnabled) {
      c.selection_step = {
        mode: stepMode,
        step_type: stepType,
        ...(minStepOrder ? { min_step_order: Number(minStepOrder) } : {}),
      };
    }
    return c;
  }, [
    mode,
    selectedApplicantIds,
    filterHiringType,
    filterJobId,
    filterAppStatus,
    stepEnabled,
    stepMode,
    stepType,
    minStepOrder,
  ]);

  const actionValid = (() => {
    if (actionType === "none" || actionType === "announcement") return true;
    if (actionType === "custom_url") return actionUrl.trim().length > 0;
    return actionRefId.length > 0;
  })();

  const hasTargetCriteria =
    mode === "individual"
      ? selectedApplicantIds.size > 0
      : Boolean(filterHiringType || filterJobId || filterAppStatus || stepEnabled);

  const canSubmit = title.trim().length > 0 && actionValid && hasTargetCriteria;
  const canPreview = hasTargetCriteria;

  const [previewOpen, setPreviewOpen] = useState(false);
  const handlePreview = () => {
    setPreviewOpen(true);
    preview.preview({ target_mode: mode, target_criteria: criteria });
  };

  const handleSubmit = async () => {
    try {
      const needsRef =
        actionType === "form" || actionType === "interview" || actionType === "survey";
      const result = await create({
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate || null,
        action_type: actionType,
        action_ref_id: needsRef ? actionRefId : null,
        action_url: actionType === "custom_url" ? actionUrl.trim() : null,
        target_mode: mode,
        target_criteria: criteria,
      });
      showToast(
        `タスクを作成しました（配信: ${result.created_count} / 対象: ${result.target_count}）`
      );
      router.push(`/recruiting-tasks/${result.task_id}`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "タスクの作成に失敗しました", "error");
    }
  };

  const toggleApplicant = (id: string) => {
    setSelectedApplicantIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      <PageHeader
        title="応募者タスクを作成"
        breadcrumb={[{ label: "応募者タスク", href: "/recruiting-tasks" }]}
        sticky={false}
      />
      <PageContent>
        <div className="max-w-3xl space-y-6">
          <SectionCard>
            <h2 className="text-sm font-semibold mb-3">基本情報</h2>
            <div className="space-y-4">
              <FormInput
                label="タイトル"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="履歴書を提出してください"
              />
              <FormTextarea
                label="説明"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="タスクの詳細や背景情報"
                rows={3}
              />
              <FormField label="期日">
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="アクション種別">
                  <Select
                    value={actionType}
                    onValueChange={(v) => {
                      if (!v) return;
                      setActionType(v as RecruiterTaskActionType);
                      setActionRefId("");
                      setActionUrl("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue>
                        {(v: string) =>
                          ({
                            none: "遷移先なし",
                            form: "フォーム回答",
                            interview: "面接日程予約",
                            survey: "サーベイ回答",
                            announcement: "お知らせ",
                            custom_url: "URL直接指定",
                          })[v] ?? v
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">遷移先なし</SelectItem>
                      <SelectItem value="form">フォーム回答</SelectItem>
                      <SelectItem value="interview">面接日程予約</SelectItem>
                      <SelectItem value="survey">サーベイ回答</SelectItem>
                      <SelectItem value="announcement">お知らせ</SelectItem>
                      <SelectItem value="custom_url">URL直接指定</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>

                {actionType === "form" && (
                  <FormField label="フォーム" required>
                    <Select value={actionRefId} onValueChange={(v) => setActionRefId(v ?? "")}>
                      <SelectTrigger>
                        <SelectValue placeholder="フォームを選択">
                          {(v: string) => forms.find((f) => f.id === v)?.title ?? v}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {forms.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                )}

                {actionType === "interview" && (
                  <FormField label="面接" required>
                    <Select value={actionRefId} onValueChange={(v) => setActionRefId(v ?? "")}>
                      <SelectTrigger>
                        <SelectValue placeholder="面接を選択">
                          {(v: string) => interviews.find((i) => i.id === v)?.title ?? v}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {interviews.map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                )}

                {actionType === "survey" && (
                  <FormField label="サーベイ" required>
                    <Select value={actionRefId} onValueChange={(v) => setActionRefId(v ?? "")}>
                      <SelectTrigger>
                        <SelectValue placeholder="サーベイを選択">
                          {(v: string) => applicantSurveys.find((s) => s.id === v)?.title ?? v}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {applicantSurveys.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                )}

                {actionType === "custom_url" && (
                  <FormInput
                    label="URL"
                    required
                    value={actionUrl}
                    onChange={(e) => setActionUrl(e.target.value)}
                    placeholder="https://example.com/..."
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {actionType === "none"
                  ? "応募者タスクから遷移先が表示されません。"
                  : actionType === "form"
                    ? "応募者ごとに該当するフォーム回答ページへ自動で遷移します。"
                    : actionType === "interview"
                      ? "応募者ごとに該当する面接予約ページへ自動で遷移します。"
                      : actionType === "survey"
                        ? "選択したサーベイの回答ページへ遷移します。"
                        : actionType === "announcement"
                          ? "お知らせ一覧ページへ遷移します。"
                          : "任意のURLへ遷移します。外部サイトへの連携にも利用できます。"}
              </p>
            </div>
          </SectionCard>

          <SectionCard>
            <h2 className="text-sm font-semibold mb-3">対象</h2>
            <div className="space-y-4">
              <SegmentControl<TargetMode>
                value={mode}
                onChange={setMode}
                options={[
                  { value: "filter", label: "条件指定" },
                  { value: "individual", label: "個別指定" },
                ]}
              />

              {mode === "individual" ? (
                <div className="space-y-3">
                  <SearchBar
                    value={applicantSearch}
                    onChange={setApplicantSearch}
                    placeholder="候補者を検索"
                    className="bg-transparent p-0 sm:px-0 md:px-0"
                  />
                  <div className="rounded-xl border max-h-80 overflow-y-auto divide-y">
                    {filteredApplicants.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        該当する候補者がいません
                      </p>
                    ) : (
                      filteredApplicants.map((a) => (
                        <label
                          key={a.id}
                          className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-muted/40"
                        >
                          <Checkbox
                            checked={selectedApplicantIds.has(a.id)}
                            onCheckedChange={() => toggleApplicant(a.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{a.display_name ?? "-"}</p>
                            <p className="text-xs text-muted-foreground truncate">{a.email}</p>
                          </div>
                          {a.hiring_type === "new_grad" ? (
                            <Badge variant="secondary">新卒</Badge>
                          ) : a.hiring_type === "mid_career" ? (
                            <Badge variant="outline">中途</Badge>
                          ) : null}
                        </label>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    選択中: {selectedApplicantIds.size} 人
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="採用区分">
                    <Select
                      value={filterHiringType}
                      onValueChange={(v) => setFilterHiringType((v as HiringType | "") ?? "")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="指定なし">
                          {(v: string) =>
                            !v
                              ? "指定なし"
                              : v === "new_grad"
                                ? "新卒"
                                : v === "mid_career"
                                  ? "中途"
                                  : v === "none"
                                    ? "未設定"
                                    : v
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">指定なし</SelectItem>
                        <SelectItem value="new_grad">新卒</SelectItem>
                        <SelectItem value="mid_career">中途</SelectItem>
                        <SelectItem value="none">未設定</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="求人">
                    <Select value={filterJobId} onValueChange={(v) => setFilterJobId(v ?? "")}>
                      <SelectTrigger>
                        <SelectValue placeholder="指定なし">
                          {(v: string) =>
                            !v ? "指定なし" : (jobs.find((j) => j.id === v)?.title ?? v)
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">指定なし</SelectItem>
                        {jobs.map((j) => (
                          <SelectItem key={j.id} value={j.id}>
                            {j.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="応募ステータス">
                    <Select
                      value={filterAppStatus}
                      onValueChange={(v) => setFilterAppStatus(v ?? "")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="指定なし">
                          {(v: string) => (!v ? "指定なし" : (applicationStatusLabels[v] ?? v))}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">指定なし</SelectItem>
                        {Object.entries(applicationStatusLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <div className="col-span-2 rounded-xl border p-3 space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={stepEnabled}
                        onCheckedChange={(v) => setStepEnabled(Boolean(v))}
                      />
                      <span className="text-sm font-medium">選考の進捗で絞り込む</span>
                    </label>
                    {stepEnabled && (
                      <div className="space-y-3 pl-6">
                        <p className="text-xs text-muted-foreground">
                          指定した選考段階にいる応募者、または通過済みの応募者を対象にします。
                        </p>
                        <FormField label="対象の選考段階">
                          <Select
                            value={stepType}
                            onValueChange={(v) => v && setStepType(v as SelectionStepType)}
                          >
                            <SelectTrigger>
                              <SelectValue>{(v: string) => stepTypeLabels[v] ?? v}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(selectableStepTypes).map(([key, label]) => (
                                <SelectItem key={key} value={key}>
                                  {label}
                                </SelectItem>
                              ))}
                              <SelectItem value={StepType.Offer}>内定</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormField>
                        <FormField label="対象範囲">
                          <SegmentControl<StepMode>
                            value={stepMode}
                            onChange={setStepMode}
                            options={[
                              { value: "current", label: "この段階にいる人" },
                              { value: "passed", label: "この段階を通過した人" },
                            ]}
                          />
                        </FormField>
                        <details className="group">
                          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground select-none">
                            詳細設定（同じ種別の段階が複数ある場合）
                          </summary>
                          <div className="mt-2 space-y-2">
                            <FormField label="何段階目以降を対象にするか（任意）">
                              <Input
                                type="number"
                                min="1"
                                value={minStepOrder}
                                onChange={(e) => setMinStepOrder(e.target.value)}
                                placeholder="例: 2（二次面接以降を対象にする場合）"
                              />
                            </FormField>
                            <p className="text-xs text-muted-foreground">
                              例えば面接が複数回ある場合に「2」と指定すると、二次面接以降が対象になります。空欄なら同じ種別の全段階が対象です。
                            </p>
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={handlePreview} disabled={!canPreview}>
                  対象をプレビュー
                </Button>
              </div>
            </div>
          </SectionCard>

          <div className="flex justify-end gap-3 pb-10">
            <Button variant="outline" onClick={() => router.push("/recruiting-tasks")}>
              キャンセル
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={!canSubmit || saving}>
              {saving ? "作成中..." : "タスクを作成"}
            </Button>
          </div>
        </div>
      </PageContent>

      <DialogPanel
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title="プレビュー"
        description={
          preview.loading
            ? "計算中..."
            : preview.error
              ? undefined
              : preview.targets != null
                ? `対象: ${preview.targets.length} 人`
                : undefined
        }
        size="lg"
        footer={
          <Button variant="outline" onClick={() => setPreviewOpen(false)}>
            閉じる
          </Button>
        }
        bodyClassName="p-0"
      >
        {preview.loading ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">計算中...</p>
        ) : preview.error ? (
          <p className="px-6 py-8 text-center text-sm text-destructive">{preview.error}</p>
        ) : preview.targets == null ? null : preview.targets.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">
            条件に該当する応募者がいません
          </p>
        ) : (
          <ul className="divide-y">
            {preview.targets.map((t) => (
              <li key={t.user_id} className="flex items-center gap-3 px-6 py-2.5">
                <Avatar className="h-8 w-8">
                  {t.avatar_url ? (
                    <AvatarImage src={t.avatar_url} alt={t.display_name ?? ""} />
                  ) : (
                    <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-medium">
                      {(t.display_name ?? t.email)[0]}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{t.display_name ?? "-"}</div>
                  <div className="truncate text-xs text-muted-foreground">{t.email}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogPanel>
    </>
  );
}
