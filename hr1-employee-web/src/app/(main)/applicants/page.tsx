"use client";

import { useRouter } from "next/navigation";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { FormField, FormInput } from "@hr1/shared-ui/components/ui/form-field";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import {
  SummaryCards,
  type SummaryCardConfig,
} from "@hr1/shared-ui/components/layout/summary-cards";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { TableEmptyState } from "@hr1/shared-ui/components/ui/table-empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import { EditPanel, type EditPanelTab } from "@hr1/shared-ui/components/ui/edit-panel";
import { useApplicantsPage } from "@/features/recruiting/hooks/use-applicants-page";
import { ApplicantImportDialog } from "@/features/recruiting/components/applicant-import-dialog";
import { Avatar, AvatarFallback } from "@hr1/shared-ui/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@hr1/shared-ui/components/ui/dropdown-menu";
import { cn } from "@hr1/shared-ui/lib/utils";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { SearchBar } from "@hr1/shared-ui/components/ui/search-bar";
import { StickyFilterBar } from "@hr1/shared-ui/components/layout/sticky-filter-bar";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import {
  SlidersHorizontal,
  X,
  Upload,
  Users,
  GraduationCap,
  Briefcase,
  ClipboardCheck,
  UserMinus,
} from "lucide-react";
import { format } from "date-fns";

const addTabs: EditPanelTab[] = [
  { value: "basic", label: "基本情報" },
  { value: "hiring", label: "採用区分" },
];

type ApplicantsSummaryKey = "total" | "newGrad" | "midCareer" | "applied" | "notApplied";

const summaryCards: readonly SummaryCardConfig<ApplicantsSummaryKey>[] = [
  { key: "total", label: "候補者数", icon: Users, iconClassName: "text-slate-600" },
  { key: "newGrad", label: "新卒", icon: GraduationCap, iconClassName: "text-blue-600" },
  { key: "midCareer", label: "中途", icon: Briefcase, iconClassName: "text-indigo-600" },
  { key: "applied", label: "応募済み", icon: ClipboardCheck, iconClassName: "text-emerald-600" },
  { key: "notApplied", label: "未応募", icon: UserMinus, iconClassName: "text-slate-500" },
];

