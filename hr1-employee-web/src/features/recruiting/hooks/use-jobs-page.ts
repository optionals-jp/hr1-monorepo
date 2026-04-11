"use client";

import { useState } from "react";
import { useTabParam } from "@/lib/hooks/use-tab-param";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase/browser";
import * as applicantRepo from "@/lib/repositories/applicant-repository";
import * as jobRepository from "@/lib/repositories/job-repository";
import * as templateRepo from "@/lib/repositories/selection-step-template-repository";
import { validators, validateForm, type ValidationErrors } from "@/lib/validation";
import { StepType } from "@/lib/constants";
import { PG_ERROR_CODES, getPgErrorCode } from "@hr1/shared-ui/lib/postgres-errors";
import type { Job, SelectionStepTemplate } from "@/types/database";

export const JOB_TAB_STATUSES: Record<string, string[]> = {
  active: ["open", "draft"],
  closed: ["closed"],
  archived: ["archived"],
};

interface AppCounts {
  total: number;
  offered: number;
}

export function useJobsList() {
  return useOrgQuery<Job[]>("jobs", (orgId) =>
    applicantRepo.fetchJobsWithCounts(getSupabase(), orgId)
  );
}

export function useJobAppCounts() {
  return useOrgQuery<Record<string, AppCounts>>("job-app-counts", (orgId) =>
    applicantRepo.fetchApplicationCounts(getSupabase(), orgId)
  );
}

export async function deleteJob(
  organizationId: string,
  jobId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await jobRepository.deleteJob(getSupabase(), jobId, organizationId);
    if (error) throw error;
    return { success: true };
  } catch {
    return { success: false, error: "求人の削除に失敗しました" };
  }
}

export function useJobsPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useTabParam("active");

  const { data: jobs = [], isLoading, error: jobsError, mutate: mutateJobs } = useJobsList();
  const { data: appCounts = {} } = useJobAppCounts();

  const filtered = jobs.filter((job) => {
    const allowed = JOB_TAB_STATUSES[activeTab] ?? [activeTab];
    if (!allowed.includes(job.status)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      job.title.toLowerCase().includes(q) ||
      (job.department ?? "").toLowerCase().includes(q) ||
      (job.location ?? "").toLowerCase().includes(q)
    );
  });

  return {
    search,
    setSearch,
    activeTab,
    setActiveTab,
    jobs,
    isLoading,
    jobsError,
    mutateJobs,
    appCounts,
    filtered,
  };
}

export interface StepDraft {
  tempId: string;
  step_type: string;
  label: string;
  /** null の場合はユーザー手動入力。非 null の場合は既存テンプレート由来（再作成スキップ） */
  templateId: string | null;
}

export function useSelectionStepTemplates() {
  return useOrgQuery<SelectionStepTemplate[]>("selection-step-templates", (orgId) =>
    templateRepo.findByOrg(getSupabase(), orgId)
  );
}

/**
 * 求人作成画面で手動入力された選考ステップのテンプレート化を試みる。
 *
 * - `templateId` が既に紐付いている step はスキップ（既存テンプレート由来）
 * - 手動入力の step は `{求人タイトル}の選考ステップ: {ステップ名}` という名前でテンプレートを作成
 * - 同一組織に同じ名前のテンプレートが既にある場合はスキップ（重複エラーを握り潰さないよう upsert ではなく fetch-then-insert）
 *
 * @returns 作成に成功したテンプレートの数
 */
async function persistManualStepsAsTemplates(
  client: ReturnType<typeof getSupabase>,
  organizationId: string,
  jobTitle: string,
  steps: StepDraft[]
): Promise<number> {
  const manualSteps = steps.filter((s) => !s.templateId && s.label.trim() !== "");
  if (manualSteps.length === 0) return 0;

  const existing = await templateRepo.findByOrg(client, organizationId);
  const existingNames = new Set(existing.map((t) => t.name));
  const maxSortOrder = existing.reduce((max, t) => Math.max(max, t.sort_order), -1);

  let created = 0;
  let nextOrder = maxSortOrder + 1;

  for (const step of manualSteps) {
    const name = `${jobTitle}の選考ステップ: ${step.label.trim()}`;
    if (existingNames.has(name)) continue;
    try {
      await templateRepo.createTemplate(client, {
        organization_id: organizationId,
        name,
        step_type: step.step_type,
        description: null,
        sort_order: nextOrder,
      });
      existingNames.add(name);
      nextOrder++;
      created++;
    } catch (e) {
      // UNIQUE 違反（並行作成によるレース）は想定内なので次のステップへ進む。
      // それ以外のエラー（RLS 拒否・ネットワーク断等）は握り潰さず呼び出し元に伝播させる。
      if (getPgErrorCode(e) !== PG_ERROR_CODES.UNIQUE_VIOLATION) throw e;
      existingNames.add(name);
    }
  }
  return created;
}

