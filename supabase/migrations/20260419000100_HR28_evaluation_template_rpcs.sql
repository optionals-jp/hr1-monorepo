-- ============================================================================
-- HR-28: 評価テンプレート編集用 RPC 群
-- ============================================================================
--
-- 既存 `create_evaluation_template` / `submit_ad_hoc_evaluation` と同じ設計方針:
--   - SECURITY DEFINER + SET search_path = public
--   - 冒頭で auth.uid() / role / 所属組織をチェック
--   - 複数テーブルへの書き込みはトランザクションで包む
--   - クライアントは deprecated な直 INSERT を呼ばず、必ずこの RPC 経由で書く
--
-- 新規 RPC 一覧:
--   - add_evaluation_criterion(...)       項目の追加
--   - update_evaluation_criterion(...)    項目の編集
--   - delete_evaluation_criterion(...)    項目の削除（論理 or 物理）
--   - reorder_evaluation_criteria(...)    項目の並び替え
--   - update_evaluation_template(...)     テンプレートのメタ編集
--   - publish_evaluation_template(...)    draft → published
--   - archive_evaluation_template(...)    published → archived
--   - duplicate_evaluation_template(...)  テンプレートの複製
--
-- 共通バリデーション:
--   - 未ログインは 42501 (unauthenticated)
--   - admin ロール以外は 42501 (forbidden)
--   - 所属組織以外のテンプレ/項目に対する操作は 42501 (forbidden)
--   - CHECK 制約違反は 22023 (invalid_parameter_value)
--   - archived のテンプレは全編集操作で拒否（publish/archive 自身を除く）
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 内部ヘルパー: 権限チェック + テンプレートの status / organization_id 取得
--
-- テンプレート単位の操作で毎回書く定型処理を集約する。
-- 呼び出し側は v_status を受け取り、archived / published の分岐を行う。
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
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  IF p_template_id IS NULL THEN
    RAISE EXCEPTION 'template_id is required' USING ERRCODE = '22023';
  END IF;

  SELECT t.organization_id, t.status
    INTO v_org_id, v_status
    FROM public.evaluation_templates t
   WHERE t.id = p_template_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'template not found: %', p_template_id USING ERRCODE = '42501';
  END IF;

  IF NOT (
    public.get_my_role() = 'admin'
    AND EXISTS (
      SELECT 1 FROM public.get_my_organization_ids() AS org_id
      WHERE org_id = v_org_id
    )
  ) THEN
    RAISE EXCEPTION 'forbidden: admin role required for organization %', v_org_id
      USING ERRCODE = '42501';
  END IF;

  organization_id := v_org_id;
  status := v_status;
  RETURN NEXT;
END;
$$;

