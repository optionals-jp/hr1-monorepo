"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { SearchBar } from "@/components/ui/search-bar";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase/browser";
import { useQuery } from "@/lib/use-query";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { cn, formatDateLocal, formatTime, formatMinutesHM } from "@/lib/utils";
import type {
  AttendanceRecord,
  AttendancePunch,
  AttendanceSettingsRow,
  AttendanceApprover,
  AttendanceCorrection,
  Department,
  Project,
} from "@/types/database";
import {
  attendanceStatusLabels,
  attendanceStatusColors,
  punchTypeLabels,
  correctionStatusLabels,
  correctionStatusColors,
} from "@/lib/constants";
import {
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  AlertTriangle,
  Calendar,
  Settings2,
  ShieldCheck,
  FileEdit,
  Plus,
  Trash2,
  Building2,
  User,
  FolderKanban,
  Download,
} from "lucide-react";
import { exportToCSV } from "@/lib/export-csv";

type TabValue = "daily" | "monthly" | "approvers" | "corrections" | "settings";

const tabList: { value: TabValue; label: string; icon: React.ElementType }[] = [
  { value: "daily", label: "日次勤怠", icon: Calendar },
  { value: "monthly", label: "月次集計", icon: Clock },
  { value: "approvers", label: "承認者設定", icon: ShieldCheck },
  { value: "corrections", label: "修正依頼", icon: FileEdit },
  { value: "settings", label: "勤怠設定", icon: Settings2 },
];

type DailyRecord = AttendanceRecord & {
  profiles: { display_name: string | null; email: string; position: string | null };
};

type ApproverRow = AttendanceApprover & {
  target_profile?: { display_name: string | null; email: string } | null;
  approver_profile?: { display_name: string | null; email: string } | null;
  departments?: { id: string; name: string } | null;
  projects?: { id: string; name: string } | null;
};

type CorrectionRow = AttendanceCorrection & {
  requester?: { display_name: string | null; email: string } | null;
  reviewer_profile?: { display_name: string | null; email: string } | null;
  attendance_records?: { date: string } | null;
};

interface Employee {
  id: string;
  email: string;
  display_name: string | null;
}

/** 勤務時間（分）を計算 */
function calcWorkMinutes(r: AttendanceRecord): number {
  if (!r.clock_in || !r.clock_out) return 0;
  const diff = new Date(r.clock_out).getTime() - new Date(r.clock_in).getTime();
  return Math.round(diff / 60000) - r.break_minutes;
}

