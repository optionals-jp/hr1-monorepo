"use client";

import React from "react";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
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
import { EditPanel } from "@/components/ui/edit-panel";
import { Avatar, AvatarFallback, AvatarImage } from "@hr1/shared-ui/components/ui/avatar";
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
} from "@hr1/shared-ui/components/ui/dropdown-menu";
import { SearchBar } from "@hr1/shared-ui/components/ui/search-bar";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { StickyFilterBar } from "@/components/layout/sticky-filter-bar";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@hr1/shared-ui/components/ui/dialog";
import { useLeavePage } from "@/lib/hooks/use-leave-page";
import { TabBar } from "@hr1/shared-ui/components/layout/tab-bar";
import { cn } from "@/lib/utils";
import {
  Plus,
  Calculator,
  Users,
  Download,
  SlidersHorizontal,
  X,
  CalendarDays,
  Gift,
} from "lucide-react";
import { exportToCSV } from "@/lib/export-csv";

type TabValue = "balances" | "grant";

const tabList: { value: TabValue; label: string; icon: React.ElementType }[] = [
  { value: "balances", label: "残日数一覧", icon: CalendarDays },
  { value: "grant", label: "有給付与", icon: Gift },
];

function formatDays(n: number): string {
  return `${n.toFixed(1)}日`;
}

