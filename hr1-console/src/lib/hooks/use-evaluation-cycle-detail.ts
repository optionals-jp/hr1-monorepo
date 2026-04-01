"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useTabParam } from "@/lib/hooks/use-tab-param";
import { useOrg } from "@/lib/org-context";
import {
  loadCycleDetail,
  bulkAddAssignments,
  removeAssignment as repoRemoveAssignment,
  removeAssignments as repoRemoveAssignments,
  updateCycleStatus as repoUpdateCycleStatus,
  type DepartmentWithMembers,
} from "@/lib/hooks/use-evaluation-detail";
import type {
  EvaluationCycle,
  EvaluationCriterion,
  EvaluationAssignment,
  EvaluationScore,
  Profile,
} from "@/types/database";

type AddMode = "individual" | "department" | "all_mutual";

export function useEvaluationCycleDetail() {
  const { id } = useParams<{ id: string }>();
  const { organization } = useOrg();
  const [cycle, setCycle] = useState<EvaluationCycle | null>(null);
  const [criteria, setCriteria] = useState<EvaluationCriterion[]>([]);
  const [assignments, setAssignments] = useState<
    (EvaluationAssignment & { target_user?: Profile; evaluator?: Profile })[]
  >([]);
  const [allScores, setAllScores] = useState<EvaluationScore[]>([]);
  const [orgMembers, setOrgMembers] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<DepartmentWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useTabParam("overview");

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

    const result = await loadCycleDetail(id, organization.id);
    setCycle(result.cycle);
    setCriteria(result.criteria);
    setAssignments(result.assignments);
    setAllScores(result.allScores);
    setOrgMembers(result.orgMembers);
    setDepartments(result.departments);

    setLoading(false);
  }

  /** 既に存在するアサインかチェック */
  function assignmentExists(targetId: string, evaluatorId: string) {
    return assignments.some((a) => a.target_user_id === targetId && a.evaluator_id === evaluatorId);
  }

  /** 複数アサインを一括追加 */
  async function handleBulkAddAssignments(
    pairs: { targetId: string; evaluatorId: string; raterType: string }[]
  ): Promise<{ success: boolean; error?: string; count?: number }> {
    if (!cycle) return { success: false };

    // 重複除外
    const newPairs = pairs.filter((p) => !assignmentExists(p.targetId, p.evaluatorId));
    if (newPairs.length === 0) {
      return {
        success: false,
        error: "追加できる組み合わせがありません（すべて登録済みです）",
      };
    }

    setAddingSaving(true);
    const result = await bulkAddAssignments(cycle.id, cycle.end_date, newPairs);
    if (result.success) {
      await loadData();
      setAddingSaving(false);
      return { success: true, count: result.count };
    } else {
      setAddingSaving(false);
      return { success: false, error: result.error ?? "追加に失敗しました" };
    }
  }

  async function addIndividualAssignment() {
    if (!addTargetId || !addEvaluatorId) return;
    const result = await handleBulkAddAssignments([
      { targetId: addTargetId, evaluatorId: addEvaluatorId, raterType: addRaterType },
    ]);
    setAddTargetId("");
    setAddEvaluatorId("");
    return result;
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
    return await handleBulkAddAssignments(pairs);
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
    return await handleBulkAddAssignments(pairs);
  }

  async function handleRemoveAssignment(
    assignmentId: string
  ): Promise<{ success: boolean; error?: string }> {
    const result = await repoRemoveAssignment(assignmentId);
    if (result.success) {
      await loadData();
      return { success: true };
    } else {
      return { success: false, error: result.error ?? "削除に失敗しました" };
    }
  }

  async function removeTargetAssignments(
    targetUserId: string
  ): Promise<{ success: boolean; error?: string; count?: number }> {
    const targetAssignments = assignments.filter(
      (a) => a.target_user_id === targetUserId && a.status === "pending"
    );
    if (targetAssignments.length === 0) return { success: false };

    const result = await repoRemoveAssignments(targetAssignments.map((a) => a.id));
    if (result.success) {
      await loadData();
      return { success: true, count: targetAssignments.length };
    } else {
      return { success: false, error: result.error ?? "削除に失敗しました" };
    }
  }

  async function handleUpdateCycleStatus(
    newStatus: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!cycle) return { success: false };
    const result = await repoUpdateCycleStatus(cycle.id, organization!.id, newStatus);
    if (result.success) {
      await loadData();
      return { success: true };
    } else {
      return { success: false, error: result.error ?? "ステータスの更新に失敗しました" };
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

  return {
    id,
    organization,
    cycle,
    criteria,
    assignments,
    allScores,
    orgMembers,
    departments,
    loading,
    activeTab,
    setActiveTab,
    addMode,
    setAddMode,
    addTargetId,
    setAddTargetId,
    addEvaluatorId,
    setAddEvaluatorId,
    addRaterType,
    setAddRaterType,
    targetDeptId,
    setTargetDeptId,
    evaluatorDeptId,
    setEvaluatorDeptId,
    deptRaterType,
    setDeptRaterType,
    mutualDeptId,
    setMutualDeptId,
    mutualIncludeSelf,
    setMutualIncludeSelf,
    addingSaving,
    assignmentsByTarget,
    reportData,
    assignmentExists,
    addIndividualAssignment,
    addByDepartment,
    addMutualEvaluations,
    handleRemoveAssignment,
    removeTargetAssignments,
    handleUpdateCycleStatus,
  };
}
