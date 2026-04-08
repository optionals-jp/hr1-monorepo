"use client";

import { useState } from "react";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { TableEmptyState } from "@hr1/shared-ui/components/ui/table-empty-state";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import { SearchBar } from "@hr1/shared-ui/components/ui/search-bar";
import { StickyFilterBar } from "@/components/layout/sticky-filter-bar";
import { useJobsPage, useNewJobPage } from "@/lib/hooks/use-jobs-page";
import { TabBar } from "@hr1/shared-ui/components/layout/tab-bar";
import {
  jobStatusLabels as statusLabels,
  jobStatusColors as statusColors,
  stepTypeLabels,
  selectableStepTypes,
} from "@/lib/constants";
import { Trash2, GripVertical, Briefcase, XCircle, Archive } from "lucide-react";
import { useRouter } from "next/navigation";
import { EditPanel } from "@/components/ui/edit-panel";
import { FormInput, FormTextarea, FormField } from "@hr1/shared-ui/components/ui/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import { Input } from "@hr1/shared-ui/components/ui/input";

const pageTabs = [
  { value: "active", label: "公開中・ドラフト", icon: Briefcase },
  { value: "closed", label: "終了", icon: XCircle },
  { value: "archived", label: "アーカイブ", icon: Archive },
];

export default function JobsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const {
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
  } = useJobsPage();
  const newJob = useNewJobPage();

  const tabCounts = pageTabs;

  const onCreateSubmit = async () => {
    const result = await newJob.handleSubmit();
    if (result.success) {
      showToast("求人を作成しました");
      setDialogOpen(false);
      newJob.reset();
      mutateJobs();
    } else if (result.error && result.error !== "validation") {
      showToast(result.error, "error");
    }
  };

  return (
    <div className="flex flex-col">
      <QueryErrorBanner error={jobsError} onRetry={() => mutateJobs()} />
      <PageHeader
        title="求人管理"
        description="求人の作成・管理"
        sticky={false}
        border={false}
        action={
          <Button variant="primary" onClick={() => setDialogOpen(true)}>
            求人を作成
          </Button>
        }
      />

      <StickyFilterBar>
        <TabBar
          tabs={tabCounts}
          activeTab={activeTab}
          onTabChange={(v) => setActiveTab(v as typeof activeTab)}
        />
        <SearchBar value={search} onChange={setSearch} placeholder="タイトル・部署・勤務地で検索" />
      </StickyFilterBar>

      <TableSection>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>タイトル</TableHead>
              <TableHead>部署</TableHead>
              <TableHead>勤務地</TableHead>
              <TableHead>雇用形態</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead className="text-right">応募数</TableHead>
              <TableHead className="text-right">内定数</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={7}
              isLoading={isLoading}
              isEmpty={filtered.length === 0}
              emptyMessage={jobs.length === 0 ? "求人がありません" : "該当する求人がありません"}
            >
              {filtered.map((job) => {
                const counts = appCounts[job.id] ?? { total: 0, offered: 0 };
                return (
                  <TableRow
                    key={job.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/jobs/${job.id}`)}
                  >
                    <TableCell className="font-medium">{job.title}</TableCell>
                    <TableCell>{job.department ?? "-"}</TableCell>
                    <TableCell>{job.location ?? "-"}</TableCell>
                    <TableCell>{job.employment_type ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={statusColors[job.status]}>{statusLabels[job.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {counts.total > 0 ? (
                        <span className="font-medium">{counts.total}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {counts.offered > 0 ? (
                        <span className="font-medium text-green-600">{counts.offered}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableEmptyState>
          </TableBody>
        </Table>
      </TableSection>

      <EditPanel
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) newJob.reset();
        }}
        title="求人を作成"
        onSave={onCreateSubmit}
        saving={newJob.saving}
        saveDisabled={!newJob.title.trim()}
        saveLabel="求人を作成"
      >
        <div className="space-y-4">
          <FormInput
            label="タイトル"
            required
            value={newJob.title}
            onChange={(e) => newJob.setTitle(e.target.value)}
            placeholder="バックエンドエンジニア"
            error={newJob.formErrors.title}
          />

          <FormTextarea
            label="説明"
            value={newJob.description}
            onChange={(e) => newJob.setDescription(e.target.value)}
            placeholder="求人の説明を入力してください"
            rows={3}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="部署"
              value={newJob.department}
              onChange={(e) => newJob.setDepartment(e.target.value)}
              placeholder="エンジニアリング"
            />
            <FormInput
              label="勤務地"
              value={newJob.location}
              onChange={(e) => newJob.setLocation(e.target.value)}
              placeholder="東京"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="雇用形態"
              value={newJob.employmentType}
              onChange={(e) => newJob.setEmploymentType(e.target.value)}
              placeholder="正社員"
            />
            <FormInput
              label="年収レンジ"
              value={newJob.salaryRange}
              onChange={(e) => newJob.setSalaryRange(e.target.value)}
              placeholder="500万〜800万"
            />
          </div>

          <FormField label="ステータス">
            <Select value={newJob.status} onValueChange={(v) => v && newJob.setStatus(v)}>
              <SelectTrigger>
                <SelectValue>{(v: string) => statusLabels[v] ?? v}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">公開中</SelectItem>
                <SelectItem value="draft">下書き</SelectItem>
                <SelectItem value="closed">終了</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">選考ステップ</span>
              <Button variant="outline" size="xs" onClick={newJob.addStep}>
                追加
              </Button>
            </div>
            <div className="space-y-2">
              {newJob.steps.map((step, index) => (
                <div key={step.tempId} className="flex items-center gap-2 rounded-xl border p-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium text-muted-foreground w-6">{index + 1}</span>
                  <Select
                    value={step.step_type}
                    onValueChange={(v) => v && newJob.updateStep(step.tempId, "step_type", v)}
                  >
                    <SelectTrigger className="w-36">
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
                    onChange={(e) => newJob.updateStep(step.tempId, "label", e.target.value)}
                    placeholder="ステップ名"
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => newJob.removeStep(step.tempId)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {newJob.steps.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-3">
                  選考ステップを追加してください
                </p>
              )}
            </div>
          </div>
        </div>
      </EditPanel>
    </div>
  );
}