export function useNewJob() {
  const { organization } = useOrg();

  const createJob = async (params: {
    title: string;
    description: string;
    department: string | null;
    location: string | null;
    employmentType: string | null;
    salaryRange: string | null;
    status: string;
    steps: StepDraft[];
  }) => {
    if (!organization) throw new Error("Organization not found");
    const client = getSupabase();
    const jobId = crypto.randomUUID();

    const { error: jobError } = await applicantRepo.createJob(client, {
      id: jobId,
      organization_id: organization.id,
      title: params.title,
      description: params.description,
      department: params.department,
      location: params.location,
      employment_type: params.employmentType,
      salary_range: params.salaryRange,
      status: params.status,
    });
    if (jobError) throw jobError;

    if (params.steps.length > 0) {
      const { error: stepsError } = await applicantRepo.createJobSteps(
        client,
        params.steps.map((step, index) => ({
          id: crypto.randomUUID(),
          job_id: jobId,
          step_type: step.step_type,
          step_order: index + 1,
          label: step.label,
        }))
      );
      if (stepsError) throw stepsError;

      // 手動入力ステップをテンプレート化（失敗しても求人作成は成功とする）
      await persistManualStepsAsTemplates(client, organization.id, params.title, params.steps);
    }
  };

  return { createJob };
}

const DEFAULT_STEPS: StepDraft[] = [
  { tempId: "1", step_type: StepType.Screening, label: "書類選考", templateId: null },
  { tempId: "2", step_type: StepType.Interview, label: "一次面接", templateId: null },
  { tempId: "3", step_type: StepType.Offer, label: "内定", templateId: null },
];

export function useNewJobPage() {
  const { createJob } = useNewJob();
  const { data: templates = [], mutate: mutateTemplates } = useSelectionStepTemplates();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [salaryRange, setSalaryRange] = useState("");
  const [status, setStatus] = useState("open");
  const [steps, setSteps] = useState<StepDraft[]>(DEFAULT_STEPS);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<ValidationErrors>({});

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      {
        tempId: `${Date.now()}`,
        step_type: StepType.Interview,
        label: "",
        templateId: null,
      },
    ]);
  };

  const addStepFromTemplate = (template: SelectionStepTemplate) => {
    setSteps((prev) => [
      ...prev,
      {
        tempId: `${Date.now()}-${template.id}`,
        step_type: template.step_type,
        label: template.name,
        templateId: template.id,
      },
    ]);
  };

  const removeStep = (tempId: string) => {
    setSteps((prev) => prev.filter((s) => s.tempId !== tempId));
  };

  const updateStep = (tempId: string, field: "step_type" | "label", value: string) => {
    // 手動編集されたらテンプレ紐付けを外す（更新後の値が独立ステップとして扱われる）
    setSteps((prev) =>
      prev.map((s) => (s.tempId === tempId ? { ...s, [field]: value, templateId: null } : s))
    );
  };

  const setTitleWithClear = (value: string) => {
    setTitle(value);
    setFormErrors((prev) => ({ ...prev, title: "" }));
  };

  const handleSubmit = async (): Promise<{ success: boolean; error?: string }> => {
    const errors = validateForm(
      {
        title: [validators.required("タイトル"), validators.maxLength(200, "タイトル")],
      },
      { title }
    );
    if (errors) {
      setFormErrors(errors);
      return { success: false, error: "validation" };
    }
    setFormErrors({});
    setSaving(true);

    try {
      await createJob({
        title,
        description,
        department: department || null,
        location: location || null,
        employmentType: employmentType || null,
        salaryRange: salaryRange || null,
        status,
        steps,
      });
      mutateTemplates();
      return { success: true };
    } catch {
      return { success: false, error: "求人の作成に失敗しました" };
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setTitle("");
    setDescription("");
    setDepartment("");
    setLocation("");
    setEmploymentType("");
    setSalaryRange("");
    setStatus("open");
    setSteps(DEFAULT_STEPS);
    setFormErrors({});
  };

  return {
    title,
    setTitle: setTitleWithClear,
    description,
    setDescription,
    department,
    setDepartment,
    location,
    setLocation,
    employmentType,
    setEmploymentType,
    salaryRange,
    setSalaryRange,
    status,
    setStatus,
    steps,
    addStep,
    addStepFromTemplate,
    removeStep,
    updateStep,
    templates,
    saving,
    formErrors,
    handleSubmit,
    reset,
  };
}
