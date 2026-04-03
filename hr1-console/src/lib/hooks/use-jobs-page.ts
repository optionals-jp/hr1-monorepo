"use client";

import { useState } from "react";
import { useTabParam } from "@/lib/hooks/use-tab-param";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase/browser";
import * as applicantRepo from "@/lib/repositories/applicant-repository";
import { validators, validateForm, type ValidationErrors } from "@/lib/validation";
import { StepType } from "@/lib/constants";
import type { Job } from "@/types/database";

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

export async function deleteJob(jobId: string, organizationId: string) {
  return applicantRepo.deleteJob(getSupabase(), jobId, organizationId);
}

export function useJobsPage() {
  const { organization } = useOrg();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useTabParam("open");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: jobs = [], isLoading, error: jobsError, mutate: mutateJobs } = useJobsList();

  const { data: appCounts = {} } = useJobAppCounts();

  const filtered = jobs.filter((job) => {
    if (job.status !== activeTab) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      job.title.toLowerCase().includes(q) ||
      (job.department ?? "").toLowerCase().includes(q) ||
      (job.location ?? "").toLowerCase().includes(q)
    );
  });

  const handleDeleteJob = async (job: Job): Promise<{ success: boolean; error?: string }> => {
    if (!organization) return { success: false };
    if (!window.confirm(`「${job.title}」を削除しますか？`)) return { success: false };
    setDeletingId(job.id);
    try {
      const result = await deleteJob(job.id, organization.id);
      if (result.error) {
        return { success: false, error: result.error.message };
      }
      mutateJobs();
      return { success: true };
    } catch {
      return { success: false, error: "削除に失敗しました" };
    } finally {
      setDeletingId(null);
    }
  };

  return {
    search,
    setSearch,
    activeTab,
    setActiveTab,
    deletingId,
    jobs,
    isLoading,
    jobsError,
    mutateJobs,
    appCounts,
    filtered,
    handleDeleteJob,
  };
}

interface StepDraft {
  tempId: string;
  step_type: string;
  label: string;
}

export type { StepDraft };

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
    steps: { step_type: string; label: string }[];
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
    }
  };

  return { createJob };
}

export function useNewJobPage() {
  const { createJob } = useNewJob();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [salaryRange, setSalaryRange] = useState("");
  const [status, setStatus] = useState("open");
  const [steps, setSteps] = useState<StepDraft[]>([
    { tempId: "1", step_type: StepType.Screening, label: "書類選考" },
    { tempId: "2", step_type: StepType.Interview, label: "一次面接" },
    { tempId: "3", step_type: StepType.Offer, label: "内定" },
  ]);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<ValidationErrors>({});

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      {
        tempId: `${Date.now()}`,
        step_type: StepType.Interview,
        label: "",
      },
    ]);
  };

  const removeStep = (tempId: string) => {
    setSteps((prev) => prev.filter((s) => s.tempId !== tempId));
  };

  const updateStep = (tempId: string, field: keyof StepDraft, value: string) => {
    setSteps((prev) => prev.map((s) => (s.tempId === tempId ? { ...s, [field]: value } : s)));
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
        steps: steps.map((step) => ({
          step_type: step.step_type,
          label: step.label,
        })),
      });
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
    setSteps([
      { tempId: "1", step_type: StepType.Screening, label: "書類選考" },
      { tempId: "2", step_type: StepType.Interview, label: "一次面接" },
      { tempId: "3", step_type: StepType.Offer, label: "内定" },
    ]);
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
    removeStep,
    updateStep,
    saving,
    formErrors,
    handleSubmit,
    reset,
  };
}