export default function ApplicantsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const h = useApplicantsPage();

  return (
    <div className="flex flex-col">
      <QueryErrorBanner error={h.applicantsError} onRetry={() => h.mutate()} />
      <PageHeader
        title="候補者"
        description="マイページを登録した人の一覧（求人への応募有無にかかわらず表示）"
        sticky={false}
        border={false}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => h.setImportDialogOpen(true)}>
              <Upload className="mr-1.5 h-4 w-4" />
              インポート
            </Button>
            <Button variant="primary" onClick={h.openAddDialog}>
              候補者を追加
            </Button>
          </div>
        }
      />

      {/* サマリ（候補者数・新卒・中途・応募済み・未応募）。フィルタ絞り込みとは独立。 */}
      <div className="px-4 sm:px-6 md:px-8 pt-2 pb-4">
        <SummaryCards cards={summaryCards} values={h.summary} />
      </div>

      <StickyFilterBar>
        <SearchBar value={h.search} onChange={h.setSearch} />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 w-full h-12 bg-white px-4 sm:px-6 md:px-8 cursor-pointer">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground shrink-0">フィルター</span>
            {(h.filterHiringType !== "all" || h.filterCreatedFrom || h.filterCreatedTo) && (
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {h.filterHiringType !== "all" && (
                  <Badge variant="secondary" className="shrink-0 gap-1 text-sm py-3 px-3">
                    採用区分：
                    {h.filterHiringType === "new_grad"
                      ? "新卒"
                      : h.filterHiringType === "mid_career"
                        ? "中途"
                        : "未設定"}
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        h.setFilterHiringType("all");
                      }}
                      className="ml-0.5 hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </Badge>
                )}
                {(h.filterCreatedFrom || h.filterCreatedTo) && (
                  <Badge variant="secondary" className="shrink-0 gap-1 text-sm py-3 px-3">
                    登録日：
                    {h.filterCreatedFrom || "指定なし"} 〜 {h.filterCreatedTo || "指定なし"}
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        h.setFilterCreatedFrom("");
                        h.setFilterCreatedTo("");
                      }}
                      className="ml-0.5 hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </Badge>
                )}
              </div>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-auto py-2">
            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">採用区分</div>
            <DropdownMenuItem className="py-2" onClick={() => h.setFilterHiringType("all")}>
              <span className={cn(h.filterHiringType === "all" && "font-medium")}>すべて</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="py-2" onClick={() => h.setFilterHiringType("new_grad")}>
              <span className={cn(h.filterHiringType === "new_grad" && "font-medium")}>新卒</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="py-2" onClick={() => h.setFilterHiringType("mid_career")}>
              <span className={cn(h.filterHiringType === "mid_career" && "font-medium")}>中途</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="py-2" onClick={() => h.setFilterHiringType("none")}>
              <span className={cn(h.filterHiringType === "none" && "font-medium")}>未設定</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">登録日</div>
            <div
              className="px-2 py-1 space-y-2"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={h.filterCreatedFrom}
                  onChange={(e) => h.setFilterCreatedFrom(e.target.value)}
                  max={h.filterCreatedTo || undefined}
                  className="h-8 w-36"
                />
                <span className="text-xs text-muted-foreground">〜</span>
                <Input
                  type="date"
                  value={h.filterCreatedTo}
                  onChange={(e) => h.setFilterCreatedTo(e.target.value)}
                  min={h.filterCreatedFrom || undefined}
                  className="h-8 w-36"
                />
              </div>
              {(h.filterCreatedFrom || h.filterCreatedTo) && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    h.setFilterCreatedFrom("");
                    h.setFilterCreatedTo("");
                  }}
                >
                  クリア
                </button>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </StickyFilterBar>

      <TableSection>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名前</TableHead>
              <TableHead>メールアドレス</TableHead>
              <TableHead>採用区分</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>登録日</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={5}
              isLoading={h.isLoading}
              isEmpty={h.filtered.length === 0}
              emptyMessage="候補者がいません"
            >
              {h.filtered.map((applicant) => (
                <TableRow
                  key={applicant.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/applicants/${applicant.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-medium">
                          {(applicant.display_name ?? applicant.email)[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{applicant.display_name ?? "-"}</span>
                    </div>
                  </TableCell>
                  <TableCell>{applicant.email}</TableCell>
                  <TableCell>
                    {applicant.hiring_type === "new_grad" ? (
                      <Badge variant="secondary">新卒（{applicant.graduation_year}年卒）</Badge>
                    ) : applicant.hiring_type === "mid_career" ? (
                      <Badge variant="outline">中途採用</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {applicant.invited_at ? (
                      <Badge variant="secondary">招待済み</Badge>
                    ) : (
                      <Badge variant="outline">未招待</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(applicant.created_at), "yyyy/MM/dd")}
                  </TableCell>
                </TableRow>
              ))}
            </TableEmptyState>
          </TableBody>
        </Table>
      </TableSection>

      <EditPanel
        open={h.dialogOpen}
        onOpenChange={h.setDialogOpen}
        title="候補者を追加"
        tabs={addTabs}
        activeTab={h.addTab}
        onTabChange={h.setAddTab}
        onSave={async () => {
          const result = await h.handleAdd();
          if (result.success) {
            showToast("候補者を追加しました");
          } else if (result.error) {
            showToast(result.error, "error");
          }
        }}
        saving={h.saving}
        saveDisabled={!h.newEmail}
        saveLabel="追加"
      >
        {h.addTab === "basic" && (
          <div className="space-y-4">
            <FormInput
              label="メールアドレス"
              required
              type="email"
              value={h.newEmail}
              onChange={(e) => h.setNewEmail(e.target.value)}
              placeholder="example@email.com"
              error={h.formErrors.email}
            />
            <FormInput
              label="名前"
              value={h.newName}
              onChange={(e) => h.setNewName(e.target.value)}
              placeholder="山田 花子"
              error={h.formErrors.name}
            />
          </div>
        )}
        {h.addTab === "hiring" && (
          <div className="space-y-4">
            <FormField label="採用区分">
              <Select value={h.newHiringType} onValueChange={(v) => h.setNewHiringType(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="未設定">
                    {(v: string) =>
                      v === "new_grad" ? "新卒採用" : v === "mid_career" ? "中途採用" : v
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new_grad">新卒採用</SelectItem>
                  <SelectItem value="mid_career">中途採用</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            {h.newHiringType === "new_grad" && (
              <FormField label="卒業年">
                <Select value={h.newGradYear} onValueChange={(v) => h.setNewGradYear(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="選択してください">
                      {(v: string) => (v ? `${v}年卒` : v)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i).map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}年卒
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            )}
          </div>
        )}
      </EditPanel>

      {h.organization && (
        <ApplicantImportDialog
          open={h.importDialogOpen}
          onOpenChange={h.setImportDialogOpen}
          organizationId={h.organization.id}
          onComplete={() => h.mutate()}
        />
      )}
    </div>
  );
}
