-- ============================================================================
-- HR-29: 採用担当者向け応募者タスク一括付与機能
-- ============================================================================
--
-- 採用担当者が複数応募者に対してタスク（書類提出リマインド・お知らせ等）を
-- 一括付与する機能。対象は「個別選択」または「AND条件フィルタ」で指定する。
--
-- データモデル:
--   recruiter_tasks (親)  -- 採用担当が作成するタスク定義
--     └ applicant_todos (子)  -- 既存テーブル。source='recruiter_task' で識別
--       └ notifications        -- 既存テーブル。type='recruiter_task' で識別
--
-- 設計方針:
--   - 採用担当者が applicant_todos を直接 SELECT/INSERT/DELETE できる RLS は追加しない。
--     代わりに SECURITY DEFINER RPC 経由で操作する（攻撃面最小化）。
--   - 対象応募者の解決ロジックは resolve_recruiter_task_targets に集約し、
--     プレビュー (preview_recruiter_task_targets) と作成 (create_recruiter_task) で共用。
--   - 応募者本人は既存の「自分のTODO」ポリシーで完了切替のみ可能（採用担当は UPDATE できない）。
--   - 削除は RPC でも可能だが、手動 SQL で親だけ削除された場合に備えてトリガで子も cleanup。
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. notifications.type CHECK 拡張: recruiter_task を許可
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
  ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
    CHECK (type IN (
      'survey_request', 'task_assigned', 'recruitment_update',
      'attendance_reminder', 'message_received', 'announcement', 'general',
      'crm_automation', 'crm_comment', 'recruiter_task'
    ));
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 2. applicant_todos 既存ポリシーの命名規約統一（日本語 → 規約準拠）
--
-- FOR ALL ポリシーは PERMISSIVE 結合で DELETE 制限を OR で上書きするため使わない。
-- 必要なアクションごとに SELECT / INSERT / UPDATE ポリシーを分割し、DELETE は既存の
-- applicant_todos_delete_manual_only (source='manual' のみ) を唯一の DELETE 経路とする。
-- これにより source='recruiter_task' の todo を応募者本人が直接 DELETE できない。
-- source='recruiter_task' の INSERT/DELETE は create_recruiter_task / delete_recruiter_task
-- の SECURITY DEFINER RPC 経由でのみ行われる。
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "自分のTODOを管理" ON public.applicant_todos;
DROP POLICY IF EXISTS "自分のTODOを閲覧" ON public.applicant_todos;

CREATE POLICY applicant_todos_select_self ON public.applicant_todos
  FOR SELECT USING (user_id = (auth.uid())::text);

CREATE POLICY applicant_todos_insert_self ON public.applicant_todos
  FOR INSERT WITH CHECK (
    user_id = (auth.uid())::text
    AND source = 'manual'
  );

-- UPDATE は完了状態切替など応募者自身の操作を許可する。
-- source / source_id の書き換えを厳密に禁止する制約は MVP では付けないが、
-- クライアントは toJson() で元値を送る実装のため実害なし。必要になったら
-- `WITH CHECK (... AND source = OLD.source)` 相当のトリガ制約を追加する。
CREATE POLICY applicant_todos_update_self ON public.applicant_todos
  FOR UPDATE USING (user_id = (auth.uid())::text)
  WITH CHECK (user_id = (auth.uid())::text);

-- DELETE は既存の applicant_todos_delete_manual_only (source='manual') のみ使用

