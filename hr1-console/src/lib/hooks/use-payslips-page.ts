"use client";

import React, { useState, useMemo } from "react";
import { useOrg } from "@/lib/org-context";
import { usePayslips } from "@/lib/hooks/use-payslips";
import type { Payslip } from "@/types/database";

type TabValue = "list" | "upload";

interface MemberRow {
  user_id: string;
  profiles: {
    id: string;
    display_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

interface CsvPreviewRow {
  email: string;
  year: number;
  month: number;
  base_salary: number;
  gross_pay: number;
  net_pay: number;
}

export function usePayslipsPage() {
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
  const [csvPreview, setCsvPreview] = useState<CsvPreviewRow[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // ---------- データ取得 ----------

  const {
    payslips,
    payslipsError,
    mutate,
    members,
    createPayslip,
    updatePayslip,
    deletePayslip,
    uploadCsv,
  } = usePayslips();

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

  const handleSave = async (): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> => {
    if (!organization) return { success: false };
    if (!formUserId) {
      return { success: false, error: "社員を選択してください" };
    }
    setSaving(true);
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

    let result: { success: boolean; error?: string };
    let message: string | undefined;
    if (isCreating) {
      result = await createPayslip(payload);
      if (result.success) message = "給与明細を作成しました";
    } else if (editingPayslip) {
      result = await updatePayslip(editingPayslip.id, payload);
      if (result.success) message = "給与明細を更新しました";
    } else {
      result = { success: false };
    }
    if (result.success) {
      setPanelOpen(false);
    }
    setSaving(false);
    return {
      success: result.success,
      message,
      error: result.success ? undefined : (result.error ?? "保存に失敗しました"),
    };
  };

  const handleDelete = async (): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> => {
    if (!editingPayslip) return { success: false };
    setSaving(true);
    const result = await deletePayslip(editingPayslip.id);
    if (result.success) {
      setPanelOpen(false);
    }
    setSaving(false);
    return {
      success: result.success,
      message: result.success ? "給与明細を削除しました" : undefined,
      error: result.success ? undefined : (result.error ?? "削除に失敗しました"),
    };
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
        const preview: CsvPreviewRow[] = [];

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

  const handleCsvUpload = async (): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> => {
    if (!organization || csvPreview.length === 0) return { success: false };
    setUploading(true);
    const result = await uploadCsv(organization.id, csvPreview);
    if (result.success) {
      setCsvFile(null);
      setCsvPreview([]);
      if (result.errors) setCsvErrors(result.errors);
      setUploading(false);
      return {
        success: true,
        message: `${result.count}件の給与明細を取り込みました`,
      };
    } else if (result.errors) {
      setCsvErrors(result.errors);
      setUploading(false);
      return { success: false };
    } else {
      setUploading(false);
      return {
        success: false,
        error: result.error ?? "取り込みに失敗しました",
      };
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

  return {
    // tabs
    activeTab,
    setActiveTab,
    // filter
    filterYear,
    setFilterYear,
    filterMonth,
    setFilterMonth,
    search,
    setSearch,
    // panel
    panelOpen,
    setPanelOpen,
    editingPayslip,
    isCreating,
    saving,
    // form
    formUserId,
    setFormUserId,
    formYear,
    setFormYear,
    formMonth,
    setFormMonth,
    formBaseSalary,
    setFormBaseSalary,
    formAllowances,
    setFormAllowances,
    formDeductions,
    setFormDeductions,
    formGrossPay,
    setFormGrossPay,
    formNetPay,
    setFormNetPay,
    formNote,
    setFormNote,
    // csv
    csvPreview,
    csvErrors,
    uploading,
    handleCsvFileChange,
    handleCsvUpload,
    // data
    payslipsError,
    mutate,
    members,
    profileMap,
    filteredPayslips,
    yearOptions,
    isLoading,
    // actions
    openCreatePanel,
    openEditPanel,
    handleSave,
    handleDelete,
  };
}
