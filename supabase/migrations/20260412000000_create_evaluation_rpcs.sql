-- ============================================================================
-- 評価機能のアトミック化 RPC + evaluation_scores の整合性強化
-- ============================================================================
-- 背景:
-- 1. フロントで `eval-${Date.now()}` / `evalscore-${...}` のような
--    非 UUID 文字列を uuid PRIMARY KEY カラムに INSERT しようとする
--    コードが存在しており、アドホック評価作成パスが完全に壊れていた
--    (Postgres "invalid input syntax for type uuid")。
-- 2. テンプレート作成は「template → criteria → anchors」の 3 段 INSERT を
--    JS 側で補償 DELETE するワークアラウンドで実装されており、
--    補償 DELETE 自体が失敗する可能性があり孤児行が残りうる構造だった。
-- 3. evaluation_scores には DELETE ポリシーが存在せず、クライアントからの
--    DELETE は RLS で 0 行のみ削除される silent-fail 状態。結果、更新パスで
--    delete → insert が delete なしで動き、重複スコア行が蓄積していた。
--
-- 本マイグレーションの対応:
-- - 既存の重複スコア行を de-dup してから UNIQUE 制約を追加（データ整合性復元）
-- - create_evaluation_template / submit_ad_hoc_evaluation RPC を導入し、
--   フロントでの UUID 採番と補償 DELETE を廃止。単一トランザクションで
--   アトミックに完結させる。
-- - RPC は SECURITY DEFINER + 明示的な auth チェックで、既存 RLS と
--   等価な権限判定を行う（バイパスではなく一元化）。
-- - カバー範囲は「アドホック評価（応募者/社員詳細ページからの直接評価）」
--   および「評価テンプレート作成」のみ。サイクル駆動の評価フローは別経路。
-- ============================================================================

-- ============================================================================
-- 1. evaluation_scores の重複除去 + UNIQUE 制約追加
-- ============================================================================
-- 過去に client-side DELETE が RLS で silent-fail していた期間に生成された
-- 重複行を除去する。同一 (evaluation_id, criterion_id) の行のうち ctid が
-- 最大のもの（物理的に最新の挿入）を残し、それ以外を削除する。
DELETE FROM public.evaluation_scores s
USING public.evaluation_scores s2
WHERE s.evaluation_id = s2.evaluation_id
  AND s.criterion_id = s2.criterion_id
  AND s.ctid < s2.ctid;

ALTER TABLE public.evaluation_scores
  ADD CONSTRAINT evaluation_scores_eval_criterion_unique
  UNIQUE (evaluation_id, criterion_id);

