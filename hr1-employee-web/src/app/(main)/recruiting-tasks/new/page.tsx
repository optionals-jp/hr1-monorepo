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
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import {
  useCreateRecruiterTask,
  usePreviewRecruiterTaskTargets,
} from "@/features/recruiting/hooks/use-recruiter-tasks";
import { useApplicantsList } from "@/features/recruiting/hooks/use-applicants-page";
import { useJobsList } from "@/features/recruiting/hooks/use-jobs-page";
import {
  applicationStatusLabels,
  stepTypeLabels,
  selectableStepTypes,
  StepType,
} from "@/lib/constants";
import type { RecruiterTaskCriteria } from "@/lib/repositories/recruiter-task-repository";

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

  const canSubmit =
    title.trim().length > 0 &&
    (mode === "individual"
      ? selectedApplicantIds.size > 0
      : Boolean(filterHiringType || filterJobId || filterAppStatus || stepEnabled));

  const handlePreview = () => {
    preview.preview({ target_mode: mode, target_criteria: criteria });
  };

  const handleSubmit = async () => {
    try {
      const result = await create({
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate || null,
        action_url: actionUrl.trim() || null,
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
              <div className="grid grid-cols-2 gap-4">
                <FormField label="期日">
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </FormField>
                <FormInput
                  label="アクション URL"
                  value={actionUrl}
                  onChange={(e) => setActionUrl(e.target.value)}
                  placeholder="/forms/xxx"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                アクション URL を指定すると、応募者アプリのタスクからそのページへ遷移できます。
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
                            v === "new_grad"
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
                          {(v: string) => jobs.find((j) => j.id === v)?.title ?? v}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
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
                          {(v: string) => applicationStatusLabels[v] ?? v}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
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
                      <span className="text-sm font-medium">選考ステップで絞り込む</span>
                    </label>
                    {stepEnabled && (
                      <div className="space-y-3 pl-6">
                        <SegmentControl<StepMode>
                          value={stepMode}
                          onChange={setStepMode}
                          options={[
                            { value: "current", label: "現在このステップに滞在中" },
                            { value: "passed", label: "このステップ以上を通過済み" },
                          ]}
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <FormField label="ステップ種別">
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
                          <FormField label="最小ステップ順序（任意）">
                            <Input
                              type="number"
                              min="1"
                              value={minStepOrder}
                              onChange={(e) => setMinStepOrder(e.target.value)}
                              placeholder="例: 2"
                            />
                          </FormField>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          例: 「一次面接（順序 2）以上を通過済み」なら step_type=面接 + 最小順序=2 +
                          通過済みモード。
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={handlePreview} disabled={!canSubmit}>
                  対象人数をプレビュー
                </Button>
                {preview.loading ? (
                  <span className="text-xs text-muted-foreground">計算中...</span>
                ) : preview.error ? (
                  <span className="text-xs text-destructive">{preview.error}</span>
                ) : preview.count != null ? (
                  <span className="text-sm font-medium">対象: {preview.count} 人</span>
                ) : null}
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
    </>
  );
}
