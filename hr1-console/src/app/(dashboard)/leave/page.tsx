"use client";

import React, { useState, useMemo } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { SearchBar } from "@/components/ui/search-bar";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase/browser";
import { useQuery } from "@/lib/use-query";
import { cn } from "@/lib/utils";
import type { LeaveBalance } from "@/types/database";
import { CalendarOff, Plus, Calculator, Users, Download } from "lucide-react";
import { exportToCSV } from "@/lib/export-csv";

type TabValue = "balances" | "grant";

const tabList: { value: TabValue; label: string; icon: React.ElementType }[] = [
  { value: "balances", label: "残日数一覧", icon: CalendarOff },
  { value: "grant", label: "有給付与", icon: Plus },
];

type MemberRow = {
  user_id: string;
  profiles: {
    id: string;
    display_name: string | null;
    email: string;
    avatar_url: string | null;
    hire_date: string | null;
  };
};

const calculateGrantDays = (hireDate: string): number => {
  const hire = new Date(hireDate);
  const now = new Date();
  const years = (now.getTime() - hire.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (years < 0.5) return 0;
  if (years < 1.5) return 10;
  if (years < 2.5) return 11;
  if (years < 3.5) return 12;
  if (years < 4.5) return 14;
  if (years < 5.5) return 16;
  if (years < 6.5) return 18;
  return 20;
};

function formatDays(n: number): string {
  return `${n.toFixed(1)}日`;
}

function formatDateJa(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function formatDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function LeavePage() {
  const { showToast } = useToast();
  const { organization } = useOrg();
  const [activeTab, setActiveTab] = useState<TabValue>("balances");

  // --- 残日数タブ ---
  const currentYear = new Date().getFullYear();
  const [filterYear, setFilterYear] = useState(currentYear);
  const [search, setSearch] = useState("");
  const [editPanelOpen, setEditPanelOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<LeaveBalance | null>(null);
  const [editGrantedDays, setEditGrantedDays] = useState("");
  const [editUsedDays, setEditUsedDays] = useState("");
  const [editCarriedOverDays, setEditCarriedOverDays] = useState("");
  const [editExpiredDays, setEditExpiredDays] = useState("");
  const [editGrantDate, setEditGrantDate] = useState("");
  const [editExpiryDate, setEditExpiryDate] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // --- 付与タブ ---
  const [manualPanelOpen, setManualPanelOpen] = useState(false);
  const [manualUserId, setManualUserId] = useState("");
  const [manualFiscalYear, setManualFiscalYear] = useState(String(currentYear));
  const [manualGrantedDays, setManualGrantedDays] = useState("");
  const [manualCarriedOverDays, setManualCarriedOverDays] = useState("0");
  const [manualGrantDate, setManualGrantDate] = useState(formatDateInput(new Date()));
  const [manualExpiryDate, setManualExpiryDate] = useState(
    formatDateInput(new Date(new Date().setFullYear(new Date().getFullYear() + 2)))
  );
  const [savingManual, setSavingManual] = useState(false);

  // --- 自動付与 ---
  const [autoGrantDialogOpen, setAutoGrantDialogOpen] = useState(false);
  const [autoGrantPreview, setAutoGrantPreview] = useState<
    { userId: string; name: string; hireDate: string; days: number }[]
  >([]);
  const [savingAutoGrant, setSavingAutoGrant] = useState(false);

  // ---------- データ取得 ----------

  const {
    data: balances,
    error: balancesError,
    mutate: mutateBalances,
  } = useQuery<LeaveBalance[]>(
    organization ? `leave-balances-${organization.id}` : null,
    async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("leave_balances")
        .select("*")
        .eq("organization_id", organization!.id)
        .order("fiscal_year", { ascending: false });
      return (data ?? []) as LeaveBalance[];
    }
  );

  const { data: members } = useQuery<MemberRow[]>(
    organization ? `members-${organization.id}` : null,
    async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("user_organizations")
        .select(
          "user_id, profiles!user_organizations_user_id_fkey(id, display_name, email, avatar_url, hire_date)"
        )
        .eq("organization_id", organization!.id);
      return (data ?? []) as unknown as MemberRow[];
    }
  );

  // ---------- プロフィール検索ヘルパー ----------

  const profileMap = useMemo(() => {
    const map = new Map<string, MemberRow["profiles"]>();
    for (const m of members ?? []) {
      if (m.profiles) {
        map.set(m.user_id, m.profiles);
      }
    }
    return map;
  }, [members]);

  // ---------- 残日数フィルタ ----------

  const filteredBalances = useMemo(() => {
    let rows = balances ?? [];
    rows = rows.filter((b) => b.fiscal_year === filterYear);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((b) => {
        const profile = profileMap.get(b.user_id);
        const name = profile?.display_name ?? "";
        const email = profile?.email ?? "";
        return name.toLowerCase().includes(q) || email.toLowerCase().includes(q);
      });
    }
    return rows;
  }, [balances, filterYear, search, profileMap]);

  // ---------- 年度選択肢 ----------

  const yearOptions = useMemo(() => {
    const years = new Set<number>();
    for (const b of balances ?? []) {
      years.add(b.fiscal_year);
    }
    years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [balances, currentYear]);

  // ---------- 残日数計算 ----------

  const calcRemaining = (b: LeaveBalance): number => {
    return b.granted_days + b.carried_over_days - b.used_days - b.expired_days;
  };

  // ---------- 編集パネル ----------

  const openEditPanel = (b: LeaveBalance) => {
    setEditTarget(b);
    setEditGrantedDays(String(b.granted_days));
    setEditUsedDays(String(b.used_days));
    setEditCarriedOverDays(String(b.carried_over_days));
    setEditExpiredDays(String(b.expired_days));
    setEditGrantDate(b.grant_date);
    setEditExpiryDate(b.expiry_date);
    setEditPanelOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!organization || !editTarget) return;
    setSavingEdit(true);
    try {
      const { error } = await getSupabase()
        .from("leave_balances")
        .update({
          granted_days: parseFloat(editGrantedDays) || 0,
          used_days: parseFloat(editUsedDays) || 0,
          carried_over_days: parseFloat(editCarriedOverDays) || 0,
          expired_days: parseFloat(editExpiredDays) || 0,
          grant_date: editGrantDate,
          expiry_date: editExpiryDate,
        })
        .eq("id", editTarget.id);
      if (error) throw error;
      await mutateBalances();
      showToast("有給残日数を更新しました", "success");
      setEditPanelOpen(false);
    } catch {
      showToast("更新に失敗しました", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  const editRemaining =
    (parseFloat(editGrantedDays) || 0) +
    (parseFloat(editCarriedOverDays) || 0) -
    (parseFloat(editUsedDays) || 0) -
    (parseFloat(editExpiredDays) || 0);

  // ---------- 手動付与 ----------

  const openManualPanel = () => {
    setManualUserId("");
    setManualFiscalYear(String(currentYear));
    setManualGrantedDays("");
    setManualCarriedOverDays("0");
    setManualGrantDate(formatDateInput(new Date()));
    setManualExpiryDate(
      formatDateInput(new Date(new Date().setFullYear(new Date().getFullYear() + 2)))
    );
    setManualPanelOpen(true);
  };

  const handleSaveManual = async () => {
    if (!organization) return;
    if (!manualUserId) {
      showToast("社員を選択してください", "error");
      return;
    }
    if (!manualGrantedDays) {
      showToast("付与日数を入力してください", "error");
      return;
    }
    setSavingManual(true);
    try {
      const { error } = await getSupabase()
        .from("leave_balances")
        .upsert(
          {
            organization_id: organization.id,
            user_id: manualUserId,
            fiscal_year: parseInt(manualFiscalYear, 10),
            granted_days: parseFloat(manualGrantedDays) || 0,
            carried_over_days: parseFloat(manualCarriedOverDays) || 0,
            used_days: 0,
            expired_days: 0,
            grant_date: manualGrantDate,
            expiry_date: manualExpiryDate,
          },
          { onConflict: "user_id,organization_id,fiscal_year" }
        );
      if (error) throw error;
      await mutateBalances();
      showToast("有給を付与しました", "success");
      setManualPanelOpen(false);
    } catch {
      showToast("付与に失敗しました", "error");
    } finally {
      setSavingManual(false);
    }
  };

  // ---------- 自動付与 ----------

  const handleOpenAutoGrant = () => {
    if (!members || members.length === 0) {
      showToast("社員情報がありません", "error");
      return;
    }
    const preview = members
      .filter((m) => m.profiles?.hire_date)
      .map((m) => {
        const days = calculateGrantDays(m.profiles.hire_date!);
        return {
          userId: m.user_id,
          name: m.profiles.display_name ?? m.profiles.email,
          hireDate: m.profiles.hire_date!,
          days,
        };
      })
      .filter((p) => p.days > 0)
      .sort((a, b) => a.name.localeCompare(b.name, "ja"));
    if (preview.length === 0) {
      showToast("付与対象の社員がいません", "error");
      return;
    }
    setAutoGrantPreview(preview);
    setAutoGrantDialogOpen(true);
  };

  const handleConfirmAutoGrant = async () => {
    if (!organization) return;
    setSavingAutoGrant(true);
    try {
      const today = formatDateInput(new Date());
      const expiryDate = formatDateInput(
        new Date(new Date().setFullYear(new Date().getFullYear() + 2))
      );
      const rows = autoGrantPreview.map((p) => ({
        organization_id: organization.id,
        user_id: p.userId,
        fiscal_year: currentYear,
        granted_days: p.days,
        carried_over_days: 0,
        used_days: 0,
        expired_days: 0,
        grant_date: today,
        expiry_date: expiryDate,
      }));
      const { error } = await getSupabase()
        .from("leave_balances")
        .upsert(rows, { onConflict: "user_id,organization_id,fiscal_year" });
      if (error) throw error;
      await mutateBalances();
      showToast(`${autoGrantPreview.length}名に有給を付与しました`, "success");
      setAutoGrantDialogOpen(false);
    } catch {
      showToast("自動付与に失敗しました", "error");
    } finally {
      setSavingAutoGrant(false);
    }
  };

  // ---------- レンダリング ----------

  return (
    <div className="flex flex-col">
      <PageHeader
        title="有給管理"
        description="社員の有給休暇の残日数・付与を管理します"
        sticky={false}
        border={false}
        tabs={
          <div className="flex gap-1 border-b -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8">
            {tabList.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.value}
                  onClick={() => setActiveTab(t.value)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 pb-2.5 pt-1 text-sm font-medium border-b-2 transition-colors -mb-px",
                    activeTab === t.value
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        }
      />

      <QueryErrorBanner error={balancesError} onRetry={() => mutateBalances()} />

      {/* ========= 残日数一覧タブ ========= */}
      {activeTab === "balances" && (
        <>
          <SearchBar value={search} onChange={setSearch} placeholder="社員名で検索" />
          <div className="px-4 py-3 sm:px-6 md:px-8">
            <div className="flex items-center gap-3 mb-4">
              <Label className="text-sm text-muted-foreground">年度</Label>
              <Select
                value={String(filterYear)}
                onValueChange={(v) => v && setFilterYear(parseInt(v, 10))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}年度
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex-1" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (filteredBalances.length === 0) return;
                  exportToCSV(
                    filteredBalances.map((b) => ({
                      ...b,
                      _name:
                        profileMap.get(b.user_id)?.display_name ??
                        profileMap.get(b.user_id)?.email ??
                        b.user_id,
                      _remaining: calcRemaining(b),
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

            <div className="rounded-lg border">
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
                    isLoading={!balances}
                    isEmpty={filteredBalances.length === 0}
                    emptyMessage="有給データがありません"
                  >
                    {filteredBalances.map((b) => {
                      const profile = profileMap.get(b.user_id);
                      const remaining = calcRemaining(b);
                      return (
                        <TableRow
                          key={b.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => openEditPanel(b)}
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
            </div>
          </div>
        </>
      )}

      {/* ========= 有給付与タブ ========= */}
      {activeTab === "grant" && (
        <div className="px-4 py-3 sm:px-6 md:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleOpenAutoGrant}>
              <Calculator className="h-4 w-4 mr-1.5" />
              労基法に基づく自動付与
            </Button>
            <Button variant="outline" onClick={openManualPanel}>
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
        open={editPanelOpen}
        onOpenChange={setEditPanelOpen}
        title="有給残日数の編集"
        onSave={handleSaveEdit}
        saving={savingEdit}
      >
        {editTarget && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b">
              <Avatar>
                {profileMap.get(editTarget.user_id)?.avatar_url && (
                  <AvatarImage src={profileMap.get(editTarget.user_id)!.avatar_url!} />
                )}
                <AvatarFallback>
                  {(profileMap.get(editTarget.user_id)?.display_name ?? "?").charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {profileMap.get(editTarget.user_id)?.display_name ??
                    profileMap.get(editTarget.user_id)?.email ??
                    editTarget.user_id}
                </p>
                <p className="text-sm text-muted-foreground">{editTarget.fiscal_year}年度</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label>付与日数</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={editGrantedDays}
                  onChange={(e) => setEditGrantedDays(e.target.value)}
                />
              </div>
              <div>
                <Label>使用日数</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={editUsedDays}
                  onChange={(e) => setEditUsedDays(e.target.value)}
                />
              </div>
              <div>
                <Label>繰越日数</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={editCarriedOverDays}
                  onChange={(e) => setEditCarriedOverDays(e.target.value)}
                />
              </div>
              <div>
                <Label>失効日数</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={editExpiredDays}
                  onChange={(e) => setEditExpiredDays(e.target.value)}
                />
              </div>
              <div>
                <Label>付与日</Label>
                <Input
                  type="date"
                  value={editGrantDate}
                  onChange={(e) => setEditGrantDate(e.target.value)}
                />
              </div>
              <div>
                <Label>有効期限</Label>
                <Input
                  type="date"
                  value={editExpiryDate}
                  onChange={(e) => setEditExpiryDate(e.target.value)}
                />
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm text-muted-foreground">残日数（自動計算）</p>
                <p
                  className={cn(
                    "text-lg font-semibold",
                    editRemaining < 5 ? "text-red-600" : "text-green-600"
                  )}
                >
                  {formatDays(editRemaining)}
                </p>
              </div>
            </div>
          </div>
        )}
      </EditPanel>

      {/* ========= 手動付与パネル ========= */}
      <EditPanel
        open={manualPanelOpen}
        onOpenChange={setManualPanelOpen}
        title="有給の個別付与"
        onSave={handleSaveManual}
        saving={savingManual}
        saveLabel="付与"
      >
        <div className="space-y-4">
          <div>
            <Label>社員</Label>
            <Select value={manualUserId} onValueChange={(v) => v && setManualUserId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="社員を選択" />
              </SelectTrigger>
              <SelectContent>
                {(members ?? []).map((m) => (
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
              value={manualFiscalYear}
              onChange={(e) => setManualFiscalYear(e.target.value)}
            />
          </div>
          <div>
            <Label>付与日数</Label>
            <Input
              type="number"
              step="0.5"
              value={manualGrantedDays}
              onChange={(e) => setManualGrantedDays(e.target.value)}
            />
          </div>
          <div>
            <Label>繰越日数</Label>
            <Input
              type="number"
              step="0.5"
              value={manualCarriedOverDays}
              onChange={(e) => setManualCarriedOverDays(e.target.value)}
            />
          </div>
          <div>
            <Label>付与日</Label>
            <Input
              type="date"
              value={manualGrantDate}
              onChange={(e) => {
                setManualGrantDate(e.target.value);
                if (e.target.value) {
                  const d = new Date(e.target.value);
                  d.setFullYear(d.getFullYear() + 2);
                  setManualExpiryDate(formatDateInput(d));
                }
              }}
            />
          </div>
          <div>
            <Label>有効期限</Label>
            <Input
              type="date"
              value={manualExpiryDate}
              onChange={(e) => setManualExpiryDate(e.target.value)}
            />
          </div>
        </div>
      </EditPanel>

      {/* ========= 自動付与確認ダイアログ ========= */}
      <Dialog open={autoGrantDialogOpen} onOpenChange={setAutoGrantDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>労基法に基づく自動付与（{currentYear}年度）</DialogTitle>
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
                {autoGrantPreview.map((p) => (
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
            {autoGrantPreview.length}名に有給を付与します。既存のデータがある場合は上書きされます。
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAutoGrantDialogOpen(false)}
              disabled={savingAutoGrant}
            >
              キャンセル
            </Button>
            <Button onClick={handleConfirmAutoGrant} disabled={savingAutoGrant}>
              {savingAutoGrant ? "付与中..." : "付与を実行"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
