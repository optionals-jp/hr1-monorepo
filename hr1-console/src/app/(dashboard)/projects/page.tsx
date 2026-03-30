"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableEmptyState } from "@/components/ui/table-empty-state";
import { EditPanel } from "@/components/ui/edit-panel";
import { cn } from "@/lib/utils";
import { useOrg } from "@/lib/org-context";
import { useProjects, createProject } from "@/lib/hooks/use-projects";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { SearchBar } from "@/components/ui/search-bar";
import { projectStatusLabels, projectStatusColors } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { SlidersHorizontal, X, Building2, FolderKanban, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const pageTabs = [
  { value: "list", label: "プロジェクト一覧" },
  { value: "guide", label: "部署との違い" },
];

const statusOptions = [
  { value: "all", label: "すべて" },
  { value: "active", label: "進行中" },
  { value: "completed", label: "完了" },
  { value: "archived", label: "アーカイブ" },
];

export default function ProjectsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { organization } = useOrg();
  const [activeTab, setActiveTab] = useState("list");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newStatus, setNewStatus] = useState<string>("active");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: projects = [], isLoading, error: projectsError, mutate } = useProjects();

  const openAddDialog = () => {
    setNewName("");
    setNewDescription("");
    setNewStatus("active");
    setNewStartDate("");
    setNewEndDate("");
    setDialogOpen(true);
  };

  const handleAdd = async () => {
    if (!organization || !newName.trim()) return;
    setSaving(true);

    const result = await createProject(organization.id, {
      name: newName,
      description: newDescription,
      status: newStatus,
      startDate: newStartDate,
      endDate: newEndDate,
    });
    if (result.success) {
      setDialogOpen(false);
      mutate();
      showToast("プロジェクトを作成しました");
    } else {
      showToast(result.error ?? "プロジェクトの作成に失敗しました", "error");
    }
    setSaving(false);
  };

  const filtered = projects.filter((p) => {
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!p.name.toLowerCase().includes(s) && !(p.description ?? "").toLowerCase().includes(s))
        return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col">
      <PageHeader
        title="プロジェクト"
        description="プロジェクトとチームの管理"
        sticky={false}
        border={false}
        action={
          activeTab === "list" ? (
            <Button onClick={openAddDialog}>プロジェクトを作成</Button>
          ) : undefined
        }
      />

      <div className="sticky top-14 z-10">
        <div className="flex items-center gap-6 border-b px-4 sm:px-6 md:px-8 bg-white">
          {pageTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "relative pb-2.5 pt-2 text-[15px] font-medium transition-colors",
                activeTab === tab.value
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {activeTab === tab.value && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
        {activeTab === "list" && (
          <>
            <SearchBar value={search} onChange={setSearch} />
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 w-full h-12 bg-white border-b px-4 sm:px-6 md:px-8 cursor-pointer">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground shrink-0">フィルター</span>
                {filterStatus !== "all" && (
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    <Badge variant="secondary" className="shrink-0 gap-1 text-sm py-3 px-3">
                      ステータス：{projectStatusLabels[filterStatus]}
                      <span
                        role="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFilterStatus("all");
                        }}
                        className="ml-0.5 hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </span>
                    </Badge>
                  </div>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-auto py-2">
                {statusOptions.map((opt, i) => (
                  <div key={opt.value}>
                    {i === 1 && <DropdownMenuSeparator />}
                    <DropdownMenuItem className="py-2" onClick={() => setFilterStatus(opt.value)}>
                      <span className={cn(filterStatus === opt.value && "font-medium")}>
                        {opt.label}
                      </span>
                    </DropdownMenuItem>
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      <QueryErrorBanner error={projectsError} onRetry={() => mutate()} />

      {activeTab === "list" && (
        <div className="bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>プロジェクト名</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>チーム数</TableHead>
                <TableHead>期間</TableHead>
                <TableHead>作成日</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableEmptyState
                colSpan={5}
                isLoading={isLoading}
                isEmpty={filtered.length === 0}
                emptyMessage="プロジェクトがありません"
              >
                {filtered.map((project) => (
                  <TableRow
                    key={project.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/projects/${project.id}`)}
                  >
                    <TableCell>
                      <div>
                        <span className="font-medium">{project.name}</span>
                        {project.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {project.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={projectStatusColors[project.status]}>
                        {projectStatusLabels[project.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>{project.team_count}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {project.start_date && project.end_date
                        ? `${format(new Date(project.start_date), "yyyy/MM/dd")} 〜 ${format(new Date(project.end_date), "yyyy/MM/dd")}`
                        : project.start_date
                          ? `${format(new Date(project.start_date), "yyyy/MM/dd")} 〜`
                          : "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(project.created_at), "yyyy/MM/dd")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableEmptyState>
            </TableBody>
          </Table>
        </div>
      )}

      {activeTab === "guide" && (
        <div className="px-4 py-6 sm:px-6 md:px-8">
          <div className="max-w-3xl space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-semibold">部署</h3>
                  </div>
                  <ul className="space-y-2.5 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">・</span>
                      <span>
                        組織の<strong className="text-foreground">恒常的な構造</strong>を表します
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">・</span>
                      <span>
                        社員は<strong className="text-foreground">所属</strong>
                        として部署に配属されます
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">・</span>
                      <span>
                        親子関係で<strong className="text-foreground">階層構造</strong>を持ちます
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">・</span>
                      <span>評価・承認フローの基盤になります</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">・</span>
                      <span>例：エンジニアリング部、営業部、人事部</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                      <FolderKanban className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-semibold">プロジェクト</h3>
                  </div>
                  <ul className="space-y-2.5 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-violet-600 mt-0.5">・</span>
                      <span>
                        特定の目標を達成するための
                        <strong className="text-foreground">一時的な活動</strong>です
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-violet-600 mt-0.5">・</span>
                      <span>
                        部署を<strong className="text-foreground">横断して</strong>
                        メンバーを集められます
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-violet-600 mt-0.5">・</span>
                      <span>
                        複数の<strong className="text-foreground">チーム</strong>を設定できます
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-violet-600 mt-0.5">・</span>
                      <span>開始日・終了日があり、完了後はアーカイブします</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-violet-600 mt-0.5">・</span>
                      <span>例：新製品開発、オフィス移転、DX推進</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent>
                <h3 className="text-base font-semibold mb-4">使い分けのポイント</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                    <ArrowRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <p>
                      <strong>部署</strong>は「誰がどの組織に属しているか」を管理します。社員の
                      <strong>評価・勤怠・承認フロー</strong>は部署をベースに運用します。
                    </p>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                    <ArrowRight className="h-4 w-4 text-violet-600 mt-0.5 shrink-0" />
                    <p>
                      <strong>プロジェクト</strong>
                      は「誰がどの仕事に取り組んでいるか」を管理します。部署を超えた
                      <strong>横断的な活動</strong>をチーム単位で編成できます。
                    </p>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                    <ArrowRight className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <p>
                      1人の社員が<strong>1つの部署に所属</strong>しながら、同時に
                      <strong>複数のプロジェクト</strong>に参加することが可能です。
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <EditPanel
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="プロジェクトを作成"
        onSave={handleAdd}
        saving={saving}
        saveDisabled={!newName.trim()}
        saveLabel="作成"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>プロジェクト名 *</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="新製品開発プロジェクト"
            />
          </div>
          <div className="space-y-2">
            <Label>説明</Label>
            <Input
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="プロジェクトの概要"
            />
          </div>
          <div className="space-y-2">
            <Label>ステータス</Label>
            <Select value={newStatus} onValueChange={(v) => v && setNewStatus(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">進行中</SelectItem>
                <SelectItem value="completed">完了</SelectItem>
                <SelectItem value="archived">アーカイブ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>開始日</Label>
              <Input
                type="date"
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>終了日</Label>
              <Input
                type="date"
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
                min={newStartDate || undefined}
              />
            </div>
          </div>
        </div>
      </EditPanel>
    </div>
  );
}
