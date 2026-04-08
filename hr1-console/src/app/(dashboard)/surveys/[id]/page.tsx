"use client";

import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { TableEmptyState } from "@hr1/shared-ui/components/ui/table-empty-state";
import { useSurveyDetailPage } from "@/lib/hooks/use-surveys";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import {
  surveyStatusLabels,
  surveyStatusColors,
  surveyTargetLabels,
  surveyQuestionTypeLabels,
} from "@/lib/constants";
import { EditPanel } from "@/components/ui/edit-panel";
import { Label } from "@hr1/shared-ui/components/ui/label";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Textarea } from "@hr1/shared-ui/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import { format } from "date-fns";
import { Pencil, Trash2, Plus, Play, Square, Loader2 } from "lucide-react";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { TabBar } from "@hr1/shared-ui/components/layout/tab-bar";
import { StickyFilterBar } from "@/components/layout/sticky-filter-bar";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { SurveyAnalyticsTab } from "./survey-analytics-tab";

export default function SurveyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const h = useSurveyDetailPage(id);

  if (h.surveyLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!h.survey) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p>サーベイが見つかりません</p>
        <Button variant="link" onClick={() => router.push("/surveys")} className="mt-2">
          一覧に戻る
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <QueryErrorBanner error={h.surveyError} onRetry={() => h.mutateSurvey()} />

      <PageHeader
        title={h.survey.title}
        description={h.survey.description ?? undefined}
        breadcrumb={[{ label: "パルスサーベイ", href: "/surveys" }]}
        sticky={false}
        action={
          <div className="flex gap-2">
            {h.survey.status === "draft" && (
              <Button
                onClick={async () => {
                  const result = await h.updateStatus("active");
                  if (result.success) {
                    showToast("配信を開始しました");
                  } else if (result.error) {
                    showToast(result.error, "error");
                  }
                }}
                disabled={h.questions.length === 0 || h.statusUpdating}
              >
                {h.statusUpdating ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-1" />
                )}
                配信開始
              </Button>
            )}
            {h.survey.status === "active" && (
              <Button
                variant="secondary"
                onClick={async () => {
                  const result = await h.updateStatus("closed");
                  if (result.success) {
                    showToast("サーベイを締め切りました");
                  } else if (result.error) {
                    showToast(result.error, "error");
                  }
                }}
                disabled={h.statusUpdating}
              >
                {h.statusUpdating ? (
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
              onClick={async () => {
                const result = await h.handleDeleteSurvey();
                if (result.success) {
                  router.push("/surveys");
                } else if (result.error) {
                  showToast(result.error, "error");
                }
              }}
              aria-label="サーベイを削除"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <div className="px-6 pb-4 flex gap-4 items-center text-sm text-muted-foreground">
        <Badge variant={surveyStatusColors[h.survey.status] ?? "outline"}>
          {surveyStatusLabels[h.survey.status] ?? h.survey.status}
        </Badge>
        <Badge variant="secondary">{surveyTargetLabels[h.survey.target] ?? h.survey.target}</Badge>
        {h.survey.deadline && (
          <span>締切: {format(new Date(h.survey.deadline), "yyyy/MM/dd")}</span>
        )}
        <span>回答済み: {h.completedCount}件</span>
      </div>

      <StickyFilterBar>
        <TabBar
          tabs={[
            { value: "questions", label: "質問" },
            { value: "responses", label: "回答" },
            { value: "analytics", label: "分析" },
          ]}
          activeTab={h.tab}
          onTabChange={(v) => h.setTab(v as "questions" | "responses" | "analytics")}
        />
      </StickyFilterBar>

      {h.tab === "questions" && (
        <TableSection>
          {h.survey.status === "draft" && (
            <div className="px-6 py-3 border-b">
              <Button size="sm" variant="outline" onClick={h.openCreateQuestion}>
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
                {h.survey.status === "draft" && <TableHead className="w-20" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableEmptyState
                colSpan={h.survey.status === "draft" ? 5 : 4}
                isLoading={h.questionsLoading}
                isEmpty={h.questions.length === 0}
                emptyMessage="質問がありません"
              >
                {h.questions.map((q, i) => (
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
                    {h.survey!.status === "draft" && (
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => h.openEditQuestion(q)}
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
        </TableSection>
      )}

      {h.tab === "responses" && (
        <TableSection className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>回答者</TableHead>
                <TableHead>ステータス</TableHead>
                {h.questions.map((q, i) => (
                  <TableHead key={q.id} className="max-w-[200px]">
                    Q{i + 1}
                  </TableHead>
                ))}
                <TableHead>回答日時</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableEmptyState
                colSpan={3 + h.questions.length}
                isLoading={h.responsesLoading}
                isEmpty={h.responses.length === 0}
                emptyMessage="回答がありません"
              >
                {h.responses.map((r) => {
                  return (
                    <TableRow key={r.id}>
                      <TableCell>{r.user_id}</TableCell>
                      <TableCell>
                        <Badge variant={r.completed_at ? "default" : "outline"}>
                          {r.completed_at ? "回答済み" : "未回答"}
                        </Badge>
                      </TableCell>
                      {h.questions.map((q) => {
                        const answer = r.pulse_survey_answers?.find((a) => a.question_id === q.id);
                        return (
                          <TableCell key={q.id} className="max-w-[200px] truncate text-sm">
                            {answer?.value ?? "\u2014"}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-muted-foreground text-sm">
                        {r.completed_at
                          ? format(new Date(r.completed_at), "yyyy/MM/dd HH:mm")
                          : "\u2014"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableEmptyState>
            </TableBody>
          </Table>
        </TableSection>
      )}

      {h.tab === "analytics" && (
        <SurveyAnalyticsTab
          questions={h.questions}
          responses={h.responses}
          totalTargetUsers={h.totalTargetUsers}
          surveyTitle={h.survey.title}
        />
      )}

      <EditPanel
        open={h.qEditOpen}
        onOpenChange={h.setQEditOpen}
        title={h.editQuestion ? "質問を編集" : "質問を追加"}
        onSave={async () => {
          const result = await h.handleSaveQuestion();
          if (result.success) {
            showToast(h.editQuestion ? "質問を更新しました" : "質問を追加しました");
          } else if (result.error) {
            showToast(result.error, "error");
          }
        }}
        saving={h.qSaving}
        saveDisabled={!h.qLabel.trim()}
        onDelete={
          h.editQuestion
            ? async () => {
                const result = await h.handleDeleteQuestion();
                if (result.success) {
                  showToast("質問を削除しました");
                } else if (result.error) {
                  showToast(result.error, "error");
                }
              }
            : undefined
        }
        deleting={h.qDeleting}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>質問文</Label>
            <Input
              value={h.qLabel}
              onChange={(e) => h.setQLabel(e.target.value)}
              placeholder="質問を入力"
            />
          </div>
          <div className="space-y-2">
            <Label>補足説明</Label>
            <Input
              value={h.qDescription}
              onChange={(e) => h.setQDescription(e.target.value)}
              placeholder="補足説明（任意）"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>タイプ</Label>
              <Select value={h.qType} onValueChange={(v) => v && h.setQType(v)}>
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
                value={h.qRequired ? "true" : "false"}
                onValueChange={(v) => h.setQRequired(v === "true")}
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
          {(h.qType === "single_choice" || h.qType === "multiple_choice") && (
            <div className="space-y-2">
              <Label>選択肢（1行に1つ）</Label>
              <Textarea
                value={h.qOptions}
                onChange={(e) => h.setQOptions(e.target.value)}
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