ALTER FUNCTION public._hr28_require_template_admin(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public._hr28_require_template_admin(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._hr28_require_template_admin(text) TO authenticated, service_role;


-- ---------------------------------------------------------------------------
-- 内部ヘルパー: criterion の anchors を一括置換
--
-- DELETE → INSERT で、UI から受け取った配列を正として反映する。
-- score_value が NULL / 空 description の要素はスキップする。
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._hr28_replace_criterion_anchors(
  p_criterion_id text,
  p_anchors jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_anchor jsonb;
  v_anc_order int := 0;
BEGIN
  DELETE FROM public.evaluation_anchors WHERE criterion_id = p_criterion_id;

  FOR v_anchor IN
    SELECT * FROM jsonb_array_elements(COALESCE(p_anchors, '[]'::jsonb))
  LOOP
    IF (v_anchor->>'score_value') IS NOT NULL
       AND length(trim(COALESCE(v_anchor->>'description', ''))) > 0 THEN
      INSERT INTO public.evaluation_anchors (
        criterion_id,
        score_value,
        description,
        sort_order
      ) VALUES (
        p_criterion_id,
        (v_anchor->>'score_value')::int,
        v_anchor->>'description',
        v_anc_order
      );
      v_anc_order := v_anc_order + 1;
    END IF;
  END LOOP;
END;
$$;

ALTER FUNCTION public._hr28_replace_criterion_anchors(text, jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public._hr28_replace_criterion_anchors(text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._hr28_replace_criterion_anchors(text, jsonb) TO service_role;


-- ---------------------------------------------------------------------------
-- add_evaluation_criterion: 評価項目を1件追加
--
-- published なテンプレートに対する差分追加は常に安全（既存 evaluation_scores
-- には影響しない）ので許可する。archived は拒否。
-- sort_order は既存アクティブ項目の最大 + 1。
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
  SELECT * INTO v_auth FROM public._hr28_require_template_admin(p_template_id);

  IF v_auth.status = 'archived' THEN
    RAISE EXCEPTION 'template is archived, cannot add criterion' USING ERRCODE = '42501';
  END IF;

  IF p_label IS NULL OR length(trim(p_label)) = 0 THEN
    RAISE EXCEPTION 'label is required' USING ERRCODE = '22023';
  END IF;

  IF p_score_type IS NULL
     OR p_score_type NOT IN ('five_star', 'ten_point', 'text', 'select') THEN
    RAISE EXCEPTION 'invalid score_type: %', p_score_type USING ERRCODE = '22023';
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

ALTER FUNCTION public.add_evaluation_criterion(text, text, text, text, jsonb, numeric, jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.add_evaluation_criterion(text, text, text, text, jsonb, numeric, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_evaluation_criterion(text, text, text, text, jsonb, numeric, jsonb) TO authenticated, service_role;


-- ---------------------------------------------------------------------------
-- update_evaluation_criterion: 評価項目を編集
--
-- published かつ既存 evaluation_scores を持つ項目では score_type の変更を禁止する。
-- label / description / options / weight / anchors は常に編集可。
-- archived は全編集不可。
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
    RAISE EXCEPTION 'criterion_id is required' USING ERRCODE = '22023';
  END IF;

  SELECT c.template_id, c.score_type
    INTO v_template_id, v_current_score_type
    FROM public.evaluation_criteria c
   WHERE c.id = p_criterion_id
     AND c.deleted_at IS NULL;

  IF v_template_id IS NULL THEN
    RAISE EXCEPTION 'criterion not found: %', p_criterion_id USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_auth FROM public._hr28_require_template_admin(v_template_id);

  IF v_auth.status = 'archived' THEN
    RAISE EXCEPTION 'template is archived, cannot edit criterion' USING ERRCODE = '42501';
  END IF;

  IF p_label IS NULL OR length(trim(p_label)) = 0 THEN
    RAISE EXCEPTION 'label is required' USING ERRCODE = '22023';
  END IF;

  IF p_score_type IS NULL
     OR p_score_type NOT IN ('five_star', 'ten_point', 'text', 'select') THEN
    RAISE EXCEPTION 'invalid score_type: %', p_score_type USING ERRCODE = '22023';
  END IF;

  -- score_type 変更時は、既存スコアが無いことを確認（published 保護）
  IF p_score_type <> v_current_score_type THEN
    SELECT EXISTS (
      SELECT 1 FROM public.evaluation_scores WHERE criterion_id = p_criterion_id
    ) INTO v_has_scores;

    IF v_has_scores THEN
      RAISE EXCEPTION 'cannot change score_type: existing evaluation_scores reference this criterion'
        USING ERRCODE = '42501';
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

ALTER FUNCTION public.update_evaluation_criterion(text, text, text, text, jsonb, numeric, jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.update_evaluation_criterion(text, text, text, text, jsonb, numeric, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_evaluation_criterion(text, text, text, text, jsonb, numeric, jsonb) TO authenticated, service_role;


-- ---------------------------------------------------------------------------
-- delete_evaluation_criterion: 評価項目を削除
--
-- 既存 evaluation_scores が存在する場合は論理削除（deleted_at = now()）、
-- 存在しない場合は物理削除（CASCADE で anchors も削除される）。
-- archived は拒否。
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
    RAISE EXCEPTION 'criterion_id is required' USING ERRCODE = '22023';
  END IF;

  SELECT c.template_id
    INTO v_template_id
    FROM public.evaluation_criteria c
   WHERE c.id = p_criterion_id
     AND c.deleted_at IS NULL;

  IF v_template_id IS NULL THEN
    RAISE EXCEPTION 'criterion not found or already deleted: %', p_criterion_id
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_auth FROM public._hr28_require_template_admin(v_template_id);

  IF v_auth.status = 'archived' THEN
    RAISE EXCEPTION 'template is archived, cannot delete criterion' USING ERRCODE = '42501';
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

ALTER FUNCTION public.delete_evaluation_criterion(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.delete_evaluation_criterion(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_evaluation_criterion(text) TO authenticated, service_role;


-- ---------------------------------------------------------------------------
-- reorder_evaluation_criteria: 評価項目の並び替え
--
-- p_criterion_ids の配列順に sort_order を 0 から採番する。
-- 指定されなかった項目は末尾に回す（sort_order = array_length + offset）。
-- archived でも並び順の整理は許可する（表示順のみの変更のため）。
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
  SELECT * INTO v_auth FROM public._hr28_require_template_admin(p_template_id);

  IF p_criterion_ids IS NULL THEN
    RAISE EXCEPTION 'criterion_ids is required' USING ERRCODE = '22023';
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
    RAISE EXCEPTION 'criterion_ids contains ids not belonging to template %', p_template_id
      USING ERRCODE = '22023';
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

ALTER FUNCTION public.reorder_evaluation_criteria(text, text[]) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.reorder_evaluation_criteria(text, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reorder_evaluation_criteria(text, text[]) TO authenticated, service_role;


-- ---------------------------------------------------------------------------
-- update_evaluation_template: テンプレートのメタ情報を編集
--
-- published では title / description のみ編集可。
-- draft では evaluation_type / anonymity_mode も編集可。
-- archived は拒否。
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
    RAISE EXCEPTION 'template is archived, cannot edit' USING ERRCODE = '42501';
  END IF;

  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
    RAISE EXCEPTION 'title is required' USING ERRCODE = '22023';
  END IF;

  IF p_evaluation_type IS NOT NULL
     AND p_evaluation_type NOT IN ('single', 'multi_rater') THEN
    RAISE EXCEPTION 'invalid evaluation_type: %', p_evaluation_type USING ERRCODE = '22023';
  END IF;

  IF p_anonymity_mode IS NOT NULL
     AND p_anonymity_mode NOT IN ('none', 'peer_only', 'full') THEN
    RAISE EXCEPTION 'invalid anonymity_mode: %', p_anonymity_mode USING ERRCODE = '22023';
  END IF;

  IF v_auth.status = 'draft' THEN
    -- draft: 全項目編集可
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

ALTER FUNCTION public.update_evaluation_template(text, text, text, text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.update_evaluation_template(text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_evaluation_template(text, text, text, text, text) TO authenticated, service_role;


-- ---------------------------------------------------------------------------
-- publish_evaluation_template: draft → published
--
-- 少なくとも1つのアクティブな評価項目を持つこと。
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
    RAISE EXCEPTION 'template is archived, cannot publish' USING ERRCODE = '42501';
  END IF;

  IF v_auth.status = 'published' THEN
    RETURN;  -- 冪等
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.evaluation_criteria
     WHERE template_id = p_template_id AND deleted_at IS NULL
  ) INTO v_has_active_criteria;

  IF NOT v_has_active_criteria THEN
    RAISE EXCEPTION 'cannot publish template without at least one criterion'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.evaluation_templates
     SET status = 'published'
   WHERE id = p_template_id;
END;
$$;

ALTER FUNCTION public.publish_evaluation_template(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.publish_evaluation_template(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_evaluation_template(text) TO authenticated, service_role;


-- ---------------------------------------------------------------------------
-- archive_evaluation_template: published → archived
--
-- 新規の評価サイクル割当を防ぐ。過去データは保持される。
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

ALTER FUNCTION public.archive_evaluation_template(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.archive_evaluation_template(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.archive_evaluation_template(text) TO authenticated, service_role;


-- ---------------------------------------------------------------------------
-- duplicate_evaluation_template: テンプレートを複製（アクティブ項目のみ）
--
-- 複製先は常に draft。削除済み項目は複製されない。
-- 大幅改訂時に「複製 → 編集 → 旧版アーカイブ」のワークフローを実現する。
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
BEGIN
  SELECT * INTO v_auth FROM public._hr28_require_template_admin(p_template_id);

  IF p_new_title IS NULL OR length(trim(p_new_title)) = 0 THEN
    RAISE EXCEPTION 'new_title is required' USING ERRCODE = '22023';
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
      v_src_criterion.sort_order,
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
  END LOOP;

  RETURN v_new_template_id;
END;
$$;

ALTER FUNCTION public.duplicate_evaluation_template(text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.duplicate_evaluation_template(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.duplicate_evaluation_template(text, text) TO authenticated, service_role;
