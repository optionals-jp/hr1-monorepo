-- ========================================================================
-- HR-29 follow-up: recruiter_tasks に action_type / action_ref_id を導入し、
-- 応募者ごとに action_url を自動生成できるようにする。
--
-- 従来: recruiter_tasks.action_url を管理者が自由入力（誤入力・対応漏れ）
-- 改善:
--   action_type ∈ (none, form, interview, survey, announcement, custom_url)
--   action_ref_id: form/interview/survey の ID
--   action_url:    custom_url 時のみ使用
--   create_recruiter_task が applicant_todos に INSERT する際、action_type に
--   応じて per-applicant で action_url を解決して格納する。
-- ========================================================================

-- 1. カラム追加 + CHECK 制約
ALTER TABLE public.recruiter_tasks
  ADD COLUMN IF NOT EXISTS action_type text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS action_ref_id text;

DO $$ BEGIN
  ALTER TABLE public.recruiter_tasks
    ADD CONSTRAINT recruiter_tasks_action_type_check
    CHECK (action_type IN ('none', 'form', 'interview', 'survey', 'announcement', 'custom_url'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 整合性: 各 action_type で必須フィールドが揃っていること
DO $$ BEGIN
  ALTER TABLE public.recruiter_tasks
    ADD CONSTRAINT recruiter_tasks_action_shape_check
    CHECK (
      (action_type = 'none'
        AND action_ref_id IS NULL AND action_url IS NULL)
      OR (action_type = 'custom_url'
        AND action_ref_id IS NULL AND action_url IS NOT NULL)
      OR (action_type IN ('form', 'interview', 'survey')
        AND action_ref_id IS NOT NULL AND action_url IS NULL)
      OR (action_type = 'announcement'
        AND action_ref_id IS NULL AND action_url IS NULL)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. create_recruiter_task RPC を置き換え（p_action_type / p_action_ref_id を受け取り、
--    per-applicant で action_url を解決して applicant_todos に INSERT）
DROP FUNCTION IF EXISTS public.create_recruiter_task(text, text, text, date, text, text, jsonb);

CREATE OR REPLACE FUNCTION public.create_recruiter_task(
  p_organization_id text,
  p_title text,
  p_description text,
  p_due_date date,
  p_action_type text,
  p_action_ref_id text,
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

  -- action_type ごとの必須フィールド検証
  IF p_action_type NOT IN ('none', 'form', 'interview', 'survey', 'announcement', 'custom_url') THEN
    RAISE EXCEPTION 'invalid action_type: %', p_action_type USING ERRCODE = '22023';
  END IF;

  IF p_action_type IN ('form', 'interview', 'survey') AND (p_action_ref_id IS NULL OR p_action_ref_id = '') THEN
    RAISE EXCEPTION 'action_ref_id is required for action_type %', p_action_type USING ERRCODE = '22023';
  END IF;

  IF p_action_type = 'custom_url' AND (p_action_url IS NULL OR p_action_url = '') THEN
    RAISE EXCEPTION 'action_url is required for custom_url' USING ERRCODE = '22023';
  END IF;

  -- 参照先が同じ組織に属するかチェック（fail-fast）
  IF p_action_type = 'form' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.custom_forms
       WHERE id = p_action_ref_id AND organization_id = p_organization_id
    ) THEN
      RAISE EXCEPTION 'form not found in organization' USING ERRCODE = '22023';
    END IF;
  ELSIF p_action_type = 'interview' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.interviews
       WHERE id = p_action_ref_id AND organization_id = p_organization_id
    ) THEN
      RAISE EXCEPTION 'interview not found in organization' USING ERRCODE = '22023';
    END IF;
  ELSIF p_action_type = 'survey' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.pulse_surveys
       WHERE id = p_action_ref_id
         AND organization_id = p_organization_id
         AND target IN ('applicant', 'both')
    ) THEN
      RAISE EXCEPTION 'survey not found in organization (or not targeted at applicants)' USING ERRCODE = '22023';
    END IF;
  END IF;

  -- 対象解決
  SELECT array_agg(applicant_id) INTO v_target_ids
    FROM public.resolve_recruiter_task_targets(p_organization_id, p_target_mode, p_target_criteria)
      AS applicant_id;

  v_target_count := COALESCE(array_length(v_target_ids, 1), 0);

  IF v_target_count = 0 THEN
    RAISE EXCEPTION 'no_target_applicants' USING ERRCODE = 'P0001';
  END IF;

  -- 親 INSERT
  INSERT INTO public.recruiter_tasks (
    organization_id, title, description, due_date,
    action_type, action_ref_id, action_url,
    target_mode, target_criteria, target_count, created_count, created_by
  )
  VALUES (
    p_organization_id, p_title, p_description, p_due_date,
    p_action_type, p_action_ref_id,
    CASE WHEN p_action_type = 'custom_url' THEN p_action_url ELSE NULL END,
    p_target_mode, p_target_criteria, v_target_count, 0, v_user_id
  )
  RETURNING id INTO v_task_id;

  -- 子 applicant_todos INSERT: action_url は per-applicant で解決
  WITH applicant_rows AS (
    SELECT applicant_id FROM unnest(v_target_ids) AS applicant_id
  ),
  resolved AS (
    SELECT
      ar.applicant_id,
      CASE p_action_type
        WHEN 'none' THEN NULL
        WHEN 'custom_url' THEN p_action_url
        WHEN 'survey' THEN '/surveys/' || p_action_ref_id
        WHEN 'announcement' THEN '/announcements'
        WHEN 'form' THEN (
          SELECT '/applications/' || a.id || '/form/' || p_action_ref_id
            FROM public.applications a
            JOIN public.application_steps s ON s.application_id = a.id
           WHERE a.applicant_id = ar.applicant_id
             AND a.organization_id = p_organization_id
             AND s.form_id = p_action_ref_id
           ORDER BY a.applied_at DESC NULLS LAST
           LIMIT 1
        )
        WHEN 'interview' THEN (
          SELECT '/applications/' || a.id || '/interview/' || p_action_ref_id
            FROM public.applications a
            JOIN public.application_steps s ON s.application_id = a.id
           WHERE a.applicant_id = ar.applicant_id
             AND a.organization_id = p_organization_id
             AND s.interview_id = p_action_ref_id
           ORDER BY a.applied_at DESC NULLS LAST
           LIMIT 1
        )
      END AS action_url
      FROM applicant_rows ar
  ),
  inserted AS (
    INSERT INTO public.applicant_todos (
      organization_id, user_id, title, note, due_date,
      source, source_id, action_url
    )
    SELECT
      p_organization_id, applicant_id, p_title, p_description, p_due_date,
      'recruiter_task', v_task_id, action_url
      FROM resolved
      ON CONFLICT DO NOTHING
      RETURNING user_id
  )
  SELECT array_agg(user_id), count(*)::int
    INTO v_created_user_ids, v_created_count
    FROM inserted;

  UPDATE public.recruiter_tasks
     SET created_count = COALESCE(v_created_count, 0)
   WHERE id = v_task_id;

  -- 通知
  IF v_created_user_ids IS NOT NULL AND array_length(v_created_user_ids, 1) > 0 THEN
    INSERT INTO public.notifications (
      organization_id, user_id, type, title, body, action_url, metadata
    )
    SELECT
      p_organization_id,
      r.applicant_id,
      'recruiter_task',
      p_title,
      p_description,
      r.action_url,
      jsonb_build_object('recruiter_task_id', v_task_id)
      FROM (
        SELECT
          ar.applicant_id,
          CASE p_action_type
            WHEN 'none' THEN NULL
            WHEN 'custom_url' THEN p_action_url
            WHEN 'survey' THEN '/surveys/' || p_action_ref_id
            WHEN 'announcement' THEN '/announcements'
            WHEN 'form' THEN (
              SELECT '/applications/' || a.id || '/form/' || p_action_ref_id
                FROM public.applications a
                JOIN public.application_steps s ON s.application_id = a.id
               WHERE a.applicant_id = ar.applicant_id
                 AND a.organization_id = p_organization_id
                 AND s.form_id = p_action_ref_id
               ORDER BY a.applied_at DESC NULLS LAST
               LIMIT 1
            )
            WHEN 'interview' THEN (
              SELECT '/applications/' || a.id || '/interview/' || p_action_ref_id
                FROM public.applications a
                JOIN public.application_steps s ON s.application_id = a.id
               WHERE a.applicant_id = ar.applicant_id
                 AND a.organization_id = p_organization_id
                 AND s.interview_id = p_action_ref_id
               ORDER BY a.applied_at DESC NULLS LAST
               LIMIT 1
            )
          END AS action_url
          FROM unnest(v_created_user_ids) AS ar(applicant_id)
      ) r;
  END IF;

  -- 監査ログ
  INSERT INTO public.audit_logs (
    organization_id, user_id, action, table_name, record_id, changes, source
  )
  VALUES (
    p_organization_id, v_user_id, 'create', 'recruiter_tasks', v_task_id,
    jsonb_build_object(
      'title', p_title,
      'target_mode', p_target_mode,
      'target_count', v_target_count,
      'created_count', COALESCE(v_created_count, 0),
      'action_type', p_action_type
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

ALTER FUNCTION public.create_recruiter_task(text, text, text, date, text, text, text, text, jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.create_recruiter_task(text, text, text, date, text, text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_recruiter_task(text, text, text, date, text, text, text, text, jsonb) TO authenticated, service_role;
