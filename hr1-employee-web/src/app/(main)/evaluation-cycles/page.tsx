"use client";

import { useRouter } from "next/navigation";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { SearchBar } from "@hr1/shared-ui/components/ui/search-bar";
import { TabBar } from "@hr1/shared-ui/components/layout/tab-bar";
import { StickyFilterBar } from "@hr1/shared-ui/components/layout/sticky-filter-bar";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { EditPanel } from "@hr1/shared-ui/components/ui/edit-panel";
import { FormInput, FormTextarea, FormField } from "@hr1/shared-ui/components/ui/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import { Star, CheckCircle2, Archive } from "lucide-react";
import { format } from "date-fns";
import { CYCLE_STATUS_LABELS } from "@/lib/evaluation-utils";
import { useEvaluationsPage } from "@/lib/hooks/use-evaluations-page";

const pageTabs = [
  { value: "active", label: "実施中", icon: Star },
  { value: "closed", label: "終了", icon: Archive },
  { value: "finalized", label: "確定", icon: CheckCircle2 },
];

export default function EvaluationsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const h = useEvaluationsPage();

  return (
    <div className="flex flex-col">
      <QueryErrorBanner error={h.cyclesError} onRetry={() => h.mutateCycles()} />
      <PageHeader
        title="評価サイクル"
        description="評価テンプレートと期間を組み合わせて実施する評価の単位"
        sticky={false}
        border={false}
        action={
          <Button variant="primary" onClick={h.openAddDialog}>
            評価サイクルを追加
          </Button>
        }
      />

      <StickyFilterBar>
        <TabBar tabs={pageTabs} activeTab={h.activeTab} onTabChange={h.setActiveTab} />
        <SearchBar value={h.search} onChange={h.setSearch} placeholder="タイトル・説明で検索" />
      </StickyFilterBar>

      <TableSection>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>タイトル</TableHead>
              <TableHead>説明</TableHead>
              <TableHead>期間</TableHead>
              <TableHead>ステータス</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {h.isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  読み込み中...
                </TableCell>
              </TableRow>
            ) : h.filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  {h.cycles.length === 0
                    ? "評価サイクルがまだありません。右上の「評価サイクルを追加」から作成してください"
                    : "該当する評価サイクルがありません"}
                </TableCell>
              </TableRow>
            ) : (
              h.filtered.map((cycle) => (
                <TableRow
                  key={cycle.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/evaluation-cycles/${cycle.id}`)}
                >
                  <TableCell className="font-medium">{cycle.title}</TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-md truncate">
                    {cycle.description ?? "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                    {format(new Date(cycle.start_date), "yyyy/MM/dd")} 〜{" "}
                    {format(new Date(cycle.end_date), "yyyy/MM/dd")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={cycle.status === "active" ? "default" : "secondary"}>
                      {CYCLE_STATUS_LABELS[cycle.status] ?? cycle.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableSection>

      <EditPanel
        open={h.dialogOpen}
        onOpenChange={h.setDialogOpen}
        title="評価サイクルを追加"
        onSave={async () => {
          const result = await h.handleSave();
          if (result.success) {
            showToast("評価サイクルを追加しました");
          } else if (result.error) {
            showToast(result.error, "error");
          }
        }}
        saving={h.saving}
        saveDisabled={!h.form.title.trim() || !h.form.template_id}
        saveLabel="追加"
      >
        <div className="space-y-4">
          <FormInput
            label="タイトル"
            required
            value={h.form.title}
            onChange={(e) => h.setFormField("title", e.target.value)}
            placeholder="例: 2026年上期評価"
            error={h.formErrors.title}
          />
          <FormTextarea
            label="説明"
            value={h.form.description}
            onChange={(e) => h.setFormField("description", e.target.value)}
            placeholder="このサイクルの目的や運用メモ"
            rows={3}
          />
          <FormField label="評価テンプレート" required error={h.formErrors.template_id}>
            {h.templates.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                評価テンプレートがありません。サイドバー「評価テンプレート」から先に作成してください。
              </p>
            ) : (
              <Select
                value={h.form.template_id}
                onValueChange={(v) => h.setFormField("template_id", v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="テンプレートを選択">
                    {(v: string) => h.templates.find((t) => t.id === v)?.title ?? v}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {h.templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="開始日"
              required
              type="date"
              value={h.form.start_date}
              onChange={(e) => h.setFormField("start_date", e.target.value)}
              error={h.formErrors.start_date}
            />
            <FormInput
              label="終了日"
              required
              type="date"
              value={h.form.end_date}
              onChange={(e) => h.setFormField("end_date", e.target.value)}
              error={h.formErrors.end_date}
            />
          </div>
          <FormField label="ステータス">
            <Select
              value={h.form.status}
              onValueChange={(v) => h.setFormField("status", v ?? "active")}
            >
              <SelectTrigger>
                <SelectValue>{(v: string) => CYCLE_STATUS_LABELS[v] ?? v}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">実施中</SelectItem>
                <SelectItem value="closed">終了</SelectItem>
                <SelectItem value="finalized">確定</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </div>
      </EditPanel>
    </div>
  );
}
