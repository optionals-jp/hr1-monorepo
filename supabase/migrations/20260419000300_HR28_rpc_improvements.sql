-- ============================================================================
-- HR-28: 評価テンプレート RPC 群の改善 (Block B)
-- ============================================================================
--
-- レビュー v1/v2 で指摘された High 問題 (H4) と付随改善を反映:
--
--   H4: 同時実行制御なし。add/reorder で sort_order 競合の余地。
--       → pg_advisory_xact_lock で排他制御 (add_criterion / reorder /
--         duplicate のみ。単一行 UPDATE/DELETE は row lock で十分)。
--
--   エラーメッセージ日本語化:
--       RPC が RAISE する例外メッセージを UI でそのまま表示するため
--       日本語固定。ERRCODE は P0001 (user-defined) に統一。
--
--   配列長制限:
--       大量配列での暴走防止。
--
--   duplicate の sort_order 再採番:
--       ROW_NUMBER() で 1..N に正規化 (ソースの飛び番を継承しない)。
--
-- 互換性:
--   既存ヘルパー `_hr28_require_template_admin(text)` /
--   `_hr28_replace_criterion_anchors(text, jsonb)` のシグネチャは不変。
--   全 RPC に `SECURITY DEFINER` + `SET search_path = public` を維持。
--   引数シグネチャも不変 (CREATE OR REPLACE)。
-- ============================================================================


