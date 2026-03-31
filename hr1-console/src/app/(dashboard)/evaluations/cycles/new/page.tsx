"use client";

import { PageHeader, PageContent } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { useNewEvaluationCycle } from "@/lib/hooks/use-evaluations";

export default function NewEvaluationCyclePage() {
  const {
    templates,
    templatesError,
    mutateTemplates,
    title,
    setTitle,
    description,
    setDescription,
    templateId,
    setTemplateId,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    saving,
    handleSubmit,
    cancel,
  } = useNewEvaluationCycle();

  return (
    <>
      <PageHeader
        title="評価サイクルを作成"
        breadcrumb={[
          { label: "評価管理", href: "/evaluations" },
          { label: "評価サイクル", href: "/evaluations?tab=cycles" },
        ]}
      />

      <QueryErrorBanner error={templatesError} onRetry={() => mutateTemplates()} />

      <PageContent>
        <div className="space-y-6 max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>サイクル名 *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="2026年度 上期評価"
                />
              </div>
              <div className="space-y-2">
                <Label>評価シート *</Label>
                {templates && templates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    多面評価シートがありません。先に評価シートを作成してください。
                  </p>
                ) : (
                  <Select value={templateId} onValueChange={(v) => v && setTemplateId(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="評価シートを選択">
                        {(v: string) => templates?.find((t) => t.id === v)?.title ?? v}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(templates ?? []).map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>開始日 *</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>終了日 *</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>説明</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="サイクルの説明"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={cancel}>
              キャンセル
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!title || !templateId || !startDate || !endDate || saving}
            >
              {saving ? "作成中..." : "サイクルを作成"}
            </Button>
          </div>
        </div>
      </PageContent>
    </>
  );
}
