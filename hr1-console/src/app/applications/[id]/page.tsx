"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
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
import { supabase } from "@/lib/supabase";
import type { Application, ApplicationStep } from "@/types/database";
import {
  Check,
  Circle,
  SkipForward,
  ChevronRight,
  ArrowRight,
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

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [application, setApplication] = useState<Application | null>(null);
  const [steps, setSteps] = useState<ApplicationStep[]>([]);
  const [loading, setLoading] = useState(true);

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

  const advanceStep = async (step: ApplicationStep) => {
    if (step.status === "pending") {
      await supabase
        .from("application_steps")
        .update({ status: "in_progress" })
        .eq("id", step.id);
    } else if (step.status === "in_progress") {
      await supabase
        .from("application_steps")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", step.id);

      // Auto-start next step
      const nextStep = steps.find(
        (s) => s.step_order === step.step_order + 1 && s.status === "pending"
      );
      if (nextStep) {
        await supabase
          .from("application_steps")
          .update({ status: "in_progress" })
          .eq("id", nextStep.id);
      }
    }
    load();
  };

  const skipStep = async (step: ApplicationStep) => {
    await supabase
      .from("application_steps")
      .update({ status: "skipped" })
      .eq("id", step.id);
    load();
  };

  const updateApplicationStatus = async (status: string | null) => {
    if (!status) return;
    await supabase.from("applications").update({ status }).eq("id", id);
    setApplication((prev) =>
      prev ? { ...prev, status: status as Application["status"] } : prev
    );
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
          <Select
            value={application.status}
            onValueChange={updateApplicationStatus}
          >
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
              <span>
                {format(new Date(application.applied_at), "yyyy/MM/dd")}
              </span>
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
                    step.status === "in_progress"
                      ? "border-primary bg-primary/5"
                      : ""
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
                        <span className="text-xs font-bold">
                          {step.step_order}
                        </span>
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
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 shrink-0">
                    {(step.status === "pending" ||
                      step.status === "in_progress") && (
                      <>
                        <Button
                          size="sm"
                          variant={
                            step.status === "in_progress"
                              ? "default"
                              : "outline"
                          }
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
    </>
  );
}
