"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { getSupabase } from "@/lib/supabase/browser";
import { useOrg } from "@/lib/org-context";
import type {
  EvaluationCycle,
  EvaluationCriterion,
  EvaluationAssignment,
  EvaluationScore,
  Profile,
  Department,
} from "@/types/database";
import { Star, Trash2, Plus, Users, UserPlus, Building2, Check } from "lucide-react";
import {
  cycleStatusLabels,
  cycleStatusColors,
  raterTypeLabels,
  assignmentStatusLabels,
  scoreTypeLabels,
} from "@/lib/constants";
import { AuditLogPanel } from "@/components/ui/audit-log-panel";

const tabs = [
  { value: "overview", label: "概要" },
  { value: "assignments", label: "対象者・評価者" },
  { value: "report", label: "集計レポート" },
  { value: "audit", label: "変更履歴" },
];

type AddMode = "individual" | "department" | "all_mutual";

interface DepartmentWithMembers extends Department {
  members: Profile[];
}

export default function EvaluationCycleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { organization } = useOrg();
  const { showToast } = useToast();
  const [cycle, setCycle] = useState<EvaluationCycle | null>(null);
  const [criteria, setCriteria] = useState<EvaluationCriterion[]>([]);
  const [assignments, setAssignments] = useState<
    (EvaluationAssignment & { target_user?: Profile; evaluator?: Profile })[]
  >([]);
  const [allScores, setAllScores] = useState<EvaluationScore[]>([]);
  const [orgMembers, setOrgMembers] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<DepartmentWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // 追加モード
  const [addMode, setAddMode] = useState<AddMode>("individual");

  // 個別追加
  const [addTargetId, setAddTargetId] = useState("");
  const [addEvaluatorId, setAddEvaluatorId] = useState("");
  const [addRaterType, setAddRaterType] = useState("peer");

  // 部署一括追加
  const [targetDeptId, setTargetDeptId] = useState("");
  const [evaluatorDeptId, setEvaluatorDeptId] = useState("");
  const [deptRaterType, setDeptRaterType] = useState("peer");

  // 相互評価一括
  const [mutualDeptId, setMutualDeptId] = useState("");
  const [mutualIncludeSelf, setMutualIncludeSelf] = useState(true);

  const [addingSaving, setAddingSaving] = useState(false);

  useEffect(() => {
    if (!organization) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, organization]);

  async function loadData() {
    if (!organization) return;
    setLoading(true);

    const [{ data: cycleData }, { data: members }, { data: deptData }] = await Promise.all([
      getSupabase()
        .from("evaluation_cycles")
        .select("*")
        .eq("id", id)
        .eq("organization_id", organization.id)
        .single(),
      getSupabase()
        .from("user_organizations")
        .select("profiles(id, display_name, email, role)")
        .eq("organization_id", organization.id),
      getSupabase()
        .from("departments")
        .select("*")
        .eq("organization_id", organization.id)
        .order("name"),
    ]);

    setCycle(cycleData);
    const profiles = (members ?? [])
      .map((m) => (m as unknown as { profiles: Profile }).profiles)
      .filter(Boolean);
    setOrgMembers(profiles);

    // 部署メンバーマッピング
    if (deptData && deptData.length > 0) {
      const { data: empDepts } = await getSupabase()
        .from("employee_departments")
        .select("user_id, department_id")
        .in(
          "department_id",
          deptData.map((d) => d.id)
        );

      const deptMembers = new Map<string, Profile[]>();
      for (const ed of empDepts ?? []) {
        const profile = profiles.find((p) => p.id === ed.user_id);
        if (profile) {
          if (!deptMembers.has(ed.department_id)) deptMembers.set(ed.department_id, []);
          deptMembers.get(ed.department_id)!.push(profile);
        }
      }

      setDepartments(
        (deptData as Department[]).map((d) => ({
          ...d,
          members: deptMembers.get(d.id) ?? [],
        }))
      );
    } else {
      setDepartments([]);
    }

    if (cycleData) {
      const [{ data: crData }, { data: assignData }] = await Promise.all([
        getSupabase()
          .from("evaluation_criteria")
          .select("*")
          .eq("template_id", cycleData.template_id)
          .order("sort_order"),
        getSupabase()
          .from("evaluation_assignments")
          .select("*")
          .eq("cycle_id", id)
          .order("created_at"),
      ]);

      setCriteria(crData ?? []);

      const assignmentList = assignData ?? [];
      const userIds = [
        ...new Set(assignmentList.flatMap((a) => [a.target_user_id, a.evaluator_id])),
      ];

      const profileMap = new Map<string, Profile>();
      if (userIds.length > 0) {
        const { data: profileData } = await getSupabase()
          .from("profiles")
          .select("id, display_name, email, role")
          .in("id", userIds);
        for (const p of profileData ?? []) profileMap.set(p.id, p as Profile);
      }

      setAssignments(
        assignmentList.map((a) => ({
          ...a,
          target_user: profileMap.get(a.target_user_id),
          evaluator: profileMap.get(a.evaluator_id),
        }))
      );

      // スコアデータ取得（提出済みの評価のみ）
      const submittedEvalIds = assignmentList
        .filter((a) => a.evaluation_id)
        .map((a) => a.evaluation_id!);
      if (submittedEvalIds.length > 0) {
        const { data: scoreData } = await getSupabase()
          .from("evaluation_scores")
          .select("*")
          .in("evaluation_id", submittedEvalIds);
        setAllScores(scoreData ?? []);
      } else {
        setAllScores([]);
      }
    }

    setLoading(false);
  }

  /** 既に存在するアサインかチェック */
  function assignmentExists(targetId: string, evaluatorId: string) {
    return assignments.some((a) => a.target_user_id === targetId && a.evaluator_id === evaluatorId);
  }

  /** 複数アサインを一括追加 */
  async function bulkAddAssignments(
    pairs: { targetId: string; evaluatorId: string; raterType: string }[]
  ) {
    if (!cycle) return;

    // 重複除外
    const newPairs = pairs.filter((p) => !assignmentExists(p.targetId, p.evaluatorId));
    if (newPairs.length === 0) {
      showToast("追加できる組み合わせがありません（すべて登録済みです）", "error");
      return;
    }

    setAddingSaving(true);
    try {
      const rows = newPairs.map((p, i) => ({
        id: `assign-${Date.now()}-${i}`,
        cycle_id: cycle.id,
        target_user_id: p.targetId,
        evaluator_id: p.evaluatorId,
        rater_type: p.raterType,
        due_date: cycle.end_date,
      }));

      const { error } = await getSupabase().from("evaluation_assignments").insert(rows);
      if (error) throw error;

      showToast(`${newPairs.length}件の評価を追加しました`);
      await loadData();
    } catch {
      showToast("追加に失敗しました", "error");
    } finally {
      setAddingSaving(false);
    }
  }

  async function addIndividualAssignment() {
    if (!addTargetId || !addEvaluatorId) return;
    await bulkAddAssignments([
      { targetId: addTargetId, evaluatorId: addEvaluatorId, raterType: addRaterType },
    ]);
    setAddTargetId("");
    setAddEvaluatorId("");
  }

  async function addByDepartment() {
    const targetDept = departments.find((d) => d.id === targetDeptId);
    const evaluatorDept = departments.find((d) => d.id === evaluatorDeptId);
    if (!targetDept || !evaluatorDept) return;

    const pairs: { targetId: string; evaluatorId: string; raterType: string }[] = [];
    for (const target of targetDept.members) {
      for (const evaluator of evaluatorDept.members) {
        if (target.id !== evaluator.id) {
          pairs.push({ targetId: target.id, evaluatorId: evaluator.id, raterType: deptRaterType });
        }
      }
    }
    await bulkAddAssignments(pairs);
  }

  async function addMutualEvaluations() {
    const dept = departments.find((d) => d.id === mutualDeptId);
    if (!dept) return;

    const pairs: { targetId: string; evaluatorId: string; raterType: string }[] = [];
    for (const target of dept.members) {
      for (const evaluator of dept.members) {
        if (target.id === evaluator.id) {
          if (mutualIncludeSelf) {
            pairs.push({ targetId: target.id, evaluatorId: evaluator.id, raterType: "self" });
          }
        } else {
          pairs.push({ targetId: target.id, evaluatorId: evaluator.id, raterType: "peer" });
        }
      }
    }
    await bulkAddAssignments(pairs);
  }

  async function removeAssignment(assignmentId: string) {
    const { error } = await getSupabase()
      .from("evaluation_assignments")
      .delete()
      .eq("id", assignmentId);
    if (error) {
      showToast("削除に失敗しました", "error");
    } else {
      await loadData();
    }
  }

  async function removeTargetAssignments(targetUserId: string) {
    const targetAssignments = assignments.filter(
      (a) => a.target_user_id === targetUserId && a.status === "pending"
    );
    if (targetAssignments.length === 0) return;

    const { error } = await getSupabase()
      .from("evaluation_assignments")
      .delete()
      .in(
        "id",
        targetAssignments.map((a) => a.id)
      );
    if (error) {
      showToast("削除に失敗しました", "error");
    } else {
      showToast(`${targetAssignments.length}件を削除しました`);
      await loadData();
    }
  }

  async function updateCycleStatus(newStatus: string) {
    if (!cycle) return;
    const { error } = await getSupabase()
      .from("evaluation_cycles")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", cycle.id);
    if (error) {
      showToast("ステータスの更新に失敗しました", "error");
    } else {
      showToast(`ステータスを「${cycleStatusLabels[newStatus]}」に変更しました`);
      await loadData();
    }
  }

  // 対象者ごとにアサインをグループ化
  const assignmentsByTarget = useMemo(() => {
    const map = new Map<
      string,
      {
        targetUser: Profile | undefined;
        assignments: (EvaluationAssignment & { target_user?: Profile; evaluator?: Profile })[];
      }
    >();
    for (const a of assignments) {
      if (!map.has(a.target_user_id)) {
        map.set(a.target_user_id, { targetUser: a.target_user, assignments: [] });
      }
      map.get(a.target_user_id)!.assignments.push(a);
    }
    return Array.from(map.entries()).map(([targetId, data]) => ({
      targetId,
      ...data,
    }));
  }, [assignments]);

  // 集計レポート用データ
  const reportData = useMemo(() => {
    if (!cycle || assignments.length === 0) return null;

    const submittedAssignments = assignments.filter((a) => a.status === "submitted");
    const targetUserIds = [...new Set(submittedAssignments.map((a) => a.target_user_id))];

    return targetUserIds.map((targetId) => {
      const targetAssignments = submittedAssignments.filter((a) => a.target_user_id === targetId);
      const targetProfile = targetAssignments[0]?.target_user;
      const evalIds = targetAssignments.map((a) => a.evaluation_id).filter(Boolean) as string[];
      const targetScores = allScores.filter((s) => evalIds.includes(s.evaluation_id));

      const criteriaStats = criteria.map((c) => {
        const isNumeric = c.score_type === "five_star" || c.score_type === "ten_point";
        const criterionScores = targetScores.filter((s) => s.criterion_id === c.id);

        const byRaterType: Record<string, number[]> = {};
        for (const a of targetAssignments) {
          if (!a.evaluation_id) continue;
          const scores = criterionScores.filter((s) => s.evaluation_id === a.evaluation_id);
          for (const s of scores) {
            if (s.score != null && isNumeric) {
              if (!byRaterType[a.rater_type]) byRaterType[a.rater_type] = [];
              byRaterType[a.rater_type].push(s.score);
            }
          }
        }

        const allNumeric = Object.values(byRaterType).flat();
        const avg =
          allNumeric.length > 0 ? allNumeric.reduce((a, b) => a + b, 0) / allNumeric.length : null;
        const stdDev =
          allNumeric.length > 1
            ? Math.sqrt(
                allNumeric.reduce((sum, s) => sum + (s - avg!) ** 2, 0) / (allNumeric.length - 1)
              )
            : null;

        const raterTypeAvgs: Record<string, number | null> = {};
        for (const [type, scores] of Object.entries(byRaterType)) {
          raterTypeAvgs[type] =
            scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
        }

        return {
          criterion: c,
          avg,
          stdDev,
          count: allNumeric.length,
          byRaterType: raterTypeAvgs,
          isNumeric,
        };
      });

      return {
        targetId,
        targetName: targetProfile?.display_name ?? targetProfile?.email ?? targetId,
        raterCount: targetAssignments.length,
        criteriaStats,
      };
    });
  }, [assignments, allScores, criteria, cycle]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if (!cycle) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        サイクルが見つかりません
      </div>
    );
  }

  const submitted = assignments.filter((a) => a.status === "submitted").length;
  const total = assignments.length;
  const progress = total > 0 ? Math.round((submitted / total) * 100) : 0;

  const getName = (p?: Profile) => p?.display_name ?? p?.email ?? "";
  const getDeptName = (deptId: string) => {
    const dept = departments.find((d) => d.id === deptId);
    return dept ? `${dept.name}（${dept.members.length}名）` : deptId;
  };

  // ステータス遷移
  const nextStatusMap: Record<string, { label: string; status: string } | null> = {
    draft: { label: "実施開始", status: "active" },
    active: { label: "締め切る", status: "closed" },
    closed: { label: "調整開始", status: "calibrating" },
    calibrating: { label: "確定する", status: "finalized" },
    finalized: null,
  };
  const nextAction = nextStatusMap[cycle.status];

  const canEdit = cycle.status === "draft" || cycle.status === "active";

  // 部署一括追加のプレビュー件数
  const deptPreviewCount = (() => {
    if (addMode === "department") {
      const targetDept = departments.find((d) => d.id === targetDeptId);
      const evaluatorDept = departments.find((d) => d.id === evaluatorDeptId);
      if (!targetDept || !evaluatorDept) return 0;
      let count = 0;
      for (const t of targetDept.members) {
        for (const e of evaluatorDept.members) {
          if (t.id !== e.id && !assignmentExists(t.id, e.id)) count++;
        }
      }
      return count;
    }
    if (addMode === "all_mutual") {
      const dept = departments.find((d) => d.id === mutualDeptId);
      if (!dept) return 0;
      let count = 0;
      for (const t of dept.members) {
        for (const e of dept.members) {
          if (t.id === e.id) {
            if (mutualIncludeSelf && !assignmentExists(t.id, e.id)) count++;
          } else {
            if (!assignmentExists(t.id, e.id)) count++;
          }
        }
      }
      return count;
    }
    return 0;
  })();

  return (
    <>
      <PageHeader
        title={cycle.title}
        description={cycle.description ?? undefined}
        breadcrumb={[
          { label: "評価管理", href: "/evaluations" },
          { label: "評価サイクル", href: "/evaluations?tab=cycles" },
        ]}
        sticky={false}
        action={
          <div className="flex items-center gap-2">
            <Badge variant={cycleStatusColors[cycle.status]}>
              {cycleStatusLabels[cycle.status]}
            </Badge>
            {nextAction && (
              <Button size="sm" onClick={() => updateCycleStatus(nextAction.status)}>
                {nextAction.label}
              </Button>
            )}
          </div>
        }
      />

      <div className="sticky top-14 z-10 bg-white">
        <div className="flex items-center gap-6 border-b px-4 sm:px-6 md:px-8">
          {tabs.map((tab) => (
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
              {tab.value === "assignments" && total > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground">{total}</span>
              )}
              {activeTab === tab.value && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 sm:px-6 md:px-8 md:py-6">
        {/* ===== 概要タブ ===== */}
        {activeTab === "overview" && (
          <div className="space-y-6 max-w-3xl">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">期間</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium">
                    {format(new Date(cycle.start_date), "yyyy/MM/dd")} 〜{" "}
                    {format(new Date(cycle.end_date), "yyyy/MM/dd")}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">対象者数</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {new Set(assignments.map((a) => a.target_user_id)).size}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">提出進捗</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {submitted}/{total}
                  </p>
                  <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">評価者タイプ別の提出状況</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(raterTypeLabels).map(([type, label]) => {
                    const typeAssignments = assignments.filter((a) => a.rater_type === type);
                    if (typeAssignments.length === 0) return null;
                    const typeSubmitted = typeAssignments.filter(
                      (a) => a.status === "submitted"
                    ).length;
                    return (
                      <div key={type} className="flex items-center gap-3 text-sm">
                        <span className="w-16 text-muted-foreground">{label}</span>
                        <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/70 rounded-full"
                            style={{
                              width: `${(typeSubmitted / typeAssignments.length) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-muted-foreground w-16 text-right">
                          {typeSubmitted}/{typeAssignments.length}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ===== 対象者・評価者タブ ===== */}
        {activeTab === "assignments" && (
          <div className="space-y-4">
            {/* 追加パネル */}
            {canEdit && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">評価者を追加</CardTitle>
                  {/* モード切替 */}
                  <div className="flex gap-1.5 mt-2">
                    {(
                      [
                        { mode: "individual", label: "個別", icon: UserPlus },
                        { mode: "department", label: "部署指定", icon: Building2 },
                        { mode: "all_mutual", label: "部署内で相互評価", icon: Users },
                      ] as const
                    ).map(({ mode, label, icon: Icon }) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setAddMode(mode)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                          addMode === mode
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </button>
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  {/* 個別追加 */}
                  {addMode === "individual" && (
                    <div className="space-y-3">
                      <div className="flex items-end gap-3">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">対象者</Label>
                          <Select value={addTargetId} onValueChange={(v) => v && setAddTargetId(v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="選択">
                                {(v: string) =>
                                  orgMembers.find((m) => m.id === v)?.display_name ??
                                  orgMembers.find((m) => m.id === v)?.email ??
                                  v
                                }
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {orgMembers.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                  {m.display_name ?? m.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">評価者</Label>
                          <Select
                            value={addEvaluatorId}
                            onValueChange={(v) => v && setAddEvaluatorId(v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="選択">
                                {(v: string) =>
                                  orgMembers.find((m) => m.id === v)?.display_name ??
                                  orgMembers.find((m) => m.id === v)?.email ??
                                  v
                                }
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {orgMembers.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                  {m.display_name ?? m.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-32 space-y-1">
                          <Label className="text-xs">関係</Label>
                          <Select
                            value={addRaterType}
                            onValueChange={(v) => v && setAddRaterType(v)}
                          >
                            <SelectTrigger>
                              <SelectValue>{(v: string) => raterTypeLabels[v] ?? v}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(raterTypeLabels).map(([key, label]) => (
                                <SelectItem key={key} value={key}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          size="sm"
                          onClick={addIndividualAssignment}
                          disabled={!addTargetId || !addEvaluatorId || addingSaving}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          追加
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* 部署指定 */}
                  {addMode === "department" && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        対象者の部署と評価者の部署を選択すると、すべての組み合わせを一括登録します。
                      </p>
                      <div className="flex items-end gap-3">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">対象者の部署</Label>
                          <Select
                            value={targetDeptId}
                            onValueChange={(v) => v && setTargetDeptId(v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="部署を選択">
                                {(v: string) => getDeptName(v)}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {departments
                                .filter((d) => d.members.length > 0)
                                .map((d) => (
                                  <SelectItem key={d.id} value={d.id}>
                                    {d.name}（{d.members.length}名）
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">評価者の部署</Label>
                          <Select
                            value={evaluatorDeptId}
                            onValueChange={(v) => v && setEvaluatorDeptId(v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="部署を選択">
                                {(v: string) => getDeptName(v)}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {departments
                                .filter((d) => d.members.length > 0)
                                .map((d) => (
                                  <SelectItem key={d.id} value={d.id}>
                                    {d.name}（{d.members.length}名）
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-32 space-y-1">
                          <Label className="text-xs">関係</Label>
                          <Select
                            value={deptRaterType}
                            onValueChange={(v) => v && setDeptRaterType(v)}
                          >
                            <SelectTrigger>
                              <SelectValue>{(v: string) => raterTypeLabels[v] ?? v}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(raterTypeLabels)
                                .filter(([k]) => k !== "self")
                                .map(([key, label]) => (
                                  <SelectItem key={key} value={key}>
                                    {label}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          size="sm"
                          onClick={addByDepartment}
                          disabled={!targetDeptId || !evaluatorDeptId || addingSaving}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          一括追加
                          {deptPreviewCount > 0 && (
                            <span className="ml-1">({deptPreviewCount}件)</span>
                          )}
                        </Button>
                      </div>
                      {targetDeptId && evaluatorDeptId && deptPreviewCount === 0 && (
                        <p className="text-xs text-amber-600">すべての組み合わせが登録済みです</p>
                      )}
                    </div>
                  )}

                  {/* 部署内で相互評価 */}
                  {addMode === "all_mutual" && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        選択した部署のメンバー全員がお互いを評価する組み合わせを一括登録します。
                        同僚同士は「同僚」、本人による評価は「自己」として登録されます。
                      </p>
                      <div className="flex items-end gap-3">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">部署</Label>
                          <Select
                            value={mutualDeptId}
                            onValueChange={(v) => v && setMutualDeptId(v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="部署を選択">
                                {(v: string) => getDeptName(v)}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {departments
                                .filter((d) => d.members.length >= 2)
                                .map((d) => (
                                  <SelectItem key={d.id} value={d.id}>
                                    {d.name}（{d.members.length}名）
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <label className="flex items-center gap-2 pb-2 cursor-pointer">
                          <button
                            type="button"
                            onClick={() => setMutualIncludeSelf(!mutualIncludeSelf)}
                            className={cn(
                              "flex h-5 w-5 items-center justify-center rounded border transition-colors",
                              mutualIncludeSelf
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-input"
                            )}
                          >
                            {mutualIncludeSelf && <Check className="h-3.5 w-3.5" />}
                          </button>
                          <span className="text-sm">自己評価を含む</span>
                        </label>
                        <Button
                          size="sm"
                          onClick={addMutualEvaluations}
                          disabled={!mutualDeptId || addingSaving}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          一括追加
                          {deptPreviewCount > 0 && (
                            <span className="ml-1">({deptPreviewCount}件)</span>
                          )}
                        </Button>
                      </div>
                      {mutualDeptId && deptPreviewCount === 0 && (
                        <p className="text-xs text-amber-600">すべての組み合わせが登録済みです</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* アサイン一覧 — 対象者ごとにグループ化 */}
            {assignmentsByTarget.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <div className="flex justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                    <Users className="h-7 w-7 text-muted-foreground" />
                  </div>
                </div>
                <p className="font-medium">評価の組み合わせを登録してください</p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  「部署内で相互評価」を使えば、部署を選ぶだけで全メンバーの相互評価を一括登録できます。
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignmentsByTarget.map((group) => (
                  <Card key={group.targetId}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-sm">{getName(group.targetUser)}</CardTitle>
                          <span className="text-xs text-muted-foreground">
                            （評価者 {group.assignments.length}名）
                          </span>
                        </div>
                        {canEdit && group.assignments.every((a) => a.status === "pending") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTargetAssignments(group.targetId)}
                            className="text-destructive hover:text-destructive text-xs"
                          >
                            すべて削除
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="divide-y">
                        {group.assignments.map((a) => (
                          <div key={a.id} className="flex items-center gap-3 py-2 text-sm">
                            <Badge variant="outline" className="text-xs w-14 justify-center">
                              {raterTypeLabels[a.rater_type]}
                            </Badge>
                            <span className="flex-1">{getName(a.evaluator)}</span>
                            <Badge
                              variant={
                                a.status === "submitted"
                                  ? "default"
                                  : a.status === "in_progress"
                                    ? "secondary"
                                    : "outline"
                              }
                              className="text-xs"
                            >
                              {assignmentStatusLabels[a.status]}
                            </Badge>
                            {a.status === "pending" && canEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeAssignment(a.id)}
                                className="text-destructive hover:text-destructive h-7 w-7 p-0"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== 集計レポートタブ ===== */}
        {activeTab === "report" && (
          <div className="space-y-6">
            {!reportData || reportData.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">提出済みの評価がありません</p>
            ) : (
              reportData.map((target) => (
                <Card key={target.targetId}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{target.targetName}</CardTitle>
                      <span className="text-sm text-muted-foreground">
                        評価者 {target.raterCount}名
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left p-2 font-medium">評価項目</th>
                            <th className="p-2 font-medium text-center">総合平均</th>
                            <th className="p-2 font-medium text-center">標準偏差</th>
                            {Object.entries(raterTypeLabels).map(([type, label]) => {
                              const hasType = target.criteriaStats.some(
                                (cs) => cs.byRaterType[type] != null
                              );
                              if (!hasType) return null;
                              return (
                                <th key={type} className="p-2 font-medium text-center">
                                  {label}
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {target.criteriaStats.map((cs) => (
                            <tr key={cs.criterion.id} className="border-b last:border-b-0">
                              <td className="p-2">
                                <div>{cs.criterion.label}</div>
                                <div className="text-xs text-muted-foreground">
                                  {scoreTypeLabels[cs.criterion.score_type]}
                                  {cs.criterion.weight !== 1 && (
                                    <span className="ml-1">×{cs.criterion.weight}</span>
                                  )}
                                </div>
                              </td>
                              <td className="p-2 text-center">
                                {cs.isNumeric && cs.avg != null ? (
                                  <div>
                                    <span className="font-semibold">{cs.avg.toFixed(1)}</span>
                                    {cs.criterion.score_type === "five_star" && (
                                      <div className="flex justify-center gap-0.5 mt-0.5">
                                        {[1, 2, 3, 4, 5].map((n) => (
                                          <Star
                                            key={n}
                                            className={cn(
                                              "h-3 w-3",
                                              n <= Math.round(cs.avg!)
                                                ? "fill-amber-400 text-amber-400"
                                                : "text-gray-200"
                                            )}
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                              <td className="p-2 text-center">
                                {cs.stdDev != null ? (
                                  <span
                                    className={cn(
                                      "font-mono text-xs",
                                      cs.stdDev > 1.5
                                        ? "text-red-600 font-semibold"
                                        : cs.stdDev > 1.0
                                          ? "text-amber-600"
                                          : "text-muted-foreground"
                                    )}
                                  >
                                    {cs.stdDev.toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                              {Object.entries(raterTypeLabels).map(([type]) => {
                                const hasType = target.criteriaStats.some(
                                  (s) => s.byRaterType[type] != null
                                );
                                if (!hasType) return null;
                                const val = cs.byRaterType[type];
                                return (
                                  <td key={type} className="p-2 text-center">
                                    {val != null ? (
                                      <span className="font-semibold">{val.toFixed(1)}</span>
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* 自己評価と他者評価のギャップ */}
                    {(() => {
                      const selfStats = target.criteriaStats.filter(
                        (cs) => cs.byRaterType.self != null && cs.isNumeric
                      );
                      const otherStats = target.criteriaStats.filter(
                        (cs) =>
                          cs.isNumeric &&
                          Object.entries(cs.byRaterType).some(([t, v]) => t !== "self" && v != null)
                      );
                      if (selfStats.length === 0 || otherStats.length === 0) return null;

                      return (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            自己評価と他者評価のギャップ
                          </p>
                          <div className="space-y-1">
                            {target.criteriaStats
                              .filter((cs) => cs.isNumeric && cs.byRaterType.self != null)
                              .map((cs) => {
                                const selfScore = cs.byRaterType.self!;
                                const othersScores = Object.entries(cs.byRaterType)
                                  .filter(([t, v]) => t !== "self" && v != null)
                                  .map(([, v]) => v!);
                                if (othersScores.length === 0) return null;
                                const othersAvg =
                                  othersScores.reduce((a, b) => a + b, 0) / othersScores.length;
                                const gap = selfScore - othersAvg;
                                return (
                                  <div
                                    key={cs.criterion.id}
                                    className="flex items-center gap-2 text-sm"
                                  >
                                    <span className="w-32 truncate text-muted-foreground">
                                      {cs.criterion.label}
                                    </span>
                                    <span className="w-12 text-right">
                                      自己 {selfScore.toFixed(1)}
                                    </span>
                                    <span className="w-12 text-right">
                                      他者 {othersAvg.toFixed(1)}
                                    </span>
                                    <span
                                      className={cn(
                                        "w-16 text-right font-semibold",
                                        gap > 0.5
                                          ? "text-amber-600"
                                          : gap < -0.5
                                            ? "text-blue-600"
                                            : "text-muted-foreground"
                                      )}
                                    >
                                      {gap > 0 ? "+" : ""}
                                      {gap.toFixed(1)}
                                    </span>
                                    {Math.abs(gap) > 1.0 && (
                                      <Badge variant="outline" className="text-xs">
                                        {gap > 0 ? "自己評価高" : "自己評価低"}
                                      </Badge>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === "audit" && organization && (
          <AuditLogPanel
            organizationId={organization.id}
            tableName="evaluation_cycles"
            recordId={id}
          />
        )}
      </div>
    </>
  );
}
