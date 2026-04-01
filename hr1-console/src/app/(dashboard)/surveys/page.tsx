"use client";

import { useRouter } from "next/navigation";
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
import { useSurveyCreatePanel } from "@/lib/hooks/use-surveys";
import { Badge } from "@/components/ui/badge";
import { surveyStatusLabels, surveyStatusColors, surveyTargetLabels } from "@/lib/constants";
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
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { TableSection } from "@/components/layout/table-section";
import { useToast } from "@/components/ui/toast";

export default function SurveysPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const {
    surveys,
    isLoading,
    surveysError,
    mutateSurveys,
    editOpen,
    setEditOpen,
    saving,
    title,
    setTitle,
    description,
    setDescription,
    target,
    setTarget,
    deadline,
    setDeadline,
    openCreate,
    handleSave,
    todayStr,
  } = useSurveyCreatePanel();

  return (
    <div className="flex flex-col">
      <PageHeader
        title="パルスサーベイ"
        description="応募者・社員向けサーベイの作成・管理"
        sticky={false}
        action={<Button onClick={openCreate}>サーベイを作成</Button>}
      />

      <QueryErrorBanner error={surveysError} onRetry={() => mutateSurveys()} />

      <TableSection>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>タイトル</TableHead>
              <TableHead>対象</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>質問数</TableHead>
              <TableHead>締切</TableHead>
              <TableHead>作成日</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={6}
              isLoading={isLoading}
              isEmpty={surveys.length === 0}
              emptyMessage="サーベイがありません"
            >
              {surveys.map((survey) => (
                <TableRow
                  key={survey.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/surveys/${survey.id}`)}
                >
                  <TableCell className="font-medium">{survey.title}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {surveyTargetLabels[survey.target] ?? survey.target}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={surveyStatusColors[survey.status] ?? "outline"}>
                      {surveyStatusLabels[survey.status] ?? survey.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{survey.pulse_survey_questions?.length ?? 0}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {survey.deadline ? format(new Date(survey.deadline), "yyyy/MM/dd") : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(survey.created_at), "yyyy/MM/dd")}
                  </TableCell>
                </TableRow>
              ))}
            </TableEmptyState>
          </TableBody>
        </Table>
      </TableSection>

      <EditPanel
        open={editOpen}
        onOpenChange={setEditOpen}
        title="サーベイを作成"
        onSave={async () => {
          const result = await handleSave();
          if (result.success) {
            showToast("サーベイを作成しました");
          } else if (result.error) {
            showToast(result.error, "error");
          }
        }}
        saving={saving}
        saveDisabled={!title.trim()}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>タイトル</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="サーベイのタイトル"
            />
          </div>
          <div className="space-y-2">
            <Label>説明</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="サーベイの説明（任意）"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>対象</Label>
              <Select value={target} onValueChange={(v) => v && setTarget(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(surveyTargetLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>締切日</Label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                min={todayStr}
              />
            </div>
          </div>
        </div>
      </EditPanel>
    </div>
  );
}
