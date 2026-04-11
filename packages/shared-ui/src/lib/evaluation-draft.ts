/**
 * 評価テンプレート作成フォームで使う下書き (draft) 型とユーティリティ。
 *
 * hr1-console と hr1-employee-web の両方で評価テンプレート作成フォームを
 * 持つため、draft の形状や行変換ロジックをここに集約する。
 *
 * 作成フローは `public.create_evaluation_template` RPC を介してアトミックに
 * 実行する。フロント側で uuid を採番することは禁止。`criteriaDraftsToRpcPayload`
 * で RPC に渡す jsonb ペイロードを生成すること。
 */

export interface EvaluationAnchorDraft {
  score_value: number;
  description: string;
}

export interface EvaluationCriterionDraft {
  tempId: string;
  label: string;
  description: string;
  score_type: string;
  options: string;
  weight: string;
  anchors: EvaluationAnchorDraft[];
  showAnchors: boolean;
}

/**
 * `create_evaluation_template` RPC の `p_criteria` パラメータに渡す
 * jsonb ペイロード 1 要素分の型。
 */
export interface EvaluationCriterionRpcPayload {
  label: string;
  description: string | null;
  score_type: string;
  options: string[] | null;
  weight: number;
  anchors: { score_value: number; description: string }[];
}

/**
 * 数値スコアタイプ (five_star / ten_point) かどうかを判定する。
 * これらのタイプだけがアンカー (各スコアの基準文) を持つ。
 */
export function isNumericScoreType(type: string): boolean {
  return type === "five_star" || type === "ten_point";
}

/**
 * スコアタイプに応じたデフォルトのアンカー配列を返す。
 * - five_star: 1〜5 の空アンカー
 * - ten_point: 1〜10 の空アンカー
 * - それ以外: 空配列
 */
export function getDefaultAnchors(scoreType: string): EvaluationAnchorDraft[] {
  const max = scoreType === "five_star" ? 5 : scoreType === "ten_point" ? 10 : 0;
  return Array.from({ length: max }, (_, i) => ({
    score_value: i + 1,
    description: "",
  }));
}

/**
 * 新しい criterion draft を生成する。
 * `tempId` は React の key として使う UI ローカルな識別子であり、DB の id ではない。
 */
export function createCriterionDraft(): EvaluationCriterionDraft {
  return {
    tempId: generateTempId(),
    label: "",
    description: "",
    score_type: "five_star",
    options: "",
    weight: "1.00",
    anchors: getDefaultAnchors("five_star"),
    showAnchors: false,
  };
}

/**
 * UI ローカルな一時識別子を生成する (React の key 用)。DB の id としては使わない。
 * `crypto.randomUUID()` を優先し、利用できない環境では乱数と時刻からフォールバックする。
 */
function generateTempId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * 評価基準の draft を `create_evaluation_template` RPC に渡す jsonb 配列に
 * 変換する。`options` は改行区切り文字列を配列に分解し、`weight` は数値化、
 * `anchors` は空の説明を除去する。
 *
 * ここで生成されたペイロードはそのまま `client.rpc(...)` に渡してよい。
 */
export function criteriaDraftsToRpcPayload(
  drafts: EvaluationCriterionDraft[]
): EvaluationCriterionRpcPayload[] {
  return drafts.map((c) => {
    const weight = parseFloat(c.weight);
    return {
      label: c.label.trim(),
      description: c.description.trim() || null,
      score_type: c.score_type,
      options:
        c.score_type === "select" && c.options
          ? c.options
              .split("\n")
              .map((o) => o.trim())
              .filter(Boolean)
          : null,
      weight: Number.isFinite(weight) && weight > 0 ? weight : 1.0,
      anchors: c.anchors
        .filter((a) => a.description.trim().length > 0)
        .map((a) => ({
          score_value: a.score_value,
          description: a.description.trim(),
        })),
    };
  });
}
