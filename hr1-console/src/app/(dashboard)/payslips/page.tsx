"use client";

import React from "react";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { TableEmptyState } from "@hr1/shared-ui/components/ui/table-empty-state";
import { EditPanel } from "@/components/ui/edit-panel";
import { Avatar, AvatarFallback } from "@hr1/shared-ui/components/ui/avatar";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@hr1/shared-ui/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@hr1/shared-ui/components/ui/dropdown-menu";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { SearchBar } from "@hr1/shared-ui/components/ui/search-bar";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { StickyFilterBar } from "@/components/layout/sticky-filter-bar";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import { usePayslipsPage } from "@/lib/hooks/use-payslips-page";
import { TabBar } from "@hr1/shared-ui/components/layout/tab-bar";
import { cn } from "@/lib/utils";
import { Plus, Trash2, FileDown, Download, SlidersHorizontal, X, List, Upload } from "lucide-react";
import { exportToCSV } from "@/lib/export-csv";

type TabValue = "list" | "upload";

const tabList: { value: TabValue; label: string; icon: React.ElementType }[] = [
  { value: "list", label: "明細一覧", icon: List },
  { value: "upload", label: "CSV取込", icon: Upload },
];

function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

export default function PayslipsPage() {
  const { showToast } = useToast();
  const h = usePayslipsPage();

  const handleSave = async () => {
    const result = await h.handleSave();
    if (result.success && result.message) {
      showToast(result.message, "success");
    } else if (!result.success && result.error) {
      showToast(result.error, "error");
    }
  };

  const handleDelete = async () => {
    const result = await h.handleDelete();
    if (result.success && result.message) {
      showToast(result.message, "success");
    } else if (!result.success && result.error) {
      showToast(result.error, "error");
    }
  };

  const handleCsvUpload = async () => {
    const result = await h.handleCsvUpload();
    if (result.success && result.message) {
      showToast(result.message, "success");
    } else if (!result.success && result.error) {
      showToast(result.error, "error");
    }
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        title="給与明細"
        description="社員の給与明細を管理します"
        sticky={false}
        border={false}
        action={
          <Button size="sm" onClick={h.openCreatePanel}>
            <Plus className="h-4 w-4 mr-1" />
            新規作成
          </Button>
        }
      />

      <QueryErrorBanner error={h.payslipsError} onRetry={() => h.mutate()} />

      <StickyFilterBar>
        <TabBar
          tabs={tabList}
          activeTab={h.activeTab}
          onTabChange={(v) => h.setActiveTab(v as TabValue)}
        />
        {h.activeTab === "list" && (
          <>
            <SearchBar value={h.search} onChange={h.setSearch} placeholder="社員名で検索" />
            <div className="flex items-center gap-2 h-12 bg-white px-4 sm:px-6 md:px-8">
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 cursor-pointer">
                  <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground shrink-0">フィルター</span>
                  {(h.filterYear !== "all" || h.filterMonth !== "all") && (
                    <div className="flex items-center gap-1.5 overflow-x-auto">
                      {h.filterYear !== "all" && (
                        <Badge variant="secondary" className="shrink-0 gap-1 text-sm py-3 px-3">
                          {h.filterYear}年
                          <span
                            role="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              h.setFilterYear("all");
                            }}
                            className="ml-0.5 hover:text-foreground"
                          >
                            <X className="h-3 w-3" />
                          </span>
                        </Badge>
                      )}
                      {h.filterMonth !== "all" && (
                        <Badge variant="secondary" className="shrink-0 gap-1 text-sm py-3 px-3">
                          {h.filterMonth}月
                          <span
                            role="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              h.setFilterMonth("all");
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
                  <DropdownMenuItem className="py-2 font-medium text-muted-foreground" disabled>
                    年
                  </DropdownMenuItem>
                  <DropdownMenuItem className="py-2" onClick={() => h.setFilterYear("all")}>
                    <span className={cn(h.filterYear === "all" && "font-medium")}>全年</span>
                  </DropdownMenuItem>
                  {h.yearOptions.map((y) => (
                    <DropdownMenuItem
                      key={y}
                      className="py-2"
                      onClick={() => h.setFilterYear(y.toString())}
                    >
                      <span className={cn(h.filterYear === y.toString() && "font-medium")}>
                        {y}年
                      </span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="py-2 font-medium text-muted-foreground" disabled>
                    月
                  </DropdownMenuItem>
                  <DropdownMenuItem className="py-2" onClick={() => h.setFilterMonth("all")}>
                    <span className={cn(h.filterMonth === "all" && "font-medium")}>全月</span>
                  </DropdownMenuItem>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <DropdownMenuItem
                      key={m}
                      className="py-2"
                      onClick={() => h.setFilterMonth(m.toString())}
                    >
                      <span className={cn(h.filterMonth === m.toString() && "font-medium")}>
                        {m}月
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="flex-1" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (h.filteredPayslips.length === 0) return;
                  exportToCSV(
                    h.filteredPayslips.map((p) => {
                      const profile = h.profileMap.get(p.user_id);
                      const totalDeductions = (p.deductions ?? []).reduce(
                        (sum, d) => sum + d.amount,
                        0
                      );
                      return {
                        ...p,
                        _name: profile?.display_name ?? profile?.email ?? "-",
                        _yearMonth: `${p.year}年${p.month}月`,
                        _totalDeductions: totalDeductions,
                      };
                    }),
                    [
                      { key: "_name", label: "社員名" },
                      { key: "_yearMonth", label: "年月" },
                      { key: "base_salary", label: "基本給" },
                      { key: "gross_pay", label: "総支給額" },
                      { key: "_totalDeductions", label: "控除合計" },
                      { key: "net_pay", label: "差引支給額" },
                    ],
                    `給与明細_${h.filterYear !== "all" ? h.filterYear : "全年"}${h.filterMonth !== "all" ? `_${h.filterMonth}月` : ""}`
                  );
                }}
              >
                <Download className="mr-1.5 h-4 w-4" />
                CSV出力
              </Button>
            </div>
          </>
        )}
      </StickyFilterBar>

      {/* ========= 明細一覧タブ ========= */}
      {h.activeTab === "list" && (
        <TableSection>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>社員名</TableHead>
                <TableHead>年月</TableHead>
                <TableHead className="text-right">基本給</TableHead>
                <TableHead className="text-right">総支給額</TableHead>
                <TableHead className="text-right">控除合計</TableHead>
                <TableHead className="text-right">差引支給額</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableEmptyState
                colSpan={6}
                isLoading={h.isLoading}
                isEmpty={h.filteredPayslips.length === 0}
                emptyMessage="給与明細がありません"
              >
                {h.filteredPayslips.map((p) => {
                  const profile = h.profileMap.get(p.user_id);
                  const displayName = profile?.display_name ?? profile?.email ?? "-";
                  const totalDeductions = (p.deductions ?? []).reduce(
                    (sum, d) => sum + d.amount,
                    0
                  );
                  return (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => h.openEditPanel(p)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-xs">
                              {(displayName ?? "?")[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{displayName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {p.year}年{p.month}月
                      </TableCell>
                      <TableCell className="text-sm text-right">
                        {formatCurrency(p.base_salary)}
                      </TableCell>
                      <TableCell className="text-sm text-right">
                        {formatCurrency(p.gross_pay)}
                      </TableCell>
                      <TableCell className="text-sm text-right">
                        {formatCurrency(totalDeductions)}
                      </TableCell>
                      <TableCell className="text-sm text-right font-medium">
                        {formatCurrency(p.net_pay)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableEmptyState>
            </TableBody>
          </Table>
        </TableSection>
      )}

      {/* ========= CSV取込タブ ========= */}
      {h.activeTab === "upload" && (
        <div className="px-4 py-4 sm:px-6 md:px-8 space-y-6">
          <div className="max-w-2xl space-y-4">
            <div>
              <Label>CSVファイル</Label>
              <Input type="file" accept=".csv" className="mt-1" onChange={h.handleCsvFileChange} />
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium">CSVフォーマット:</p>
              <code className="block bg-muted px-3 py-2 rounded text-xs">
                email,year,month,base_salary,gross_pay,net_pay
              </code>
              <p>手当・控除の詳細は取り込み後、明細編集画面から追加できます。</p>
            </div>
          </div>

          {h.csvErrors.length > 0 && (
            <div className="max-w-2xl bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-1">
              {h.csvErrors.map((err, i) => (
                <p key={i} className="text-sm text-destructive">
                  {err}
                </p>
              ))}
            </div>
          )}

          {h.csvPreview.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium">プレビュー（{h.csvPreview.length}件）</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>メール</TableHead>
                    <TableHead>年月</TableHead>
                    <TableHead className="text-right">基本給</TableHead>
                    <TableHead className="text-right">総支給額</TableHead>
                    <TableHead className="text-right">差引支給額</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {h.csvPreview.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{row.email}</TableCell>
                      <TableCell className="text-sm">
                        {row.year}年{row.month}月
                      </TableCell>
                      <TableCell className="text-sm text-right">
                        {formatCurrency(row.base_salary)}
                      </TableCell>
                      <TableCell className="text-sm text-right">
                        {formatCurrency(row.gross_pay)}
                      </TableCell>
                      <TableCell className="text-sm text-right">
                        {formatCurrency(row.net_pay)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button onClick={handleCsvUpload} disabled={h.uploading}>
                <FileDown className="h-4 w-4 mr-1" />
                {h.uploading ? "取り込み中..." : `${h.csvPreview.length}件を取り込む`}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ========= EditPanel ========= */}
      <EditPanel
        open={h.panelOpen}
        onOpenChange={h.setPanelOpen}
        title={h.isCreating ? "給与明細を作成" : "給与明細を編集"}
        onSave={handleSave}
        saving={h.saving}
        saveLabel="保存"
        onDelete={!h.isCreating && h.editingPayslip ? handleDelete : undefined}
        deleteLabel="削除"
      >
        <div className="space-y-4">
          <div>
            <Label>社員</Label>
            <Select
              value={h.formUserId}
              onValueChange={(v) => v && h.setFormUserId(v)}
              disabled={!h.isCreating}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="社員を選択" />
              </SelectTrigger>
              <SelectContent>
                {(h.members ?? []).map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.profiles?.display_name ?? m.profiles?.email ?? m.user_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>年</Label>
              <Select value={h.formYear} onValueChange={(v) => v && h.setFormYear(v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {h.yearOptions.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}年
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>月</Label>
              <Select value={h.formMonth} onValueChange={(v) => v && h.setFormMonth(v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <SelectItem key={m} value={m.toString()}>
                      {m}月
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>基本給</Label>
            <Input
              type="number"
              value={h.formBaseSalary}
              onChange={(e) => h.setFormBaseSalary(e.target.value)}
              className="mt-1"
              placeholder="0"
            />
          </div>

          {/* 手当 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>手当</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  h.setFormAllowances([...h.formAllowances, { label: "", amount: "" }])
                }
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                項目を追加
              </Button>
            </div>
            {h.formAllowances.map((item, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <Input
                  placeholder="項目名"
                  value={item.label}
                  onChange={(e) => {
                    const next = [...h.formAllowances];
                    next[i] = { ...next[i], label: e.target.value };
                    h.setFormAllowances(next);
                  }}
                  className="flex-1"
                />
                <Input
                  type="number"
                  placeholder="金額"
                  value={item.amount}
                  onChange={(e) => {
                    const next = [...h.formAllowances];
                    next[i] = { ...next[i], amount: e.target.value };
                    h.setFormAllowances(next);
                  }}
                  className="w-28"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => h.setFormAllowances(h.formAllowances.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>

          {/* 控除 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>控除</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  h.setFormDeductions([...h.formDeductions, { label: "", amount: "" }])
                }
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                項目を追加
              </Button>
            </div>
            {h.formDeductions.map((item, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <Input
                  placeholder="項目名"
                  value={item.label}
                  onChange={(e) => {
                    const next = [...h.formDeductions];
                    next[i] = { ...next[i], label: e.target.value };
                    h.setFormDeductions(next);
                  }}
                  className="flex-1"
                />
                <Input
                  type="number"
                  placeholder="金額"
                  value={item.amount}
                  onChange={(e) => {
                    const next = [...h.formDeductions];
                    next[i] = { ...next[i], amount: e.target.value };
                    h.setFormDeductions(next);
                  }}
                  className="w-28"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => h.setFormDeductions(h.formDeductions.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>総支給額</Label>
              <Input
                type="number"
                value={h.formGrossPay}
                onChange={(e) => h.setFormGrossPay(e.target.value)}
                className="mt-1"
                placeholder="0"
              />
            </div>
            <div>
              <Label>差引支給額</Label>
              <Input
                type="number"
                value={h.formNetPay}
                onChange={(e) => h.setFormNetPay(e.target.value)}
                className="mt-1"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <Label>備考</Label>
            <Input
              value={h.formNote}
              onChange={(e) => h.setFormNote(e.target.value)}
              className="mt-1"
              placeholder="備考（任意）"
            />
          </div>
        </div>
      </EditPanel>
    </div>
  );
}