-- ============================================================================
-- 2. create_evaluation_template RPC
-- ----------------------------------------------------------------------------
-- evaluation_templates / evaluation_criteria / evaluation_anchors を
-- 1 トランザクションで作成する。id は全て DB 側の gen_random_uuid() で採番。
-- 権限: eval_templates_all_admin RLS と等価（自組織 admin のみ）。
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_evaluation_template(
  p_organization_id text,
  p_title text,
  p_description text,
  p_target text,
  p_evaluation_type text,
  p_anonymity_mode text,
  p_criteria jsonb
  -- p_criteria 形式:
  --   [
  --     {
  --       "label": "string",
  --       "description": "string|null",
  --       "score_type": "five_star|ten_point|text|select",
  --       "options": ["string", ...] | null,   -- score_type=select のみ
  --       "weight": number,
  --       "anchors": [{"score_value": int, "description": "string"}, ...]
  --     }, ...
  --   ]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template_id uuid;
  v_criterion jsonb;
  v_criterion_id uuid;
  v_anchor jsonb;
  v_cr_order int := 0;
  v_anc_order int;
BEGIN
  -- ─── 認証・権限 ──────────────────────────────────────────────────
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  IF p_organization_id IS NULL THEN
    RAISE EXCEPTION 'organization_id is required' USING ERRCODE = '22023';
  END IF;

  -- eval_templates_all_admin と等価: 自組織 admin のみ
  IF NOT (
    public.get_my_role() = 'admin'
    AND EXISTS (
      SELECT 1 FROM public.get_my_organization_ids() AS org_id
      WHERE org_id = p_organization_id
    )
  ) THEN
    RAISE EXCEPTION 'forbidden: admin role required for organization %', p_organization_id
      USING ERRCODE = '42501';
  END IF;

  -- ─── 入力バリデーション ──────────────────────────────────────────
  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
    RAISE EXCEPTION 'title is required' USING ERRCODE = '22023';
  END IF;

  IF p_target IS NULL OR p_target NOT IN ('applicant', 'employee', 'both') THEN
    RAISE EXCEPTION 'invalid target: %', p_target USING ERRCODE = '22023';
  END IF;

  IF p_evaluation_type IS NULL OR p_evaluation_type NOT IN ('single', 'multi_rater') THEN
    RAISE EXCEPTION 'invalid evaluation_type: %', p_evaluation_type USING ERRCODE = '22023';
  END IF;

  IF p_anonymity_mode IS NULL OR p_anonymity_mode NOT IN ('none', 'peer_only', 'full') THEN
    RAISE EXCEPTION 'invalid anonymity_mode: %', p_anonymity_mode USING ERRCODE = '22023';
  END IF;

  -- ─── template 作成 ──────────────────────────────────────────────
  INSERT INTO public.evaluation_templates (
    organization_id,
    title,
    description,
    target,
    evaluation_type,
    anonymity_mode
  ) VALUES (
    p_organization_id,
    trim(p_title),
    NULLIF(trim(COALESCE(p_description, '')), ''),
    p_target,
    p_evaluation_type,
    -- single 評価では anonymity は常に 'none' に正規化
    CASE WHEN p_evaluation_type = 'multi_rater' THEN p_anonymity_mode ELSE 'none' END
  )
  RETURNING id INTO v_template_id;

  -- ─── criteria + anchors ─────────────────────────────────────────
  FOR v_criterion IN
    SELECT * FROM jsonb_array_elements(COALESCE(p_criteria, '[]'::jsonb))
  LOOP
    INSERT INTO public.evaluation_criteria (
      template_id,
      label,
      description,
      score_type,
      options,
      sort_order,
      weight
    ) VALUES (
      v_template_id,
      trim(COALESCE(v_criterion->>'label', '')),
      NULLIF(trim(COALESCE(v_criterion->>'description', '')), ''),
      v_criterion->>'score_type',
      CASE
        WHEN (v_criterion->>'score_type') = 'select'
         AND jsonb_typeof(v_criterion->'options') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(v_criterion->'options'))
        ELSE NULL
      END,
      v_cr_order,
      COALESCE((v_criterion->>'weight')::numeric, 1.0)
    )
    RETURNING id INTO v_criterion_id;

    v_anc_order := 0;
    FOR v_anchor IN
      SELECT * FROM jsonb_array_elements(COALESCE(v_criterion->'anchors', '[]'::jsonb))
    LOOP
      IF length(trim(COALESCE(v_anchor->>'description', ''))) > 0 THEN
        INSERT INTO public.evaluation_anchors (
          criterion_id,
          score_value,
          description,
          sort_order
        ) VALUES (
          v_criterion_id,
          (v_anchor->>'score_value')::int,
          v_anchor->>'description',
          v_anc_order
        );
        v_anc_order := v_anc_order + 1;
      END IF;
    END LOOP;

    v_cr_order := v_cr_order + 1;
  END LOOP;

  RETURN v_template_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_evaluation_template(
  text, text, text, text, text, text, jsonb
) TO authenticated;

COMMENT ON FUNCTION public.create_evaluation_template(
  text, text, text, text, text, text, jsonb
) IS '評価テンプレート + 基準 + アンカーを 1 トランザクションで作成する。権限は eval_templates_all_admin RLS と等価 (自組織 admin のみ)。';


-- ============================================================================
-- 3. submit_ad_hoc_evaluation RPC
-- ----------------------------------------------------------------------------
-- アドホック評価（応募者/社員詳細ページからの評価）の作成/更新を
-- evaluations + evaluation_scores 含めて 1 トランザクションで処理する。
-- cycle_id / assignment_id / rater_type は使わない。サイクル駆動フローは対象外。
--
-- 権限:
-- - 新規作成: 自組織メンバーのみ。evaluator_id は必ず auth.uid() に強制設定。
-- - 更新: 既存 evaluator 本人 または 自組織 admin のみ。
-- ============================================================================