function formatDateJa(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export default function LeavePage() {
  const { showToast } = useToast();
  const h = useLeavePage();

  const handleSaveEdit = async () => {
    const result = await h.handleSaveEdit();
    if (result.success && result.message) {
      showToast(result.message, "success");
    } else if (!result.success && result.error) {
      showToast(result.error, "error");
    }
  };

  const handleSaveManual = async () => {
    const result = await h.handleSaveManual();
    if (result.success && result.message) {
      showToast(result.message, "success");
    } else if (!result.success && result.error) {
      showToast(result.error, "error");
    }
  };

  const handleOpenAutoGrant = () => {
    const result = h.handleOpenAutoGrant();
    if (!result.success && result.error) {
      showToast(result.error, "error");
    }
  };

  const handleConfirmAutoGrant = async () => {
    const result = await h.handleConfirmAutoGrant();
    if (result.success && result.message) {
      showToast(result.message, "success");
    } else if (!result.success && result.error) {
      showToast(result.error, "error");
    }
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        title="有給管理"
        description="社員の有給休暇の残日数・付与を管理します"
        sticky={false}
        border={false}
      />

      <QueryErrorBanner error={h.balancesError} onRetry={() => h.mutateBalances()} />

      <StickyFilterBar>
        <TabBar
          tabs={tabList}
          activeTab={h.activeTab}
          onTabChange={(v) => h.setActiveTab(v as TabValue)}
        />
        {h.activeTab === "balances" && (
          <>
            <SearchBar value={h.search} onChange={h.setSearch} placeholder="社員名で検索" />
            <div className="flex items-center gap-2 h-12 bg-white px-4 sm:px-6 md:px-8">
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 cursor-pointer">
                  <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground shrink-0">フィルター</span>
                  {h.filterYear !== h.yearOptions[0] && (
                    <Badge variant="secondary" className="shrink-0 gap-1 text-sm py-3 px-3">
                      {h.filterYear}年度
                      <span
                        role="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          h.setFilterYear(h.yearOptions[0]);
                        }}
                        className="ml-0.5 hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </span>
                    </Badge>
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-auto py-2">
                  {h.yearOptions.map((y) => (
                    <DropdownMenuItem key={y} className="py-2" onClick={() => h.setFilterYear(y)}>
                      <span className={cn(h.filterYear === y && "font-medium")}>{y}年度</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="flex-1" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (h.filteredBalances.length === 0) return;
                  exportToCSV(
                    h.filteredBalances.map((b) => ({
                      ...b,
                      _name:
                        h.profileMap.get(b.user_id)?.display_name ??
                        h.profileMap.get(b.user_id)?.email ??
                        b.user_id,
                      _remaining: h.calcRemaining(b),
                    })),
                    [
                      { key: "_name", label: "社員名" },
                      { key: "fiscal_year", label: "年度" },
                      { key: "granted_days", label: "付与日数" },
                      { key: "used_days", label: "使用日数" },
                      { key: "carried_over_days", label: "繰越日数" },
                      { key: "_remaining", label: "残日数" },
                    ],
                    `有給一覧_${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}`
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

      {/* ========= 残日数一覧タブ ========= */}
      {h.activeTab === "balances" && (
        <TableSection>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>社員名</TableHead>
                <TableHead className="text-right">年度</TableHead>
                <TableHead className="text-right">付与日数</TableHead>
                <TableHead className="text-right">使用日数</TableHead>
                <TableHead className="text-right">繰越日数</TableHead>
                <TableHead className="text-right">残日数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableEmptyState
                colSpan={6}
                isLoading={!h.balances}
                isEmpty={h.filteredBalances.length === 0}
                emptyMessage="有給データがありません"
              >
                {h.filteredBalances.map((b) => {
                  const profile = h.profileMap.get(b.user_id);
                  const remaining = h.calcRemaining(b);
                  return (
                    <TableRow
                      key={b.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => h.openEditPanel(b)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar size="sm">
                            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                            <AvatarFallback>
                              {(profile?.display_name ?? "?").charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            {profile?.display_name ?? profile?.email ?? b.user_id}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{b.fiscal_year}</TableCell>
                      <TableCell className="text-right">{formatDays(b.granted_days)}</TableCell>
                      <TableCell className="text-right">{formatDays(b.used_days)}</TableCell>
                      <TableCell className="text-right">
                        {formatDays(b.carried_over_days)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={remaining < 5 ? "destructive" : "default"}
                          className={cn(remaining >= 5 && "bg-green-100 text-green-800")}
                        >
                          {formatDays(remaining)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableEmptyState>
            </TableBody>
          </Table>
        </TableSection>
      )}

      {/* ========= 有給付与タブ ========= */}
      {h.activeTab === "grant" && (
        <div className="px-4 py-3 sm:px-6 md:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleOpenAutoGrant}>
              <Calculator className="h-4 w-4 mr-1.5" />
              労基法に基づく自動付与
            </Button>
            <Button variant="outline" onClick={h.openManualPanel}>
              <Plus className="h-4 w-4 mr-1.5" />
              個別付与
            </Button>
          </div>

          <div className="rounded-lg border p-6 text-sm text-muted-foreground space-y-3">
            <h3 className="font-medium text-foreground flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              労基法による有給付与日数
            </h3>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>勤続期間</TableHead>
                    <TableHead className="text-right">付与日数</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { label: "6ヶ月", days: 10 },
                    { label: "1年6ヶ月", days: 11 },
                    { label: "2年6ヶ月", days: 12 },
                    { label: "3年6ヶ月", days: 14 },
                    { label: "4年6ヶ月", days: 16 },
                    { label: "5年6ヶ月", days: 18 },
                    { label: "6年6ヶ月以上", days: 20 },
                  ].map((r) => (
                    <TableRow key={r.label}>
                      <TableCell>{r.label}</TableCell>
                      <TableCell className="text-right">{formatDays(r.days)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* ========= 残日数編集パネル ========= */}
      <EditPanel
        open={h.editPanelOpen}
        onOpenChange={h.setEditPanelOpen}
        title="有給残日数の編集"
        onSave={handleSaveEdit}
        saving={h.savingEdit}
      >
        {h.editTarget && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b">
              <Avatar>
                {h.profileMap.get(h.editTarget.user_id)?.avatar_url && (
                  <AvatarImage src={h.profileMap.get(h.editTarget.user_id)!.avatar_url!} />
                )}
                <AvatarFallback>
                  {(h.profileMap.get(h.editTarget.user_id)?.display_name ?? "?").charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {h.profileMap.get(h.editTarget.user_id)?.display_name ??
                    h.profileMap.get(h.editTarget.user_id)?.email ??
                    h.editTarget.user_id}
                </p>
                <p className="text-sm text-muted-foreground">{h.editTarget.fiscal_year}年度</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label>付与日数</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={h.editGrantedDays}
                  onChange={(e) => h.setEditGrantedDays(e.target.value)}
                />
              </div>
              <div>
                <Label>使用日数</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={h.editUsedDays}
                  onChange={(e) => h.setEditUsedDays(e.target.value)}
                />
              </div>
              <div>
                <Label>繰越日数</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={h.editCarriedOverDays}
                  onChange={(e) => h.setEditCarriedOverDays(e.target.value)}
                />
              </div>
              <div>
                <Label>失効日数</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={h.editExpiredDays}
                  onChange={(e) => h.setEditExpiredDays(e.target.value)}
                />
              </div>
              <div>
                <Label>付与日</Label>
                <Input
                  type="date"
                  value={h.editGrantDate}
                  onChange={(e) => h.setEditGrantDate(e.target.value)}
                />
              </div>
              <div>
                <Label>有効期限</Label>
                <Input
                  type="date"
                  value={h.editExpiryDate}
                  onChange={(e) => h.setEditExpiryDate(e.target.value)}
                />
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm text-muted-foreground">残日数（自動計算）</p>
                <p
                  className={cn(
                    "text-lg font-semibold",
                    h.editRemaining < 5 ? "text-red-600" : "text-green-600"
                  )}
                >
                  {formatDays(h.editRemaining)}
                </p>
              </div>
            </div>
          </div>
        )}
      </EditPanel>

      {/* ========= 手動付与パネル ========= */}
      <EditPanel
        open={h.manualPanelOpen}
        onOpenChange={h.setManualPanelOpen}
        title="有給の個別付与"
        onSave={handleSaveManual}
        saving={h.savingManual}
        saveLabel="付与"
      >
        <div className="space-y-4">
          <div>
            <Label>社員</Label>
            <Select value={h.manualUserId} onValueChange={(v) => v && h.setManualUserId(v)}>
              <SelectTrigger>
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
          <div>
            <Label>年度</Label>
            <Input
              type="number"
              value={h.manualFiscalYear}
              onChange={(e) => h.setManualFiscalYear(e.target.value)}
            />
          </div>
          <div>
            <Label>付与日数</Label>
            <Input
              type="number"
              step="0.5"
              value={h.manualGrantedDays}
              onChange={(e) => h.setManualGrantedDays(e.target.value)}
            />
          </div>
          <div>
            <Label>繰越日数</Label>
            <Input
              type="number"
              step="0.5"
              value={h.manualCarriedOverDays}
              onChange={(e) => h.setManualCarriedOverDays(e.target.value)}
            />
          </div>
          <div>
            <Label>付与日</Label>
            <Input
              type="date"
              value={h.manualGrantDate}
              onChange={(e) => {
                h.setManualGrantDate(e.target.value);
                if (e.target.value) {
                  const d = new Date(e.target.value);
                  d.setFullYear(d.getFullYear() + 2);
                  const y = d.getFullYear();
                  const m = String(d.getMonth() + 1).padStart(2, "0");
                  const day = String(d.getDate()).padStart(2, "0");
                  h.setManualExpiryDate(`${y}-${m}-${day}`);
                }
              }}
            />
          </div>
          <div>
            <Label>有効期限</Label>
            <Input
              type="date"
              value={h.manualExpiryDate}
              onChange={(e) => h.setManualExpiryDate(e.target.value)}
            />
          </div>
        </div>
      </EditPanel>

      {/* ========= 自動付与確認ダイアログ ========= */}
      <Dialog open={h.autoGrantDialogOpen} onOpenChange={h.setAutoGrantDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>労基法に基づく自動付与（{h.currentYear}年度）</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>社員名</TableHead>
                  <TableHead>入社日</TableHead>
                  <TableHead className="text-right">付与日数</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {h.autoGrantPreview.map((p) => (
                  <TableRow key={p.userId}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{formatDateJa(p.hireDate)}</TableCell>
                    <TableCell className="text-right">{formatDays(p.days)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-sm text-muted-foreground">
            {h.autoGrantPreview.length}
            名に有給を付与します。既存のデータがある場合は上書きされます。
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => h.setAutoGrantDialogOpen(false)}
              disabled={h.savingAutoGrant}
            >
              キャンセル
            </Button>
            <Button onClick={handleConfirmAutoGrant} disabled={h.savingAutoGrant}>
              {h.savingAutoGrant ? "付与中..." : "付与を実行"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
