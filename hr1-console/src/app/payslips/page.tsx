"use client";

import React, { useState, useMemo } from "react";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { SearchBar } from "@/components/ui/search-bar";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import { cn } from "@/lib/utils";
import type { Payslip } from "@/types/database";
import { Receipt, Upload, Plus, Trash2, FileDown, Download } from "lucide-react";
import { exportToCSV } from "@/lib/export-csv";

type TabValue = "list" | "upload";

const tabList: { value: TabValue; label: string; icon: React.ElementType }[] = [
  { value: "list", label: "明細一覧", icon: Receipt },
  { value: "upload", label: "CSV取込", icon: Upload },
];

interface MemberRow {
  user_id: string;
  profiles: {
    id: string;
    display_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

export default function PayslipsPage() {
  const { showToast } = useToast();
  const { organization } = useOrg();
  const [activeTab, setActiveTab] = useState<TabValue>("list");

  // --- 一覧タブ ---
  const today = new Date();
  const [filterYear, setFilterYear] = useState(today.getFullYear().toString());
  const [filterMonth, setFilterMonth] = useState("all");
  const [search, setSearch] = useState("");

  // --- EditPanel ---
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingPayslip, setEditingPayslip] = useState<Payslip | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  // --- フォーム ---
  const [formUserId, setFormUserId] = useState("");
  const [formYear, setFormYear] = useState(today.getFullYear().toString());
  const [formMonth, setFormMonth] = useState((today.getMonth() + 1).toString());
  const [formBaseSalary, setFormBaseSalary] = useState("");
  const [formAllowances, setFormAllowances] = useState<{ label: string; amount: string }[]>([]);
  const [formDeductions, setFormDeductions] = useState<{ label: string; amount: string }[]>([]);
  const [formGrossPay, setFormGrossPay] = useState("");
  const [formNetPay, setFormNetPay] = useState("");
  const [formNote, setFormNote] = useState("");

  // --- CSV取込タブ ---
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<
    {
      email: string;
      year: number;
      month: number;
      base_salary: number;
      gross_pay: number;
      net_pay: number;
    }[]
  >([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // ---------- データ取得 ----------

  const {
    data: payslips,
    error: payslipsError,
    mutate,
  } = useQuery<Payslip[]>(organization ? `payslips-${organization.id}` : null, async () => {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("payslips")
      .select("*")
      .eq("organization_id", organization!.id)
      .order("year", { ascending: false })
      .order("month", { ascending: false });
    return (data ?? []) as Payslip[];
  });

  const { data: members } = useQuery<MemberRow[]>(
    organization ? `members-${organization.id}` : null,
    async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("user_organizations")
        .select(
          "user_id, profiles!user_organizations_user_id_fkey(id, display_name, email, avatar_url)"
        )
        .eq("organization_id", organization!.id);
      return (data ?? []) as unknown as MemberRow[];
    }
  );

  // ---------- プロフィール参照 ----------

  const profileMap = useMemo(() => {
    const map = new Map<string, MemberRow["profiles"]>();
    for (const m of members ?? []) {
      if (m.profiles) map.set(m.user_id, m.profiles);
    }
    return map;
  }, [members]);

  // ---------- フィルタ ----------

  const filteredPayslips = useMemo(() => {
    let rows = payslips ?? [];
    if (filterYear !== "all") {
      rows = rows.filter((r) => r.year === parseInt(filterYear, 10));
    }
    if (filterMonth !== "all") {
      rows = rows.filter((r) => r.month === parseInt(filterMonth, 10));
    }
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => {
        const profile = profileMap.get(r.user_id);
        return (
          (profile?.display_name ?? "").toLowerCase().includes(q) ||
          (profile?.email ?? "").toLowerCase().includes(q)
        );
      });
    }
    return rows;
  }, [payslips, filterYear, filterMonth, search, profileMap]);

  // ---------- EditPanel ----------