CREATE OR REPLACE FUNCTION public.submit_ad_hoc_evaluation(
  p_evaluation_id uuid,       -- NULL なら新規
  p_organization_id text,
  p_template_id uuid,
  p_target_user_id text,
  p_application_id uuid,      -- NULL 可
  p_status text,              -- 'draft' | 'submitted'
  p_overall_comment text,
  p_scores jsonb
  -- p_scores 形式:
  --   [
  --     {
  --       "criterion_id": "uuid",
  --       "score": number | null,    -- 数値スコア
  --       "value": "string" | null,  -- text/select スコア
  --       "comment": "string" | null
  --     }, ...
  --   ]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_eval_id uuid;
  v_score jsonb;
  v_existing_evaluator text;
  v_submitted_at timestamptz;
BEGIN
  -- ─── 認証 ───────────────────────────────────────────────────────
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  -- ─── 入力バリデーション ──────────────────────────────────────────
  IF p_organization_id IS NULL THEN
    RAISE EXCEPTION 'organization_id is required' USING ERRCODE = '22023';
  END IF;

  IF p_template_id IS NULL THEN
    RAISE EXCEPTION 'template_id is required' USING ERRCODE = '22023';
  END IF;

  IF p_target_user_id IS NULL OR length(trim(p_target_user_id)) = 0 THEN
    RAISE EXCEPTION 'target_user_id is required' USING ERRCODE = '22023';
  END IF;

  IF p_status IS NULL OR p_status NOT IN ('draft', 'submitted') THEN
    RAISE EXCEPTION 'invalid status: %', p_status USING ERRCODE = '22023';
  END IF;

  -- 組織所属チェック（evaluations_insert_evaluator RLS の org-admin 分岐と等価）
  IF NOT EXISTS (
    SELECT 1 FROM public.get_my_organization_ids() AS org_id
    WHERE org_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'forbidden: not a member of organization %', p_organization_id
      USING ERRCODE = '42501';
  END IF;

  v_submitted_at := CASE WHEN p_status = 'submitted' THEN now() ELSE NULL END;

  IF p_evaluation_id IS NULL THEN
    -- ─── 新規作成 ────────────────────────────────────────────────
    -- evaluator_id は auth.uid() に強制。クライアントからの偽装不可。
    INSERT INTO public.evaluations (
      organization_id,
      template_id,
      target_user_id,
      evaluator_id,
      application_id,
      status,
      overall_comment,
      submitted_at
    ) VALUES (
      p_organization_id,
      p_template_id,
      p_target_user_id,
      auth.uid()::text,
      p_application_id,
      p_status,
      NULLIF(trim(COALESCE(p_overall_comment, '')), ''),
      v_submitted_at
    )
    RETURNING id INTO v_eval_id;
  ELSE
    -- ─── 更新 ────────────────────────────────────────────────────
    -- 権限: 既存 evaluator 本人 または 自組織 admin のみ
    SELECT evaluator_id INTO v_existing_evaluator
    FROM public.evaluations
    WHERE id = p_evaluation_id AND organization_id = p_organization_id
    FOR UPDATE;

    IF v_existing_evaluator IS NULL THEN
      RAISE EXCEPTION 'evaluation not found: %', p_evaluation_id USING ERRCODE = '02000';
    END IF;

    IF v_existing_evaluator <> auth.uid()::text
       AND public.get_my_role() <> 'admin' THEN
      RAISE EXCEPTION 'forbidden: not the evaluator' USING ERRCODE = '42501';
    END IF;

    -- 不変フィールド (organization_id / template_id / evaluator_id / target_user_id)
    -- は SET 対象外。移動・なりすましを物理的に防ぐ。
    UPDATE public.evaluations
    SET status = p_status,
        overall_comment = NULLIF(trim(COALESCE(p_overall_comment, '')), ''),
        submitted_at = v_submitted_at
    WHERE id = p_evaluation_id;

    -- 既存スコアを全削除して再作成。UNIQUE (evaluation_id, criterion_id) に
    -- 依存するわけではないが、重複スコアが二度と生まれないよう delete→insert。
    DELETE FROM public.evaluation_scores WHERE evaluation_id = p_evaluation_id;

    v_eval_id := p_evaluation_id;
  END IF;

  -- ─── スコア insert ──────────────────────────────────────────────
  -- score (数値) / value (text or select) / comment のいずれかが有意義な値を
  -- 持つ行のみ保存する。3 つとも空の行はスキップ。
  FOR v_score IN
    SELECT * FROM jsonb_array_elements(COALESCE(p_scores, '[]'::jsonb))
  LOOP
    IF (
      jsonb_typeof(v_score->'score') = 'number'
      OR length(trim(COALESCE(v_score->>'value', ''))) > 0
      OR length(trim(COALESCE(v_score->>'comment', ''))) > 0
    ) THEN
      INSERT INTO public.evaluation_scores (
        evaluation_id,
        criterion_id,
        score,
        value,
        comment
      ) VALUES (
        v_eval_id,
        (v_score->>'criterion_id')::uuid,
        CASE
          WHEN jsonb_typeof(v_score->'score') = 'number'
          THEN (v_score->>'score')::numeric
          ELSE NULL
        END,
        NULLIF(trim(COALESCE(v_score->>'value', '')), ''),
        NULLIF(trim(COALESCE(v_score->>'comment', '')), '')
      );
    END IF;
  END LOOP;

  RETURN v_eval_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_ad_hoc_evaluation(
  uuid, text, uuid, text, uuid, text, text, jsonb
) TO authenticated;

COMMENT ON FUNCTION public.submit_ad_hoc_evaluation(
  uuid, text, uuid, text, uuid, text, text, jsonb
) IS 'アドホック評価（応募者/社員詳細から直接作成する評価）の作成・更新をアトミックに処理する。cycle_id / assignment_id は扱わない。サイクル駆動の評価フローは別経路。';
