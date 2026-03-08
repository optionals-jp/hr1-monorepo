"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader, PageContent } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import type { Job, JobStep } from "@/types/database";
import { Plus, Trash2, GripVertical, Save } from "lucide-react";

const stepTypeLabels: Record<string, string> = {
  screening: "書類選考",
  form: "アンケート/フォーム",
  interview: "面接",
  external_test: "外部テスト",
  offer: "内定",
};

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [steps, setSteps] = useState<JobStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newStepType, setNewStepType] = useState("interview");
  const [newStepLabel, setNewStepLabel] = useState("");

  const load = async () => {
    setLoading(true);
    const [{ data: jobData }, { data: stepsData }] = await Promise.all([
      supabase.from("jobs").select("*").eq("id", id).single(),
      supabase.from("job_steps").select("*").eq("job_id", id).order("step_order"),
    ]);

    setJob(jobData);
    setSteps(stepsData ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const addStep = async () => {
    if (!newStepLabel) return;
    const nextOrder = steps.length + 1;
    const stepId = `step-${id}-${Date.now()}`;

    await supabase.from("job_steps").insert({
      id: stepId,
      job_id: id,
      step_type: newStepType,
      step_order: nextOrder,
      label: newStepLabel,
    });

    setNewStepType("interview");
    setNewStepLabel("");
    setDialogOpen(false);
    load();
  };

  const removeStep = async (stepId: string) => {
    await supabase.from("job_steps").delete().eq("id", stepId);
    load();
  };

  const updateJobStatus = async (status: string) => {
    await supabase.from("jobs").update({ status }).eq("id", id);
    setJob((prev) => (prev ? { ...prev, status: status as Job["status"] } : prev));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        求人が見つかりません
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={job.title}
        description={[job.department, job.location, job.employment_type]
          .filter(Boolean)
          .join(" / ")}
        action={
          <Select value={job.status} onValueChange={(v) => v && updateJobStatus(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">公開中</SelectItem>
              <SelectItem value="draft">下書き</SelectItem>
              <SelectItem value="closed">終了</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <PageContent>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 求人情報 */}
          <Card>
            <CardHeader>
              <CardTitle>求人情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">部署</span>
                <span>{job.department ?? "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">勤務地</span>
                <span>{job.location ?? "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">雇用形態</span>
                <span>{job.employment_type ?? "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">年収</span>
                <span>{job.salary_range ?? "-"}</span>
              </div>
              {job.description && (
                <div className="pt-3 border-t">
                  <p className="text-muted-foreground mb-1">説明</p>
                  <p className="whitespace-pre-wrap">{job.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 選考ステップ */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>選考ステップ</CardTitle>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger render={<Button variant="outline" size="sm" />}>
                  <Plus className="mr-1 h-4 w-4" />
                  追加
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>選考ステップを追加</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>種類</Label>
                      <Select value={newStepType} onValueChange={(v) => v && setNewStepType(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(stepTypeLabels).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>ラベル *</Label>
                      <Input
                        value={newStepLabel}
                        onChange={(e) => setNewStepLabel(e.target.value)}
                        placeholder="一次面接"
                      />
                    </div>
                    <Button onClick={addStep} className="w-full" disabled={!newStepLabel}>
                      追加する
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="space-y-2">
              {steps.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  選考ステップがありません
                </p>
              ) : (
                steps.map((step, index) => (
                  <div key={step.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <span className="text-sm font-bold text-muted-foreground w-6 text-center">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{step.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {stepTypeLabels[step.step_type] ?? step.step_type}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStep(step.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </>
  );
}