/** 時刻→分（0:00起点）に変換 */
function timeToMinutes(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

/** タイムラインバー: 勤務時間帯を視覚的に表示（6:00〜22:00の16時間） */
function TimelineBar({
  clockIn,
  clockOut,
  punches,
  settings,
}: {
  clockIn: string | null;
  clockOut: string | null;
  punches: AttendancePunch[];
  settings: AttendanceSettingsRow | null;
}) {
  const RANGE_START = 6 * 60; // 6:00
  const RANGE_END = 22 * 60; // 22:00
  const RANGE = RANGE_END - RANGE_START;

  const toPercent = (min: number) =>
    Math.max(0, Math.min(100, ((min - RANGE_START) / RANGE) * 100));

  if (!clockIn)
    return (
      <div className="h-6 bg-muted/30 rounded text-xs text-muted-foreground flex items-center justify-center">
        未出勤
      </div>
    );

  const inMin = timeToMinutes(clockIn);
  const outMin = clockOut ? timeToMinutes(clockOut) : null;

  // 休憩区間を計算
  const breakPeriods: { start: number; end: number }[] = [];
  const sortedPunches = [...punches].sort(
    (a, b) => new Date(a.punched_at).getTime() - new Date(b.punched_at).getTime()
  );
  let breakStart: number | null = null;
  for (const p of sortedPunches) {
    if (p.punch_type === "break_start") {
      breakStart = timeToMinutes(p.punched_at);
    } else if (p.punch_type === "break_end" && breakStart !== null) {
      breakPeriods.push({ start: breakStart, end: timeToMinutes(p.punched_at) });
      breakStart = null;
    }
  }

  // 定時ライン
  const workStart = settings?.work_start_time
    ? parseInt(settings.work_start_time.split(":")[0]) * 60 +
      parseInt(settings.work_start_time.split(":")[1])
    : null;
  const workEnd = settings?.work_end_time
    ? parseInt(settings.work_end_time.split(":")[0]) * 60 +
      parseInt(settings.work_end_time.split(":")[1])
    : null;

  return (
    <div className="relative h-6 bg-muted/30 rounded overflow-hidden">
      {/* 定時範囲（薄い背景） */}
      {workStart !== null && workEnd !== null && (
        <div
          className="absolute top-0 bottom-0 bg-blue-50"
          style={{
            left: `${toPercent(workStart)}%`,
            width: `${toPercent(workEnd) - toPercent(workStart)}%`,
          }}
        />
      )}
      {/* 勤務時間バー */}
      {outMin !== null && (
        <div
          className="absolute top-1 bottom-1 bg-blue-400 rounded-sm"
          style={{
            left: `${toPercent(inMin)}%`,
            width: `${Math.max(0.5, toPercent(outMin) - toPercent(inMin))}%`,
          }}
        />
      )}
      {/* 出勤中（退勤なし） */}
      {outMin === null && (
        <div
          className="absolute top-1 bottom-1 bg-blue-400/60 rounded-sm animate-pulse"
          style={{ left: `${toPercent(inMin)}%`, right: "0%" }}
        />
      )}
      {/* 休憩区間 */}
      {breakPeriods.map((bp, i) => (
        <div
          key={i}
          className="absolute top-1 bottom-1 bg-amber-300 rounded-sm"
          style={{
            left: `${toPercent(bp.start)}%`,
            width: `${Math.max(0.3, toPercent(bp.end) - toPercent(bp.start))}%`,
          }}
        />
      ))}
      {/* 残業区間（定時以降の勤務） */}
      {outMin !== null && workEnd !== null && outMin > workEnd && (
        <div
          className="absolute top-1 bottom-1 bg-red-400/70 rounded-sm"
          style={{
            left: `${toPercent(workEnd)}%`,
            width: `${toPercent(outMin) - toPercent(workEnd)}%`,
          }}
        />
      )}
      {/* 時間目盛り */}
      {[6, 9, 12, 15, 18, 21].map((h) => (
        <div
          key={h}
          className="absolute top-0 bottom-0 border-l border-muted-foreground/10"
          style={{ left: `${toPercent(h * 60)}%` }}
        >
          <span className="absolute -top-0.5 left-0.5 text-[8px] text-muted-foreground/40 leading-none">
            {h}
          </span>
        </div>
      ))}
    </div>
  );
}

/** 打刻イベント一覧 */
function PunchList({ punches }: { punches: AttendancePunch[] }) {
  const sorted = [...punches].sort(
    (a, b) => new Date(a.punched_at).getTime() - new Date(b.punched_at).getTime()
  );
  if (sorted.length === 0)
    return <p className="text-xs text-muted-foreground">打刻記録がありません</p>;
  return (
    <div className="flex flex-wrap gap-3">
      {sorted.map((p) => (
        <div key={p.id} className="flex items-center gap-1.5">
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              p.punch_type === "clock_in" && "bg-green-500",
              p.punch_type === "clock_out" && "bg-red-500",
              p.punch_type === "break_start" && "bg-amber-400",
              p.punch_type === "break_end" && "bg-blue-400"
            )}
          />
          <span className="text-xs font-medium">{punchTypeLabels[p.punch_type]}</span>
          <span className="text-xs font-mono text-muted-foreground">
            {formatTime(p.punched_at)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AttendancePage() {
  const { showToast } = useToast();
  const router = useRouter();
  const { organization } = useOrg();
  const [activeTab, setActiveTab] = useState<TabValue>("daily");

  // --- 日次タブ ---
  const [selectedDate, setSelectedDate] = useState(formatDateLocal(new Date()));
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // --- 月次タブ ---
  const today = new Date();
  const [monthYear, setMonthYear] = useState(today.getFullYear());
  const [monthMonth, setMonthMonth] = useState(today.getMonth() + 1);

  // --- 設定タブ ---
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [editStartTime, setEditStartTime] = useState("09:00");
  const [editEndTime, setEditEndTime] = useState("18:00");
  const [editBreakMinutes, setEditBreakMinutes] = useState("60");
  const [savingSettings, setSavingSettings] = useState(false);

  // --- 承認者タブ ---
  const [approverDialogOpen, setApproverDialogOpen] = useState(false);
  const [approverMode, setApproverMode] = useState<"individual" | "department" | "project">(
    "individual"
  );
  const [approverTargetUserId, setApproverTargetUserId] = useState("");
  const [approverTargetDeptId, setApproverTargetDeptId] = useState("");
  const [approverTargetProjectId, setApproverTargetProjectId] = useState("");
  const [approverApproverId, setApproverApproverId] = useState("");
  const [savingApprover, setSavingApprover] = useState(false);

  // --- 修正依頼タブ ---
  const [correctionFilter, setCorrectionFilter] = useState("all");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<CorrectionRow | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [savingReview, setSavingReview] = useState(false);

  // ---------- データ取得 ----------

  // 社員一覧（承認者設定で使用）
  const { data: employees = [] } = useQuery<Employee[]>(
    organization ? `employees-list-${organization.id}` : null,
    async () => {
      const { data } = await getSupabase()
        .from("user_organizations")
        .select("user_id, profiles!user_organizations_user_id_fkey(id, email, display_name)")
        .eq("organization_id", organization!.id);
      return (data ?? []).map((d) => {
        const p = d.profiles as unknown as Employee;
        return { id: p.id, email: p.email, display_name: p.display_name };
      });
    }
  );

  // 部署一覧
  const { data: departments = [] } = useQuery<Department[]>(
    organization ? `departments-list-${organization.id}` : null,
    async () => {
      const { data } = await getSupabase()
        .from("departments")
        .select("*")
        .eq("organization_id", organization!.id)
        .order("name");
      return data ?? [];
    }
  );

  // プロジェクト一覧
  const { data: projects = [] } = useQuery<Project[]>(
    organization ? `projects-list-${organization.id}` : null,
    async () => {
      const { data } = await getSupabase()
        .from("projects")
        .select("*")
        .eq("organization_id", organization!.id)
        .in("status", ["active"])
        .order("name");
      return data ?? [];
    }
  );

  // 日次
  const {
    data: dailyRecords = [],
    isLoading: dailyLoading,
    error: dailyError,
    mutate: mutateDaily,
  } = useQuery<DailyRecord[]>(
    organization ? `attendance-daily-${organization.id}-${selectedDate}` : null,
    async () => {
      const { data } = await getSupabase()
        .from("attendance_records")
        .select("*, profiles!attendance_records_user_id_fkey(display_name, email, position)")
        .eq("organization_id", organization!.id)
        .eq("date", selectedDate)
        .order("clock_in", { ascending: true, nullsFirst: false });
      return (data ?? []) as DailyRecord[];
    }
  );

  // 打刻記録（日次タブ用）
  const { data: dailyPunches = [] } = useQuery<AttendancePunch[]>(
    organization && activeTab === "daily"
      ? `attendance-punches-${organization.id}-${selectedDate}`
      : null,
    async () => {
      // ローカルタイムゾーンの日付境界をUTCに変換してクエリ
      const dayStart = new Date(`${selectedDate}T00:00:00`);
      const dayEnd = new Date(`${selectedDate}T00:00:00`);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const { data } = await getSupabase()
        .from("attendance_punches")
        .select("*")
        .eq("organization_id", organization!.id)
        .gte("punched_at", dayStart.toISOString())
        .lt("punched_at", dayEnd.toISOString())
        .order("punched_at", { ascending: true });
      return (data ?? []) as AttendancePunch[];
    }
  );

  // ユーザーIDで打刻をグループ化
  const punchesByUser = useMemo(() => {
    const map = new Map<string, AttendancePunch[]>();
    for (const p of dailyPunches) {
      const arr = map.get(p.user_id) ?? [];
      arr.push(p);
      map.set(p.user_id, arr);
    }
    return map;
  }, [dailyPunches]);

  // 月次（サーバーサイド集計 RPC）
  interface MonthlySummaryRow {
    user_id: string;
    display_name: string | null;
    email: string;
    present_days: number;
    late_days: number;
    absent_days: number;
    leave_days: number;
    total_work_minutes: number;
    total_overtime_minutes: number;
  }
  const {
    data: monthlySummary = [],
    isLoading: monthlyLoading,
    error: monthlyError,
    mutate: mutateMonthly,
  } = useQuery<MonthlySummaryRow[]>(
    organization && activeTab === "monthly"
      ? `attendance-monthly-${organization.id}-${monthYear}-${monthMonth}`
      : null,
    async () => {
      const startDate = `${monthYear}-${String(monthMonth).padStart(2, "0")}-01`;
      const lastDay = new Date(monthYear, monthMonth, 0).getDate();
      const endDate = `${monthYear}-${String(monthMonth).padStart(2, "0")}-${lastDay}`;
      const { data } = await getSupabase().rpc("get_monthly_attendance_summary", {
        p_organization_id: organization!.id,
        p_start_date: startDate,
        p_end_date: endDate,
      });
      return (data ?? []) as MonthlySummaryRow[];
    }
  );

  // 設定
  const { data: settings, mutate: mutateSettings } = useQuery<AttendanceSettingsRow | null>(
    organization ? `attendance-settings-${organization.id}` : null,
    async () => {
      const { data } = await getSupabase()
        .from("attendance_settings")
        .select("*")
        .eq("organization_id", organization!.id)
        .maybeSingle();
      return data as AttendanceSettingsRow | null;
    }
  );

  // 承認者一覧
  const {
    data: approvers = [],
    isLoading: approversLoading,
    mutate: mutateApprovers,
  } = useQuery<ApproverRow[]>(
    organization && activeTab === "approvers" ? `attendance-approvers-${organization.id}` : null,
    async () => {
      const { data } = await getSupabase()
        .from("attendance_approvers")
        .select(
          "*, target_profile:profiles!attendance_approvers_user_id_fkey(display_name, email), approver_profile:profiles!attendance_approvers_approver_id_fkey(display_name, email), departments(id, name), projects(id, name)"
        )
        .eq("organization_id", organization!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as ApproverRow[];
    }
  );

  // 修正依頼一覧
  const {
    data: corrections = [],
    isLoading: correctionsLoading,
    mutate: mutateCorrections,
  } = useQuery<CorrectionRow[]>(
    organization && activeTab === "corrections"
      ? `attendance-corrections-${organization.id}`
      : null,
    async () => {
      const { data } = await getSupabase()
        .from("attendance_corrections")
        .select(
          "*, requester:profiles!attendance_corrections_user_id_fkey(display_name, email), reviewer_profile:profiles!attendance_corrections_reviewed_by_fkey(display_name, email), attendance_records(date)"
        )
        .eq("organization_id", organization!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as CorrectionRow[];
    }
  );

  // ---------- フィルタ ----------
  const filteredDaily = useMemo(() => {
    let rows = dailyRecords;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          (r.profiles?.display_name ?? "").toLowerCase().includes(q) ||
          (r.profiles?.email ?? "").toLowerCase().includes(q)
      );
    }
    if (filterStatus !== "all") {
      rows = rows.filter((r) => r.status === filterStatus);
    }
    return rows;
  }, [dailyRecords, search, filterStatus]);

  const filteredCorrections = useMemo(() => {
    if (correctionFilter === "all") return corrections;
    return corrections.filter((c) => c.status === correctionFilter);
  }, [corrections, correctionFilter]);

  // ---------- 月次集計はサーバーサイド RPC で取得済み（monthlySummary） ----------

  const dailySummary = useMemo(() => {
    const total = dailyRecords.length;
    const present = dailyRecords.filter(
      (r) => r.status === "present" || r.status === "late" || r.status === "early_leave"
    ).length;
    const late = dailyRecords.filter((r) => r.status === "late").length;
    const absent = dailyRecords.filter((r) => r.status === "absent").length;
    return { total, present, late, absent };
  }, [dailyRecords]);

  // ---------- 設定保存 ----------
  const handleSaveSettings = async () => {
    if (!organization) return;
    setSavingSettings(true);
    try {
      await getSupabase()
        .from("attendance_settings")
        .upsert(
          {
            organization_id: organization.id,
            work_start_time: editStartTime,
            work_end_time: editEndTime,
            break_minutes: parseInt(editBreakMinutes, 10) || 60,
          },
          { onConflict: "organization_id" }
        );
      await mutateSettings();
      showToast("設定を保存しました", "success");
      setSettingsDialogOpen(false);
    } catch {
      showToast("設定の保存に失敗しました", "error");
    } finally {
      setSavingSettings(false);
    }
  };

  // ---------- 承認者追加 ----------
  const handleAddApprover = async () => {
    if (!organization) return;
    if (!approverApproverId) {
      showToast("承認者を選択してください", "error");
      return;
    }
    if (approverMode === "individual" && !approverTargetUserId) {
      showToast("対象社員を選択してください", "error");
      return;
    }
    if (approverMode === "department" && !approverTargetDeptId) {
      showToast("対象部署を選択してください", "error");
      return;
    }
    if (approverMode === "project" && !approverTargetProjectId) {
      showToast("対象プロジェクトを選択してください", "error");
      return;
    }
    setSavingApprover(true);
    try {
      const { error } = await getSupabase()
        .from("attendance_approvers")
        .insert({
          organization_id: organization.id,
          user_id: approverMode === "individual" ? approverTargetUserId : null,
          department_id: approverMode === "department" ? approverTargetDeptId : null,
          project_id: approverMode === "project" ? approverTargetProjectId : null,
          approver_id: approverApproverId,
        });
      if (error) throw error;
      await mutateApprovers();
      showToast("承認者を追加しました", "success");
      setApproverDialogOpen(false);
      setApproverTargetUserId("");
      setApproverTargetDeptId("");
      setApproverTargetProjectId("");
      setApproverApproverId("");
    } catch {
      showToast("承認者の追加に失敗しました（重複の可能性があります）", "error");
    } finally {
      setSavingApprover(false);
    }
  };

  const handleDeleteApprover = async (id: string) => {
    if (!window.confirm("削除してもよろしいですか？")) return;
    try {
      await getSupabase().from("attendance_approvers").delete().eq("id", id);
      await mutateApprovers();
      showToast("承認者を削除しました", "success");
    } catch {
      showToast("削除に失敗しました", "error");
    }
  };

  // ---------- 修正依頼の承認/却下 ----------
  const handleReview = async (status: "approved" | "rejected") => {
    if (!reviewTarget) return;
    setSavingReview(true);
    try {
      const supabase = getSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      await supabase
        .from("attendance_corrections")
        .update({
          status,
          reviewed_by: user?.id ?? null,
          reviewed_at: new Date().toISOString(),
          review_comment: reviewComment || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reviewTarget.id);

      // 承認の場合、勤怠レコードを更新
      if (status === "approved") {
        const updates: Record<string, unknown> = {};
        if (reviewTarget.requested_clock_in) updates.clock_in = reviewTarget.requested_clock_in;
        if (reviewTarget.requested_clock_out) updates.clock_out = reviewTarget.requested_clock_out;
        if (Object.keys(updates).length > 0) {
          await supabase
            .from("attendance_records")
            .update(updates)
            .eq("id", reviewTarget.record_id);
        }
      }

      await mutateCorrections();
      showToast(status === "approved" ? "承認しました" : "却下しました", "success");
      setReviewDialogOpen(false);
      setReviewTarget(null);
      setReviewComment("");
    } catch {
      showToast("処理に失敗しました", "error");
    } finally {
      setSavingReview(false);
    }
  };

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(formatDateLocal(d));
  };

  const shiftMonth = (dir: number) => {
    let y = monthYear;
    let m = monthMonth + dir;
    if (m < 1) {
      m = 12;
      y--;
    }
    if (m > 12) {
      m = 1;
      y++;
    }
    setMonthYear(y);
    setMonthMonth(m);
  };

  const pendingCount = corrections.filter((c) => c.status === "pending").length;

  return (
    <div className="flex flex-col">
      <PageHeader
        title="勤怠管理"
        description="社員の出退勤状況を管理します"
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
                  {t.value === "corrections" && pendingCount > 0 && (
                    <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-[10px]">
                      {pendingCount}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        }
      />

      {/* ========= 日次タブ ========= */}
      {activeTab === "daily" && (
        <>
          <div className="px-4 py-3 sm:px-6 md:px-8 space-y-4">
            <QueryErrorBanner error={dailyError} onRetry={() => mutateDaily()} />
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => shiftDate(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-44"
              />
              <Button variant="outline" size="icon" onClick={() => shiftDate(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDate(formatDateLocal(new Date()))}
              >
                今日
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-lg bg-blue-50 p-2">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">記録数</p>
                    <p className="text-xl font-semibold">{dailySummary.total}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-lg bg-green-50 p-2">
                    <Clock className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">出勤</p>
                    <p className="text-xl font-semibold">{dailySummary.present}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-lg bg-yellow-50 p-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">遅刻</p>
                    <p className="text-xl font-semibold">{dailySummary.late}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-lg bg-red-50 p-2">
                    <X className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">欠勤</p>
                    <p className="text-xl font-semibold">{dailySummary.absent}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="sticky top-14 z-10">
            <SearchBar value={search} onChange={setSearch} placeholder="社員名・メールで検索" />
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 w-full h-12 bg-white border-b px-4 sm:px-6 md:px-8 cursor-pointer">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground shrink-0">フィルター</span>
                {filterStatus !== "all" && (
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    <Badge variant="secondary" className="shrink-0 gap-1 text-sm py-3 px-3">
                      ステータス：{attendanceStatusLabels[filterStatus]}
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
                <DropdownMenuItem className="py-2" onClick={() => setFilterStatus("all")}>
                  <span className={cn(filterStatus === "all" && "font-medium")}>すべて</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {Object.entries(attendanceStatusLabels).map(([k, v]) => (
                  <DropdownMenuItem className="py-2" key={k} onClick={() => setFilterStatus(k)}>
                    <span className={cn(filterStatus === k && "font-medium")}>{v}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-45">社員</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>出勤</TableHead>
                  <TableHead>退勤</TableHead>
                  <TableHead>休憩</TableHead>
                  <TableHead>勤務時間</TableHead>
                  <TableHead>残業</TableHead>
                  <TableHead className="w-55">タイムライン</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableEmptyState
                  colSpan={8}
                  isLoading={dailyLoading}
                  isEmpty={filteredDaily.length === 0}
                  emptyMessage="この日の勤怠記録はありません"
                >
                  {filteredDaily.map((r) => {
                    const userPunches = punchesByUser.get(r.user_id) ?? [];
                    const isExpanded = expandedRowId === r.id;
                    return (
                      <React.Fragment key={r.id}>
                        <TableRow
                          className="cursor-pointer"
                          onClick={() => setExpandedRowId(isExpanded ? null : r.id)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarFallback className="text-xs">
                                  {(r.profiles?.display_name ?? r.profiles?.email ?? "?")[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p
                                  className="text-sm font-medium truncate text-primary hover:underline cursor-pointer"
                                  role="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/attendance/${r.user_id}`);
                                  }}
                                >
                                  {r.profiles?.display_name ?? r.profiles?.email}
                                </p>
                                {r.profiles?.position && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {r.profiles.position}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={attendanceStatusColors[r.status] ?? "outline"}>
                              {attendanceStatusLabels[r.status] ?? r.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {formatTime(r.clock_in)}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {formatTime(r.clock_out)}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {r.break_minutes > 0 ? formatMinutesHM(r.break_minutes) : "-"}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {formatMinutesHM(calcWorkMinutes(r))}
                          </TableCell>
                          <TableCell className="text-sm">
                            {r.overtime_minutes > 0 ? (
                              <span className="text-red-600 font-medium">
                                {formatMinutesHM(r.overtime_minutes)}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <TimelineBar
                              clockIn={r.clock_in}
                              clockOut={r.clock_out}
                              punches={userPunches}
                              settings={settings ?? null}
                            />
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow className="bg-muted/20 hover:bg-muted/20">
                            <TableCell colSpan={8}>
                              <div className="py-2 space-y-2">
                                <div className="flex items-center gap-4">
                                  <span className="text-xs font-semibold text-muted-foreground">
                                    打刻記録
                                  </span>
                                  <PunchList punches={userPunches} />
                                </div>
                                {r.note && (
                                  <div className="flex items-center gap-4">
                                    <span className="text-xs font-semibold text-muted-foreground">
                                      備考
                                    </span>
                                    <span className="text-xs text-muted-foreground">{r.note}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-6 text-xs text-muted-foreground">
                                  <span>
                                    <span className="inline-block h-2 w-2 rounded-full bg-blue-50 border border-blue-200 mr-1" />
                                    定時
                                  </span>
                                  <span>
                                    <span className="inline-block h-2 w-2 rounded-full bg-blue-400 mr-1" />
                                    勤務
                                  </span>
                                  <span>
                                    <span className="inline-block h-2 w-2 rounded-full bg-amber-300 mr-1" />
                                    休憩
                                  </span>
                                  <span>
                                    <span className="inline-block h-2 w-2 rounded-full bg-red-400 mr-1" />
                                    残業
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableEmptyState>
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* ========= 月次タブ ========= */}
      {activeTab === "monthly" && (
        <>
          <div className="px-4 py-3 sm:px-6 md:px-8 space-y-4">
            <QueryErrorBanner error={monthlyError} onRetry={() => mutateMonthly()} />
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => shiftMonth(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium w-28 text-center">
                {monthYear}年{monthMonth}月
              </span>
              <Button variant="outline" size="icon" onClick={() => shiftMonth(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMonthYear(today.getFullYear());
                  setMonthMonth(today.getMonth() + 1);
                }}
              >
                今月
              </Button>
              <div className="flex-1" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (monthlySummary.length === 0) return;
                  exportToCSV(
                    monthlySummary.map((s) => ({
                      ...s,
                      name: s.display_name ?? s.email,
                      totalWorkFormatted: formatMinutesHM(s.total_work_minutes),
                      totalOvertimeFormatted: formatMinutesHM(s.total_overtime_minutes),
                    })),
                    [
                      { key: "name", label: "社員名" },
                      { key: "present_days", label: "出勤日数" },
                      { key: "late_days", label: "遅刻" },
                      { key: "absent_days", label: "欠勤" },
                      { key: "leave_days", label: "休暇" },
                      { key: "totalWorkFormatted", label: "総勤務時間" },
                      { key: "totalOvertimeFormatted", label: "総残業時間" },
                    ],
                    `勤怠レポート_${monthYear}${String(monthMonth).padStart(2, "0")}`
                  );
                }}
              >
                <Download className="mr-1.5 h-4 w-4" />
                CSV出力
              </Button>
            </div>

            {/* 月次サマリーカード */}
            {monthlySummary.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="rounded-lg bg-blue-50 p-2">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">対象社員数</p>
                      <p className="text-xl font-semibold">{monthlySummary.length}名</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="rounded-lg bg-green-50 p-2">
                      <Clock className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">平均労働時間</p>
                      <p className="text-xl font-semibold">
                        {formatMinutesHM(
                          Math.round(
                            monthlySummary.reduce((sum, s) => sum + s.total_work_minutes, 0) /
                              monthlySummary.length
                          )
                        )}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="rounded-lg bg-violet-50 p-2">
                      <Calendar className="h-5 w-5 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">平均出勤日数</p>
                      <p className="text-xl font-semibold">
                        {(
                          monthlySummary.reduce((sum, s) => sum + s.present_days, 0) /
                          monthlySummary.length
                        ).toFixed(1)}
                        日
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="rounded-lg bg-red-50 p-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">総残業時間</p>
                      <p className="text-xl font-semibold">
                        {formatMinutesHM(
                          monthlySummary.reduce((sum, s) => sum + s.total_overtime_minutes, 0)
                        )}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          <div className="bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-50">社員</TableHead>
                  <TableHead className="text-center">出勤日数</TableHead>
                  <TableHead className="text-center">遅刻</TableHead>
                  <TableHead className="text-center">欠勤</TableHead>
                  <TableHead className="text-center">休暇</TableHead>
                  <TableHead className="text-center">総勤務時間</TableHead>
                  <TableHead className="text-center">総残業時間</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableEmptyState
                  colSpan={7}
                  isLoading={monthlyLoading}
                  isEmpty={monthlySummary.length === 0}
                  emptyMessage="この月の勤怠記録はありません"
                >
                  {monthlySummary.map((s) => (
                    <TableRow key={s.user_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-xs">
                              {(s.display_name || s.email)[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p
                              className="text-sm font-medium truncate text-primary hover:underline cursor-pointer"
                              role="button"
                              onClick={() => router.push(`/attendance/${s.user_id}`)}
                            >
                              {s.display_name || s.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-mono">{s.present_days}</TableCell>
                      <TableCell className="text-center">
                        {s.late_days > 0 ? (
                          <Badge variant="outline" className="text-yellow-600">
                            {s.late_days}
                          </Badge>
                        ) : (
                          "0"
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {s.absent_days > 0 ? (
                          <Badge variant="destructive">{s.absent_days}</Badge>
                        ) : (
                          "0"
                        )}
                      </TableCell>
                      <TableCell className="text-center">{s.leave_days}</TableCell>
                      <TableCell className="text-center font-mono">
                        {formatMinutesHM(s.total_work_minutes)}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {s.total_overtime_minutes > 0
                          ? formatMinutesHM(s.total_overtime_minutes)
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableEmptyState>
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* ========= 承認者設定タブ ========= */}
      {activeTab === "approvers" && (
        <>
          <div className="px-4 py-3 sm:px-6 md:px-8">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                社員ごと、または部署単位で勤怠の承認者を設定できます。部署単位で設定すると、その部署に所属する全社員に適用されます。
              </p>
              <Button
                className="shrink-0 ml-4"
                onClick={() => {
                  setApproverMode("individual");
                  setApproverTargetUserId("");
                  setApproverTargetDeptId("");
                  setApproverApproverId("");
                  setApproverDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                承認者を追加
              </Button>
            </div>
          </div>

          <div className="bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>種別</TableHead>
                  <TableHead>対象</TableHead>
                  <TableHead>承認者</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableEmptyState
                  colSpan={4}
                  isLoading={approversLoading}
                  isEmpty={approvers.length === 0}
                  emptyMessage="承認者が設定されていません"
                >
                  {approvers.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        {a.department_id ? (
                          <Badge variant="secondary" className="gap-1">
                            <Building2 className="h-3 w-3" />
                            部署
                          </Badge>
                        ) : a.project_id ? (
                          <Badge
                            variant="secondary"
                            className="gap-1 bg-violet-100 text-violet-700"
                          >
                            <FolderKanban className="h-3 w-3" />
                            プロジェクト
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <User className="h-3 w-3" />
                            個別
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {a.department_id ? (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {a.departments?.name ?? "不明な部署"}
                            </span>
                          </div>
                        ) : a.project_id ? (
                          <div className="flex items-center gap-2">
                            <FolderKanban className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {a.projects?.name ?? "不明なプロジェクト"}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {
                                  (a.target_profile?.display_name ??
                                    a.target_profile?.email ??
                                    "?")[0]
                                }
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">
                              {a.target_profile?.display_name ?? a.target_profile?.email}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {
                                (a.approver_profile?.display_name ??
                                  a.approver_profile?.email ??
                                  "?")[0]
                              }
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">
                            {a.approver_profile?.display_name ?? a.approver_profile?.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteApprover(a.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableEmptyState>
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* ========= 修正依頼タブ ========= */}
      {activeTab === "corrections" && (
        <>
          <div className="sticky top-14 z-10">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 w-full h-12 bg-white border-b px-4 sm:px-6 md:px-8 cursor-pointer">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground shrink-0">フィルター</span>
                {correctionFilter !== "all" && (
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    <Badge variant="secondary" className="shrink-0 gap-1 text-sm py-3 px-3">
                      ステータス：{correctionStatusLabels[correctionFilter]}
                      <span
                        role="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCorrectionFilter("all");
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
                <DropdownMenuItem className="py-2" onClick={() => setCorrectionFilter("all")}>
                  <span className={cn(correctionFilter === "all" && "font-medium")}>すべて</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {Object.entries(correctionStatusLabels).map(([k, v]) => (
                  <DropdownMenuItem className="py-2" key={k} onClick={() => setCorrectionFilter(k)}>
                    <span className={cn(correctionFilter === k && "font-medium")}>{v}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">申請者</TableHead>
                  <TableHead>対象日</TableHead>
                  <TableHead>変更前（出勤）</TableHead>
                  <TableHead>変更前（退勤）</TableHead>
                  <TableHead>変更後（出勤）</TableHead>
                  <TableHead>変更後（退勤）</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableEmptyState
                  colSpan={8}
                  isLoading={correctionsLoading}
                  isEmpty={filteredCorrections.length === 0}
                  emptyMessage="修正依頼はありません"
                >
                  {filteredCorrections.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {(c.requester?.display_name ?? c.requester?.email ?? "?")[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm truncate">
                            {c.requester?.display_name ?? c.requester?.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{c.attendance_records?.date ?? "-"}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatTime(c.original_clock_in)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatTime(c.original_clock_out)}
                      </TableCell>
                      <TableCell className="font-mono text-sm font-medium text-blue-600">
                        {formatTime(c.requested_clock_in)}
                      </TableCell>
                      <TableCell className="font-mono text-sm font-medium text-blue-600">
                        {formatTime(c.requested_clock_out)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={correctionStatusColors[c.status] ?? "outline"}>
                          {correctionStatusLabels[c.status] ?? c.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {c.status === "pending" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setReviewTarget(c);
                              setReviewComment("");
                              setReviewDialogOpen(true);
                            }}
                          >
                            確認
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableEmptyState>
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* ========= 設定タブ ========= */}
      {activeTab === "settings" && (
        <div className="px-4 py-4 sm:px-6 md:px-8 md:py-6">
          <div className="max-w-xl space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">勤務時間設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">始業時刻</Label>
                    <p className="text-lg font-medium mt-1">
                      {settings?.work_start_time ?? "09:00"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">終業時刻</Label>
                    <p className="text-lg font-medium mt-1">{settings?.work_end_time ?? "18:00"}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">休憩時間</Label>
                  <p className="text-lg font-medium mt-1">{settings?.break_minutes ?? 60}分</p>
                </div>
                <Button
                  className="mt-2"
                  onClick={() => {
                    setEditStartTime(settings?.work_start_time ?? "09:00");
                    setEditEndTime(settings?.work_end_time ?? "18:00");
                    setEditBreakMinutes(String(settings?.break_minutes ?? 60));
                    setSettingsDialogOpen(true);
                  }}
                >
                  <Settings2 className="h-4 w-4 mr-1.5" />
                  設定を変更
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">ステータス一覧</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(attendanceStatusLabels).map(([k, v]) => (
                    <Badge key={k} variant={attendanceStatusColors[k] ?? "outline"}>
                      {v}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">打刻種別一覧</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(punchTypeLabels).map(([k, v]) => (
                    <Badge key={k} variant="secondary">
                      {v}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 設定編集ダイアログ */}
      <EditPanel
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        title="勤務時間設定"
        saving={savingSettings}
        onSave={handleSaveSettings}
      >
        <div className="space-y-4">
          <div>
            <Label>始業時刻</Label>
            <Input
              type="time"
              value={editStartTime}
              onChange={(e) => setEditStartTime(e.target.value)}
            />
          </div>
          <div>
            <Label>終業時刻</Label>
            <Input
              type="time"
              value={editEndTime}
              onChange={(e) => setEditEndTime(e.target.value)}
            />
          </div>
          <div>
            <Label>休憩時間（分）</Label>
            <Input
              type="number"
              min="0"
              max="480"
              value={editBreakMinutes}
              onChange={(e) => setEditBreakMinutes(e.target.value)}
            />
          </div>
        </div>
      </EditPanel>

      {/* 承認者追加ダイアログ */}
      <EditPanel
        open={approverDialogOpen}
        onOpenChange={setApproverDialogOpen}
        title="承認者を追加"
        saving={savingApprover}
        onSave={handleAddApprover}
        saveLabel="追加"
      >
        <div className="space-y-4">
          <div>
            <Label>設定方法</Label>
            <div className="flex gap-1.5 mt-1.5">
              {(
                [
                  { mode: "individual", label: "個別設定", icon: User },
                  { mode: "department", label: "部署一括", icon: Building2 },
                  { mode: "project", label: "プロジェクト一括", icon: FolderKanban },
                ] as const
              ).map(({ mode, label, icon: Icon }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setApproverMode(mode)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                    approverMode === mode
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {approverMode === "individual" && (
            <div>
              <Label>対象社員</Label>
              <Select
                value={approverTargetUserId}
                onValueChange={(v) => v && setApproverTargetUserId(v)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="社員を選択">
                    {(v: string) =>
                      employees.find((e) => e.id === v)?.display_name ??
                      employees.find((e) => e.id === v)?.email ??
                      v
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.display_name ?? e.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {approverMode === "department" && (
            <div>
              <Label>対象部署</Label>
              <Select
                value={approverTargetDeptId}
                onValueChange={(v) => v && setApproverTargetDeptId(v)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="部署を選択">
                    {(v: string) => departments.find((d) => d.id === v)?.name ?? v}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                この部署に所属する全社員に承認者が適用されます
              </p>
            </div>
          )}

          {approverMode === "project" && (
            <div>
              <Label>対象プロジェクト</Label>
              <Select
                value={approverTargetProjectId}
                onValueChange={(v) => v && setApproverTargetProjectId(v)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="プロジェクトを選択">
                    {(v: string) => projects.find((p) => p.id === v)?.name ?? v}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {projects.length === 0 ? (
                    <div className="py-2 px-3 text-sm text-muted-foreground">
                      有効なプロジェクトがありません
                    </div>
                  ) : (
                    projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                このプロジェクトのメンバー全員に承認者が適用されます
              </p>
            </div>
          )}

          <div>
            <Label>承認者</Label>
            <Select value={approverApproverId} onValueChange={(v) => v && setApproverApproverId(v)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="承認者を選択">
                  {(v: string) =>
                    employees.find((e) => e.id === v)?.display_name ??
                    employees.find((e) => e.id === v)?.email ??
                    v
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.display_name ?? e.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </EditPanel>

      {/* 修正依頼レビューダイアログ */}
      <EditPanel
        open={reviewDialogOpen}
        onOpenChange={(open) => {
          setReviewDialogOpen(open);
          if (!open) setReviewTarget(null);
        }}
        title="修正依頼の確認"
        saving={savingReview}
        onSave={() => handleReview("approved")}
        saveLabel="承認"
      >
        {reviewTarget && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">申請者</Label>
              <p className="text-sm font-medium mt-0.5">
                {reviewTarget.requester?.display_name ?? reviewTarget.requester?.email}
              </p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">対象日</Label>
              <p className="text-sm font-medium mt-0.5">
                {reviewTarget.attendance_records?.date ?? "-"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">変更前（出勤）</Label>
                <p className="text-sm font-mono mt-0.5">
                  {formatTime(reviewTarget.original_clock_in)}
                </p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">変更前（退勤）</Label>
                <p className="text-sm font-mono mt-0.5">
                  {formatTime(reviewTarget.original_clock_out)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-blue-600">変更後（出勤）</Label>
                <p className="text-sm font-mono font-medium text-blue-600 mt-0.5">
                  {formatTime(reviewTarget.requested_clock_in)}
                </p>
              </div>
              <div>
                <Label className="text-sm text-blue-600">変更後（退勤）</Label>
                <p className="text-sm font-mono font-medium text-blue-600 mt-0.5">
                  {formatTime(reviewTarget.requested_clock_out)}
                </p>
              </div>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">修正理由</Label>
              <p className="text-sm mt-0.5 bg-muted/50 rounded-md p-2">{reviewTarget.reason}</p>
            </div>
            <div>
              <Label>コメント（任意）</Label>
              <Textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="承認・却下の理由を入力"
                rows={3}
                className="mt-1.5"
              />
            </div>
            <div className="pt-2">
              <Button
                variant="destructive"
                className="w-full"
                disabled={savingReview}
                onClick={() => handleReview("rejected")}
              >
                <X className="h-4 w-4 mr-1.5" />
                却下
              </Button>
            </div>
          </div>
        )}
      </EditPanel>
    </div>
  );
}
