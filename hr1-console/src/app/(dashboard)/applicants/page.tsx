"use client";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EditPanel, type EditPanelTab } from "@/components/ui/edit-panel";
import { useApplicantsPage } from "@/lib/hooks/use-applicants-page";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { SearchBar } from "@/components/ui/search-bar";
import { SlidersHorizontal, X, Download, Upload } from "lucide-react";
import { exportToCSV, csvFilenameWithDate } from "@/lib/export-csv";
import { useRouter } from "next/navigation";
import { ApplicantImportDialog } from "./applicant-import-dialog";

const addTabs: EditPanelTab[] = [
  { value: "basic", label: "基本情報" },
  { value: "hiring", label: "採用区分" },
];

export default function ApplicantsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const h = useApplicantsPage();

  return (
    <div className="flex flex-col">
      <QueryErrorBanner error={h.applicantsError} onRetry={() => h.mutate()} />
      <PageHeader
        title="応募者一覧"
        description="応募者の管理・招待"
        sticky={false}
        border={false}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (h.applicants.length === 0) return;
                exportToCSV(
                  h.handleExport(),
                  [
                    { key: "_name", label: "氏名" },
                    { key: "email", label: "メール" },
                    { key: "_hiringType", label: "採用区分" },
                    { key: "_createdAt", label: "登録日" },
                  ],
                  csvFilenameWithDate("応募者一覧")
                );
              }}
            >
              <Download className="mr-1.5 h-4 w-4" />
              CSV出力
            </Button>
            <Button variant="outline" size="sm" onClick={() => h.setImportOpen(true)}>
              <Upload className="mr-1.5 h-4 w-4" />
              インポート
            </Button>
            <Button onClick={h.openAddDialog}>応募者を追加</Button>
          </div>
        }
      />

      <div className="sticky top-14 z-10">
        <SearchBar value={h.search} onChange={h.setSearch} />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 w-full h-12 bg-white border-b px-4 sm:px-6 md:px-8 cursor-pointer">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground shrink-0">フィルター</span>
            {h.filterHiringType !== "all" && (
              <div className="flex items-center gap-1.5 overflow-x-auto">
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
              </div>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-auto py-2">
            <DropdownMenuItem className="py-2" onClick={() => h.setFilterHiringType("all")}>
              <span className={cn(h.filterHiringType === "all" && "font-medium")}>すべて</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="py-2" onClick={() => h.setFilterHiringType("new_grad")}>
              <span className={cn(h.filterHiringType === "new_grad" && "font-medium")}>新卒</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="py-2" onClick={() => h.setFilterHiringType("mid_career")}>
              <span className={cn(h.filterHiringType === "mid_career" && "font-medium")}>中途</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="py-2" onClick={() => h.setFilterHiringType("none")}>
              <span className={cn(h.filterHiringType === "none" && "font-medium")}>未設定</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名前</TableHead>
              <TableHead>メールアドレス</TableHead>
              <TableHead>採用区分</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={3}
              isLoading={h.isLoading}
              isEmpty={h.filtered.length === 0}
              emptyMessage="応募者がいません"
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
                </TableRow>
              ))}
            </TableEmptyState>
          </TableBody>
        </Table>
      </div>

      <EditPanel
        open={h.dialogOpen}
        onOpenChange={h.setDialogOpen}
        title="応募者を追加"
        tabs={addTabs}
        activeTab={h.addTab}
        onTabChange={h.setAddTab}
        onSave={async () => {
          const result = await h.handleAdd();
          if (result.success) {
            showToast("応募者を追加しました");
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
            <div className="space-y-2">
              <Label>メールアドレス *</Label>
              <Input
                type="email"
                value={h.newEmail}
                onChange={(e) => h.setNewEmail(e.target.value)}
                placeholder="example@email.com"
                className={h.formErrors.email ? "border-red-500" : ""}
              />
              {h.formErrors.email && <p className="text-sm text-red-500">{h.formErrors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label>名前</Label>
              <Input
                value={h.newName}
                onChange={(e) => h.setNewName(e.target.value)}
                placeholder="山田 花子"
                className={h.formErrors.name ? "border-red-500" : ""}
              />
              {h.formErrors.name && <p className="text-sm text-red-500">{h.formErrors.name}</p>}
            </div>
          </div>
        )}
        {h.addTab === "hiring" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>採用区分</Label>
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
            </div>
            {h.newHiringType === "new_grad" && (
              <div className="space-y-2">
                <Label>卒業年</Label>
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
              </div>
            )}
          </div>
        )}
      </EditPanel>

      {h.organization && (
        <ApplicantImportDialog
          open={h.importOpen}
          onOpenChange={h.setImportOpen}
          organizationId={h.organization.id}
          onComplete={() => h.mutate()}
        />
      )}
    </div>
  );
}