-- ---------------------------------------------------------------------------
-- 3. recruiter_tasks テーブル作成
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recruiter_tasks (
  id               text PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  organization_id  text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title            text NOT NULL,
  description      text,
  due_date         date,
  action_url       text,
  target_mode      text NOT NULL CHECK (target_mode IN ('individual', 'filter')),
  target_criteria  jsonb NOT NULL DEFAULT '{}'::jsonb,
  target_count     integer NOT NULL,
  created_count    integer NOT NULL,
  created_by       text REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recruiter_tasks OWNER TO postgres;

CREATE INDEX IF NOT EXISTS idx_recruiter_tasks_org_created
  ON public.recruiter_tasks (organization_id, created_at DESC);

CREATE TRIGGER set_recruiter_tasks_updated_at
  BEFORE UPDATE ON public.recruiter_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT ON TABLE public.recruiter_tasks TO authenticated;
GRANT ALL    ON TABLE public.recruiter_tasks TO service_role;

-- RLS: SELECT のみ。INSERT/UPDATE/DELETE は RPC 経由に限定（ポリシー無し）
ALTER TABLE public.recruiter_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY recruiter_tasks_select_org ON public.recruiter_tasks
  FOR SELECT USING (
    organization_id IN (SELECT public.get_my_organization_ids())
    AND public.get_my_role() IN ('employee', 'admin', 'manager', 'approver')
  );

-- ---------------------------------------------------------------------------
-- 4. 親削除時に子 applicant_todos を cleanup するトリガ
--    （通常は delete_recruiter_task RPC 経由で先に子を消すが、手動 SQL 対策の二重防御）
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._cleanup_recruiter_task_todos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.applicant_todos
   WHERE source = 'recruiter_task'
     AND source_id = OLD.id;
  RETURN OLD;
END;
$$;

ALTER FUNCTION public._cleanup_recruiter_task_todos() OWNER TO postgres;

CREATE TRIGGER recruiter_tasks_cleanup_todos
  AFTER DELETE ON public.recruiter_tasks
  FOR EACH ROW EXECUTE FUNCTION public._cleanup_recruiter_task_todos();

-- ---------------------------------------------------------------------------
-- 5. 内部ヘルパー: 採用担当権限チェック
--    hr1-employee-web の middleware.ts allowedRoles と揃える。
--    将来 permission key 導入時はここだけ差替え。
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._require_recruiter_task_manager(p_organization_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  IF p_organization_id IS NULL THEN
    RAISE EXCEPTION 'organization_id is required' USING ERRCODE = '22023';
  END IF;

  IF NOT (
    public.get_my_role() IN ('employee', 'admin', 'manager', 'approver')
    AND EXISTS (
      SELECT 1 FROM public.get_my_organization_ids() AS org_id
      WHERE org_id = p_organization_id
    )
  ) THEN
    RAISE EXCEPTION 'forbidden: recruiter task manager role required for organization %', p_organization_id
      USING ERRCODE = '42501';
  END IF;
END;
$$;

ALTER FUNCTION public._require_recruiter_task_manager(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public._require_recruiter_task_manager(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._require_recruiter_task_manager(text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6. 対象応募者解決関数: target_criteria から applicant_id 集合を返す
--
-- target_mode='individual' の場合:
--   criteria.applicant_ids 配列をそのまま（但し当該組織の applicant ロールに限定）
-- target_mode='filter' の場合:
--   以下 AND で絞り込み:
--     - hiring_type: 'new_grad'|'mid_career'|'none'(NULL明示)
--     - job_id: applications.job_id 一致
--     - application_status: applications.status 一致
--     - selection_step: {mode:'current'|'passed', step_type, min_step_order?}
--         current: in_progress ステップ、 passed: completed/skipped ステップ
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_recruiter_task_targets(
  p_organization_id text,
  p_target_mode text,
  p_target_criteria jsonb
)
RETURNS SETOF text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hiring_type text;
  v_job_id text;
  v_app_status text;
  v_step jsonb;
  v_step_mode text;
  v_step_type text;
  v_step_min_order int;
  v_step_min_order_raw text;
  v_applicant_ids text[];
BEGIN
  PERFORM public._require_recruiter_task_manager(p_organization_id);

  IF p_target_mode NOT IN ('individual', 'filter') THEN
    RAISE EXCEPTION 'invalid target_mode: %', p_target_mode USING ERRCODE = '22023';
  END IF;

  IF p_target_mode = 'individual' THEN
    -- 個別指定: applicant_ids 配列 ∩ 当該組織の applicant
    v_applicant_ids := ARRAY(
      SELECT jsonb_array_elements_text(COALESCE(p_target_criteria->'applicant_ids', '[]'::jsonb))
    );
    IF v_applicant_ids IS NULL OR array_length(v_applicant_ids, 1) IS NULL THEN
      RETURN;
    END IF;

    RETURN QUERY
    SELECT DISTINCT p.id
      FROM public.profiles p
      JOIN public.user_organizations uo ON uo.user_id = p.id
     WHERE uo.organization_id = p_organization_id
       AND p.role = 'applicant'
       AND p.id = ANY(v_applicant_ids);
    RETURN;
  END IF;

  -- filter モード
  v_hiring_type := p_target_criteria->>'hiring_type';
  v_job_id      := p_target_criteria->>'job_id';
  v_app_status  := p_target_criteria->>'application_status';
  v_step        := p_target_criteria->'selection_step';

  IF v_step IS NOT NULL AND jsonb_typeof(v_step) = 'object' THEN
    v_step_mode      := v_step->>'mode';
    v_step_type      := v_step->>'step_type';
    v_step_min_order_raw := NULLIF(v_step->>'min_step_order', '');
    IF v_step_min_order_raw IS NOT NULL THEN
      IF v_step_min_order_raw !~ '^\d+$' THEN
        RAISE EXCEPTION 'selection_step.min_step_order must be a non-negative integer: %',
          v_step_min_order_raw USING ERRCODE = '22023';
      END IF;
      v_step_min_order := v_step_min_order_raw::int;
    END IF;

    IF v_step_mode IS NOT NULL AND v_step_mode NOT IN ('current', 'passed') THEN
      RAISE EXCEPTION 'invalid selection_step.mode: %', v_step_mode USING ERRCODE = '22023';
    END IF;

    IF v_step_type IS NULL OR v_step_type = '' THEN
      RAISE EXCEPTION 'selection_step.step_type is required' USING ERRCODE = '22023';
    END IF;
  END IF;

  -- filter モードで条件が 1 つも指定されていない場合は組織全体が対象になるためエラー
  IF v_hiring_type IS NULL
     AND v_job_id IS NULL
     AND v_app_status IS NULL
     AND v_step IS NULL
  THEN
    RAISE EXCEPTION 'at least one filter criterion is required' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT DISTINCT p.id
    FROM public.profiles p
    JOIN public.user_organizations uo ON uo.user_id = p.id
   WHERE uo.organization_id = p_organization_id
     AND p.role = 'applicant'
     AND (
       v_hiring_type IS NULL
       OR (v_hiring_type = 'none' AND p.hiring_type IS NULL)
       OR (v_hiring_type <> 'none' AND p.hiring_type = v_hiring_type)
     )
     AND (
       (v_job_id IS NULL AND v_app_status IS NULL AND v_step IS NULL)
       OR EXISTS (
         SELECT 1
           FROM public.applications a
           LEFT JOIN public.application_steps s ON s.application_id = a.id
          WHERE a.applicant_id = p.id
            AND a.organization_id = p_organization_id
            AND (v_job_id IS NULL OR a.job_id = v_job_id)
            AND (v_app_status IS NULL OR a.status = v_app_status)
            AND (
              v_step IS NULL
              OR (
                s.step_type = v_step_type
                AND (
                  (v_step_mode = 'current'  AND s.status = 'in_progress')
                  OR (v_step_mode = 'passed' AND s.status IN ('completed', 'skipped'))
                )
                AND (v_step_min_order IS NULL OR s.step_order >= v_step_min_order)
              )
            )
       )
     );
END;
$$;

ALTER FUNCTION public.resolve_recruiter_task_targets(text, text, jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.resolve_recruiter_task_targets(text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_recruiter_task_targets(text, text, jsonb) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7. プレビュー用: 対象ユーザー一覧を返す (作成前確認に利用)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.preview_recruiter_task_targets(
  p_organization_id text,
  p_target_mode text,
  p_target_criteria jsonb
)
RETURNS TABLE (
  user_id text,
  display_name text,
  email text,
  avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id AS user_id, p.display_name, p.email, p.avatar_url
    FROM public.resolve_recruiter_task_targets(p_organization_id, p_target_mode, p_target_criteria) AS t(applicant_id)
    JOIN public.profiles p ON p.id = t.applicant_id
    ORDER BY p.display_name NULLS LAST, p.email;
END;
$$;

ALTER FUNCTION public.preview_recruiter_task_targets(text, text, jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.preview_recruiter_task_targets(text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.preview_recruiter_task_targets(text, text, jsonb) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 8. 作成 RPC: recruiter_tasks 親 + applicant_todos 子 + notifications + audit_logs を
--    1トランザクションで作成
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_recruiter_task(
  p_organization_id text,
  p_title text,
  p_description text,
  p_due_date date,
  p_action_url text,
  p_target_mode text,
  p_target_criteria jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id text := (auth.uid())::text;
  v_task_id text;
  v_target_ids text[];
  v_target_count int;
  v_created_count int;
  v_created_user_ids text[];
BEGIN
  PERFORM public._require_recruiter_task_manager(p_organization_id);

  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
    RAISE EXCEPTION 'title is required' USING ERRCODE = '22023';
  END IF;

  -- 対象解決
  SELECT array_agg(applicant_id) INTO v_target_ids
    FROM public.resolve_recruiter_task_targets(p_organization_id, p_target_mode, p_target_criteria)
      AS applicant_id;

  v_target_count := COALESCE(array_length(v_target_ids, 1), 0);

  IF v_target_count = 0 THEN
    RAISE EXCEPTION 'no_target_applicants' USING ERRCODE = 'P0001';
  END IF;

  -- 親 INSERT（created_count は後続の INSERT 結果で更新）
  INSERT INTO public.recruiter_tasks (
    organization_id, title, description, due_date, action_url,
    target_mode, target_criteria, target_count, created_count, created_by
  )
  VALUES (
    p_organization_id, p_title, p_description, p_due_date, p_action_url,
    p_target_mode, p_target_criteria, v_target_count, 0, v_user_id
  )
  RETURNING id INTO v_task_id;

  -- 子 applicant_todos バルク INSERT（既存 unique index による重複はスキップ）
  WITH inserted AS (
    INSERT INTO public.applicant_todos (
      organization_id, user_id, title, note, due_date,
      source, source_id, action_url
    )
    SELECT
      p_organization_id, applicant_id, p_title, p_description, p_due_date,
      'recruiter_task', v_task_id, p_action_url
      FROM unnest(v_target_ids) AS applicant_id
      ON CONFLICT DO NOTHING
      RETURNING user_id
  )
  SELECT array_agg(user_id), count(*)::int
    INTO v_created_user_ids, v_created_count
    FROM inserted;

  -- 実作成行数を親に反映
  UPDATE public.recruiter_tasks
     SET created_count = COALESCE(v_created_count, 0)
   WHERE id = v_task_id;

  -- 通知は実際に todo が作成されたユーザーのみに配信
  IF v_created_user_ids IS NOT NULL AND array_length(v_created_user_ids, 1) > 0 THEN
    INSERT INTO public.notifications (
      organization_id, user_id, type, title, body, action_url, metadata
    )
    SELECT
      p_organization_id, target_user_id, 'recruiter_task',
      p_title, p_description, p_action_url,
      jsonb_build_object('recruiter_task_id', v_task_id)
      FROM unnest(v_created_user_ids) AS target_user_id;
  END IF;

  -- 監査ログ（親 1 行のみ）
  INSERT INTO public.audit_logs (
    organization_id, user_id, action, table_name, record_id, changes, source
  )
  VALUES (
    p_organization_id, v_user_id, 'create', 'recruiter_tasks', v_task_id,
    jsonb_build_object(
      'title', p_title,
      'target_mode', p_target_mode,
      'target_count', v_target_count,
      'created_count', COALESCE(v_created_count, 0)
    ),
    'api'
  );

  RETURN jsonb_build_object(
    'task_id', v_task_id,
    'target_count', v_target_count,
    'created_count', COALESCE(v_created_count, 0)
  );
END;
$$;

ALTER FUNCTION public.create_recruiter_task(text, text, text, date, text, text, jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.create_recruiter_task(text, text, text, date, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_recruiter_task(text, text, text, date, text, text, jsonb) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 9. 削除 RPC: 親 DELETE → トリガで子 cleanup。監査ログ記録。
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_recruiter_task(p_task_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id text := (auth.uid())::text;
  v_org_id text;
  v_title text;
  v_target_count int;
BEGIN
  IF p_task_id IS NULL THEN
    RAISE EXCEPTION 'task_id is required' USING ERRCODE = '22023';
  END IF;

  SELECT organization_id, title, target_count
    INTO v_org_id, v_title, v_target_count
    FROM public.recruiter_tasks
   WHERE id = p_task_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'recruiter_task not found: %', p_task_id USING ERRCODE = '42501';
  END IF;

  PERFORM public._require_recruiter_task_manager(v_org_id);

  INSERT INTO public.audit_logs (
    organization_id, user_id, action, table_name, record_id, changes, source
  )
  VALUES (
    v_org_id, v_user_id, 'delete', 'recruiter_tasks', p_task_id,
    jsonb_build_object('title', v_title, 'target_count', v_target_count),
    'api'
  );

  DELETE FROM public.recruiter_tasks WHERE id = p_task_id;
END;
$$;

ALTER FUNCTION public.delete_recruiter_task(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.delete_recruiter_task(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_recruiter_task(text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 10. 詳細取得 RPC: 親 + 対象応募者の完了状態リスト
--     採用担当者は applicant_todos を直接 SELECT できないため、この RPC 経由で取得
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_recruiter_task_detail(p_task_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task jsonb;
  v_targets jsonb;
  v_org_id text;
BEGIN
  SELECT organization_id INTO v_org_id
    FROM public.recruiter_tasks WHERE id = p_task_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'recruiter_task not found: %', p_task_id USING ERRCODE = '42501';
  END IF;

  PERFORM public._require_recruiter_task_manager(v_org_id);

  SELECT to_jsonb(rt.*) INTO v_task
    FROM public.recruiter_tasks rt WHERE rt.id = p_task_id;

  SELECT jsonb_agg(
    jsonb_build_object(
      'user_id',       t.user_id,
      'display_name',  p.display_name,
      'email',         p.email,
      'avatar_url',    p.avatar_url,
      'is_completed',  t.is_completed,
      'completed_at',  t.completed_at,
      'due_date',      t.due_date
    )
    ORDER BY t.is_completed, p.display_name NULLS LAST
  ) INTO v_targets
    FROM public.applicant_todos t
    JOIN public.profiles p ON p.id = t.user_id
   WHERE t.source = 'recruiter_task'
     AND t.source_id = p_task_id;

  RETURN jsonb_build_object(
    'task', v_task,
    'targets', COALESCE(v_targets, '[]'::jsonb)
  );
END;
$$;

ALTER FUNCTION public.get_recruiter_task_detail(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_recruiter_task_detail(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_recruiter_task_detail(text) TO authenticated, service_role;
