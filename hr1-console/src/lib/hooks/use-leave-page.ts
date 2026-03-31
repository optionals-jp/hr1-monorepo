"use client";

import { useState, useMemo } from "react";
import { useTabParam } from "@/lib/hooks/use-tab-param";
import { useOrg } from "@/lib/org-context";
import { useLeave } from "@/lib/hooks/use-leave";
import type { LeaveBalance } from "@/types/database";

type TabValue = "balances" | "grant";

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

function formatDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function useLeavePage() {
  const { organization } = useOrg();
  const [activeTab, setActiveTab] = useTabParam<TabValue>("balances");

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
    balances,
    balancesError,
    mutateBalances,
    members,
    updateBalance: updateBalanceApi,
    grantManual: grantManualApi,
    grantAuto: grantAutoApi,
  } = useLeave();

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

  const handleSaveEdit = async (): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> => {
    if (!organization || !editTarget) return { success: false };
    setSavingEdit(true);
    const result = await updateBalanceApi(editTarget.id, {
      granted_days: parseFloat(editGrantedDays) || 0,
      used_days: parseFloat(editUsedDays) || 0,
      carried_over_days: parseFloat(editCarriedOverDays) || 0,
      expired_days: parseFloat(editExpiredDays) || 0,
      grant_date: editGrantDate,
      expiry_date: editExpiryDate,
    });
    if (result.success) {
      setEditPanelOpen(false);
    }
    setSavingEdit(false);
    return {
      success: result.success,
      message: result.success ? "有給残日数を更新しました" : undefined,
      error: result.success ? undefined : (result.error ?? "更新に失敗しました"),
    };
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

  const handleSaveManual = async (): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> => {
    if (!organization) return { success: false };
    if (!manualUserId) {
      return { success: false, error: "社員を選択してください" };
    }
    if (!manualGrantedDays) {
      return { success: false, error: "付与日数を入力してください" };
    }
    setSavingManual(true);
    const result = await grantManualApi(organization.id, {
      organization_id: organization.id,
      user_id: manualUserId,
      fiscal_year: parseInt(manualFiscalYear, 10),
      granted_days: parseFloat(manualGrantedDays) || 0,
      carried_over_days: parseFloat(manualCarriedOverDays) || 0,
      used_days: 0,
      expired_days: 0,
      grant_date: manualGrantDate,
      expiry_date: manualExpiryDate,
    });
    if (result.success) {
      setManualPanelOpen(false);
    }
    setSavingManual(false);
    return {
      success: result.success,
      message: result.success ? "有給を付与しました" : undefined,
      error: result.success ? undefined : (result.error ?? "付与に失敗しました"),
    };
  };

  // ---------- 自動付与 ----------

  const handleOpenAutoGrant = (): { success: boolean; error?: string } => {
    if (!members || members.length === 0) {
      return { success: false, error: "社員情報がありません" };
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
      return { success: false, error: "付与対象の社員がいません" };
    }
    setAutoGrantPreview(preview);
    setAutoGrantDialogOpen(true);
    return { success: true };
  };

  const handleConfirmAutoGrant = async (): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> => {
    if (!organization) return { success: false };
    setSavingAutoGrant(true);
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
    const result = await grantAutoApi(rows);
    if (result.success) {
      setAutoGrantDialogOpen(false);
    }
    setSavingAutoGrant(false);
    return {
      success: result.success,
      message: result.success ? `${autoGrantPreview.length}名に有給を付与しました` : undefined,
      error: result.success ? undefined : (result.error ?? "自動付与に失敗しました"),
    };
  };

  return {
    // tabs
    activeTab,
    setActiveTab,
    // filter
    currentYear,
    filterYear,
    setFilterYear,
    search,
    setSearch,
    // edit panel
    editPanelOpen,
    setEditPanelOpen,
    editTarget,
    editGrantedDays,
    setEditGrantedDays,
    editUsedDays,
    setEditUsedDays,
    editCarriedOverDays,
    setEditCarriedOverDays,
    editExpiredDays,
    setEditExpiredDays,
    editGrantDate,
    setEditGrantDate,
    editExpiryDate,
    setEditExpiryDate,
    savingEdit,
    editRemaining,
    // manual panel
    manualPanelOpen,
    setManualPanelOpen,
    manualUserId,
    setManualUserId,
    manualFiscalYear,
    setManualFiscalYear,
    manualGrantedDays,
    setManualGrantedDays,
    manualCarriedOverDays,
    setManualCarriedOverDays,
    manualGrantDate,
    setManualGrantDate,
    manualExpiryDate,
    setManualExpiryDate,
    savingManual,
    // auto grant
    autoGrantDialogOpen,
    setAutoGrantDialogOpen,
    autoGrantPreview,
    savingAutoGrant,
    // data
    balances,
    balancesError,
    mutateBalances,
    members,
    profileMap,
    filteredBalances,
    yearOptions,
    // computed
    calcRemaining,
    // actions
    openEditPanel,
    handleSaveEdit,
    openManualPanel,
    handleSaveManual,
    handleOpenAutoGrant,
    handleConfirmAutoGrant,
  };
}
