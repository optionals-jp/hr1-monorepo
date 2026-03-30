"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { PageHeader, PageContent } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrg } from "@/lib/org-context";
import { useNewJob } from "@/lib/hooks/use-jobs-page";
import { validators, validateForm, type ValidationErrors } from "@/lib/validation";
import { Trash2, GripVertical } from "lucide-react";
import { jobStatusLabels, stepTypeLabels, selectableStepTypes, StepType } from "@/lib/constants";

interface StepDraft {
  tempId: string;
  step_type: string;
  label: string;
}

export default function NewJobPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { organization } = useOrg();
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
    setSteps([
      ...steps,
      {
        tempId: `${Date.now()}`,
        step_type: StepType.Interview,
        label: "",
      },
    ]);
  };

  const removeStep = (tempId: string) => {
    setSteps(steps.filter((s) => s.tempId !== tempId));
  };

  const updateStep = (tempId: string, field: keyof StepDraft, value: string) => {
    setSteps(steps.map((s) => (s.tempId === tempId ? { ...s, [field]: value } : s)));
  };

  const handleSubmit = async () => {
    if (!organization) return;

    const errors = validateForm(
      {
        title: [validators.required("タイトル"), validators.maxLength(200, "タイトル")],
      },
      { title }
    );
    if (errors) {
      setFormErrors(errors);
      return;
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

      showToast("求人を作成しました");
      router.push("/jobs");
    } catch {
      showToast("求人の作成に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="求人を作成" />

      <PageContent>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 基本情報 */}
          <Card>
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>タイトル *</Label>
                <Input
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setFormErrors((prev) => ({ ...prev, title: "" }));
                  }}
                  placeholder="バックエンドエンジニア"
                  className={formErrors.title ? "border-red-500" : ""}
                />
                {formErrors.title && <p className="text-sm text-red-500">{formErrors.title}</p>}
              </div>
              <div className="space-y-2">
                <Label>説明</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="求人の説明を入力してください"
                  rows={5}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>部署</Label>
                  <Input
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="エンジニアリング"
                  />
                </div>
                <div className="space-y-2">
                  <Label>勤務地</Label>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="東京"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>雇用形態</Label>
                  <Input
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value)}
                    placeholder="正社員"
                  />
                </div>
                <div className="space-y-2">
                  <Label>年収レンジ</Label>
                  <Input
                    value={salaryRange}
                    onChange={(e) => setSalaryRange(e.target.value)}
                    placeholder="500万〜800万"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>ステータス</Label>
                <Select value={status} onValueChange={(v) => v && setStatus(v)}>
                  <SelectTrigger>
                    <SelectValue>{(v: string) => jobStatusLabels[v] ?? v}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">公開中</SelectItem>
                    <SelectItem value="draft">下書き</SelectItem>
                    <SelectItem value="closed">終了</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* 選考ステップ */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>選考ステップ</CardTitle>
              <Button variant="outline" size="sm" onClick={addStep}>
                追加
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {steps.map((step, index) => (
                <div key={step.tempId} className="flex items-center gap-2 rounded-lg border p-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium text-muted-foreground w-6">{index + 1}</span>
                  <Select
                    value={step.step_type}
                    onValueChange={(v) => v && updateStep(step.tempId, "step_type", v)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue>{(v: string) => stepTypeLabels[v] ?? v}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(selectableStepTypes).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={step.label}
                    onChange={(e) => updateStep(step.tempId, "label", e.target.value)}
                    placeholder="ステップ名"
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeStep(step.tempId)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {steps.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  選考ステップを追加してください
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => router.push("/jobs")}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || saving}>
            {saving ? "作成中..." : "求人を作成"}
          </Button>
        </div>
      </PageContent>
    </>
  );
}