  const openCreatePanel = () => {
    setIsCreating(true);
    setEditingPayslip(null);
    setFormUserId("");
    setFormYear(today.getFullYear().toString());
    setFormMonth((today.getMonth() + 1).toString());
    setFormBaseSalary("");
    setFormAllowances([]);
    setFormDeductions([]);
    setFormGrossPay("");
    setFormNetPay("");
    setFormNote("");
    setPanelOpen(true);
  };

  const openEditPanel = (payslip: Payslip) => {
    setIsCreating(false);
    setEditingPayslip(payslip);
    setFormUserId(payslip.user_id);
    setFormYear(payslip.year.toString());
    setFormMonth(payslip.month.toString());
    setFormBaseSalary(payslip.base_salary.toString());
    setFormAllowances(
      (payslip.allowances ?? []).map((a) => ({ label: a.label, amount: a.amount.toString() }))
    );
    setFormDeductions(
      (payslip.deductions ?? []).map((d) => ({ label: d.label, amount: d.amount.toString() }))
    );
    setFormGrossPay(payslip.gross_pay.toString());
    setFormNetPay(payslip.net_pay.toString());
    setFormNote(payslip.note ?? "");
    setPanelOpen(true);
  };

  const handleSave = async () => {
    if (!organization) return;
    if (!formUserId) {
      showToast("社員を選択してください", "error");
      return;
    }
    setSaving(true);
    try {
      const allowances = formAllowances
        .filter((a) => a.label.trim())
        .map((a) => ({ label: a.label.trim(), amount: parseInt(a.amount, 10) || 0 }));
      const deductions = formDeductions
        .filter((d) => d.label.trim())
        .map((d) => ({ label: d.label.trim(), amount: parseInt(d.amount, 10) || 0 }));

      const payload = {
        organization_id: organization.id,
        user_id: formUserId,
        year: parseInt(formYear, 10),
        month: parseInt(formMonth, 10),
        base_salary: parseInt(formBaseSalary, 10) || 0,
        allowances,
        deductions,
        gross_pay: parseInt(formGrossPay, 10) || 0,
        net_pay: parseInt(formNetPay, 10) || 0,
        note: formNote.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const supabase = getSupabase();
      if (isCreating) {
        const { error } = await supabase.from("payslips").insert(payload);
        if (error) throw error;
        showToast("給与明細を作成しました", "success");
      } else if (editingPayslip) {
        const { error } = await supabase
          .from("payslips")
          .update(payload)
          .eq("id", editingPayslip.id);
        if (error) throw error;
        showToast("給与明細を更新しました", "success");
      }
      await mutate();
      setPanelOpen(false);
    } catch {
      showToast("保存に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingPayslip) return;
    setSaving(true);
    try {
      const { error } = await getSupabase().from("payslips").delete().eq("id", editingPayslip.id);
      if (error) throw error;
      await mutate();
      showToast("給与明細を削除しました", "success");
      setPanelOpen(false);
    } catch {
      showToast("削除に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  };

  // ---------- CSV ----------

  const parseCSV = (text: string) => {
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = values[i] || "";
      });
      return row;
    });
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setCsvFile(file);
    setCsvPreview([]);
    setCsvErrors([]);

    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const rows = parseCSV(text);
        const errors: string[] = [];
        const preview: typeof csvPreview = [];

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (!row.email) {
            errors.push(`${i + 2}行目: メールアドレスが空です`);
            continue;
          }
          if (!row.year || !row.month) {
            errors.push(`${i + 2}行目: 年または月が空です`);
            continue;
          }
          preview.push({
            email: row.email,
            year: parseInt(row.year, 10),
            month: parseInt(row.month, 10),
            base_salary: parseInt(row.base_salary, 10) || 0,
            gross_pay: parseInt(row.gross_pay, 10) || 0,
            net_pay: parseInt(row.net_pay, 10) || 0,
          });
        }

        setCsvPreview(preview);
        setCsvErrors(errors);
      } catch {
        setCsvErrors(["CSVの解析に失敗しました"]);
      }
    };
    reader.readAsText(file);
  };

  const handleCsvUpload = async () => {
    if (!organization || csvPreview.length === 0) return;
    setUploading(true);
    try {
      const supabase = getSupabase();

      // メールアドレスからuser_idを検索
      const emails = [...new Set(csvPreview.map((r) => r.email))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("email", emails);

      const emailToId = new Map<string, string>();
      for (const p of profiles ?? []) {
        emailToId.set(p.email, p.id);
      }

      const errors: string[] = [];
      const records: {
        organization_id: string;
        user_id: string;
        year: number;
        month: number;
        base_salary: number;
        allowances: { label: string; amount: number }[];
        deductions: { label: string; amount: number }[];
        gross_pay: number;
        net_pay: number;
        note: null;
        updated_at: string;
      }[] = [];

      for (const row of csvPreview) {
        const userId = emailToId.get(row.email);
        if (!userId) {
          errors.push(`${row.email}: ユーザーが見つかりません`);
          continue;
        }
        records.push({
          organization_id: organization.id,
          user_id: userId,
          year: row.year,
          month: row.month,
          base_salary: row.base_salary,
          allowances: [],
          deductions: [],
          gross_pay: row.gross_pay,
          net_pay: row.net_pay,
          note: null,
          updated_at: new Date().toISOString(),
        });
      }

      if (errors.length > 0) {
        setCsvErrors(errors);
        if (records.length === 0) {
          setUploading(false);
          return;
        }
      }

      const { error } = await supabase
        .from("payslips")
        .upsert(records, { onConflict: "organization_id,user_id,year,month" });

      if (error) throw error;

      await mutate();
      showToast(`${records.length}件の給与明細を取り込みました`, "success");
      setCsvFile(null);
      setCsvPreview([]);
      setCsvErrors(errors);
    } catch {
      showToast("取り込みに失敗しました", "error");
    } finally {
      setUploading(false);
    }
  };

  // ---------- 年リスト ----------
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let y = currentYear - 3; y <= currentYear + 1; y++) {
      years.push(y);
    }
    return years;
  }, []);

  const isLoading = !payslips;

  return (
    <div className="flex flex-col">
      <PageHeader
        title="給与明細"
        description="社員の給与明細を管理します"
        sticky={false}
        border={false}
        action={
          <Button size="sm" onClick={openCreatePanel}>
            <Plus className="h-4 w-4 mr-1" />
            新規作成
          </Button>
        }
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

      <QueryErrorBanner error={payslipsError} onRetry={() => mutate()} />

      {/* ========= 明細一覧タブ ========= */}
      {activeTab === "list" && (
        <>
          <SearchBar value={search} onChange={setSearch} placeholder="社員名で検索" />
          <div className="px-4 py-3 sm:px-6 md:px-8">
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={filterYear} onValueChange={(v) => v && setFilterYear(v)}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全年</SelectItem>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}年
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterMonth} onValueChange={(v) => v && setFilterMonth(v)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全月</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <SelectItem key={m} value={m.toString()}>
                      {m}月
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex-1" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (filteredPayslips.length === 0) return;
                  exportToCSV(
                    filteredPayslips.map((p) => {
                      const profile = profileMap.get(p.user_id);
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
                    `給与明細_${filterYear !== "all" ? filterYear : "全年"}${filterMonth !== "all" ? `_${filterMonth}月` : ""}`
                  );
                }}
              >
                <Download className="mr-1.5 h-4 w-4" />
                CSV出力
              </Button>
            </div>
          </div>

          <div className="px-4 sm:px-6 md:px-8 pb-6">
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
                  isLoading={isLoading}
                  isEmpty={filteredPayslips.length === 0}
                  emptyMessage="給与明細がありません"
                >
                  {filteredPayslips.map((p) => {
                    const profile = profileMap.get(p.user_id);
                    const displayName = profile?.display_name ?? profile?.email ?? "-";
                    const totalDeductions = (p.deductions ?? []).reduce(
                      (sum, d) => sum + d.amount,
                      0
                    );
                    return (
                      <TableRow
                        key={p.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openEditPanel(p)}
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
          </div>
        </>
      )}

      {/* ========= CSV取込タブ ========= */}
      {activeTab === "upload" && (
        <div className="px-4 py-4 sm:px-6 md:px-8 space-y-6">
          <div className="max-w-2xl space-y-4">
            <div>
              <Label>CSVファイル</Label>
              <Input type="file" accept=".csv" className="mt-1" onChange={handleCsvFileChange} />
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium">CSVフォーマット:</p>
              <code className="block bg-muted px-3 py-2 rounded text-xs">
                email,year,month,base_salary,gross_pay,net_pay
              </code>
              <p>手当・控除の詳細は取り込み後、明細編集画面から追加できます。</p>
            </div>
          </div>

          {csvErrors.length > 0 && (
            <div className="max-w-2xl bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-1">
              {csvErrors.map((err, i) => (
                <p key={i} className="text-sm text-destructive">
                  {err}
                </p>
              ))}
            </div>
          )}

          {csvPreview.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium">プレビュー（{csvPreview.length}件）</h3>
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
                  {csvPreview.map((row, i) => (
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
              <Button onClick={handleCsvUpload} disabled={uploading}>
                <FileDown className="h-4 w-4 mr-1" />
                {uploading ? "取り込み中..." : `${csvPreview.length}件を取り込む`}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ========= EditPanel ========= */}
      <EditPanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        title={isCreating ? "給与明細を作成" : "給与明細を編集"}
        onSave={handleSave}
        saving={saving}
        saveLabel="保存"
        onDelete={!isCreating && editingPayslip ? handleDelete : undefined}
        deleteLabel="削除"
      >
        <div className="space-y-4">
          <div>
            <Label>社員</Label>
            <Select
              value={formUserId}
              onValueChange={(v) => v && setFormUserId(v)}
              disabled={!isCreating}
            >
              <SelectTrigger className="mt-1">
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>年</Label>
              <Select value={formYear} onValueChange={(v) => v && setFormYear(v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}年
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>月</Label>
              <Select value={formMonth} onValueChange={(v) => v && setFormMonth(v)}>
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
              value={formBaseSalary}
              onChange={(e) => setFormBaseSalary(e.target.value)}
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
                onClick={() => setFormAllowances([...formAllowances, { label: "", amount: "" }])}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                項目を追加
              </Button>
            </div>
            {formAllowances.map((item, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <Input
                  placeholder="項目名"
                  value={item.label}
                  onChange={(e) => {
                    const next = [...formAllowances];
                    next[i] = { ...next[i], label: e.target.value };
                    setFormAllowances(next);
                  }}
                  className="flex-1"
                />
                <Input
                  type="number"
                  placeholder="金額"
                  value={item.amount}
                  onChange={(e) => {
                    const next = [...formAllowances];
                    next[i] = { ...next[i], amount: e.target.value };
                    setFormAllowances(next);
                  }}
                  className="w-28"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setFormAllowances(formAllowances.filter((_, j) => j !== i))}
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
                onClick={() => setFormDeductions([...formDeductions, { label: "", amount: "" }])}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                項目を追加
              </Button>
            </div>
            {formDeductions.map((item, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <Input
                  placeholder="項目名"
                  value={item.label}
                  onChange={(e) => {
                    const next = [...formDeductions];
                    next[i] = { ...next[i], label: e.target.value };
                    setFormDeductions(next);
                  }}
                  className="flex-1"
                />
                <Input
                  type="number"
                  placeholder="金額"
                  value={item.amount}
                  onChange={(e) => {
                    const next = [...formDeductions];
                    next[i] = { ...next[i], amount: e.target.value };
                    setFormDeductions(next);
                  }}
                  className="w-28"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setFormDeductions(formDeductions.filter((_, j) => j !== i))}
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
                value={formGrossPay}
                onChange={(e) => setFormGrossPay(e.target.value)}
                className="mt-1"
                placeholder="0"
              />
            </div>
            <div>
              <Label>差引支給額</Label>
              <Input
                type="number"
                value={formNetPay}
                onChange={(e) => setFormNetPay(e.target.value)}
                className="mt-1"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <Label>備考</Label>
            <Input
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              className="mt-1"
              placeholder="備考（任意）"
            />
          </div>
        </div>
      </EditPanel>
    </div>
  );
}
