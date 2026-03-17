"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableEmptyState } from "@/components/ui/table-empty-state";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import type { PulseSurvey, PulseSurveyQuestion, PulseSurveyResponse } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import {
  surveyStatusLabels,
  surveyStatusColors,
  surveyTargetLabels,
  surveyQuestionTypeLabels,
} from "@/lib/constants";
import { EditPanel } from "@/components/ui/edit-panel";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Pencil, Trash2, Plus, Play, Square, Loader2 } from "lucide-react";
import { mutate } from "swr";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

type Tab = "questions" | "responses";

export default function SurveyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { organization } = useOrg();
  const router = useRouter();
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>("questions");

  const surveyCacheKey = organization ? `pulse-survey-${id}` : null;
  const questionsCacheKey = organization ? `pulse-survey-questions-${id}` : null;
  const responsesCacheKey = organization ? `pulse-survey-responses-${id}` : null;
  const listCacheKey = organization ? `pulse-surveys-${organization.id}` : null;

  const { data: survey, isLoading: surveyLoading } = useQuery<PulseSurvey>(
    surveyCacheKey,
    async () => {
      const { data } = await getSupabase()
        .from("pulse_surveys")
        .select("*")
        .eq("id", id)
        .eq("organization_id", organization!.id)
        .single();
      return data;
    }
  );

  const { data: questions = [], isLoading: questionsLoading } = useQuery<PulseSurveyQuestion[]>(
    questionsCacheKey,
    async () => {
      const { data } = await getSupabase()
        .from("pulse_survey_questions")
        .select("*")
        .eq("survey_id", id)
        .order("sort_order", { ascending: true });
      return data ?? [];
    }
  );

  const { data: responses = [], isLoading: responsesLoading } = useQuery<PulseSurveyResponse[]>(
    responsesCacheKey,
    async () => {
      const { data } = await getSupabase()
        .from("pulse_survey_responses")
        .select("*, pulse_survey_answers(*)")
        .eq("survey_id", id)
        .order("created_at", { ascending: false });
      return data ?? [];
    }
  );

  // 質問編集パネル
  const [qEditOpen, setQEditOpen] = useState(false);
  const [editQuestion, setEditQuestion] = useState<PulseSurveyQuestion | null>(null);
  const [qSaving, setQSaving] = useState(false);
  const [qDeleting, setQDeleting] = useState(false);

  // 質問フォーム
  const [qLabel, setQLabel] = useState("");
  const [qDescription, setQDescription] = useState("");
  const [qType, setQType] = useState<string>("rating");
  const [qRequired, setQRequired] = useState(true);
  const [qOptions, setQOptions] = useState("");

  // ステータス変更のローディング
  const [statusUpdating, setStatusUpdating] = useState(false);

  function openCreateQuestion() {
    setEditQuestion(null);
    setQLabel("");
    setQDescription("");
    setQType("rating");
    setQRequired(true);
    setQOptions("");
    setQEditOpen(true);
  }

  function openEditQuestion(q: PulseSurveyQuestion) {
    setEditQuestion(q);
    setQLabel(q.label);
    setQDescription(q.description ?? "");
    setQType(q.type);
    setQRequired(q.is_required);
    setQOptions(q.options ? (q.options as string[]).join("\n") : "");
    setQEditOpen(true);
  }

  async function handleSaveQuestion() {
    if (!qLabel.trim()) return;
    setQSaving(true);
    try {
      const options =
        qType === "single_choice" || qType === "multiple_choice"
          ? qOptions
              .split("\n")
              .map((o) => o.trim())
              .filter(Boolean)
          : null;

      if (
        (qType === "single_choice" || qType === "multiple_choice") &&
        (!options || options.length === 0)
      ) {
        showToast("選択肢を1つ以上入力してください", "error");
        return;
      }

      if (editQuestion) {
        const { error } = await getSupabase()
          .from("pulse_survey_questions")
          .update({
            label: qLabel.trim(),
            description: qDescription.trim() || null,
            type: qType,
            is_required: qRequired,
            options,
          })
          .eq("id", editQuestion.id);
        if (error) {
          showToast("質問の更新に失敗しました", "error");
          return;
        }
      } else {
        const maxOrder =
          questions.length > 0 ? Math.max(...questions.map((q) => q.sort_order)) + 1 : 0;
        const { error } = await getSupabase()
          .from("pulse_survey_questions")
          .insert({
            survey_id: id,
            label: qLabel.trim(),
            description: qDescription.trim() || null,
            type: qType,
            is_required: qRequired,
            options,
            sort_order: maxOrder,
          });
        if (error) {
          showToast("質問の追加に失敗しました", "error");
          return;
        }
      }
      await mutate(questionsCacheKey);
      setQEditOpen(false);
      showToast(editQuestion ? "質問を更新しました" : "質問を追加しました");
    } catch {
      showToast("質問の保存に失敗しました", "error");
    } finally {
      setQSaving(false);
    }
  }

  async function handleDeleteQuestion() {
    if (!editQuestion) return;
    if (!confirm("この質問を削除しますか？")) return;
    setQDeleting(true);
    try {
      const { error } = await getSupabase()
        .from("pulse_survey_questions")
        .delete()
        .eq("id", editQuestion.id);
      if (error) {
        showToast("質問の削除に失敗しました", "error");
        return;
      }
      await mutate(questionsCacheKey);
      setQEditOpen(false);
      showToast("質問を削除しました");
    } catch {
      showToast("質問の削除に失敗しました", "error");
    } finally {
      setQDeleting(false);
    }
  }

  // ステータス変更
  async function updateStatus(newStatus: "active" | "closed") {
    if (!survey || statusUpdating) return;
    setStatusUpdating(true);
    try {
      const { error } = await getSupabase()
        .from("pulse_surveys")
        .update({ status: newStatus })
        .eq("id", survey.id);
      if (error) {
        showToast("ステータスの変更に失敗しました", "error");
        return;
      }
      await mutate(surveyCacheKey);
      await mutate(listCacheKey);
      showToast(newStatus === "active" ? "配信を開始しました" : "サーベイを締め切りました");
    } catch {
      showToast("ステータスの変更に失敗しました", "error");
    } finally {
      setStatusUpdating(false);
    }
  }

  // サーベイ削除
  async function handleDeleteSurvey() {
    if (!survey) return;
    if (!confirm("このサーベイを削除しますか？回答データも削除されます。")) return;
    try {
      const { error } = await getSupabase().from("pulse_surveys").delete().eq("id", survey.id);
      if (error) {
        showToast("サーベイの削除に失敗しました", "error");
        return;
      }
      await mutate(listCacheKey);
      router.push("/surveys");
    } catch {
      showToast("サーベイの削除に失敗しました", "error");
    }
  }

  if (surveyLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p>サーベイが見つかりません</p>
        <Button variant="link" onClick={() => router.push("/surveys")} className="mt-2">
          一覧に戻る
        </Button>
      </div>
    );
  }

  const completedCount = responses.filter((r) => r.completed_at).length;

  return (
    <div className="flex flex-col">
      <PageHeader
        title={survey.title}
        description={survey.description ?? undefined}
        breadcrumb={[{ label: "パルスサーベイ", href: "/surveys" }]}
        sticky={false}
        action={
          <div className="flex gap-2">
            {survey.status === "draft" && (
              <Button
                onClick={() => updateStatus("active")}
                disabled={questions.length === 0 || statusUpdating}
              >
                {statusUpdating ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-1" />
                )}
                配信開始
              </Button>
            )}
            {survey.status === "active" && (
              <Button
                variant="secondary"
                onClick={() => updateStatus("closed")}
                disabled={statusUpdating}
              >
                {statusUpdating ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Square className="h-4 w-4 mr-1" />
                )}
                締め切る
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteSurvey}
              aria-label="サーベイを削除"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {/* メタ情報 */}
      <div className="px-6 pb-4 flex gap-4 items-center text-sm text-muted-foreground">
        <Badge variant={surveyStatusColors[survey.status] ?? "outline"}>
          {surveyStatusLabels[survey.status] ?? survey.status}
        </Badge>
        <Badge variant="secondary">{surveyTargetLabels[survey.target] ?? survey.target}</Badge>
        {survey.deadline && <span>締切: {format(new Date(survey.deadline), "yyyy/MM/dd")}</span>}
        <span>回答済み: {completedCount}件</span>
      </div>

      {/* タブ */}
      <div className="border-b px-6 flex gap-6" role="tablist">
        {(["questions", "responses"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "pb-2 text-sm font-medium border-b-2 transition-colors",
              tab === t
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "questions" ? `質問 (${questions.length})` : `回答 (${completedCount})`}
          </button>
        ))}
      </div>

      {/* 質問タブ */}
      {tab === "questions" && (
        <div className="bg-white">
          {survey.status === "draft" && (
            <div className="px-6 py-3 border-b">
              <Button size="sm" variant="outline" onClick={openCreateQuestion}>
                <Plus className="h-4 w-4 mr-1" />
                質問を追加
              </Button>
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>質問</TableHead>
                <TableHead>タイプ</TableHead>
                <TableHead>必須</TableHead>
                {survey.status === "draft" && <TableHead className="w-20" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableEmptyState
                colSpan={survey.status === "draft" ? 5 : 4}
                isLoading={questionsLoading}
                isEmpty={questions.length === 0}
                emptyMessage="質問がありません"
              >
                {questions.map((q, i) => (
                  <TableRow key={q.id}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium">{q.label}</div>
                      {q.description && (
                        <div className="text-sm text-muted-foreground">{q.description}</div>
                      )}
                      {q.options && (
                        <div className="text-xs text-muted-foreground mt-1">
                          選択肢: {(q.options as string[]).join(", ")}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{surveyQuestionTypeLabels[q.type] ?? q.type}</Badge>
                    </TableCell>
                    <TableCell>{q.is_required ? "必須" : "任意"}</TableCell>
                    {survey.status === "draft" && (
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => openEditQuestion(q)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                          aria-label="質問を編集"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableEmptyState>
            </TableBody>
          </Table>
        </div>
      )}

      {/* 回答タブ */}
      {tab === "responses" && (
        <div className="bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>回答者</TableHead>
                <TableHead>ステータス</TableHead>
                {questions.map((q, i) => (
                  <TableHead key={q.id} className="max-w-[200px]">
                    Q{i + 1}
                  </TableHead>
                ))}
                <TableHead>回答日時</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableEmptyState
                colSpan={3 + questions.length}
                isLoading={responsesLoading}
                isEmpty={responses.length === 0}
                emptyMessage="回答がありません"
              >
                {responses.map((r) => {
                  return (
                    <TableRow key={r.id}>
                      <TableCell>{r.user_id}</TableCell>
                      <TableCell>
                        <Badge variant={r.completed_at ? "default" : "outline"}>
                          {r.completed_at ? "回答済み" : "未回答"}
                        </Badge>
                      </TableCell>
                      {questions.map((q) => {
                        const answer = r.pulse_survey_answers?.find((a) => a.question_id === q.id);
                        return (
                          <TableCell key={q.id} className="max-w-[200px] truncate text-sm">
                            {answer?.value ?? "—"}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-muted-foreground text-sm">
                        {r.completed_at
                          ? format(new Date(r.completed_at), "yyyy/MM/dd HH:mm")
                          : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableEmptyState>
            </TableBody>
          </Table>
        </div>
      )}

      {/* 質問編集パネル */}
      <EditPanel
        open={qEditOpen}
        onOpenChange={setQEditOpen}
        title={editQuestion ? "質問を編集" : "質問を追加"}
        onSave={handleSaveQuestion}
        saving={qSaving}
        saveDisabled={!qLabel.trim()}
        onDelete={editQuestion ? handleDeleteQuestion : undefined}
        deleting={qDeleting}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>質問文</Label>
            <Input
              value={qLabel}
              onChange={(e) => setQLabel(e.target.value)}
              placeholder="質問を入力"
            />
          </div>
          <div className="space-y-2">
            <Label>補足説明</Label>
            <Input
              value={qDescription}
              onChange={(e) => setQDescription(e.target.value)}
              placeholder="補足説明（任意）"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>タイプ</Label>
              <Select value={qType} onValueChange={(v) => v && setQType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(surveyQuestionTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>必須</Label>
              <Select
                value={qRequired ? "true" : "false"}
                onValueChange={(v) => setQRequired(v === "true")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">必須</SelectItem>
                  <SelectItem value="false">任意</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {(qType === "single_choice" || qType === "multiple_choice") && (
            <div className="space-y-2">
              <Label>選択肢（1行に1つ）</Label>
              <Textarea
                value={qOptions}
                onChange={(e) => setQOptions(e.target.value)}
                placeholder={"選択肢1\n選択肢2\n選択肢3"}
                rows={5}
              />
            </div>
          )}
        </div>
      </EditPanel>
    </div>
  );
}