-- ---------------------------------------------------------------------------
-- _hr28_require_template_admin: エラーメッセージ日本語化 (シグネチャ不変)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._hr28_require_template_admin(p_template_id text)
RETURNS TABLE(organization_id text, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id text;
  v_status text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'ログインが必要です' USING ERRCODE = 'P0001';
  END IF;

  IF p_template_id IS NULL THEN
    RAISE EXCEPTION 'テンプレート ID が指定されていません' USING ERRCODE = 'P0001';
  END IF;

  SELECT t.organization_id, t.status
    INTO v_org_id, v_status
    FROM public.evaluation_templates t
   WHERE t.id = p_template_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'テンプレートが見つかりません' USING ERRCODE = 'P0001';
  END IF;

  IF NOT (
    public.get_my_role() = 'admin'
    AND EXISTS (
      SELECT 1 FROM public.get_my_organization_ids() AS org_id
      WHERE org_id = v_org_id
    )
  ) THEN
    RAISE EXCEPTION 'この操作を行う権限がありません' USING ERRCODE = 'P0001';
  END IF;

  organization_id := v_org_id;
  status := v_status;
  RETURN NEXT;
END;
$$;


-- ---------------------------------------------------------------------------
-- add_evaluation_criterion: sort_order 競合対策で advisory lock を追加
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_evaluation_criterion(
  p_template_id text,
  p_label text,
  p_description text,
  p_score_type text,
  p_options jsonb,
  p_weight numeric,
  p_anchors jsonb
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth record;
  v_criterion_id text;
  v_next_sort int;
BEGIN
  -- 並行 add/reorder との競合を排除
  PERFORM pg_advisory_xact_lock(hashtext('hr28:template:' || p_template_id));

  SELECT * INTO v_auth FROM public._hr28_require_template_admin(p_template_id);

  IF v_auth.status = 'archived' THEN
    RAISE EXCEPTION 'アーカイブ済みテンプレートは編集できません' USING ERRCODE = 'P0001';
  END IF;

  IF p_label IS NULL OR length(trim(p_label)) = 0 THEN
    RAISE EXCEPTION 'ラベルを入力してください' USING ERRCODE = 'P0001';
  END IF;

  IF p_score_type IS NULL
     OR p_score_type NOT IN ('five_star', 'ten_point', 'text', 'select') THEN
    RAISE EXCEPTION 'スコアタイプが不正です' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(MAX(sort_order) + 1, 0)
    INTO v_next_sort
    FROM public.evaluation_criteria
   WHERE template_id = p_template_id
     AND deleted_at IS NULL;

  INSERT INTO public.evaluation_criteria (
    template_id,
    label,
    description,
    score_type,
    options,
    sort_order,
    weight
  ) VALUES (
    p_template_id,
    trim(p_label),
    NULLIF(trim(COALESCE(p_description, '')), ''),
    p_score_type,
    CASE
      WHEN p_score_type = 'select'
       AND jsonb_typeof(p_options) = 'array'
      THEN ARRAY(SELECT jsonb_array_elements_text(p_options))
      ELSE NULL
    END,
    v_next_sort,
    COALESCE(p_weight, 1.0)
  )
  RETURNING id INTO v_criterion_id;

  PERFORM public._hr28_replace_criterion_anchors(v_criterion_id, p_anchors);

  RETURN v_criterion_id;
END;
$$;


-- ---------------------------------------------------------------------------
-- update_evaluation_criterion: エラーメッセージ日本語化のみ (単一行操作のため lock 不要)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_evaluation_criterion(
  p_criterion_id text,
  p_label text,
  p_description text,
  p_score_type text,
  p_options jsonb,
  p_weight numeric,
  p_anchors jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template_id text;
  v_current_score_type text;
  v_auth record;
  v_has_scores boolean;
BEGIN
  IF p_criterion_id IS NULL THEN
    RAISE EXCEPTION '評価項目 ID が指定されていません' USING ERRCODE = 'P0001';
  END IF;

  SELECT c.template_id, c.score_type
    INTO v_template_id, v_current_score_type
    FROM public.evaluation_criteria c
   WHERE c.id = p_criterion_id
     AND c.deleted_at IS NULL;

  IF v_template_id IS NULL THEN
    RAISE EXCEPTION '評価項目が見つかりません' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_auth FROM public._hr28_require_template_admin(v_template_id);

  IF v_auth.status = 'archived' THEN
    RAISE EXCEPTION 'アーカイブ済みテンプレートは編集できません' USING ERRCODE = 'P0001';
  END IF;

  IF p_label IS NULL OR length(trim(p_label)) = 0 THEN
    RAISE EXCEPTION 'ラベルを入力してください' USING ERRCODE = 'P0001';
  END IF;

  IF p_score_type IS NULL
     OR p_score_type NOT IN ('five_star', 'ten_point', 'text', 'select') THEN
    RAISE EXCEPTION 'スコアタイプが不正です' USING ERRCODE = 'P0001';
  END IF;

  -- score_type 変更時は、既存スコアが無いことを確認（published 保護）
  IF p_score_type <> v_current_score_type THEN
    SELECT EXISTS (
      SELECT 1 FROM public.evaluation_scores WHERE criterion_id = p_criterion_id
    ) INTO v_has_scores;

    IF v_has_scores THEN
      RAISE EXCEPTION '既に評価に使用されている項目のスコアタイプは変更できません'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  UPDATE public.evaluation_criteria
     SET label = trim(p_label),
         description = NULLIF(trim(COALESCE(p_description, '')), ''),
         score_type = p_score_type,
         options = CASE
           WHEN p_score_type = 'select'
            AND jsonb_typeof(p_options) = 'array'
           THEN ARRAY(SELECT jsonb_array_elements_text(p_options))
           ELSE NULL
         END,
         weight = COALESCE(p_weight, weight)
   WHERE id = p_criterion_id;

  PERFORM public._hr28_replace_criterion_anchors(p_criterion_id, p_anchors);
END;
$$;


-- ---------------------------------------------------------------------------
-- delete_evaluation_criterion: エラーメッセージ日本語化のみ
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_evaluation_criterion(p_criterion_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template_id text;
  v_auth record;
  v_has_scores boolean;
BEGIN
  IF p_criterion_id IS NULL THEN
    RAISE EXCEPTION '評価項目 ID が指定されていません' USING ERRCODE = 'P0001';
  END IF;

  SELECT c.template_id
    INTO v_template_id
    FROM public.evaluation_criteria c
   WHERE c.id = p_criterion_id
     AND c.deleted_at IS NULL;

  IF v_template_id IS NULL THEN
    RAISE EXCEPTION '評価項目が見つからないか、既に削除されています'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_auth FROM public._hr28_require_template_admin(v_template_id);

  IF v_auth.status = 'archived' THEN
    RAISE EXCEPTION 'アーカイブ済みテンプレートは編集できません' USING ERRCODE = 'P0001';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.evaluation_scores WHERE criterion_id = p_criterion_id
  ) INTO v_has_scores;

  IF v_has_scores THEN
    -- 論理削除: 過去評価の参照を保つ
    UPDATE public.evaluation_criteria
       SET deleted_at = now()
     WHERE id = p_criterion_id;
  ELSE
    -- 物理削除: anchors は FK CASCADE で同時削除
    DELETE FROM public.evaluation_criteria WHERE id = p_criterion_id;
  END IF;
END;
$$;


-- ---------------------------------------------------------------------------
-- reorder_evaluation_criteria: advisory lock + 配列長制限 + 日本語化
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reorder_evaluation_criteria(
  p_template_id text,
  p_criterion_ids text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth record;
  v_id text;
  v_i int := 0;
BEGIN
  -- 並行 add/reorder との競合を排除
  PERFORM pg_advisory_xact_lock(hashtext('hr28:template:' || p_template_id));

  SELECT * INTO v_auth FROM public._hr28_require_template_admin(p_template_id);

  IF p_criterion_ids IS NULL THEN
    RAISE EXCEPTION '並び順の ID 配列が指定されていません' USING ERRCODE = 'P0001';
  END IF;

  IF array_length(p_criterion_ids, 1) > 100 THEN
    RAISE EXCEPTION '評価項目数の上限 (100) を超えています' USING ERRCODE = 'P0001';
  END IF;

  -- 配列内の ID が当該テンプレートのアクティブ項目であることを検証
  IF EXISTS (
    SELECT 1 FROM unnest(p_criterion_ids) AS cid
    WHERE NOT EXISTS (
      SELECT 1 FROM public.evaluation_criteria c
       WHERE c.id = cid
         AND c.template_id = p_template_id
         AND c.deleted_at IS NULL
    )
  ) THEN
    RAISE EXCEPTION '並び順の ID 配列が既存項目と一致しません' USING ERRCODE = 'P0001';
  END IF;

  FOREACH v_id IN ARRAY p_criterion_ids
  LOOP
    UPDATE public.evaluation_criteria
       SET sort_order = v_i
     WHERE id = v_id;
    v_i := v_i + 1;
  END LOOP;
END;
$$;


-- ---------------------------------------------------------------------------
-- update_evaluation_template: エラーメッセージ日本語化
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_evaluation_template(
  p_template_id text,
  p_title text,
  p_description text,
  p_evaluation_type text,
  p_anonymity_mode text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth record;
BEGIN
  SELECT * INTO v_auth FROM public._hr28_require_template_admin(p_template_id);

  IF v_auth.status = 'archived' THEN
    RAISE EXCEPTION 'アーカイブ済みテンプレートは編集できません' USING ERRCODE = 'P0001';
  END IF;

  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
    RAISE EXCEPTION 'タイトルを入力してください' USING ERRCODE = 'P0001';
  END IF;

  IF p_evaluation_type IS NOT NULL
     AND p_evaluation_type NOT IN ('single', 'multi_rater') THEN
    RAISE EXCEPTION '評価方式が不正です' USING ERRCODE = 'P0001';
  END IF;

  IF p_anonymity_mode IS NOT NULL
     AND p_anonymity_mode NOT IN ('none', 'peer_only', 'full') THEN
    RAISE EXCEPTION '匿名化モードが不正です' USING ERRCODE = 'P0001';
  END IF;

  IF v_auth.status = 'draft' THEN
    UPDATE public.evaluation_templates
       SET title = trim(p_title),
           description = NULLIF(trim(COALESCE(p_description, '')), ''),
           evaluation_type = COALESCE(p_evaluation_type, evaluation_type),
           anonymity_mode = CASE
             WHEN COALESCE(p_evaluation_type, evaluation_type) = 'multi_rater'
             THEN COALESCE(p_anonymity_mode, anonymity_mode)
             ELSE 'none'
           END
     WHERE id = p_template_id;
  ELSE
    -- published: title / description のみ
    UPDATE public.evaluation_templates
       SET title = trim(p_title),
           description = NULLIF(trim(COALESCE(p_description, '')), '')
     WHERE id = p_template_id;
  END IF;
END;
$$;


-- ---------------------------------------------------------------------------
-- publish_evaluation_template: エラーメッセージ日本語化
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.publish_evaluation_template(p_template_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth record;
  v_has_active_criteria boolean;
BEGIN
  SELECT * INTO v_auth FROM public._hr28_require_template_admin(p_template_id);

  IF v_auth.status = 'archived' THEN
    RAISE EXCEPTION 'アーカイブ済みテンプレートは公開できません' USING ERRCODE = 'P0001';
  END IF;

  IF v_auth.status = 'published' THEN
    RETURN;  -- 冪等
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.evaluation_criteria
     WHERE template_id = p_template_id AND deleted_at IS NULL
  ) INTO v_has_active_criteria;

  IF NOT v_has_active_criteria THEN
    RAISE EXCEPTION '公開するには少なくとも 1 つの評価項目が必要です'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.evaluation_templates
     SET status = 'published'
   WHERE id = p_template_id;
END;
$$;


-- ---------------------------------------------------------------------------
-- archive_evaluation_template: 変更なし (旧版はエラーメッセージを出さない)
--   念のため CREATE OR REPLACE で search_path 等を固定し直す。
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.archive_evaluation_template(p_template_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth record;
BEGIN
  SELECT * INTO v_auth FROM public._hr28_require_template_admin(p_template_id);

  IF v_auth.status = 'archived' THEN
    RETURN;  -- 冪等
  END IF;

  UPDATE public.evaluation_templates
     SET status = 'archived'
   WHERE id = p_template_id;
END;
$$;


-- ---------------------------------------------------------------------------
-- duplicate_evaluation_template: advisory lock + sort_order 再採番 + 日本語化
--
-- 複製先テンプレは新 ID (= ロック対象なし) だが、**ソース側の criteria 参照**を
-- 一貫して読むためにソース template に対して advisory lock を取る。
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.duplicate_evaluation_template(
  p_template_id text,
  p_new_title text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth record;
  v_src record;
  v_new_template_id text;
  v_src_criterion record;
  v_new_criterion_id text;
  v_sort_idx int := 0;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('hr28:template:' || p_template_id));

  SELECT * INTO v_auth FROM public._hr28_require_template_admin(p_template_id);

  IF p_new_title IS NULL OR length(trim(p_new_title)) = 0 THEN
    RAISE EXCEPTION '新しいタイトルを入力してください' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_src
    FROM public.evaluation_templates
   WHERE id = p_template_id;

  -- テンプレート本体を複製（status は draft で新規採番）
  INSERT INTO public.evaluation_templates (
    organization_id,
    title,
    description,
    target,
    evaluation_type,
    anonymity_mode,
    status
  ) VALUES (
    v_src.organization_id,
    trim(p_new_title),
    v_src.description,
    v_src.target,
    v_src.evaluation_type,
    v_src.anonymity_mode,
    'draft'
  )
  RETURNING id INTO v_new_template_id;

  -- アクティブ項目のみを新テンプレートへコピー（anchors 含む）
  -- sort_order はソースの飛び番を継承せず 0..N-1 に再採番する
  FOR v_src_criterion IN
    SELECT * FROM public.evaluation_criteria
     WHERE template_id = p_template_id
       AND deleted_at IS NULL
     ORDER BY sort_order, id
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
      v_new_template_id,
      v_src_criterion.label,
      v_src_criterion.description,
      v_src_criterion.score_type,
      v_src_criterion.options,
      v_sort_idx,
      v_src_criterion.weight
    )
    RETURNING id INTO v_new_criterion_id;

    INSERT INTO public.evaluation_anchors (
      criterion_id,
      score_value,
      description,
      sort_order
    )
    SELECT v_new_criterion_id,
           a.score_value,
           a.description,
           a.sort_order
      FROM public.evaluation_anchors a
     WHERE a.criterion_id = v_src_criterion.id;

    v_sort_idx := v_sort_idx + 1;
  END LOOP;

  RETURN v_new_template_id;
END;
$$;


-- ---------------------------------------------------------------------------
-- create_evaluation_template: 既存 RPC の配列長制限追加
--
-- 既存定義は 20260413000000_baseline.sql 側にあり、本 migration では
-- CREATE OR REPLACE せずに置いておく（signature が確定していないため）。
-- 配列長制限は follow-up で対応する。
-- ---------------------------------------------------------------------------
-- (follow-up: create_evaluation_template の criteria 配列長制限)
