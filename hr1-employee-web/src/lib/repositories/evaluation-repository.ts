import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  EvaluationCycle,
  EvaluationAssignment,
  EvaluationCriterion,
  EvaluationAnchor,
  Evaluation,
  EvaluationScore,
} from "@/types/database";

export async function fetchActiveCycles(client: SupabaseClient, organizationId: string) {
  const { data, error } = await client
    .from("evaluation_cycles")
    .select("*")
    .eq("organization_id", organizationId)
    .in("status", ["active", "closed", "finalized"])
    .order("start_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as EvaluationCycle[];
}

export async function fetchMyAssignments(client: SupabaseClient, cycleId: string, userId: string) {
  const { data, error } = await client
    .from("evaluation_assignments")
    .select(
      "*, target_profile:target_user_id(display_name, email), evaluator_profile:evaluator_id(display_name, email)"
    )
    .eq("cycle_id", cycleId)
    .or(`target_user_id.eq.${userId},evaluator_id.eq.${userId}`)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as EvaluationAssignment[];
}

export async function fetchAssignmentDetail(
  client: SupabaseClient,
  assignmentId: string,
  userId: string
) {
  const { data, error } = await client
    .from("evaluation_assignments")
    .select(
      "*, target_profile:target_user_id(display_name, email), evaluator_profile:evaluator_id(display_name, email), evaluation_cycles(*)"
    )
    .eq("id", assignmentId)
    .eq("evaluator_id", userId)
    .single();
  if (error) throw error;
  return data as EvaluationAssignment & {
    evaluation_cycles: EvaluationCycle;
  };
}

export async function fetchCriteriaForTemplate(client: SupabaseClient, templateId: string) {
  const { data, error } = await client
    .from("evaluation_criteria")
    .select("*, evaluation_anchors(*)")
    .eq("template_id", templateId)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as (EvaluationCriterion & {
    evaluation_anchors: EvaluationAnchor[];
  })[];
}

export async function fetchExistingEvaluation(
  client: SupabaseClient,
  assignmentId: string,
  evaluatorId: string
) {
  const { data, error } = await client
    .from("evaluations")
    .select("*, evaluation_scores(*)")
    .eq("assignment_id", assignmentId)
    .eq("evaluator_id", evaluatorId)
    .maybeSingle();
  if (error) throw error;
  return data as (Evaluation & { evaluation_scores: EvaluationScore[] }) | null;
}

export async function createEvaluation(
  client: SupabaseClient,
  data: {
    organization_id: string;
    template_id: string;
    target_user_id: string;
    evaluator_id: string;
    cycle_id: string;
    rater_type: string;
    assignment_id: string;
  }
) {
  const { data: result, error } = await client
    .from("evaluations")
    .insert({ ...data, status: "draft" })
    .select("id")
    .single();
  if (error) throw error;
  return result.id as string;
}

export async function upsertScores(
  client: SupabaseClient,
  evaluationId: string,
  scores: {
    criterion_id: string;
    score: number | null;
    value: string | null;
    comment: string | null;
  }[]
) {
  const rows = scores.map((s) => ({
    evaluation_id: evaluationId,
    criterion_id: s.criterion_id,
    score: s.score,
    value: s.value,
    comment: s.comment,
  }));
  const { error } = await client
    .from("evaluation_scores")
    .upsert(rows, { onConflict: "evaluation_id,criterion_id" });
  if (error) throw error;
}

export async function saveOverallComment(
  client: SupabaseClient,
  evaluationId: string,
  comment: string | null
) {
  const { error } = await client
    .from("evaluations")
    .update({ overall_comment: comment })
    .eq("id", evaluationId);
  if (error) throw error;
}

export async function submitEvaluation(
  client: SupabaseClient,
  evaluationId: string,
  assignmentId: string
) {
  const { error: evalError } = await client
    .from("evaluations")
    .update({ status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", evaluationId);
  if (evalError) throw evalError;

  const { error: assignError } = await client
    .from("evaluation_assignments")
    .update({ status: "submitted", evaluation_id: evaluationId })
    .eq("id", assignmentId);
  if (assignError) throw assignError;
}
