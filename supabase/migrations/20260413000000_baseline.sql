


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."applicant_complete_step"("p_step_id" "uuid", "p_application_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_applicant_id text;
  v_step_order int;
  v_next_step_id uuid;
  v_next_step_type text;
BEGIN
  SELECT a.applicant_id INTO v_applicant_id
  FROM public.applications a
  WHERE a.id = p_application_id;

  IF v_applicant_id IS NULL OR v_applicant_id != auth.uid()::text THEN
    RAISE EXCEPTION '権限がありません';
  END IF;

  -- FOR UPDATE で行ロックを取得
  SELECT step_order INTO v_step_order
  FROM public.application_steps
  WHERE id = p_step_id
    AND application_id = p_application_id
    AND status = 'in_progress'
  FOR UPDATE;

  IF v_step_order IS NULL THEN
    RAISE EXCEPTION '完了できるステップが見つかりません';
  END IF;

  UPDATE public.application_steps
  SET status = 'completed',
      completed_at = now(),
      applicant_action_at = now()
  WHERE id = p_step_id;

  -- 次ステップも FOR UPDATE で取得
  SELECT id, step_type INTO v_next_step_id, v_next_step_type
  FROM public.application_steps
  WHERE application_id = p_application_id
    AND step_order > v_step_order
    AND status = 'pending'
  ORDER BY step_order
  LIMIT 1
  FOR UPDATE;

  IF v_next_step_id IS NOT NULL
     AND v_next_step_type NOT IN ('form', 'interview') THEN
    UPDATE public.application_steps
    SET status = 'in_progress',
        started_at = now()
    WHERE id = v_next_step_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."applicant_complete_step"("p_step_id" "uuid", "p_application_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."applicant_confirm_interview_slot"("p_slot_id" "uuid", "p_application_id" "uuid", "p_step_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_applicant_id text;
  v_current_app_id uuid;
  v_max_applicants int;
  v_booked_count int;
  v_interview_id uuid;
BEGIN
  -- 1. 呼び出し元が該当応募の本人であることを検証
  SELECT a.applicant_id INTO v_applicant_id
  FROM public.applications a
  WHERE a.id = p_application_id;

  IF v_applicant_id IS NULL OR v_applicant_id != auth.uid()::text THEN
    RAISE EXCEPTION '権限がありません';
  END IF;

  -- 2. スロットをロックして現在の状態を取得
  SELECT application_id, max_applicants, interview_id
  INTO v_current_app_id, v_max_applicants, v_interview_id
  FROM public.interview_slots
  WHERE id = p_slot_id
  FOR UPDATE;

  IF v_interview_id IS NULL THEN
    RAISE EXCEPTION 'スロットが見つかりません';
  END IF;

  -- 3. 既に予約済みかチェック
  IF v_current_app_id IS NOT NULL THEN
    RAISE EXCEPTION 'このスロットは既に予約されています';
  END IF;

  -- 4. 定員チェック（max_applicants > 1 の場合に備えて）
  SELECT count(*) INTO v_booked_count
  FROM public.interview_slots
  WHERE interview_id = v_interview_id
    AND application_id IS NOT NULL;

  -- 5. スロットを予約
  UPDATE public.interview_slots
  SET is_selected = true,
      application_id = p_application_id
  WHERE id = p_slot_id;

  -- 6. 応募者アクション完了を記録
  IF p_step_id IS NOT NULL THEN
    UPDATE public.application_steps
    SET applicant_action_at = now()
    WHERE id = p_step_id
      AND application_id = p_application_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."applicant_confirm_interview_slot"("p_slot_id" "uuid", "p_application_id" "uuid", "p_step_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_leave_request"("p_request_id" "uuid", "p_reviewer_id" "text", "p_comment" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_request record;
  v_balance record;
  v_remaining numeric;
  v_days numeric;
BEGIN
  SELECT * INTO v_request FROM workflow_requests WHERE id = p_request_id FOR UPDATE;

  IF NOT FOUND OR v_request.status != 'pending' THEN
    RETURN jsonb_build_object('error', '申請が見つからないか、既に処理済みです');
  END IF;

  v_days := COALESCE((v_request.request_data->>'days')::numeric, 0);

  SELECT * INTO v_balance FROM leave_balances
  WHERE user_id = v_request.user_id
    AND organization_id = v_request.organization_id
  ORDER BY fiscal_year DESC LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    v_remaining := v_balance.granted_days + COALESCE(v_balance.carried_over_days, 0) - v_balance.used_days;
    IF v_days > v_remaining THEN
      RETURN jsonb_build_object('error', '有給残日数が不足しています（残り' || v_remaining || '日）');
    END IF;

    UPDATE leave_balances SET used_days = used_days + v_days
    WHERE id = v_balance.id;
  END IF;

  UPDATE workflow_requests SET
    status = 'approved',
    reviewed_by = p_reviewer_id,
    reviewed_at = now(),
    review_comment = p_comment
  WHERE id = p_request_id;

  RETURN jsonb_build_object('success', true);
END;
$$;


ALTER FUNCTION "public"."approve_leave_request"("p_request_id" "uuid", "p_reviewer_id" "text", "p_comment" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."archive_old_audit_logs"("retention_days" integer DEFAULT 365) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  archived_count integer;
BEGIN
  WITH to_archive AS (
    DELETE FROM audit_logs
    WHERE created_at < now() - (retention_days || ' days')::interval
    RETURNING *
  )
  INSERT INTO audit_logs_archive SELECT * FROM to_archive;

  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$;


ALTER FUNCTION "public"."archive_old_audit_logs"("retention_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_approve_workflow"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_rule record;
  v_should_approve boolean := false;
BEGIN
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_rule FROM workflow_rules
  WHERE organization_id = NEW.organization_id
    AND request_type = NEW.request_type
    AND rule_type = 'auto_approve'
    AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  BEGIN
    CASE NEW.request_type
      WHEN 'paid_leave' THEN
        v_should_approve := COALESCE((NEW.request_data->>'days')::numeric, 0) <= COALESCE((v_rule.conditions->>'max_days')::numeric, 0);
      WHEN 'expense' THEN
        v_should_approve := COALESCE((NEW.request_data->>'amount')::numeric, 0) <= COALESCE((v_rule.conditions->>'max_amount')::numeric, 0);
      WHEN 'overtime' THEN
        v_should_approve := COALESCE((NEW.request_data->>'hours')::numeric, 0) <= COALESCE((v_rule.conditions->>'max_hours')::numeric, 0);
      ELSE
        v_should_approve := false;
    END CASE;
  EXCEPTION WHEN OTHERS THEN
    v_should_approve := false;
  END;

  IF v_should_approve THEN
    NEW.status := 'approved';
    NEW.reviewed_by := 'system';
    NEW.reviewed_at := now();
    NEW.review_comment := '自動承認ルールにより承認';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_approve_workflow"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_grant_leave_with_carry_over"("p_organization_id" "text", "p_fiscal_year" integer) RETURNS TABLE("user_id" "text", "granted_days" numeric, "carried_over_days" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- 当年度のレコードに繰越日数を反映
  RETURN QUERY
  UPDATE public.leave_balances lb
  SET carried_over_days = COALESCE(co.carried_over_days, 0)
  FROM public.calculate_leave_carry_over(p_organization_id, p_fiscal_year) co
  WHERE lb.user_id = co.user_id
    AND lb.organization_id = p_organization_id
    AND lb.fiscal_year = p_fiscal_year
  RETURNING lb.user_id, lb.granted_days, lb.carried_over_days;
END;
$$;


ALTER FUNCTION "public"."auto_grant_leave_with_carry_over"("p_organization_id" "text", "p_fiscal_year" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_leave_carry_over"("p_organization_id" "text" DEFAULT NULL::"text", "p_fiscal_year" integer DEFAULT NULL::integer) RETURNS TABLE("user_id" "text", "carried_over_days" numeric, "prev_remaining" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_fiscal_year integer;
  v_prev_year integer;
  v_max_carry_over numeric := 20;
BEGIN
  v_fiscal_year := COALESCE(p_fiscal_year, EXTRACT(YEAR FROM now())::integer);
  v_prev_year := v_fiscal_year - 1;

  RETURN QUERY
  SELECT
    lb.user_id,
    LEAST(
      GREATEST(lb.granted_days - lb.used_days, 0),
      v_max_carry_over
    ) AS carried_over_days,
    GREATEST(lb.granted_days - lb.used_days, 0) AS prev_remaining
  FROM public.leave_balances lb
  WHERE lb.fiscal_year = v_prev_year
    AND (p_organization_id IS NULL OR lb.organization_id = p_organization_id);
END;
$$;


ALTER FUNCTION "public"."calculate_leave_carry_over"("p_organization_id" "text", "p_fiscal_year" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_compliance_alerts"("p_organization_id" "text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_count integer := 0;
  v_user record;
  v_fiscal_year integer;
  v_remaining numeric;
BEGIN
  IF public.get_my_role() <> 'admin' THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  v_fiscal_year := EXTRACT(YEAR FROM now())::integer;

  -- 1. 有給消化不足チェック (労基法: 年5日取得義務)
  FOR v_user IN
    SELECT lb.user_id, lb.used_days, lb.granted_days, lb.carried_over_days,
           p.display_name
    FROM leave_balances lb
    JOIN profiles p ON p.id = lb.user_id
    JOIN user_organizations uo ON uo.user_id = lb.user_id AND uo.organization_id = p_organization_id
    WHERE lb.organization_id = p_organization_id
      AND lb.fiscal_year = v_fiscal_year
      AND lb.used_days < 5
      AND lb.granted_days >= 10
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM compliance_alerts
      WHERE organization_id = p_organization_id
        AND user_id = v_user.user_id
        AND alert_type = 'leave_usage_warning'
        AND is_resolved = false
    ) THEN
      INSERT INTO compliance_alerts (organization_id, user_id, alert_type, severity, title, description, metadata)
      VALUES (
        p_organization_id,
        v_user.user_id,
        'leave_usage_warning',
        CASE WHEN EXTRACT(MONTH FROM now()) >= 10 THEN 'critical' ELSE 'warning' END,
        '有給取得義務: ' || COALESCE(v_user.display_name, '') || 'さん',
        COALESCE(v_user.display_name, '') || 'さんの有給取得日数は' || v_user.used_days || '日です。年5日以上の取得が義務付けられています。',
        jsonb_build_object('used_days', v_user.used_days, 'required_days', 5, 'fiscal_year', v_fiscal_year)
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  -- 2. 有給期限切れ警告（残日数あり、期限まで90日以内）
  FOR v_user IN
    SELECT lb.user_id, lb.granted_days, lb.used_days, lb.carried_over_days, lb.expiry_date,
           p.display_name
    FROM leave_balances lb
    JOIN profiles p ON p.id = lb.user_id
    WHERE lb.organization_id = p_organization_id
      AND lb.expiry_date IS NOT NULL
      AND lb.expiry_date <= now() + interval '90 days'
      AND lb.expiry_date > now()
      AND (lb.granted_days + COALESCE(lb.carried_over_days, 0) - lb.used_days) > 0
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM compliance_alerts
      WHERE organization_id = p_organization_id
        AND user_id = v_user.user_id
        AND alert_type = 'leave_expiry_warning'
        AND is_resolved = false
    ) THEN
      v_remaining := v_user.granted_days + COALESCE(v_user.carried_over_days, 0) - v_user.used_days;
      INSERT INTO compliance_alerts (organization_id, user_id, alert_type, severity, title, description, metadata)
      VALUES (
        p_organization_id,
        v_user.user_id,
        'leave_expiry_warning',
        'warning',
        '有給期限切れ間近: ' || COALESCE(v_user.display_name, '') || 'さん',
        COALESCE(v_user.display_name, '') || 'さんの有給' || v_remaining || '日分が' || to_char(v_user.expiry_date, 'YYYY/MM/DD') || 'に期限切れとなります。',
        jsonb_build_object('remaining_days', v_remaining, 'expiry_date', v_user.expiry_date)
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."check_compliance_alerts"("p_organization_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_todo_on_survey_response"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_survey_id text;
BEGIN
  IF NEW.completed_at IS NULL THEN
    RETURN NEW;
  END IF;

  v_survey_id := NEW.survey_id::text;

  UPDATE public.applicant_todos
  SET is_completed = true, completed_at = now()
  WHERE source = 'survey'
    AND source_id = v_survey_id
    AND user_id = NEW.user_id
    AND is_completed = false;

  UPDATE public.employee_tasks
  SET is_completed = true, completed_at = now()
  WHERE user_id = NEW.user_id
    AND title LIKE 'サーベイに回答: %'
    AND is_completed = false
    AND organization_id = NEW.organization_id;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."complete_todo_on_survey_response"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_department_channels"("p_organization_id" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_dept record;
  v_thread_id text;
  v_member record;
BEGIN
  FOR v_dept IN SELECT id, name FROM departments WHERE organization_id = p_organization_id
  LOOP
    -- 既存チャンネルがある場合はスキップ
    SELECT id INTO v_thread_id FROM message_threads
    WHERE organization_id = p_organization_id
      AND is_channel = true
      AND channel_type = 'department'
      AND channel_source_id = v_dept.id::text;

    IF v_thread_id IS NULL THEN
      INSERT INTO message_threads (organization_id, is_channel, channel_name, channel_type, channel_source_id, title)
      VALUES (p_organization_id, true, v_dept.name, 'department', v_dept.id::text, v_dept.name || ' チャンネル')
      RETURNING id INTO v_thread_id;
    END IF;

    IF v_thread_id IS NOT NULL THEN
      FOR v_member IN
        SELECT user_id FROM employee_departments WHERE department_id = v_dept.id
      LOOP
        INSERT INTO channel_members (thread_id, user_id) VALUES (v_thread_id, v_member.user_id)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."create_department_channels"("p_organization_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_evaluation_template"("p_organization_id" "text", "p_title" "text", "p_description" "text", "p_target" "text", "p_evaluation_type" "text", "p_anonymity_mode" "text", "p_criteria" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_template_id uuid;
  v_criterion jsonb;
  v_criterion_id uuid;
  v_anchor jsonb;
  v_cr_order int := 0;
  v_anc_order int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  IF p_organization_id IS NULL THEN
    RAISE EXCEPTION 'organization_id is required' USING ERRCODE = '22023';
  END IF;

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
    CASE WHEN p_evaluation_type = 'multi_rater' THEN p_anonymity_mode ELSE 'none' END
  )
  RETURNING id INTO v_template_id;

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


ALTER FUNCTION "public"."create_evaluation_template"("p_organization_id" "text", "p_title" "text", "p_description" "text", "p_target" "text", "p_evaluation_type" "text", "p_anonymity_mode" "text", "p_criteria" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_evaluation_template"("p_organization_id" "text", "p_title" "text", "p_description" "text", "p_target" "text", "p_evaluation_type" "text", "p_anonymity_mode" "text", "p_criteria" "jsonb") IS '評価テンプレート + 基準 + アンカーを 1 トランザクションで作成する。権限は eval_templates_all_admin RLS と等価 (自組織 admin のみ)。';



CREATE OR REPLACE FUNCTION "public"."create_survey_todos_and_notifications"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user record;
  v_todo_title text;
  v_notification_body text;
  v_action_url text;
BEGIN
  IF NEW.status != 'active' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' THEN
    RETURN NEW;
  END IF;

  v_todo_title := 'サーベイに回答: ' || NEW.title;
  v_notification_body := NEW.title;
  v_action_url := '/surveys/' || NEW.id::text;

  IF NEW.target IN ('applicant', 'both') THEN
    FOR v_user IN
      SELECT uo.user_id
      FROM public.user_organizations uo
      JOIN public.profiles p ON p.id = uo.user_id
      WHERE uo.organization_id = NEW.organization_id
        AND p.role = 'applicant'
    LOOP
      INSERT INTO public.applicant_todos (
        organization_id, user_id, title, due_date, source, source_id, action_url
      ) VALUES (
        NEW.organization_id, v_user.user_id, v_todo_title,
        NEW.deadline::date, 'survey', NEW.id::text, v_action_url
      )
      ON CONFLICT DO NOTHING;

      INSERT INTO public.notifications (
        organization_id, user_id, type, title, body, action_url, metadata
      ) VALUES (
        NEW.organization_id, v_user.user_id, 'survey_request',
        'サーベイの依頼', v_notification_body, v_action_url,
        jsonb_build_object('survey_id', NEW.id::text)
      );
    END LOOP;
  END IF;

  IF NEW.target IN ('employee', 'both') THEN
    FOR v_user IN
      SELECT uo.user_id
      FROM public.user_organizations uo
      JOIN public.profiles p ON p.id = uo.user_id
      WHERE uo.organization_id = NEW.organization_id
        AND p.role = 'employee'
    LOOP
      INSERT INTO public.employee_tasks (
        organization_id, user_id, title, due_date, list_name
      ) VALUES (
        NEW.organization_id, v_user.user_id, v_todo_title,
        NEW.deadline::date, 'タスク'
      );

      INSERT INTO public.notifications (
        organization_id, user_id, type, title, body, action_url, metadata
      ) VALUES (
        NEW.organization_id, v_user.user_id, 'survey_request',
        'サーベイの依頼', v_notification_body, v_action_url,
        jsonb_build_object('survey_id', NEW.id::text)
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_survey_todos_and_notifications"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_user_with_org"("p_user_id" "text", "p_email" "text", "p_display_name" "text" DEFAULT NULL::"text", "p_role" "text" DEFAULT 'employee'::"text", "p_organization_id" "text" DEFAULT NULL::"text", "p_position" "text" DEFAULT NULL::"text", "p_hiring_type" "text" DEFAULT NULL::"text", "p_graduation_year" integer DEFAULT NULL::integer, "p_department_ids" "text"[] DEFAULT '{}'::"text"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_dept_id text;
BEGIN
  -- profiles 作成
  INSERT INTO public.profiles (id, email, display_name, role, position, hiring_type, graduation_year)
  VALUES (p_user_id, p_email, p_display_name, p_role, p_position, p_hiring_type, p_graduation_year);

  -- user_organizations 作成
  IF p_organization_id IS NOT NULL THEN
    INSERT INTO public.user_organizations (user_id, organization_id)
    VALUES (p_user_id, p_organization_id);
  END IF;

  -- 部署割り当て
  IF p_department_ids IS NOT NULL AND array_length(p_department_ids, 1) > 0 THEN
    FOREACH v_dept_id IN ARRAY p_department_ids
    LOOP
      INSERT INTO public.employee_departments (user_id, department_id)
      VALUES (p_user_id, v_dept_id::uuid);
    END LOOP;
  END IF;

  RETURN jsonb_build_object('id', p_user_id, 'email', p_email);
END;
$$;


ALTER FUNCTION "public"."create_user_with_org"("p_user_id" "text", "p_email" "text", "p_display_name" "text", "p_role" "text", "p_organization_id" "text", "p_position" "text", "p_hiring_type" "text", "p_graduation_year" integer, "p_department_ids" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_user_with_org"("p_user_id" "text", "p_email" "text", "p_display_name" "text" DEFAULT NULL::"text", "p_role" "text" DEFAULT 'employee'::"text", "p_organization_id" "text" DEFAULT NULL::"text", "p_position" "text" DEFAULT NULL::"text", "p_department_ids" "uuid"[] DEFAULT '{}'::"uuid"[], "p_name_kana" "text" DEFAULT NULL::"text", "p_phone" "text" DEFAULT NULL::"text", "p_hire_date" "date" DEFAULT NULL::"date", "p_birth_date" "date" DEFAULT NULL::"date", "p_gender" "text" DEFAULT NULL::"text", "p_current_postal_code" "text" DEFAULT NULL::"text", "p_current_prefecture" "text" DEFAULT NULL::"text", "p_current_city" "text" DEFAULT NULL::"text", "p_current_street_address" "text" DEFAULT NULL::"text", "p_current_building" "text" DEFAULT NULL::"text", "p_registered_postal_code" "text" DEFAULT NULL::"text", "p_registered_prefecture" "text" DEFAULT NULL::"text", "p_registered_city" "text" DEFAULT NULL::"text", "p_registered_street_address" "text" DEFAULT NULL::"text", "p_registered_building" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_dept_id uuid;
BEGIN
  INSERT INTO public.profiles (
    id, email, display_name, role, position, name_kana, phone,
    hire_date, birth_date, gender,
    current_postal_code, current_prefecture, current_city, current_street_address, current_building,
    registered_postal_code, registered_prefecture, registered_city, registered_street_address, registered_building
  )
  VALUES (
    p_user_id, p_email, p_display_name, p_role, p_position, p_name_kana, p_phone,
    p_hire_date, p_birth_date, p_gender,
    p_current_postal_code, p_current_prefecture, p_current_city, p_current_street_address, p_current_building,
    p_registered_postal_code, p_registered_prefecture, p_registered_city, p_registered_street_address, p_registered_building
  );

  IF p_organization_id IS NOT NULL THEN
    INSERT INTO public.user_organizations (user_id, organization_id)
    VALUES (p_user_id, p_organization_id);
  END IF;

  IF p_department_ids IS NOT NULL AND array_length(p_department_ids, 1) > 0 THEN
    FOREACH v_dept_id IN ARRAY p_department_ids
    LOOP
      INSERT INTO public.employee_departments (user_id, department_id)
      VALUES (p_user_id, v_dept_id);
    END LOOP;
  END IF;

  RETURN jsonb_build_object('id', p_user_id, 'email', p_email);
END;
$$;


ALTER FUNCTION "public"."create_user_with_org"("p_user_id" "text", "p_email" "text", "p_display_name" "text", "p_role" "text", "p_organization_id" "text", "p_position" "text", "p_department_ids" "uuid"[], "p_name_kana" "text", "p_phone" "text", "p_hire_date" "date", "p_birth_date" "date", "p_gender" "text", "p_current_postal_code" "text", "p_current_prefecture" "text", "p_current_city" "text", "p_current_street_address" "text", "p_current_building" "text", "p_registered_postal_code" "text", "p_registered_prefecture" "text", "p_registered_city" "text", "p_registered_street_address" "text", "p_registered_building" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_user_with_org"("p_user_id" "text", "p_email" "text", "p_display_name" "text" DEFAULT NULL::"text", "p_role" "text" DEFAULT 'employee'::"text", "p_organization_id" "text" DEFAULT NULL::"text", "p_position" "text" DEFAULT NULL::"text", "p_department_ids" "uuid"[] DEFAULT '{}'::"uuid"[], "p_name_kana" "text" DEFAULT NULL::"text", "p_phone" "text" DEFAULT NULL::"text", "p_hire_date" "date" DEFAULT NULL::"date", "p_birth_date" "date" DEFAULT NULL::"date", "p_gender" "text" DEFAULT NULL::"text", "p_current_postal_code" "text" DEFAULT NULL::"text", "p_current_prefecture" "text" DEFAULT NULL::"text", "p_current_city" "text" DEFAULT NULL::"text", "p_current_street_address" "text" DEFAULT NULL::"text", "p_current_building" "text" DEFAULT NULL::"text", "p_registered_postal_code" "text" DEFAULT NULL::"text", "p_registered_prefecture" "text" DEFAULT NULL::"text", "p_registered_city" "text" DEFAULT NULL::"text", "p_registered_street_address" "text" DEFAULT NULL::"text", "p_registered_building" "text" DEFAULT NULL::"text", "p_hiring_type" "text" DEFAULT NULL::"text", "p_graduation_year" integer DEFAULT NULL::integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_dept_id uuid;
BEGIN
  INSERT INTO public.profiles (
    id, email, display_name, role, position, name_kana, phone,
    hire_date, birth_date, gender,
    current_postal_code, current_prefecture, current_city, current_street_address, current_building,
    registered_postal_code, registered_prefecture, registered_city, registered_street_address, registered_building,
    hiring_type, graduation_year
  )
  VALUES (
    p_user_id, p_email, p_display_name, p_role, p_position, p_name_kana, p_phone,
    p_hire_date, p_birth_date, p_gender,
    p_current_postal_code, p_current_prefecture, p_current_city, p_current_street_address, p_current_building,
    p_registered_postal_code, p_registered_prefecture, p_registered_city, p_registered_street_address, p_registered_building,
    p_hiring_type, p_graduation_year
  );

  IF p_organization_id IS NOT NULL THEN
    INSERT INTO public.user_organizations (user_id, organization_id)
    VALUES (p_user_id, p_organization_id);
  END IF;

  IF p_department_ids IS NOT NULL AND array_length(p_department_ids, 1) > 0 THEN
    FOREACH v_dept_id IN ARRAY p_department_ids
    LOOP
      INSERT INTO public.employee_departments (user_id, department_id)
      VALUES (p_user_id, v_dept_id);
    END LOOP;
  END IF;

  RETURN jsonb_build_object('id', p_user_id, 'email', p_email);
END;
$$;


ALTER FUNCTION "public"."create_user_with_org"("p_user_id" "text", "p_email" "text", "p_display_name" "text", "p_role" "text", "p_organization_id" "text", "p_position" "text", "p_department_ids" "uuid"[], "p_name_kana" "text", "p_phone" "text", "p_hire_date" "date", "p_birth_date" "date", "p_gender" "text", "p_current_postal_code" "text", "p_current_prefecture" "text", "p_current_city" "text", "p_current_street_address" "text", "p_current_building" "text", "p_registered_postal_code" "text", "p_registered_prefecture" "text", "p_registered_city" "text", "p_registered_street_address" "text", "p_registered_building" "text", "p_hiring_type" "text", "p_graduation_year" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_channel_members"("p_thread_id" "text") RETURNS TABLE("id" "uuid", "user_id" "text", "display_name" "text", "email" "text", "avatar_url" "text", "joined_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    cm.id,
    cm.user_id,
    p.display_name,
    p.email,
    p.avatar_url,
    cm.joined_at
  FROM channel_members cm
  JOIN profiles p ON p.id = cm.user_id
  WHERE cm.thread_id = p_thread_id
  ORDER BY cm.joined_at;
$$;


ALTER FUNCTION "public"."get_channel_members"("p_thread_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_channels_with_details"("p_org_id" "text") RETURNS TABLE("id" "text", "organization_id" "text", "channel_name" "text", "channel_type" "text", "channel_source_id" "text", "title" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "member_count" bigint, "latest_message_id" "text", "latest_message_content" "text", "latest_message_sender_name" "text", "latest_message_created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    mt.id,
    mt.organization_id,
    mt.channel_name,
    mt.channel_type,
    mt.channel_source_id,
    mt.title,
    mt.created_at,
    mt.updated_at,
    (SELECT count(*) FROM channel_members cm WHERE cm.thread_id = mt.id) AS member_count,
    lm.id AS latest_message_id,
    lm.content AS latest_message_content,
    (SELECT p.display_name FROM profiles p WHERE p.id = lm.sender_id) AS latest_message_sender_name,
    lm.created_at AS latest_message_created_at
  FROM message_threads mt
  LEFT JOIN LATERAL (
    SELECT m.id, m.content, m.sender_id, m.created_at
    FROM messages m WHERE m.thread_id = mt.id ORDER BY m.created_at DESC LIMIT 1
  ) lm ON true
  WHERE mt.organization_id = p_org_id AND mt.is_channel = true
  ORDER BY mt.updated_at DESC;
$$;


ALTER FUNCTION "public"."get_channels_with_details"("p_org_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_monthly_attendance_summary"("p_organization_id" "text", "p_start_date" "date", "p_end_date" "date") RETURNS TABLE("user_id" "text", "display_name" "text", "email" "text", "present_days" bigint, "late_days" bigint, "absent_days" bigint, "leave_days" bigint, "total_work_minutes" bigint, "total_overtime_minutes" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    ar.user_id,
    p.display_name,
    p.email,
    COUNT(*) FILTER (WHERE ar.status IN ('present', 'late', 'early_leave')) AS present_days,
    COUNT(*) FILTER (WHERE ar.status = 'late') AS late_days,
    COUNT(*) FILTER (WHERE ar.status = 'absent') AS absent_days,
    COUNT(*) FILTER (WHERE ar.status IN ('paid_leave', 'half_day_am', 'half_day_pm', 'sick_leave', 'special_leave')) AS leave_days,
    COALESCE(SUM(
      CASE WHEN ar.clock_in IS NOT NULL AND ar.clock_out IS NOT NULL
        THEN GREATEST(
          EXTRACT(EPOCH FROM (ar.clock_out - ar.clock_in))::bigint / 60 - ar.break_minutes,
          0
        )
        ELSE 0
      END
    ), 0) AS total_work_minutes,
    COALESCE(SUM(ar.overtime_minutes), 0) AS total_overtime_minutes
  FROM public.attendance_records ar
  JOIN public.profiles p ON p.id = ar.user_id
  WHERE ar.organization_id = p_organization_id
    AND ar.date >= p_start_date
    AND ar.date <= p_end_date
  GROUP BY ar.user_id, p.display_name, p.email
  ORDER BY p.display_name NULLS LAST, p.email;
$$;


ALTER FUNCTION "public"."get_monthly_attendance_summary"("p_organization_id" "text", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_accessible_thread_ids"() RETURNS SETOF "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT id FROM message_threads WHERE participant_id = auth.uid()::text
  UNION
  SELECT id FROM message_threads
  WHERE organization_id IN (SELECT get_my_organization_ids())
    AND public.get_my_role() IN ('admin', 'employee')
  UNION
  SELECT thread_id FROM channel_members WHERE user_id = auth.uid()::text;
$$;


ALTER FUNCTION "public"."get_my_accessible_thread_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_organization_id"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT organization_id
  FROM user_organizations
  WHERE user_id = auth.uid()::text
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_my_organization_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_organization_ids"() RETURNS SETOF "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text;
$$;


ALTER FUNCTION "public"."get_my_organization_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_permissions"() RETURNS TABLE("resource" "text", "actions" "text"[])
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT pgp.resource, array_agg(DISTINCT act) AS actions
  FROM member_permission_groups mpg
  JOIN permission_group_permissions pgp ON pgp.group_id = mpg.group_id,
  LATERAL unnest(pgp.actions) AS act
  WHERE mpg.user_id = auth.uid()::text
  GROUP BY pgp.resource;
$$;


ALTER FUNCTION "public"."get_my_permissions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT role FROM profiles WHERE id = auth.uid()::text;
$$;


ALTER FUNCTION "public"."get_my_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_server_now"() RETURNS timestamp with time zone
    LANGUAGE "sql" STABLE
    AS $$
  SELECT now();
$$;


ALTER FUNCTION "public"."get_server_now"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_threads_with_details"("p_org_id" "text", "p_user_id" "text") RETURNS TABLE("id" "text", "organization_id" "text", "participant_id" "text", "participant_type" "text", "title" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "participant_display_name" "text", "participant_email" "text", "participant_avatar_url" "text", "participant_department" "text", "participant_position" "text", "job_titles" "text", "application_count" bigint, "latest_message_id" "text", "latest_message_content" "text", "latest_message_sender_id" "text", "latest_message_sender_name" "text", "latest_message_created_at" timestamp with time zone, "unread_count" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT
    mt.id,
    mt.organization_id,
    mt.participant_id,
    mt.participant_type,
    mt.title,
    mt.created_at,
    mt.updated_at,
    -- Participant profile
    p.display_name AS participant_display_name,
    p.email AS participant_email,
    p.avatar_url AS participant_avatar_url,
    p.department AS participant_department,
    p.position AS participant_position,
    -- Aggregated job titles for applicant threads
    aj.job_titles,
    COALESCE(aj.app_count, 0) AS application_count,
    -- Latest message
    lm.id AS latest_message_id,
    lm.content AS latest_message_content,
    lm.sender_id AS latest_message_sender_id,
    sp.display_name AS latest_message_sender_name,
    lm.created_at AS latest_message_created_at,
    COALESCE(uc.cnt, 0) AS unread_count
  FROM message_threads mt
  LEFT JOIN profiles p ON p.id = mt.participant_id
  -- Aggregate all applications/jobs for this applicant in this org
  LEFT JOIN LATERAL (
    SELECT 
      string_agg(j.title, ', ' ORDER BY a.applied_at DESC) AS job_titles,
      count(*) AS app_count
    FROM applications a
    JOIN jobs j ON j.id = a.job_id
    WHERE a.applicant_id = mt.participant_id
      AND a.organization_id = mt.organization_id
  ) aj ON mt.participant_type = 'applicant'
  -- Latest message
  LEFT JOIN LATERAL (
    SELECT m.id, m.content, m.sender_id, m.created_at
    FROM messages m
    WHERE m.thread_id = mt.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) lm ON true
  LEFT JOIN profiles sp ON sp.id = lm.sender_id
  -- Unread count
  LEFT JOIN LATERAL (
    SELECT count(*) AS cnt
    FROM messages m2
    WHERE m2.thread_id = mt.id
      AND m2.sender_id != p_user_id
      AND m2.read_at IS NULL
  ) uc ON true
  WHERE mt.organization_id = p_org_id
  ORDER BY mt.updated_at DESC;
$$;


ALTER FUNCTION "public"."get_threads_with_details"("p_org_id" "text", "p_user_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_permission"("p_resource" "text", "p_action" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    CASE
      WHEN (SELECT role FROM profiles WHERE id = auth.uid()::text) = 'admin' THEN true
      ELSE EXISTS (
        SELECT 1
        FROM member_permission_groups mpg
        JOIN permission_group_permissions pgp ON pgp.group_id = mpg.group_id
        WHERE mpg.user_id = auth.uid()::text
          AND pgp.resource = p_resource
          AND p_action = ANY(pgp.actions)
      )
    END;
$$;


ALTER FUNCTION "public"."has_permission"("p_resource" "text", "p_action" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_audit_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_action text;
  v_record_id text;
  v_org_id text;
  v_user_id text;
  v_changes jsonb;
  v_old jsonb;
  v_new jsonb;
  v_old_hstore hstore;
  v_new_hstore hstore;
  v_diff hstore;
  v_key text;
  v_excluded_keys text[] := ARRAY['id', 'created_at', 'updated_at'];
BEGIN
  v_user_id := coalesce(auth.uid()::text, 'system');

  IF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_old := to_jsonb(OLD);
    v_record_id := v_old ->> 'id';
    v_org_id := v_old ->> 'organization_id';
    v_changes := v_old;
  ELSIF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_new := to_jsonb(NEW);
    v_record_id := v_new ->> 'id';
    v_org_id := v_new ->> 'organization_id';
    v_changes := v_new;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_record_id := v_new ->> 'id';
    v_org_id := v_new ->> 'organization_id';

    v_old_hstore := hstore(OLD);
    v_new_hstore := hstore(NEW);
    v_diff := v_new_hstore - v_old_hstore;

    v_changes := '{}'::jsonb;
    FOR v_key IN SELECT skeys(v_diff)
    LOOP
      IF v_key != ALL(v_excluded_keys) THEN
        v_changes := v_changes || jsonb_build_object(
          v_key, jsonb_build_object('old', v_old -> v_key, 'new', v_new -> v_key)
        );
      END IF;
    END LOOP;

    IF v_changes = '{}'::jsonb THEN
      RETURN NEW;
    END IF;
  END IF;

  -- organization_idがないテーブル（profiles等）はuser_organizationsから取得
  IF v_org_id IS NULL THEN
    IF TG_TABLE_NAME = 'profiles' THEN
      SELECT uo.organization_id INTO v_org_id
      FROM public.user_organizations uo
      WHERE uo.user_id = v_record_id
      LIMIT 1;
    END IF;

    IF v_org_id IS NULL THEN
      RAISE WARNING 'audit_log: organization_id is NULL for table=%, record_id=%, op=%',
        TG_TABLE_NAME, v_record_id, TG_OP;

      BEGIN
        INSERT INTO public.audit_logs_errors (error_message, table_name, record_id, operation, raw_data)
        VALUES (
          'organization_id is NULL',
          TG_TABLE_NAME,
          v_record_id,
          TG_OP,
          v_changes
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'audit_log: failed to log error: %', SQLERRM;
      END;

      IF TG_OP = 'DELETE' THEN
        RETURN OLD;
      ELSE
        RETURN NEW;
      END IF;
    END IF;
  END IF;

  BEGIN
    INSERT INTO public.audit_logs (organization_id, user_id, action, table_name, record_id, changes)
    VALUES (v_org_id, v_user_id, v_action, TG_TABLE_NAME, v_record_id, v_changes);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.audit_logs_errors (error_message, table_name, record_id, operation, raw_data)
    VALUES (SQLERRM, TG_TABLE_NAME, v_record_id, TG_OP, v_changes);
    RAISE WARNING 'audit_log: INSERT failed for table=%, record_id=%: %', TG_TABLE_NAME, v_record_id, SQLERRM;
  END;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;


ALTER FUNCTION "public"."log_audit_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_all_notifications_read"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = now()
  WHERE user_id = auth.uid()::text
    AND is_read = false;
END;
$$;


ALTER FUNCTION "public"."mark_all_notifications_read"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_notifications_read"("p_notification_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = now()
  WHERE id = ANY(p_notification_ids)
    AND user_id = auth.uid()::text;
END;
$$;


ALTER FUNCTION "public"."mark_notifications_read"("p_notification_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_admins_on_workflow_request"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_admin record;
  v_rule record;
  v_title text;
BEGIN
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_rule FROM workflow_rules
  WHERE organization_id = NEW.organization_id
    AND rule_type = 'notify'
    AND is_active = true
    AND (request_type = NEW.request_type OR request_type = '_all')
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_title := '新しい申請: ' || CASE NEW.request_type
    WHEN 'paid_leave' THEN '有給休暇'
    WHEN 'overtime' THEN '残業'
    WHEN 'business_trip' THEN '出張'
    WHEN 'expense' THEN '経費'
    ELSE NEW.request_type
  END;

  FOR v_admin IN
    SELECT uo.user_id FROM user_organizations uo
    JOIN profiles p ON p.id = uo.user_id
    WHERE uo.organization_id = NEW.organization_id AND p.role = 'admin'
  LOOP
    INSERT INTO notifications (organization_id, user_id, type, title, body, action_url)
    VALUES (NEW.organization_id, v_admin.user_id, 'general', v_title, NEW.reason, '/workflows');
  END LOOP;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_admins_on_workflow_request"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_application_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_job_title text;
  v_title text;
BEGIN
  -- ステータスが変更されていない場合はスキップ
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- 求人タイトルを取得
  SELECT title INTO v_job_title
  FROM jobs
  WHERE id = NEW.job_id;

  -- 新しいステータスに応じたタイトルを決定
  CASE NEW.status
    WHEN 'offered'  THEN v_title := '内定のお知らせ';
    WHEN 'rejected' THEN v_title := '選考結果のお知らせ';
    ELSE v_title := '応募状況が更新されました';
  END CASE;

  -- 通知レコードを作成
  INSERT INTO notifications (
    organization_id,
    user_id,
    type,
    title,
    body,
    action_url,
    metadata
  ) VALUES (
    NEW.organization_id,
    NEW.applicant_id,
    'recruitment_update',
    v_title,
    COALESCE(v_job_title, ''),
    '/applications/' || NEW.id,
    jsonb_build_object(
      'application_id', NEW.id,
      'old_status', OLD.status,
      'new_status', NEW.status
    )
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_application_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_application_step_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_application record;
  v_title text;
BEGIN
  -- ステータスが変更されていない場合はスキップ
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- 親の応募情報を取得
  SELECT applicant_id, organization_id, id
  INTO v_application
  FROM applications
  WHERE id = NEW.application_id;

  IF v_application IS NULL THEN
    RETURN NEW;
  END IF;

  -- 新しいステータスに応じたタイトルを決定
  CASE NEW.status
    WHEN 'in_progress' THEN v_title := '選考が進みました';
    WHEN 'completed'   THEN v_title := 'ステップが完了しました';
    WHEN 'skipped'     THEN v_title := 'ステップがスキップされました';
    ELSE v_title := '選考ステップが更新されました';
  END CASE;

  -- 通知レコードを作成
  INSERT INTO notifications (
    organization_id,
    user_id,
    type,
    title,
    body,
    action_url,
    metadata
  ) VALUES (
    v_application.organization_id,
    v_application.applicant_id,
    'recruitment_update',
    v_title,
    NEW.label,
    '/applications/' || v_application.id,
    jsonb_build_object(
      'application_id', v_application.id,
      'step_id', NEW.id,
      'old_status', OLD.status,
      'new_status', NEW.status
    )
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_application_step_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reorder_job_steps"("p_job_id" "uuid", "p_step_ids" "uuid"[], "p_step_orders" integer[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- 管理者権限チェック
  IF NOT EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = p_job_id
      AND j.organization_id IN (
        SELECT uo.organization_id FROM public.user_organizations uo
        JOIN public.profiles p ON p.id = uo.user_id
        WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
      )
  ) THEN
    RAISE EXCEPTION '権限がありません';
  END IF;

  IF array_length(p_step_ids, 1) IS DISTINCT FROM array_length(p_step_orders, 1) THEN
    RAISE EXCEPTION 'step_ids と step_orders の長さが一致しません';
  END IF;

  UPDATE public.job_steps
  SET step_order = step_order + 10000
  WHERE job_id = p_job_id;

  FOR i IN 1..array_length(p_step_ids, 1) LOOP
    UPDATE public.job_steps
    SET step_order = p_step_orders[i]
    WHERE id = p_step_ids[i]
      AND job_id = p_job_id;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."reorder_job_steps"("p_job_id" "uuid", "p_step_ids" "uuid"[], "p_step_orders" integer[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."seed_default_permission_groups"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  grp_admin_id uuid;
  grp_hr_id uuid;
  grp_employee_id uuid;
  all_resources text[] := ARRAY[
    'applicants','jobs','applications','scheduling','forms',
    'employees','departments','attendance','shifts','workflows','leave','payslips',
    'evaluations','messages','calendar','tasks','announcements','faqs','projects','surveys','wiki',
    'crm.leads','crm.companies','crm.contacts','crm.deals','crm.quotes','crm.reports','crm.settings',
    'settings.organization','settings.members','settings.dashboard','settings.recruiting-targets','settings.certifications','settings.skills',
    'compliance','audit-logs'
  ];
  all_actions text[] := ARRAY['view','create','edit','delete'];
  hr_resources text[] := ARRAY[
    'applicants','jobs','applications','scheduling','forms',
    'employees','departments','attendance','evaluations','leave','payslips'
  ];
  employee_resources text[] := ARRAY[
    'messages','calendar','tasks','announcements','faqs','wiki','surveys'
  ];
  employee_actions text[] := ARRAY['view','create'];
  r text;
BEGIN
  -- 管理者グループ
  INSERT INTO permission_groups (organization_id, name, description, is_system)
  VALUES (NEW.id, '管理者', '全機能へのフルアクセス', true)
  RETURNING id INTO grp_admin_id;

  FOREACH r IN ARRAY all_resources LOOP
    INSERT INTO permission_group_permissions (group_id, resource, actions)
    VALUES (grp_admin_id, r, all_actions);
  END LOOP;

  -- 人事担当グループ
  INSERT INTO permission_groups (organization_id, name, description, is_system)
  VALUES (NEW.id, '人事担当', '採用・人事管理の担当者', true)
  RETURNING id INTO grp_hr_id;

  FOREACH r IN ARRAY hr_resources LOOP
    INSERT INTO permission_group_permissions (group_id, resource, actions)
    VALUES (grp_hr_id, r, all_actions);
  END LOOP;

  -- 一般社員グループ
  INSERT INTO permission_groups (organization_id, name, description, is_system)
  VALUES (NEW.id, '一般社員', '基本的な閲覧権限', true)
  RETURNING id INTO grp_employee_id;

  FOREACH r IN ARRAY employee_resources LOOP
    INSERT INTO permission_group_permissions (group_id, resource, actions)
    VALUES (grp_employee_id, r, employee_actions);
  END LOOP;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."seed_default_permission_groups"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_push_on_notification_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  _supabase_url text;
  _service_role_key text;
BEGIN
  _supabase_url := current_setting('app.settings.supabase_url', true);
  _service_role_key := current_setting('app.settings.service_role_key', true);

  IF _supabase_url IS NULL OR _service_role_key IS NULL THEN
    INSERT INTO public.push_notification_logs (notification_id, user_id, status, error_message)
    VALUES (NEW.id, NEW.user_id, 'skipped', 'app.settings.supabase_url or service_role_key not configured');
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM extensions.http_post(
      url := _supabase_url || '/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _service_role_key
      ),
      body := jsonb_build_object(
        'user_id', NEW.user_id,
        'title', NEW.title,
        'body', COALESCE(NEW.body, ''),
        'action_url', NEW.action_url
      )
    );

    INSERT INTO public.push_notification_logs (notification_id, user_id, status)
    VALUES (NEW.id, NEW.user_id, 'sent');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.push_notification_logs (notification_id, user_id, status, error_message)
    VALUES (NEW.id, NEW.user_id, 'failed', SQLERRM);
  END;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."send_push_on_notification_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."signup_setup"("p_email" "text", "p_display_name" "text", "p_phone" "text", "p_company_name" "text", "p_industry" "text", "p_employee_count" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id text;
  v_org_id  text;
BEGIN
  v_user_id := auth.uid()::text;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 二重初期化ガード
  -- user_organizations に既にレコードがある = 初期化済み
  -- ネットワークエラーによるリトライや二重送信で組織が重複作成されるのを防ぐ
  IF EXISTS (
    SELECT 1 FROM public.user_organizations WHERE user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Already initialized: user already belongs to an organization';
  END IF;

  -- 1. プロフィール作成（admin ロールで登録）
  -- ON CONFLICT DO NOTHING: 既存プロフィールのroleを強制上書きしない
  INSERT INTO public.profiles (id, email, display_name, phone, role)
  VALUES (v_user_id, p_email, p_display_name, p_phone, 'admin')
  ON CONFLICT (id) DO NOTHING;

  -- 2. 組織作成
  v_org_id := gen_random_uuid()::text;
  INSERT INTO public.organizations (id, name, industry, employee_count)
  VALUES (v_org_id, p_company_name, p_industry, p_employee_count);

  -- 3. ユーザーと組織を紐付け
  INSERT INTO public.user_organizations (user_id, organization_id)
  VALUES (v_user_id, v_org_id);
END;
$$;


ALTER FUNCTION "public"."signup_setup"("p_email" "text", "p_display_name" "text", "p_phone" "text", "p_company_name" "text", "p_industry" "text", "p_employee_count" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_ad_hoc_evaluation"("p_evaluation_id" "uuid", "p_organization_id" "text", "p_template_id" "uuid", "p_target_user_id" "text", "p_application_id" "uuid", "p_status" "text", "p_overall_comment" "text", "p_scores" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_eval_id uuid;
  v_score jsonb;
  v_existing_evaluator text;
  v_submitted_at timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

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

  IF NOT EXISTS (
    SELECT 1 FROM public.get_my_organization_ids() AS org_id
    WHERE org_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'forbidden: not a member of organization %', p_organization_id
      USING ERRCODE = '42501';
  END IF;

  v_submitted_at := CASE WHEN p_status = 'submitted' THEN now() ELSE NULL END;

  IF p_evaluation_id IS NULL THEN
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

    UPDATE public.evaluations
    SET status = p_status,
        overall_comment = NULLIF(trim(COALESCE(p_overall_comment, '')), ''),
        submitted_at = v_submitted_at
    WHERE id = p_evaluation_id;

    DELETE FROM public.evaluation_scores WHERE evaluation_id = p_evaluation_id;

    v_eval_id := p_evaluation_id;
  END IF;

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


ALTER FUNCTION "public"."submit_ad_hoc_evaluation"("p_evaluation_id" "uuid", "p_organization_id" "text", "p_template_id" "uuid", "p_target_user_id" "text", "p_application_id" "uuid", "p_status" "text", "p_overall_comment" "text", "p_scores" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."submit_ad_hoc_evaluation"("p_evaluation_id" "uuid", "p_organization_id" "text", "p_template_id" "uuid", "p_target_user_id" "text", "p_application_id" "uuid", "p_status" "text", "p_overall_comment" "text", "p_scores" "jsonb") IS 'アドホック評価（応募者/社員詳細から直接作成する評価）の作成・更新をアトミックに処理する。cycle_id / assignment_id は扱わない。サイクル駆動の評価フローは別経路。';



CREATE OR REPLACE FUNCTION "public"."submit_survey_response"("p_survey_id" "text", "p_answers" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id text;
  v_org_id text;
  v_response_id uuid;
  v_survey_status text;
  v_survey_deadline timestamptz;
  v_survey_uuid uuid;
  v_answer jsonb;
BEGIN
  v_user_id := auth.uid()::text;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'ユーザーが認証されていません';
  END IF;

  v_survey_uuid := p_survey_id::uuid;

  SELECT ps.status, ps.deadline, ps.organization_id
    INTO v_survey_status, v_survey_deadline, v_org_id
    FROM pulse_surveys ps
    WHERE ps.id = v_survey_uuid;

  IF v_survey_status IS NULL THEN
    RAISE EXCEPTION 'サーベイが見つかりません';
  END IF;
  IF v_survey_status != 'active' THEN
    RAISE EXCEPTION 'このサーベイは現在回答を受け付けていません';
  END IF;
  IF v_survey_deadline IS NOT NULL AND v_survey_deadline < now() THEN
    RAISE EXCEPTION 'このサーベイは締め切りを過ぎています';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM user_organizations
    WHERE user_id = v_user_id AND organization_id = v_org_id
  ) THEN
    RAISE EXCEPTION 'このサーベイへのアクセス権限がありません';
  END IF;

  INSERT INTO pulse_survey_responses (survey_id, organization_id, user_id, completed_at)
  VALUES (v_survey_uuid, v_org_id, v_user_id, now())
  ON CONFLICT (survey_id, user_id)
  DO UPDATE SET completed_at = now()
  RETURNING id INTO v_response_id;

  DELETE FROM pulse_survey_answers WHERE response_id = v_response_id;

  FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers) LOOP
    INSERT INTO pulse_survey_answers (response_id, question_id, value)
    VALUES (
      v_response_id,
      (v_answer->>'question_id')::uuid,
      v_answer->>'value'
    );
  END LOOP;

  RETURN v_response_id;
END;
$$;


ALTER FUNCTION "public"."submit_survey_response"("p_survey_id" "text", "p_answers" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_selection_step_templates_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."touch_selection_step_templates_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_pulse_survey_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_pulse_survey_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_thread_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE message_threads
  SET updated_at = now()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_thread_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_push_token"("p_token" "text", "p_platform" "text", "p_app_type" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id text;
BEGIN
  v_user_id := auth.uid()::text;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '認証が必要です';
  END IF;

  INSERT INTO push_tokens (user_id, token, platform, app_type)
  VALUES (v_user_id, p_token, p_platform, p_app_type)
  ON CONFLICT (user_id, token)
  DO UPDATE SET platform = p_platform, app_type = p_app_type, updated_at = now();
END;
$$;


ALTER FUNCTION "public"."upsert_push_token"("p_token" "text", "p_platform" "text", "p_app_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_org_ids"() RETURNS SETOF "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text;
$$;


ALTER FUNCTION "public"."user_org_ids"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."activity_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "actor_id" "text",
    "actor_name" "text",
    "action" "text" NOT NULL,
    "category" "text" NOT NULL,
    "target_type" "text" NOT NULL,
    "target_id" "text" NOT NULL,
    "parent_type" "text",
    "parent_id" "text",
    "summary" "text" NOT NULL,
    "detail" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."activity_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "is_pinned" boolean DEFAULT false NOT NULL,
    "target" "text" DEFAULT 'all'::"text" NOT NULL,
    "published_at" timestamp with time zone,
    "created_by" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "announcements_target_check" CHECK (("target" = ANY (ARRAY['all'::"text", 'employee'::"text", 'applicant'::"text"])))
);


ALTER TABLE "public"."announcements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."applicant_todos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" NOT NULL,
    "organization_id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "note" "text",
    "is_completed" boolean DEFAULT false NOT NULL,
    "completed_at" timestamp with time zone,
    "is_important" boolean DEFAULT false NOT NULL,
    "due_date" "date",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "source_id" "text",
    "action_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."applicant_todos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."application_steps" (
    "id" "text" NOT NULL,
    "application_id" "text" NOT NULL,
    "step_type" "text" NOT NULL,
    "step_order" integer DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "label" "text" NOT NULL,
    "related_id" "text",
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "applicant_action_at" timestamp with time zone,
    CONSTRAINT "application_steps_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text", 'completed'::"text", 'skipped'::"text"]))),
    CONSTRAINT "application_steps_step_type_check" CHECK (("step_type" = ANY (ARRAY['screening'::"text", 'form'::"text", 'interview'::"text", 'external_test'::"text", 'offer'::"text"])))
);


ALTER TABLE "public"."application_steps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."applications" (
    "id" "text" NOT NULL,
    "job_id" "text" NOT NULL,
    "applicant_id" "text" NOT NULL,
    "organization_id" "text" NOT NULL,
    "status" "text" NOT NULL,
    "applied_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "applications_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'offered'::"text", 'rejected'::"text", 'withdrawn'::"text"])))
);


ALTER TABLE "public"."applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attendance_approvers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "user_id" "text",
    "department_id" "text",
    "approver_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "project_id" "text",
    CONSTRAINT "approver_target_check" CHECK (((("user_id" IS NOT NULL) AND ("department_id" IS NULL)) OR (("user_id" IS NULL) AND ("department_id" IS NOT NULL)))),
    CONSTRAINT "attendance_approvers_target_check" CHECK (((("user_id" IS NOT NULL) AND ("department_id" IS NULL) AND ("project_id" IS NULL)) OR (("user_id" IS NULL) AND ("department_id" IS NOT NULL) AND ("project_id" IS NULL)) OR (("user_id" IS NULL) AND ("department_id" IS NULL) AND ("project_id" IS NOT NULL))))
);


ALTER TABLE "public"."attendance_approvers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attendance_corrections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "record_id" "uuid" NOT NULL,
    "user_id" "text" NOT NULL,
    "original_clock_in" timestamp with time zone,
    "original_clock_out" timestamp with time zone,
    "requested_clock_in" timestamp with time zone,
    "requested_clock_out" timestamp with time zone,
    "reason" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "reviewed_by" "text",
    "reviewed_at" timestamp with time zone,
    "review_comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "punch_corrections" "jsonb",
    CONSTRAINT "attendance_corrections_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."attendance_corrections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attendance_punches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" NOT NULL,
    "organization_id" "text" NOT NULL,
    "record_id" "uuid",
    "punch_type" "text" NOT NULL,
    "punched_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "attendance_punches_punch_type_check" CHECK (("punch_type" = ANY (ARRAY['clock_in'::"text", 'clock_out'::"text", 'break_start'::"text", 'break_end'::"text"])))
);


ALTER TABLE "public"."attendance_punches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attendance_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" NOT NULL,
    "organization_id" "text" NOT NULL,
    "date" "date" NOT NULL,
    "clock_in" timestamp with time zone,
    "clock_out" timestamp with time zone,
    "break_minutes" integer DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'present'::"text" NOT NULL,
    "note" "text",
    "overtime_minutes" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "late_night_minutes" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "attendance_records_status_check" CHECK (("status" = ANY (ARRAY['present'::"text", 'absent'::"text", 'late'::"text", 'early_leave'::"text", 'paid_leave'::"text", 'half_day_am'::"text", 'half_day_pm'::"text", 'holiday'::"text", 'sick_leave'::"text", 'special_leave'::"text"])))
);


ALTER TABLE "public"."attendance_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attendance_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "work_start_time" time without time zone DEFAULT '09:00:00'::time without time zone NOT NULL,
    "work_end_time" time without time zone DEFAULT '18:00:00'::time without time zone NOT NULL,
    "break_minutes" integer DEFAULT 60 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."attendance_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sequence_number" bigint NOT NULL,
    "organization_id" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "action" "text" NOT NULL,
    "table_name" "text" NOT NULL,
    "record_id" "text" NOT NULL,
    "changes" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "metadata" "jsonb",
    "ip_address" "text",
    "user_agent" "text",
    "source" "text" DEFAULT 'trigger'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "audit_logs_action_check" CHECK (("action" = ANY (ARRAY['create'::"text", 'update'::"text", 'delete'::"text"]))),
    CONSTRAINT "audit_logs_source_check" CHECK (("source" = ANY (ARRAY['trigger'::"text", 'console'::"text", 'api'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs_archive" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sequence_number" bigint NOT NULL,
    "organization_id" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "action" "text" NOT NULL,
    "table_name" "text" NOT NULL,
    "record_id" "text" NOT NULL,
    "changes" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "metadata" "jsonb",
    "ip_address" "text",
    "user_agent" "text",
    "source" "text" DEFAULT 'trigger'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_logs_archive" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs_errors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "error_message" "text" NOT NULL,
    "table_name" "text",
    "record_id" "text",
    "operation" "text",
    "raw_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_logs_errors" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."audit_logs_sequence_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."audit_logs_sequence_number_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."audit_logs_sequence_number_seq" OWNED BY "public"."audit_logs"."sequence_number";



CREATE TABLE IF NOT EXISTS "public"."bc_activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "company_id" "uuid",
    "contact_id" "uuid",
    "deal_id" "uuid",
    "activity_type" "text" DEFAULT 'memo'::"text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "activity_date" timestamp with time zone,
    "created_by" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "lead_id" "uuid"
);


ALTER TABLE "public"."bc_activities" OWNER TO "postgres";


COMMENT ON COLUMN "public"."bc_activities"."lead_id" IS 'リードに紐づく活動（商談化前の電話・メール等）';



CREATE TABLE IF NOT EXISTS "public"."bc_cards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "contact_id" "uuid",
    "image_url" "text" NOT NULL,
    "raw_text" "text",
    "scanned_by" "text" NOT NULL,
    "scanned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."bc_cards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bc_companies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "name_kana" "text",
    "corporate_number" "text",
    "postal_code" "text",
    "address" "text",
    "phone" "text",
    "website" "text",
    "industry" "text",
    "notes" "text",
    "created_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."bc_companies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bc_contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "company_id" "uuid",
    "last_name" "text" NOT NULL,
    "first_name" "text",
    "last_name_kana" "text",
    "first_name_kana" "text",
    "department" "text",
    "position" "text",
    "email" "text",
    "phone" "text",
    "mobile_phone" "text",
    "notes" "text",
    "created_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."bc_contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bc_deal_contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "deal_id" "uuid" NOT NULL,
    "contact_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'stakeholder'::"text" NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "bc_deal_contacts_role_check" CHECK (("role" = ANY (ARRAY['decision_maker'::"text", 'influencer'::"text", 'champion'::"text", 'end_user'::"text", 'evaluator'::"text", 'stakeholder'::"text"])))
);


ALTER TABLE "public"."bc_deal_contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bc_deals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "company_id" "uuid",
    "contact_id" "uuid",
    "title" "text" NOT NULL,
    "amount" integer,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "stage" "text" DEFAULT 'initial'::"text" NOT NULL,
    "expected_close_date" "date",
    "description" "text",
    "assigned_to" "text",
    "created_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "probability" integer,
    "pipeline_id" "uuid",
    "stage_id" "uuid",
    CONSTRAINT "bc_deals_probability_range" CHECK ((("probability" IS NULL) OR (("probability" >= 0) AND ("probability" <= 100))))
);


ALTER TABLE "public"."bc_deals" OWNER TO "postgres";


COMMENT ON COLUMN "public"."bc_deals"."probability" IS '受注確度（0-100%）。ステージ変更時にデフォルト値を自動設定';



CREATE TABLE IF NOT EXISTS "public"."bc_leads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "source" "text" DEFAULT 'other'::"text" NOT NULL,
    "status" "text" DEFAULT 'new'::"text" NOT NULL,
    "assigned_to" "text",
    "notes" "text",
    "converted_company_id" "uuid",
    "converted_contact_id" "uuid",
    "converted_deal_id" "uuid",
    "converted_at" timestamp with time zone,
    "created_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "contact_name" "text",
    "contact_email" "text",
    "contact_phone" "text",
    CONSTRAINT "bc_leads_source_check" CHECK (("source" = ANY (ARRAY['web'::"text", 'referral'::"text", 'event'::"text", 'cold_call'::"text", 'other'::"text"]))),
    CONSTRAINT "bc_leads_status_check" CHECK (("status" = ANY (ARRAY['new'::"text", 'contacted'::"text", 'qualified'::"text", 'unqualified'::"text", 'converted'::"text"])))
);


ALTER TABLE "public"."bc_leads" OWNER TO "postgres";


COMMENT ON COLUMN "public"."bc_leads"."name" IS 'リード企業名（必須）';



COMMENT ON COLUMN "public"."bc_leads"."contact_name" IS '担当者名';



COMMENT ON COLUMN "public"."bc_leads"."contact_email" IS '担当者メールアドレス';



COMMENT ON COLUMN "public"."bc_leads"."contact_phone" IS '担当者電話番号';



CREATE TABLE IF NOT EXISTS "public"."bc_quote_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quote_id" "uuid" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "description" "text" NOT NULL,
    "quantity" numeric(10,2) DEFAULT 1 NOT NULL,
    "unit" "text" DEFAULT '式'::"text" NOT NULL,
    "unit_price" bigint DEFAULT 0 NOT NULL,
    "amount" bigint DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "bc_quote_items_amount_nonneg" CHECK (("amount" >= 0)),
    CONSTRAINT "bc_quote_items_quantity_positive" CHECK (("quantity" > (0)::numeric)),
    CONSTRAINT "bc_quote_items_unit_price_nonneg" CHECK (("unit_price" >= 0))
);


ALTER TABLE "public"."bc_quote_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bc_quotes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "deal_id" "uuid",
    "company_id" "uuid",
    "contact_id" "uuid",
    "quote_number" "text" NOT NULL,
    "title" "text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "issue_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "expiry_date" "date",
    "subtotal" bigint DEFAULT 0 NOT NULL,
    "tax_rate" numeric(5,2) DEFAULT 10.00 NOT NULL,
    "tax_amount" bigint DEFAULT 0 NOT NULL,
    "total" bigint DEFAULT 0 NOT NULL,
    "notes" "text",
    "terms" "text",
    "created_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "bc_quotes_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'sent'::"text", 'accepted'::"text", 'rejected'::"text", 'expired'::"text"]))),
    CONSTRAINT "bc_quotes_subtotal_nonneg" CHECK (("subtotal" >= 0)),
    CONSTRAINT "bc_quotes_tax_amount_nonneg" CHECK (("tax_amount" >= 0)),
    CONSTRAINT "bc_quotes_tax_rate_range" CHECK ((("tax_rate" >= (0)::numeric) AND ("tax_rate" <= (100)::numeric))),
    CONSTRAINT "bc_quotes_total_nonneg" CHECK (("total" >= 0))
);


ALTER TABLE "public"."bc_quotes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bc_todos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "company_id" "uuid",
    "contact_id" "uuid",
    "deal_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "due_date" "date",
    "is_completed" boolean DEFAULT false NOT NULL,
    "completed_at" timestamp with time zone,
    "assigned_to" "text" NOT NULL,
    "created_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "lead_id" "uuid"
);


ALTER TABLE "public"."bc_todos" OWNER TO "postgres";


COMMENT ON COLUMN "public"."bc_todos"."lead_id" IS 'リードに紐づくTODO（フォローアップ予定等）';



CREATE TABLE IF NOT EXISTS "public"."calendar_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" NOT NULL,
    "organization_id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "start_at" timestamp with time zone NOT NULL,
    "end_at" timestamp with time zone NOT NULL,
    "is_all_day" boolean DEFAULT false NOT NULL,
    "location" "text",
    "category_color" "text" DEFAULT '#0F6CBD'::"text" NOT NULL,
    "recurrence_rule" "text",
    "reminder_minutes" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."calendar_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."certification_masters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text",
    "name" "text" NOT NULL,
    "category" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "has_score" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."certification_masters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."channel_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "thread_id" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."channel_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."compliance_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "user_id" "text",
    "alert_type" "text" NOT NULL,
    "severity" "text" DEFAULT 'warning'::"text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "metadata" "jsonb",
    "is_resolved" boolean DEFAULT false NOT NULL,
    "resolved_at" timestamp with time zone,
    "resolved_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "compliance_alerts_alert_type_check" CHECK (("alert_type" = ANY (ARRAY['leave_usage_warning'::"text", 'leave_expiry_warning'::"text", 'overtime_monthly_warning'::"text", 'overtime_yearly_warning'::"text", 'leave_balance_low'::"text", 'attendance_anomaly'::"text"]))),
    CONSTRAINT "compliance_alerts_severity_check" CHECK (("severity" = ANY (ARRAY['info'::"text", 'warning'::"text", 'critical'::"text"])))
);


ALTER TABLE "public"."compliance_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contract_changes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contract_id" "uuid" NOT NULL,
    "changed_by" "text",
    "change_type" "text" NOT NULL,
    "old_values" "jsonb",
    "new_values" "jsonb",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "contract_changes_change_type_check" CHECK (("change_type" = ANY (ARRAY['created'::"text", 'plan_changed'::"text", 'employees_changed'::"text", 'suspended'::"text", 'cancelled'::"text", 'renewed'::"text", 'updated'::"text"])))
);


ALTER TABLE "public"."contract_changes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contracts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'trial'::"text" NOT NULL,
    "contracted_employees" integer DEFAULT 0 NOT NULL,
    "monthly_price" integer DEFAULT 0 NOT NULL,
    "start_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "end_date" "date",
    "trial_end_date" "date",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "contracts_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'trial'::"text", 'suspended'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."contracts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crm_automation_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "rule_id" "uuid" NOT NULL,
    "trigger_type" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "actions_executed" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'success'::"text" NOT NULL,
    "error_message" "text",
    "executed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "crm_automation_logs_status_check" CHECK (("status" = ANY (ARRAY['success'::"text", 'partial'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."crm_automation_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crm_automation_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "trigger_type" "text" NOT NULL,
    "conditions" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "actions" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "crm_automation_rules_trigger_type_check" CHECK (("trigger_type" = ANY (ARRAY['deal_stage_changed'::"text", 'deal_created'::"text", 'deal_won'::"text", 'deal_lost'::"text", 'lead_created'::"text", 'lead_status_changed'::"text", 'lead_converted'::"text", 'contact_created'::"text", 'company_created'::"text", 'activity_created'::"text"])))
);


ALTER TABLE "public"."crm_automation_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crm_email_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "body" "text" NOT NULL,
    "category" "text" DEFAULT 'general'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "crm_email_templates_category_check" CHECK (("category" = ANY (ARRAY['general'::"text", 'follow_up'::"text", 'proposal'::"text", 'thank_you'::"text", 'introduction'::"text", 'reminder'::"text"])))
);


ALTER TABLE "public"."crm_email_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crm_field_definitions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "field_type" "text" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text",
    "placeholder" "text",
    "is_required" boolean DEFAULT false NOT NULL,
    "options" "text"[],
    "field_group" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "crm_field_definitions_entity_type_check" CHECK (("entity_type" = ANY (ARRAY['company'::"text", 'contact'::"text", 'deal'::"text"])))
);


ALTER TABLE "public"."crm_field_definitions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crm_field_values" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "field_id" "uuid" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "entity_type" "text" NOT NULL,
    "value" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "crm_field_values_entity_type_check" CHECK (("entity_type" = ANY (ARRAY['company'::"text", 'contact'::"text", 'deal'::"text"])))
);


ALTER TABLE "public"."crm_field_values" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crm_pipeline_stages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pipeline_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "color" "text" DEFAULT '#3b82f6'::"text" NOT NULL,
    "probability_default" integer DEFAULT 0 NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "crm_pipeline_stages_probability_range" CHECK ((("probability_default" >= 0) AND ("probability_default" <= 100)))
);


ALTER TABLE "public"."crm_pipeline_stages" OWNER TO "postgres";


COMMENT ON TABLE "public"."crm_pipeline_stages" IS 'パイプラインのステージ定義（順序・色・デフォルト確度）';



CREATE TABLE IF NOT EXISTS "public"."crm_pipelines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."crm_pipelines" OWNER TO "postgres";


COMMENT ON TABLE "public"."crm_pipelines" IS 'テナント毎のCRMパイプライン定義';



CREATE TABLE IF NOT EXISTS "public"."crm_saved_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "is_shared" boolean DEFAULT false NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "crm_saved_views_entity_type_check" CHECK (("entity_type" = ANY (ARRAY['company'::"text", 'contact'::"text", 'deal'::"text"])))
);


ALTER TABLE "public"."crm_saved_views" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crm_webhook_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "webhook_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "request_body" "jsonb" NOT NULL,
    "response_status" integer,
    "response_body" "text",
    "success" boolean NOT NULL,
    "error_message" "text",
    "executed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."crm_webhook_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crm_webhooks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "url" "text" NOT NULL,
    "secret" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "events" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "headers" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "last_triggered_at" timestamp with time zone,
    "success_count" integer DEFAULT 0 NOT NULL,
    "failure_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."crm_webhooks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."custom_forms" (
    "id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "application_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "organization_id" "text",
    "target" "text" DEFAULT 'both'::"text" NOT NULL,
    CONSTRAINT "check_custom_forms_target" CHECK (("target" = ANY (ARRAY['applicant'::"text", 'employee'::"text", 'both'::"text"])))
);


ALTER TABLE "public"."custom_forms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dashboard_widget_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" NOT NULL,
    "organization_id" "text" NOT NULL,
    "product_tab" "text" NOT NULL,
    "widget_config" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "dashboard_widget_preferences_product_tab_check" CHECK (("product_tab" = ANY (ARRAY['recruiting'::"text", 'workspace'::"text"])))
);


ALTER TABLE "public"."dashboard_widget_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."departments" (
    "id" "text" NOT NULL,
    "organization_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "parent_id" "text"
);


ALTER TABLE "public"."departments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_certifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" NOT NULL,
    "organization_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "acquired_date" "date",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "score" integer
);


ALTER TABLE "public"."employee_certifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_departments" (
    "user_id" "text" NOT NULL,
    "department_id" "text" NOT NULL
);


ALTER TABLE "public"."employee_departments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_skills" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" NOT NULL,
    "organization_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."employee_skills" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_task_steps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "is_completed" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."employee_task_steps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" NOT NULL,
    "organization_id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "note" "text",
    "is_completed" boolean DEFAULT false NOT NULL,
    "completed_at" timestamp with time zone,
    "is_important" boolean DEFAULT false NOT NULL,
    "is_my_day" boolean DEFAULT false NOT NULL,
    "my_day_date" "date",
    "due_date" "date",
    "reminder_at" timestamp with time zone,
    "list_name" "text" DEFAULT 'タスク'::"text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "company_id" "uuid",
    "contact_id" "uuid",
    "deal_id" "uuid"
);


ALTER TABLE "public"."employee_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evaluation_anchors" (
    "id" "text" NOT NULL,
    "criterion_id" "text" NOT NULL,
    "score_value" integer NOT NULL,
    "description" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."evaluation_anchors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evaluation_assignments" (
    "id" "text" NOT NULL,
    "cycle_id" "text" NOT NULL,
    "target_user_id" "text" NOT NULL,
    "evaluator_id" "text" NOT NULL,
    "rater_type" "text" NOT NULL,
    "evaluation_id" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "due_date" "date",
    "reminded_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "evaluation_assignments_rater_type_check" CHECK (("rater_type" = ANY (ARRAY['supervisor'::"text", 'peer'::"text", 'subordinate'::"text", 'self'::"text", 'external'::"text"]))),
    CONSTRAINT "evaluation_assignments_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text", 'submitted'::"text", 'skipped'::"text"])))
);


ALTER TABLE "public"."evaluation_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evaluation_criteria" (
    "id" "text" NOT NULL,
    "template_id" "text" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text",
    "score_type" "text" DEFAULT 'five_star'::"text" NOT NULL,
    "options" "text"[],
    "sort_order" integer DEFAULT 0 NOT NULL,
    "weight" numeric(3,2) DEFAULT 1.00 NOT NULL,
    CONSTRAINT "check_eval_score_type" CHECK (("score_type" = ANY (ARRAY['five_star'::"text", 'ten_point'::"text", 'text'::"text", 'select'::"text"])))
);


ALTER TABLE "public"."evaluation_criteria" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evaluation_cycles" (
    "id" "text" NOT NULL,
    "organization_id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "template_id" "text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "created_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "evaluation_cycles_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'active'::"text", 'closed'::"text", 'calibrating'::"text", 'finalized'::"text"])))
);


ALTER TABLE "public"."evaluation_cycles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evaluation_scores" (
    "id" "text" NOT NULL,
    "evaluation_id" "text" NOT NULL,
    "criterion_id" "text" NOT NULL,
    "score" integer,
    "value" "text",
    "comment" "text"
);


ALTER TABLE "public"."evaluation_scores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evaluation_templates" (
    "id" "text" NOT NULL,
    "organization_id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "target" "text" DEFAULT 'both'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "evaluation_type" "text" DEFAULT 'single'::"text" NOT NULL,
    "anonymity_mode" "text" DEFAULT 'none'::"text" NOT NULL,
    CONSTRAINT "check_eval_template_target" CHECK (("target" = ANY (ARRAY['applicant'::"text", 'employee'::"text", 'both'::"text"]))),
    CONSTRAINT "evaluation_templates_anonymity_mode_check" CHECK (("anonymity_mode" = ANY (ARRAY['none'::"text", 'peer_only'::"text", 'full'::"text"]))),
    CONSTRAINT "evaluation_templates_evaluation_type_check" CHECK (("evaluation_type" = ANY (ARRAY['single'::"text", 'multi_rater'::"text"])))
);


ALTER TABLE "public"."evaluation_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evaluations" (
    "id" "text" NOT NULL,
    "organization_id" "text" NOT NULL,
    "template_id" "text" NOT NULL,
    "target_user_id" "text" NOT NULL,
    "evaluator_id" "text" NOT NULL,
    "application_id" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "overall_comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "submitted_at" timestamp with time zone,
    "cycle_id" "text",
    "rater_type" "text",
    "assignment_id" "text",
    CONSTRAINT "check_eval_status" CHECK (("status" = ANY (ARRAY['draft'::"text", 'submitted'::"text"]))),
    CONSTRAINT "evaluations_rater_type_check" CHECK (("rater_type" = ANY (ARRAY['supervisor'::"text", 'peer'::"text", 'subordinate'::"text", 'self'::"text", 'external'::"text"])))
);


ALTER TABLE "public"."evaluations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."faqs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "question" "text" NOT NULL,
    "answer" "text" NOT NULL,
    "category" "text" DEFAULT 'general'::"text" NOT NULL,
    "target" "text" DEFAULT 'both'::"text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_published" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "faqs_target_check" CHECK (("target" = ANY (ARRAY['employee'::"text", 'applicant'::"text", 'both'::"text"])))
);


ALTER TABLE "public"."faqs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."form_fields" (
    "id" "text" NOT NULL,
    "form_id" "text" NOT NULL,
    "label" "text" NOT NULL,
    "type" "text" NOT NULL,
    "description" "text",
    "is_required" boolean DEFAULT false NOT NULL,
    "options" "text"[],
    "placeholder" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "form_fields_type_check" CHECK (("type" = ANY (ARRAY['shortText'::"text", 'longText'::"text", 'radio'::"text", 'checkbox'::"text", 'dropdown'::"text", 'date'::"text", 'fileUpload'::"text"])))
);


ALTER TABLE "public"."form_fields" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."form_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "form_id" "text" NOT NULL,
    "field_id" "text" NOT NULL,
    "applicant_id" "text" NOT NULL,
    "value" "jsonb",
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."form_responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."interview_slots" (
    "id" "text" NOT NULL,
    "interview_id" "text" NOT NULL,
    "start_at" timestamp with time zone NOT NULL,
    "end_at" timestamp with time zone NOT NULL,
    "is_selected" boolean DEFAULT false NOT NULL,
    "application_id" "text",
    "max_applicants" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "check_max_applicants_gte_1" CHECK (("max_applicants" >= 1))
);


ALTER TABLE "public"."interview_slots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."interviews" (
    "id" "text" NOT NULL,
    "application_id" "text",
    "status" "text" NOT NULL,
    "confirmed_slot_id" "text",
    "location" "text",
    "meeting_url" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "organization_id" "text",
    "title" "text" DEFAULT ''::"text",
    CONSTRAINT "interviews_status_check" CHECK (("status" = ANY (ARRAY['scheduling'::"text", 'confirmed'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."interviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_sections" (
    "id" "text" NOT NULL,
    "job_id" "text" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text",
    "items" "jsonb" DEFAULT '[]'::"jsonb",
    "sort_order" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "job_sections_type_check" CHECK (("type" = ANY (ARRAY['markdown'::"text", 'jobList'::"text", 'benefitList'::"text", 'valueList'::"text", 'stats'::"text", 'members'::"text", 'gallery'::"text", 'faq'::"text"])))
);


ALTER TABLE "public"."job_sections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_steps" (
    "id" "text" NOT NULL,
    "job_id" "text" NOT NULL,
    "step_type" "text" NOT NULL,
    "step_order" integer DEFAULT 0 NOT NULL,
    "label" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "related_id" "text",
    CONSTRAINT "job_steps_step_type_check" CHECK (("step_type" = ANY (ARRAY['screening'::"text", 'form'::"text", 'interview'::"text", 'external_test'::"text", 'offer'::"text"])))
);


ALTER TABLE "public"."job_steps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."jobs" (
    "id" "text" NOT NULL,
    "organization_id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "department" "text",
    "location" "text",
    "employment_type" "text",
    "salary_range" "text",
    "posted_at" timestamp with time zone,
    "closing_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    CONSTRAINT "jobs_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'closed'::"text", 'draft'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leave_balances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "fiscal_year" integer NOT NULL,
    "granted_days" numeric(4,1) DEFAULT 0 NOT NULL,
    "used_days" numeric(4,1) DEFAULT 0 NOT NULL,
    "carried_over_days" numeric(4,1) DEFAULT 0 NOT NULL,
    "expired_days" numeric(4,1) DEFAULT 0 NOT NULL,
    "grant_date" "date" NOT NULL,
    "expiry_date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."leave_balances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."member_permission_groups" (
    "user_id" "text" NOT NULL,
    "group_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."member_permission_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_threads" (
    "id" "text" DEFAULT ('thread-'::"text" || "substr"(("gen_random_uuid"())::"text", 1, 8)) NOT NULL,
    "organization_id" "text" NOT NULL,
    "title" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "participant_id" "text",
    "participant_type" "text" DEFAULT 'applicant'::"text",
    "is_channel" boolean DEFAULT false NOT NULL,
    "channel_name" "text",
    "channel_type" "text",
    "channel_source_id" "text",
    CONSTRAINT "message_threads_channel_type_check" CHECK (("channel_type" = ANY (ARRAY['department'::"text", 'project'::"text", 'custom'::"text"]))),
    CONSTRAINT "message_threads_participant_type_check" CHECK (("participant_type" = ANY (ARRAY['applicant'::"text", 'employee'::"text"])))
);


ALTER TABLE "public"."message_threads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "text" DEFAULT ('msg-'::"text" || "substr"(("gen_random_uuid"())::"text", 1, 8)) NOT NULL,
    "thread_id" "text" NOT NULL,
    "sender_id" "text" DEFAULT ("auth"."uid"())::"text" NOT NULL,
    "content" "text" NOT NULL,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "edited_at" timestamp with time zone,
    CONSTRAINT "messages_content_length" CHECK (("length"("content") <= 5000)),
    CONSTRAINT "messages_content_not_empty" CHECK (("length"(TRIM(BOTH FROM "content")) > 0))
);

ALTER TABLE ONLY "public"."messages" REPLICA IDENTITY FULL;


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text",
    "is_read" boolean DEFAULT false NOT NULL,
    "read_at" timestamp with time zone,
    "action_url" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['survey_request'::"text", 'task_assigned'::"text", 'recruitment_update'::"text", 'attendance_reminder'::"text", 'message_received'::"text", 'announcement'::"text", 'general'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "logo_url" "text",
    "industry" "text",
    "description" "text",
    "mission" "text",
    "employee_count" "text",
    "founded_year" integer,
    "location" "text",
    "website_url" "text",
    "benefits" "text"[] DEFAULT '{}'::"text"[],
    "culture" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."page_sections" (
    "id" "text" NOT NULL,
    "tab_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text",
    "items" "jsonb" DEFAULT '[]'::"jsonb",
    "sort_order" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "page_sections_type_check" CHECK (("type" = ANY (ARRAY['markdown'::"text", 'jobList'::"text", 'benefitList'::"text", 'valueList'::"text", 'stats'::"text", 'members'::"text", 'gallery'::"text", 'faq'::"text"])))
);


ALTER TABLE "public"."page_sections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."page_tabs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "label" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."page_tabs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payslips" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "year" integer NOT NULL,
    "month" integer NOT NULL,
    "base_salary" integer DEFAULT 0 NOT NULL,
    "allowances" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "deductions" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "gross_pay" integer DEFAULT 0 NOT NULL,
    "net_pay" integer DEFAULT 0 NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "payslips_month_check" CHECK ((("month" >= 1) AND ("month" <= 12)))
);


ALTER TABLE "public"."payslips" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permission_group_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "resource" "text" NOT NULL,
    "actions" "text"[] DEFAULT '{}'::"text"[] NOT NULL
);


ALTER TABLE "public"."permission_group_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permission_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_system" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."permission_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "price_monthly" integer DEFAULT 0 NOT NULL,
    "max_employees" integer,
    "description" "text",
    "features" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."positions" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "organization_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."positions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "text" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" NOT NULL,
    "display_name" "text",
    "avatar_url" "text",
    "organization_id" "text",
    "organization_name" "text",
    "department" "text",
    "position" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "hiring_type" "text",
    "graduation_year" integer,
    "current_postal_code" "text",
    "current_prefecture" "text",
    "current_city" "text",
    "current_street_address" "text",
    "current_building" "text",
    "registered_postal_code" "text",
    "registered_prefecture" "text",
    "registered_city" "text",
    "registered_street_address" "text",
    "registered_building" "text",
    "name_kana" "text",
    "phone" "text",
    "hire_date" "date",
    "birth_date" "date",
    "gender" "text",
    "invited_at" timestamp with time zone,
    "school_name" "text",
    "school_faculty" "text",
    "work_history" "text",
    "skills" "text",
    "self_introduction" "text",
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'employee'::"text", 'applicant'::"text", 'hr1_admin'::"text", 'manager'::"text", 'approver'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_team_members" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "team_id" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "left_at" timestamp with time zone,
    CONSTRAINT "project_team_members_role_check" CHECK (("role" = ANY (ARRAY['leader'::"text", 'member'::"text"])))
);


ALTER TABLE "public"."project_team_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_teams" (
    "id" "text" NOT NULL,
    "project_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."project_teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "text" NOT NULL,
    "organization_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "start_date" "date",
    "end_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "projects_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'completed'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pulse_survey_answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "response_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "value" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pulse_survey_answers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pulse_survey_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "survey_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text",
    "is_required" boolean DEFAULT true NOT NULL,
    "options" "jsonb",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pulse_survey_questions_type_check" CHECK (("type" = ANY (ARRAY['rating'::"text", 'text'::"text", 'single_choice'::"text", 'multiple_choice'::"text"])))
);


ALTER TABLE "public"."pulse_survey_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pulse_survey_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "survey_id" "uuid" NOT NULL,
    "organization_id" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pulse_survey_responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pulse_surveys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "target" "text" DEFAULT 'employee'::"text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "deadline" timestamp with time zone,
    "created_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pulse_surveys_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'active'::"text", 'closed'::"text"]))),
    CONSTRAINT "pulse_surveys_target_check" CHECK (("target" = ANY (ARRAY['applicant'::"text", 'employee'::"text", 'both'::"text"])))
);


ALTER TABLE "public"."pulse_surveys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_notification_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "notification_id" "uuid",
    "user_id" "text" NOT NULL,
    "status" "text" NOT NULL,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "push_notification_logs_status_check" CHECK (("status" = ANY (ARRAY['sent'::"text", 'failed'::"text", 'skipped'::"text"])))
);


ALTER TABLE "public"."push_notification_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" NOT NULL,
    "token" "text" NOT NULL,
    "platform" "text" NOT NULL,
    "app_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "push_tokens_app_type_check" CHECK (("app_type" = ANY (ARRAY['employee'::"text", 'applicant'::"text"]))),
    CONSTRAINT "push_tokens_platform_check" CHECK (("platform" = ANY (ARRAY['ios'::"text", 'android'::"text"])))
);


ALTER TABLE "public"."push_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recruiting_targets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "fiscal_year" integer NOT NULL,
    "hiring_type" "text" NOT NULL,
    "target_type" "text" NOT NULL,
    "target_value" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "recruiting_targets_hiring_type_check" CHECK (("hiring_type" = ANY (ARRAY['new_grad'::"text", 'mid_career'::"text", 'all'::"text"]))),
    CONSTRAINT "recruiting_targets_target_type_check" CHECK (("target_type" = ANY (ARRAY['applications'::"text", 'offers'::"text"])))
);


ALTER TABLE "public"."recruiting_targets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."selection_step_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "step_type" "text" NOT NULL,
    "description" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "selection_step_templates_step_type_check" CHECK (("step_type" = ANY (ARRAY['screening'::"text", 'form'::"text", 'interview'::"text", 'external_test'::"text", 'offer'::"text"])))
);


ALTER TABLE "public"."selection_step_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."selection_step_templates" IS '選考ステップテンプレート: 求人作成時に再利用する名前付き選考ステップのマスタ';



COMMENT ON COLUMN "public"."selection_step_templates"."name" IS '選考ステップ名（例: 書類選考、1次面接、最終面接、内定）';



COMMENT ON COLUMN "public"."selection_step_templates"."step_type" IS 'ステップ種別: screening / form / interview / external_test / offer';



COMMENT ON COLUMN "public"."selection_step_templates"."sort_order" IS 'テンプレート一覧での並び順（小さいほど上に表示）';



CREATE TABLE IF NOT EXISTS "public"."service_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "service_requests_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'in_progress'::"text", 'resolved'::"text", 'closed'::"text"]))),
    CONSTRAINT "service_requests_type_check" CHECK (("type" = ANY (ARRAY['bug'::"text", 'feature'::"text"])))
);


ALTER TABLE "public"."service_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shift_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" NOT NULL,
    "organization_id" "text" NOT NULL,
    "target_date" "date" NOT NULL,
    "start_time" time without time zone,
    "end_time" time without time zone,
    "is_available" boolean DEFAULT true NOT NULL,
    "note" "text",
    "submitted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."shift_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shift_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" NOT NULL,
    "organization_id" "text" NOT NULL,
    "target_date" "date" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "position_label" "text",
    "note" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "published_at" timestamp with time zone,
    "published_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "shift_schedules_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text"])))
);


ALTER TABLE "public"."shift_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."skill_masters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text",
    "name" "text" NOT NULL,
    "category" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."skill_masters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_assignees" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "task_id" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "task_assignees_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."task_assignees" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "organization_id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "priority" "text" DEFAULT 'medium'::"text" NOT NULL,
    "scope" "text" DEFAULT 'personal'::"text" NOT NULL,
    "project_id" "text",
    "team_id" "text",
    "due_date" "date",
    "assign_to_all" boolean DEFAULT false NOT NULL,
    "created_by" "text" NOT NULL,
    "source" "text" DEFAULT 'employee'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tasks_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'urgent'::"text"]))),
    CONSTRAINT "tasks_scope_check" CHECK (("scope" = ANY (ARRAY['personal'::"text", 'organization'::"text", 'project'::"text", 'team'::"text"]))),
    CONSTRAINT "tasks_source_check" CHECK (("source" = ANY (ARRAY['employee'::"text", 'console'::"text"]))),
    CONSTRAINT "tasks_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'in_progress'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" NOT NULL,
    "organization_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wiki_pages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" DEFAULT ''::"text" NOT NULL,
    "category" "text",
    "parent_id" "uuid",
    "is_published" boolean DEFAULT false NOT NULL,
    "created_by" "text" NOT NULL,
    "updated_by" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."wiki_pages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "request_type" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "request_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "reason" "text" NOT NULL,
    "reviewed_by" "text",
    "reviewed_at" timestamp with time zone,
    "review_comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "workflow_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."workflow_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "request_type" "text" NOT NULL,
    "rule_type" "text" NOT NULL,
    "conditions" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "workflow_rules_rule_type_check" CHECK (("rule_type" = ANY (ARRAY['auto_approve'::"text", 'notify'::"text", 'validate'::"text"])))
);


ALTER TABLE "public"."workflow_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "icon" "text" DEFAULT '📝'::"text",
    "fields" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."workflow_templates" OWNER TO "postgres";


ALTER TABLE ONLY "public"."audit_logs" ALTER COLUMN "sequence_number" SET DEFAULT "nextval"('"public"."audit_logs_sequence_number_seq"'::"regclass");



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."applicant_todos"
    ADD CONSTRAINT "applicant_todos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."application_steps"
    ADD CONSTRAINT "application_steps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendance_approvers"
    ADD CONSTRAINT "attendance_approvers_department_id_approver_id_key" UNIQUE ("department_id", "approver_id");



ALTER TABLE ONLY "public"."attendance_approvers"
    ADD CONSTRAINT "attendance_approvers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendance_approvers"
    ADD CONSTRAINT "attendance_approvers_project_approver_unique" UNIQUE ("organization_id", "project_id", "approver_id");



ALTER TABLE ONLY "public"."attendance_approvers"
    ADD CONSTRAINT "attendance_approvers_user_id_approver_id_key" UNIQUE ("user_id", "approver_id");



ALTER TABLE ONLY "public"."attendance_corrections"
    ADD CONSTRAINT "attendance_corrections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendance_punches"
    ADD CONSTRAINT "attendance_punches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendance_records"
    ADD CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendance_records"
    ADD CONSTRAINT "attendance_records_user_id_date_key" UNIQUE ("user_id", "date");



ALTER TABLE ONLY "public"."attendance_settings"
    ADD CONSTRAINT "attendance_settings_organization_id_key" UNIQUE ("organization_id");



ALTER TABLE ONLY "public"."attendance_settings"
    ADD CONSTRAINT "attendance_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs_errors"
    ADD CONSTRAINT "audit_logs_errors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bc_activities"
    ADD CONSTRAINT "bc_activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bc_cards"
    ADD CONSTRAINT "bc_cards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bc_companies"
    ADD CONSTRAINT "bc_companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bc_contacts"
    ADD CONSTRAINT "bc_contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bc_deal_contacts"
    ADD CONSTRAINT "bc_deal_contacts_deal_id_contact_id_key" UNIQUE ("deal_id", "contact_id");



ALTER TABLE ONLY "public"."bc_deal_contacts"
    ADD CONSTRAINT "bc_deal_contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bc_deals"
    ADD CONSTRAINT "bc_deals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bc_leads"
    ADD CONSTRAINT "bc_leads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bc_quote_items"
    ADD CONSTRAINT "bc_quote_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bc_quotes"
    ADD CONSTRAINT "bc_quotes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bc_todos"
    ADD CONSTRAINT "bc_todos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."certification_masters"
    ADD CONSTRAINT "certification_masters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."channel_members"
    ADD CONSTRAINT "channel_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."channel_members"
    ADD CONSTRAINT "channel_members_thread_id_user_id_key" UNIQUE ("thread_id", "user_id");



ALTER TABLE ONLY "public"."compliance_alerts"
    ADD CONSTRAINT "compliance_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contract_changes"
    ADD CONSTRAINT "contract_changes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_automation_logs"
    ADD CONSTRAINT "crm_automation_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_automation_rules"
    ADD CONSTRAINT "crm_automation_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_email_templates"
    ADD CONSTRAINT "crm_email_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_field_definitions"
    ADD CONSTRAINT "crm_field_definitions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_field_values"
    ADD CONSTRAINT "crm_field_values_field_id_entity_id_key" UNIQUE ("field_id", "entity_id");



ALTER TABLE ONLY "public"."crm_field_values"
    ADD CONSTRAINT "crm_field_values_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_pipeline_stages"
    ADD CONSTRAINT "crm_pipeline_stages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_pipelines"
    ADD CONSTRAINT "crm_pipelines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_saved_views"
    ADD CONSTRAINT "crm_saved_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_webhook_logs"
    ADD CONSTRAINT "crm_webhook_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_webhooks"
    ADD CONSTRAINT "crm_webhooks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."custom_forms"
    ADD CONSTRAINT "custom_forms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dashboard_widget_preferences"
    ADD CONSTRAINT "dashboard_widget_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dashboard_widget_preferences"
    ADD CONSTRAINT "dashboard_widget_preferences_user_id_organization_id_produc_key" UNIQUE ("user_id", "organization_id", "product_tab");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_certifications"
    ADD CONSTRAINT "employee_certifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_departments"
    ADD CONSTRAINT "employee_departments_pkey" PRIMARY KEY ("user_id", "department_id");



ALTER TABLE ONLY "public"."employee_skills"
    ADD CONSTRAINT "employee_skills_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_task_steps"
    ADD CONSTRAINT "employee_task_steps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_tasks"
    ADD CONSTRAINT "employee_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evaluation_anchors"
    ADD CONSTRAINT "evaluation_anchors_criterion_id_score_value_key" UNIQUE ("criterion_id", "score_value");



ALTER TABLE ONLY "public"."evaluation_anchors"
    ADD CONSTRAINT "evaluation_anchors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evaluation_assignments"
    ADD CONSTRAINT "evaluation_assignments_cycle_id_target_user_id_evaluator_id_key" UNIQUE ("cycle_id", "target_user_id", "evaluator_id");



ALTER TABLE ONLY "public"."evaluation_assignments"
    ADD CONSTRAINT "evaluation_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evaluation_criteria"
    ADD CONSTRAINT "evaluation_criteria_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evaluation_cycles"
    ADD CONSTRAINT "evaluation_cycles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evaluation_scores"
    ADD CONSTRAINT "evaluation_scores_eval_criterion_unique" UNIQUE ("evaluation_id", "criterion_id");



ALTER TABLE ONLY "public"."evaluation_scores"
    ADD CONSTRAINT "evaluation_scores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evaluation_templates"
    ADD CONSTRAINT "evaluation_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evaluations"
    ADD CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."faqs"
    ADD CONSTRAINT "faqs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."form_fields"
    ADD CONSTRAINT "form_fields_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."form_responses"
    ADD CONSTRAINT "form_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."interview_slots"
    ADD CONSTRAINT "interview_slots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."interviews"
    ADD CONSTRAINT "interviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_sections"
    ADD CONSTRAINT "job_sections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_steps"
    ADD CONSTRAINT "job_steps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leave_balances"
    ADD CONSTRAINT "leave_balances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leave_balances"
    ADD CONSTRAINT "leave_balances_user_id_organization_id_fiscal_year_key" UNIQUE ("user_id", "organization_id", "fiscal_year");



ALTER TABLE ONLY "public"."member_permission_groups"
    ADD CONSTRAINT "member_permission_groups_pkey" PRIMARY KEY ("user_id", "group_id");



ALTER TABLE ONLY "public"."message_threads"
    ADD CONSTRAINT "message_threads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."page_sections"
    ADD CONSTRAINT "page_sections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."page_tabs"
    ADD CONSTRAINT "page_tabs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payslips"
    ADD CONSTRAINT "payslips_organization_id_user_id_year_month_key" UNIQUE ("organization_id", "user_id", "year", "month");



ALTER TABLE ONLY "public"."payslips"
    ADD CONSTRAINT "payslips_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permission_group_permissions"
    ADD CONSTRAINT "permission_group_permissions_group_id_resource_key" UNIQUE ("group_id", "resource");



ALTER TABLE ONLY "public"."permission_group_permissions"
    ADD CONSTRAINT "permission_group_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permission_groups"
    ADD CONSTRAINT "permission_groups_organization_id_name_key" UNIQUE ("organization_id", "name");



ALTER TABLE ONLY "public"."permission_groups"
    ADD CONSTRAINT "permission_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."positions"
    ADD CONSTRAINT "positions_org_name_unique" UNIQUE ("organization_id", "name");



ALTER TABLE ONLY "public"."positions"
    ADD CONSTRAINT "positions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_team_members"
    ADD CONSTRAINT "project_team_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_team_members"
    ADD CONSTRAINT "project_team_members_team_id_user_id_key" UNIQUE ("team_id", "user_id");



ALTER TABLE ONLY "public"."project_teams"
    ADD CONSTRAINT "project_teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pulse_survey_answers"
    ADD CONSTRAINT "pulse_survey_answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pulse_survey_answers"
    ADD CONSTRAINT "pulse_survey_answers_response_id_question_id_key" UNIQUE ("response_id", "question_id");



ALTER TABLE ONLY "public"."pulse_survey_questions"
    ADD CONSTRAINT "pulse_survey_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pulse_survey_responses"
    ADD CONSTRAINT "pulse_survey_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pulse_survey_responses"
    ADD CONSTRAINT "pulse_survey_responses_survey_id_user_id_key" UNIQUE ("survey_id", "user_id");



ALTER TABLE ONLY "public"."pulse_surveys"
    ADD CONSTRAINT "pulse_surveys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_notification_logs"
    ADD CONSTRAINT "push_notification_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_user_id_token_key" UNIQUE ("user_id", "token");



ALTER TABLE ONLY "public"."recruiting_targets"
    ADD CONSTRAINT "recruiting_targets_organization_id_fiscal_year_hiring_type__key" UNIQUE ("organization_id", "fiscal_year", "hiring_type", "target_type");



ALTER TABLE ONLY "public"."recruiting_targets"
    ADD CONSTRAINT "recruiting_targets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."selection_step_templates"
    ADD CONSTRAINT "selection_step_templates_organization_id_name_key" UNIQUE ("organization_id", "name");



ALTER TABLE ONLY "public"."selection_step_templates"
    ADD CONSTRAINT "selection_step_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_requests"
    ADD CONSTRAINT "service_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shift_requests"
    ADD CONSTRAINT "shift_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shift_requests"
    ADD CONSTRAINT "shift_requests_user_id_organization_id_target_date_key" UNIQUE ("user_id", "organization_id", "target_date");



ALTER TABLE ONLY "public"."shift_schedules"
    ADD CONSTRAINT "shift_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shift_schedules"
    ADD CONSTRAINT "shift_schedules_user_id_organization_id_target_date_key" UNIQUE ("user_id", "organization_id", "target_date");



ALTER TABLE ONLY "public"."skill_masters"
    ADD CONSTRAINT "skill_masters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_assignees"
    ADD CONSTRAINT "task_assignees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_assignees"
    ADD CONSTRAINT "task_assignees_task_id_user_id_key" UNIQUE ("task_id", "user_id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_organizations"
    ADD CONSTRAINT "user_organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_organizations"
    ADD CONSTRAINT "user_organizations_user_id_organization_id_key" UNIQUE ("user_id", "organization_id");



ALTER TABLE ONLY "public"."wiki_pages"
    ADD CONSTRAINT "wiki_pages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflow_requests"
    ADD CONSTRAINT "workflow_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflow_rules"
    ADD CONSTRAINT "workflow_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflow_templates"
    ADD CONSTRAINT "workflow_templates_pkey" PRIMARY KEY ("id");



CREATE INDEX "faqs_org_id_idx" ON "public"."faqs" USING "btree" ("organization_id");



CREATE INDEX "faqs_target_idx" ON "public"."faqs" USING "btree" ("target");



CREATE INDEX "idx_activity_logs_org_created" ON "public"."activity_logs" USING "btree" ("organization_id", "created_at" DESC);



CREATE INDEX "idx_activity_logs_parent" ON "public"."activity_logs" USING "btree" ("parent_type", "parent_id", "created_at" DESC);



CREATE INDEX "idx_activity_logs_target" ON "public"."activity_logs" USING "btree" ("target_type", "target_id", "created_at" DESC);



CREATE INDEX "idx_announcements_org_published" ON "public"."announcements" USING "btree" ("organization_id", "published_at" DESC);



CREATE INDEX "idx_applicant_todos_completed" ON "public"."applicant_todos" USING "btree" ("user_id", "is_completed");



CREATE INDEX "idx_applicant_todos_org_incomplete" ON "public"."applicant_todos" USING "btree" ("organization_id", "is_completed") WHERE ("is_completed" = false);



CREATE UNIQUE INDEX "idx_applicant_todos_source_unique" ON "public"."applicant_todos" USING "btree" ("user_id", "source", "source_id") WHERE (("source" <> 'manual'::"text") AND ("source_id" IS NOT NULL));



CREATE INDEX "idx_applicant_todos_user_org" ON "public"."applicant_todos" USING "btree" ("user_id", "organization_id");



CREATE INDEX "idx_application_steps_app" ON "public"."application_steps" USING "btree" ("application_id");



CREATE UNIQUE INDEX "idx_application_steps_order" ON "public"."application_steps" USING "btree" ("application_id", "step_order");



CREATE INDEX "idx_applications_applicant" ON "public"."applications" USING "btree" ("applicant_id");



CREATE INDEX "idx_applications_job" ON "public"."applications" USING "btree" ("job_id");



CREATE INDEX "idx_applications_org" ON "public"."applications" USING "btree" ("organization_id");



CREATE INDEX "idx_applications_org_status" ON "public"."applications" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_applications_status" ON "public"."applications" USING "btree" ("status");



CREATE INDEX "idx_attendance_approvers_dept" ON "public"."attendance_approvers" USING "btree" ("department_id");



CREATE INDEX "idx_attendance_approvers_org" ON "public"."attendance_approvers" USING "btree" ("organization_id");



CREATE INDEX "idx_attendance_approvers_user" ON "public"."attendance_approvers" USING "btree" ("user_id");



CREATE INDEX "idx_attendance_corrections_org" ON "public"."attendance_corrections" USING "btree" ("organization_id");



CREATE INDEX "idx_attendance_corrections_record" ON "public"."attendance_corrections" USING "btree" ("record_id");



CREATE INDEX "idx_attendance_corrections_status" ON "public"."attendance_corrections" USING "btree" ("status");



CREATE INDEX "idx_attendance_corrections_user" ON "public"."attendance_corrections" USING "btree" ("user_id");



CREATE INDEX "idx_attendance_punches_org" ON "public"."attendance_punches" USING "btree" ("organization_id");



CREATE INDEX "idx_attendance_punches_record" ON "public"."attendance_punches" USING "btree" ("record_id");



CREATE INDEX "idx_attendance_punches_user" ON "public"."attendance_punches" USING "btree" ("user_id", "punched_at" DESC);



CREATE INDEX "idx_attendance_punches_user_date" ON "public"."attendance_punches" USING "btree" ("user_id", "punched_at");



CREATE INDEX "idx_attendance_records_org" ON "public"."attendance_records" USING "btree" ("organization_id", "date");



CREATE INDEX "idx_attendance_records_org_date" ON "public"."attendance_records" USING "btree" ("organization_id", "date");



CREATE INDEX "idx_attendance_records_user" ON "public"."attendance_records" USING "btree" ("user_id", "date");



CREATE INDEX "idx_attendance_records_user_date" ON "public"."attendance_records" USING "btree" ("user_id", "date");



CREATE INDEX "idx_audit_logs_action" ON "public"."audit_logs" USING "btree" ("action", "created_at" DESC);



CREATE INDEX "idx_audit_logs_org_created" ON "public"."audit_logs" USING "btree" ("organization_id", "created_at" DESC);



CREATE INDEX "idx_audit_logs_org_table_created" ON "public"."audit_logs" USING "btree" ("organization_id", "table_name", "created_at" DESC);



CREATE INDEX "idx_audit_logs_sequence" ON "public"."audit_logs" USING "btree" ("sequence_number");



CREATE INDEX "idx_audit_logs_table_record" ON "public"."audit_logs" USING "btree" ("table_name", "record_id");



CREATE INDEX "idx_audit_logs_user" ON "public"."audit_logs" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_bc_activities_contact" ON "public"."bc_activities" USING "btree" ("contact_id");



CREATE INDEX "idx_bc_activities_deal" ON "public"."bc_activities" USING "btree" ("deal_id");



CREATE INDEX "idx_bc_activities_lead" ON "public"."bc_activities" USING "btree" ("lead_id");



CREATE INDEX "idx_bc_activities_org" ON "public"."bc_activities" USING "btree" ("organization_id");



CREATE INDEX "idx_bc_cards_contact" ON "public"."bc_cards" USING "btree" ("contact_id");



CREATE INDEX "idx_bc_cards_org" ON "public"."bc_cards" USING "btree" ("organization_id");



CREATE INDEX "idx_bc_companies_org" ON "public"."bc_companies" USING "btree" ("organization_id");



CREATE INDEX "idx_bc_contacts_company" ON "public"."bc_contacts" USING "btree" ("company_id");



CREATE INDEX "idx_bc_contacts_org" ON "public"."bc_contacts" USING "btree" ("organization_id");



CREATE INDEX "idx_bc_deal_contacts_contact" ON "public"."bc_deal_contacts" USING "btree" ("contact_id");



CREATE INDEX "idx_bc_deal_contacts_deal" ON "public"."bc_deal_contacts" USING "btree" ("deal_id");



CREATE INDEX "idx_bc_deal_contacts_org" ON "public"."bc_deal_contacts" USING "btree" ("organization_id");



CREATE INDEX "idx_bc_deals_company" ON "public"."bc_deals" USING "btree" ("company_id");



CREATE INDEX "idx_bc_deals_contact" ON "public"."bc_deals" USING "btree" ("contact_id");



CREATE INDEX "idx_bc_deals_org" ON "public"."bc_deals" USING "btree" ("organization_id");



CREATE INDEX "idx_bc_deals_pipeline" ON "public"."bc_deals" USING "btree" ("pipeline_id");



CREATE INDEX "idx_bc_leads_assigned" ON "public"."bc_leads" USING "btree" ("assigned_to");



CREATE INDEX "idx_bc_leads_converted_company" ON "public"."bc_leads" USING "btree" ("converted_company_id") WHERE ("converted_company_id" IS NOT NULL);



CREATE INDEX "idx_bc_leads_converted_contact" ON "public"."bc_leads" USING "btree" ("converted_contact_id") WHERE ("converted_contact_id" IS NOT NULL);



CREATE INDEX "idx_bc_leads_converted_deal" ON "public"."bc_leads" USING "btree" ("converted_deal_id") WHERE ("converted_deal_id" IS NOT NULL);



CREATE INDEX "idx_bc_leads_org" ON "public"."bc_leads" USING "btree" ("organization_id");



CREATE INDEX "idx_bc_leads_status" ON "public"."bc_leads" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_bc_quote_items_quote" ON "public"."bc_quote_items" USING "btree" ("quote_id");



CREATE INDEX "idx_bc_quote_items_quote_sort" ON "public"."bc_quote_items" USING "btree" ("quote_id", "sort_order");



CREATE INDEX "idx_bc_quotes_company" ON "public"."bc_quotes" USING "btree" ("company_id");



CREATE INDEX "idx_bc_quotes_deal" ON "public"."bc_quotes" USING "btree" ("deal_id");



CREATE INDEX "idx_bc_quotes_org" ON "public"."bc_quotes" USING "btree" ("organization_id");



CREATE INDEX "idx_bc_quotes_status" ON "public"."bc_quotes" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_bc_todos_assigned" ON "public"."bc_todos" USING "btree" ("assigned_to");



CREATE INDEX "idx_bc_todos_lead" ON "public"."bc_todos" USING "btree" ("lead_id");



CREATE INDEX "idx_bc_todos_org" ON "public"."bc_todos" USING "btree" ("organization_id");



CREATE INDEX "idx_calendar_events_org" ON "public"."calendar_events" USING "btree" ("organization_id");



CREATE INDEX "idx_calendar_events_user_start" ON "public"."calendar_events" USING "btree" ("user_id", "start_at");



CREATE INDEX "idx_certification_masters_org" ON "public"."certification_masters" USING "btree" ("organization_id");



CREATE INDEX "idx_channel_members_thread" ON "public"."channel_members" USING "btree" ("thread_id");



CREATE INDEX "idx_channel_members_user" ON "public"."channel_members" USING "btree" ("user_id");



CREATE INDEX "idx_compliance_alerts_org" ON "public"."compliance_alerts" USING "btree" ("organization_id", "is_resolved", "created_at" DESC);



CREATE INDEX "idx_compliance_alerts_user" ON "public"."compliance_alerts" USING "btree" ("user_id", "is_resolved");



CREATE INDEX "idx_contract_changes_contract_id" ON "public"."contract_changes" USING "btree" ("contract_id");



CREATE INDEX "idx_contracts_organization_id" ON "public"."contracts" USING "btree" ("organization_id");



CREATE INDEX "idx_contracts_plan_id" ON "public"."contracts" USING "btree" ("plan_id");



CREATE INDEX "idx_contracts_status" ON "public"."contracts" USING "btree" ("status");



CREATE INDEX "idx_crm_automation_logs_entity" ON "public"."crm_automation_logs" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_crm_automation_logs_org" ON "public"."crm_automation_logs" USING "btree" ("organization_id");



CREATE INDEX "idx_crm_automation_logs_rule" ON "public"."crm_automation_logs" USING "btree" ("rule_id");



CREATE INDEX "idx_crm_automation_rules_org" ON "public"."crm_automation_rules" USING "btree" ("organization_id");



CREATE INDEX "idx_crm_automation_rules_trigger" ON "public"."crm_automation_rules" USING "btree" ("organization_id", "trigger_type") WHERE ("is_active" = true);



CREATE INDEX "idx_crm_email_templates_category" ON "public"."crm_email_templates" USING "btree" ("organization_id", "category") WHERE ("is_active" = true);



CREATE INDEX "idx_crm_email_templates_org" ON "public"."crm_email_templates" USING "btree" ("organization_id");



CREATE INDEX "idx_crm_field_definitions_org_entity" ON "public"."crm_field_definitions" USING "btree" ("organization_id", "entity_type");



CREATE INDEX "idx_crm_field_values_entity" ON "public"."crm_field_values" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_crm_field_values_field" ON "public"."crm_field_values" USING "btree" ("field_id");



CREATE INDEX "idx_crm_pipeline_stages_pipeline" ON "public"."crm_pipeline_stages" USING "btree" ("pipeline_id");



CREATE INDEX "idx_crm_pipelines_org" ON "public"."crm_pipelines" USING "btree" ("organization_id");



CREATE UNIQUE INDEX "idx_crm_pipelines_unique_default" ON "public"."crm_pipelines" USING "btree" ("organization_id") WHERE ("is_default" = true);



CREATE INDEX "idx_crm_saved_views_org_entity" ON "public"."crm_saved_views" USING "btree" ("organization_id", "entity_type");



CREATE INDEX "idx_crm_saved_views_user" ON "public"."crm_saved_views" USING "btree" ("user_id");



CREATE INDEX "idx_crm_webhook_logs_org" ON "public"."crm_webhook_logs" USING "btree" ("organization_id");



CREATE INDEX "idx_crm_webhook_logs_webhook" ON "public"."crm_webhook_logs" USING "btree" ("webhook_id");



CREATE INDEX "idx_crm_webhooks_active" ON "public"."crm_webhooks" USING "btree" ("organization_id") WHERE ("is_active" = true);



CREATE INDEX "idx_crm_webhooks_org" ON "public"."crm_webhooks" USING "btree" ("organization_id");



CREATE INDEX "idx_custom_forms_org" ON "public"."custom_forms" USING "btree" ("organization_id");



CREATE INDEX "idx_departments_org" ON "public"."departments" USING "btree" ("organization_id");



CREATE INDEX "idx_employee_certifications_org" ON "public"."employee_certifications" USING "btree" ("organization_id");



CREATE INDEX "idx_employee_certifications_user" ON "public"."employee_certifications" USING "btree" ("user_id");



CREATE INDEX "idx_employee_departments_dept" ON "public"."employee_departments" USING "btree" ("department_id");



CREATE INDEX "idx_employee_skills_org" ON "public"."employee_skills" USING "btree" ("organization_id");



CREATE INDEX "idx_employee_skills_user" ON "public"."employee_skills" USING "btree" ("user_id");



CREATE INDEX "idx_employee_task_steps_task" ON "public"."employee_task_steps" USING "btree" ("task_id");



CREATE INDEX "idx_employee_tasks_company" ON "public"."employee_tasks" USING "btree" ("company_id");



CREATE INDEX "idx_employee_tasks_contact" ON "public"."employee_tasks" USING "btree" ("contact_id");



CREATE INDEX "idx_employee_tasks_deal" ON "public"."employee_tasks" USING "btree" ("deal_id");



CREATE INDEX "idx_employee_tasks_org" ON "public"."employee_tasks" USING "btree" ("organization_id");



CREATE INDEX "idx_employee_tasks_user" ON "public"."employee_tasks" USING "btree" ("user_id");



CREATE INDEX "idx_employee_tasks_user_completed" ON "public"."employee_tasks" USING "btree" ("user_id", "is_completed");



CREATE INDEX "idx_employee_tasks_user_due" ON "public"."employee_tasks" USING "btree" ("user_id", "due_date");



CREATE INDEX "idx_employee_tasks_user_important" ON "public"."employee_tasks" USING "btree" ("user_id", "is_important");



CREATE INDEX "idx_employee_tasks_user_my_day" ON "public"."employee_tasks" USING "btree" ("user_id", "is_my_day", "my_day_date");



CREATE INDEX "idx_evaluation_anchors_criterion" ON "public"."evaluation_anchors" USING "btree" ("criterion_id", "sort_order");



CREATE INDEX "idx_evaluation_assignments_cycle" ON "public"."evaluation_assignments" USING "btree" ("cycle_id");



CREATE INDEX "idx_evaluation_assignments_evaluator" ON "public"."evaluation_assignments" USING "btree" ("evaluator_id");



CREATE INDEX "idx_evaluation_assignments_evaluator_status" ON "public"."evaluation_assignments" USING "btree" ("evaluator_id", "status");



CREATE INDEX "idx_evaluation_assignments_target" ON "public"."evaluation_assignments" USING "btree" ("target_user_id");



CREATE INDEX "idx_evaluation_assignments_target_status" ON "public"."evaluation_assignments" USING "btree" ("target_user_id", "status");



CREATE INDEX "idx_evaluation_criteria_template" ON "public"."evaluation_criteria" USING "btree" ("template_id", "sort_order");



CREATE INDEX "idx_evaluation_cycles_org" ON "public"."evaluation_cycles" USING "btree" ("organization_id");



CREATE INDEX "idx_evaluation_scores_evaluation" ON "public"."evaluation_scores" USING "btree" ("evaluation_id");



CREATE INDEX "idx_evaluation_templates_org" ON "public"."evaluation_templates" USING "btree" ("organization_id");



CREATE INDEX "idx_evaluations_cycle" ON "public"."evaluations" USING "btree" ("cycle_id");



CREATE INDEX "idx_evaluations_evaluator" ON "public"."evaluations" USING "btree" ("evaluator_id");



CREATE INDEX "idx_evaluations_org" ON "public"."evaluations" USING "btree" ("organization_id");



CREATE INDEX "idx_evaluations_target" ON "public"."evaluations" USING "btree" ("target_user_id");



CREATE INDEX "idx_form_fields_form" ON "public"."form_fields" USING "btree" ("form_id", "sort_order");



CREATE INDEX "idx_form_responses_applicant" ON "public"."form_responses" USING "btree" ("applicant_id");



CREATE INDEX "idx_form_responses_field" ON "public"."form_responses" USING "btree" ("field_id");



CREATE INDEX "idx_form_responses_form" ON "public"."form_responses" USING "btree" ("form_id");



CREATE INDEX "idx_interview_slots_interview" ON "public"."interview_slots" USING "btree" ("interview_id");



CREATE INDEX "idx_interviews_org" ON "public"."interviews" USING "btree" ("organization_id");



CREATE INDEX "idx_job_steps_job" ON "public"."job_steps" USING "btree" ("job_id", "step_order");



CREATE INDEX "idx_job_steps_job_id" ON "public"."job_steps" USING "btree" ("job_id");



CREATE UNIQUE INDEX "idx_job_steps_order" ON "public"."job_steps" USING "btree" ("job_id", "step_order");



CREATE INDEX "idx_jobs_org" ON "public"."jobs" USING "btree" ("organization_id");



CREATE INDEX "idx_jobs_status" ON "public"."jobs" USING "btree" ("status");



CREATE INDEX "idx_leave_balances_org" ON "public"."leave_balances" USING "btree" ("organization_id");



CREATE INDEX "idx_leave_balances_org_year" ON "public"."leave_balances" USING "btree" ("organization_id", "fiscal_year");



CREATE INDEX "idx_leave_balances_user" ON "public"."leave_balances" USING "btree" ("user_id");



CREATE INDEX "idx_leave_balances_year" ON "public"."leave_balances" USING "btree" ("fiscal_year");



CREATE INDEX "idx_message_threads_org" ON "public"."message_threads" USING "btree" ("organization_id");



CREATE INDEX "idx_message_threads_participant" ON "public"."message_threads" USING "btree" ("participant_id");



CREATE INDEX "idx_messages_sender" ON "public"."messages" USING "btree" ("sender_id");



CREATE INDEX "idx_messages_thread" ON "public"."messages" USING "btree" ("thread_id", "created_at");



CREATE INDEX "idx_messages_thread_created" ON "public"."messages" USING "btree" ("thread_id", "created_at" DESC);



CREATE INDEX "idx_messages_unread" ON "public"."messages" USING "btree" ("thread_id", "sender_id") WHERE ("read_at" IS NULL);



CREATE INDEX "idx_mpg_group" ON "public"."member_permission_groups" USING "btree" ("group_id");



CREATE INDEX "idx_mpg_user" ON "public"."member_permission_groups" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_org" ON "public"."notifications" USING "btree" ("organization_id");



CREATE INDEX "idx_notifications_org_created" ON "public"."notifications" USING "btree" ("organization_id", "created_at" DESC);



CREATE INDEX "idx_notifications_user_created" ON "public"."notifications" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_notifications_user_unread" ON "public"."notifications" USING "btree" ("user_id", "is_read") WHERE ("is_read" = false);



CREATE INDEX "idx_page_sections_tab" ON "public"."page_sections" USING "btree" ("tab_id", "sort_order");



CREATE INDEX "idx_page_tabs_org" ON "public"."page_tabs" USING "btree" ("organization_id", "sort_order");



CREATE INDEX "idx_payslips_org" ON "public"."payslips" USING "btree" ("organization_id");



CREATE INDEX "idx_payslips_org_year_month" ON "public"."payslips" USING "btree" ("organization_id", "year", "month");



CREATE INDEX "idx_payslips_user" ON "public"."payslips" USING "btree" ("user_id");



CREATE INDEX "idx_payslips_user_year_month" ON "public"."payslips" USING "btree" ("user_id", "year" DESC, "month" DESC);



CREATE INDEX "idx_payslips_year_month" ON "public"."payslips" USING "btree" ("year", "month");



CREATE INDEX "idx_permission_groups_org" ON "public"."permission_groups" USING "btree" ("organization_id");



CREATE INDEX "idx_pgp_group" ON "public"."permission_group_permissions" USING "btree" ("group_id");



CREATE INDEX "idx_project_team_members_team" ON "public"."project_team_members" USING "btree" ("team_id");



CREATE INDEX "idx_project_team_members_user" ON "public"."project_team_members" USING "btree" ("user_id");



CREATE INDEX "idx_project_teams_project" ON "public"."project_teams" USING "btree" ("project_id");



CREATE INDEX "idx_projects_org" ON "public"."projects" USING "btree" ("organization_id");



CREATE INDEX "idx_pulse_survey_answers_response" ON "public"."pulse_survey_answers" USING "btree" ("response_id");



CREATE INDEX "idx_pulse_survey_questions_survey" ON "public"."pulse_survey_questions" USING "btree" ("survey_id");



CREATE INDEX "idx_pulse_survey_responses_org_user" ON "public"."pulse_survey_responses" USING "btree" ("organization_id", "user_id", "completed_at");



CREATE INDEX "idx_pulse_survey_responses_survey" ON "public"."pulse_survey_responses" USING "btree" ("survey_id");



CREATE INDEX "idx_pulse_survey_responses_user" ON "public"."pulse_survey_responses" USING "btree" ("user_id");



CREATE INDEX "idx_pulse_surveys_org" ON "public"."pulse_surveys" USING "btree" ("organization_id");



CREATE INDEX "idx_pulse_surveys_status" ON "public"."pulse_surveys" USING "btree" ("status");



CREATE INDEX "idx_push_notification_logs_status" ON "public"."push_notification_logs" USING "btree" ("status") WHERE ("status" = 'failed'::"text");



CREATE INDEX "idx_push_notification_logs_user" ON "public"."push_notification_logs" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_push_tokens_token" ON "public"."push_tokens" USING "btree" ("token");



CREATE INDEX "idx_push_tokens_user" ON "public"."push_tokens" USING "btree" ("user_id");



CREATE INDEX "idx_recruiting_targets_org" ON "public"."recruiting_targets" USING "btree" ("organization_id");



CREATE INDEX "idx_service_requests_status" ON "public"."service_requests" USING "btree" ("status");



CREATE INDEX "idx_service_requests_type" ON "public"."service_requests" USING "btree" ("type");



CREATE INDEX "idx_service_requests_user_id" ON "public"."service_requests" USING "btree" ("user_id");



CREATE INDEX "idx_shift_requests_org_date" ON "public"."shift_requests" USING "btree" ("organization_id", "target_date");



CREATE INDEX "idx_shift_requests_user_org" ON "public"."shift_requests" USING "btree" ("user_id", "organization_id", "target_date");



CREATE INDEX "idx_shift_schedules_org_date" ON "public"."shift_schedules" USING "btree" ("organization_id", "target_date");



CREATE INDEX "idx_shift_schedules_user_org" ON "public"."shift_schedules" USING "btree" ("user_id", "organization_id", "target_date");



CREATE INDEX "idx_skill_masters_org" ON "public"."skill_masters" USING "btree" ("organization_id");



CREATE INDEX "idx_sst_org" ON "public"."selection_step_templates" USING "btree" ("organization_id", "sort_order");



CREATE INDEX "idx_sst_org_type" ON "public"."selection_step_templates" USING "btree" ("organization_id", "step_type");



CREATE INDEX "idx_task_assignees_task" ON "public"."task_assignees" USING "btree" ("task_id");



CREATE INDEX "idx_task_assignees_user" ON "public"."task_assignees" USING "btree" ("user_id");



CREATE INDEX "idx_tasks_created_by" ON "public"."tasks" USING "btree" ("created_by");



CREATE INDEX "idx_tasks_org" ON "public"."tasks" USING "btree" ("organization_id");



CREATE INDEX "idx_tasks_project_id" ON "public"."tasks" USING "btree" ("project_id");



CREATE INDEX "idx_tasks_status" ON "public"."tasks" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_tasks_team_id" ON "public"."tasks" USING "btree" ("team_id");



CREATE INDEX "idx_wiki_pages_category" ON "public"."wiki_pages" USING "btree" ("organization_id", "category");



CREATE INDEX "idx_wiki_pages_org" ON "public"."wiki_pages" USING "btree" ("organization_id", "is_published");



CREATE INDEX "idx_wiki_pages_parent" ON "public"."wiki_pages" USING "btree" ("parent_id");



CREATE INDEX "idx_workflow_requests_org" ON "public"."workflow_requests" USING "btree" ("organization_id");



CREATE INDEX "idx_workflow_requests_org_status_created" ON "public"."workflow_requests" USING "btree" ("organization_id", "status", "created_at" DESC);



CREATE INDEX "idx_workflow_requests_status" ON "public"."workflow_requests" USING "btree" ("status");



CREATE INDEX "idx_workflow_requests_type" ON "public"."workflow_requests" USING "btree" ("request_type");



CREATE INDEX "idx_workflow_requests_user" ON "public"."workflow_requests" USING "btree" ("user_id");



CREATE INDEX "idx_workflow_requests_user_status_created" ON "public"."workflow_requests" USING "btree" ("user_id", "status", "created_at" DESC);



CREATE INDEX "idx_workflow_rules_org" ON "public"."workflow_rules" USING "btree" ("organization_id", "request_type");



CREATE INDEX "idx_workflow_templates_org" ON "public"."workflow_templates" USING "btree" ("organization_id");



CREATE INDEX "message_threads_organization_id_idx" ON "public"."message_threads" USING "btree" ("organization_id");



CREATE UNIQUE INDEX "message_threads_participant_unique" ON "public"."message_threads" USING "btree" ("organization_id", "participant_id");



CREATE INDEX "messages_sender_id_idx" ON "public"."messages" USING "btree" ("sender_id");



CREATE INDEX "messages_thread_id_created_at_idx" ON "public"."messages" USING "btree" ("thread_id", "created_at");



CREATE OR REPLACE TRIGGER "audit_trigger_announcements" AFTER INSERT OR DELETE OR UPDATE ON "public"."announcements" FOR EACH ROW EXECUTE FUNCTION "public"."log_audit_change"();



CREATE OR REPLACE TRIGGER "audit_trigger_applications" AFTER INSERT OR DELETE OR UPDATE ON "public"."applications" FOR EACH ROW EXECUTE FUNCTION "public"."log_audit_change"();



CREATE OR REPLACE TRIGGER "audit_trigger_attendance_records" AFTER INSERT OR DELETE OR UPDATE ON "public"."attendance_records" FOR EACH ROW EXECUTE FUNCTION "public"."log_audit_change"();



CREATE OR REPLACE TRIGGER "audit_trigger_custom_forms" AFTER INSERT OR DELETE OR UPDATE ON "public"."custom_forms" FOR EACH ROW EXECUTE FUNCTION "public"."log_audit_change"();



CREATE OR REPLACE TRIGGER "audit_trigger_departments" AFTER INSERT OR DELETE OR UPDATE ON "public"."departments" FOR EACH ROW EXECUTE FUNCTION "public"."log_audit_change"();



CREATE OR REPLACE TRIGGER "audit_trigger_evaluation_cycles" AFTER INSERT OR DELETE OR UPDATE ON "public"."evaluation_cycles" FOR EACH ROW EXECUTE FUNCTION "public"."log_audit_change"();



CREATE OR REPLACE TRIGGER "audit_trigger_evaluation_templates" AFTER INSERT OR DELETE OR UPDATE ON "public"."evaluation_templates" FOR EACH ROW EXECUTE FUNCTION "public"."log_audit_change"();



CREATE OR REPLACE TRIGGER "audit_trigger_interviews" AFTER INSERT OR DELETE OR UPDATE ON "public"."interviews" FOR EACH ROW EXECUTE FUNCTION "public"."log_audit_change"();



CREATE OR REPLACE TRIGGER "audit_trigger_jobs" AFTER INSERT OR DELETE OR UPDATE ON "public"."jobs" FOR EACH ROW EXECUTE FUNCTION "public"."log_audit_change"();



CREATE OR REPLACE TRIGGER "audit_trigger_leave_balances" AFTER INSERT OR DELETE OR UPDATE ON "public"."leave_balances" FOR EACH ROW EXECUTE FUNCTION "public"."log_audit_change"();



CREATE OR REPLACE TRIGGER "audit_trigger_payslips" AFTER INSERT OR DELETE OR UPDATE ON "public"."payslips" FOR EACH ROW EXECUTE FUNCTION "public"."log_audit_change"();



CREATE OR REPLACE TRIGGER "audit_trigger_profiles" AFTER INSERT OR DELETE OR UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."log_audit_change"();



CREATE OR REPLACE TRIGGER "audit_trigger_user_organizations" AFTER INSERT OR DELETE OR UPDATE ON "public"."user_organizations" FOR EACH ROW EXECUTE FUNCTION "public"."log_audit_change"();



CREATE OR REPLACE TRIGGER "audit_trigger_wiki_pages" AFTER INSERT OR DELETE OR UPDATE ON "public"."wiki_pages" FOR EACH ROW EXECUTE FUNCTION "public"."log_audit_change"();



CREATE OR REPLACE TRIGGER "audit_trigger_workflow_requests" AFTER INSERT OR DELETE OR UPDATE ON "public"."workflow_requests" FOR EACH ROW EXECUTE FUNCTION "public"."log_audit_change"();



CREATE OR REPLACE TRIGGER "auto_approve_workflow_trigger" BEFORE INSERT ON "public"."workflow_requests" FOR EACH ROW EXECUTE FUNCTION "public"."auto_approve_workflow"();



CREATE OR REPLACE TRIGGER "faqs_updated_at" BEFORE UPDATE ON "public"."faqs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "notifications_updated_at" BEFORE UPDATE ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "notify_admins_workflow_trigger" AFTER INSERT ON "public"."workflow_requests" FOR EACH ROW EXECUTE FUNCTION "public"."notify_admins_on_workflow_request"();



CREATE OR REPLACE TRIGGER "on_application_status_changed" AFTER UPDATE OF "status" ON "public"."applications" FOR EACH ROW WHEN (("old"."status" IS DISTINCT FROM "new"."status")) EXECUTE FUNCTION "public"."notify_application_status_change"();



CREATE OR REPLACE TRIGGER "on_application_step_status_changed" AFTER UPDATE OF "status" ON "public"."application_steps" FOR EACH ROW WHEN (("old"."status" IS DISTINCT FROM "new"."status")) EXECUTE FUNCTION "public"."notify_application_step_change"();



CREATE OR REPLACE TRIGGER "on_pulse_survey_activated" AFTER INSERT OR UPDATE OF "status" ON "public"."pulse_surveys" FOR EACH ROW WHEN (("new"."status" = 'active'::"text")) EXECUTE FUNCTION "public"."create_survey_todos_and_notifications"();



CREATE OR REPLACE TRIGGER "on_survey_response_completed" AFTER INSERT OR UPDATE OF "completed_at" ON "public"."pulse_survey_responses" FOR EACH ROW WHEN (("new"."completed_at" IS NOT NULL)) EXECUTE FUNCTION "public"."complete_todo_on_survey_response"();



CREATE OR REPLACE TRIGGER "pulse_surveys_updated_at" BEFORE UPDATE ON "public"."pulse_surveys" FOR EACH ROW EXECUTE FUNCTION "public"."update_pulse_survey_updated_at"();



CREATE OR REPLACE TRIGGER "push_tokens_updated_at" BEFORE UPDATE ON "public"."push_tokens" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_announcements_updated_at" BEFORE UPDATE ON "public"."announcements" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_applicant_todos_updated_at" BEFORE UPDATE ON "public"."applicant_todos" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_applications_updated_at" BEFORE UPDATE ON "public"."applications" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_attendance_corrections_updated_at" BEFORE UPDATE ON "public"."attendance_corrections" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_attendance_records_updated_at" BEFORE UPDATE ON "public"."attendance_records" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_attendance_settings_updated_at" BEFORE UPDATE ON "public"."attendance_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_bc_activities_updated_at" BEFORE UPDATE ON "public"."bc_activities" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_bc_companies_updated_at" BEFORE UPDATE ON "public"."bc_companies" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_bc_contacts_updated_at" BEFORE UPDATE ON "public"."bc_contacts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_bc_deal_contacts_updated_at" BEFORE UPDATE ON "public"."bc_deal_contacts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_bc_deals_updated_at" BEFORE UPDATE ON "public"."bc_deals" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_bc_quote_items_updated_at" BEFORE UPDATE ON "public"."bc_quote_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_bc_quotes_updated_at" BEFORE UPDATE ON "public"."bc_quotes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_bc_todos_updated_at" BEFORE UPDATE ON "public"."bc_todos" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_calendar_events_updated_at" BEFORE UPDATE ON "public"."calendar_events" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_crm_automation_rules_updated_at" BEFORE UPDATE ON "public"."crm_automation_rules" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_crm_email_templates_updated_at" BEFORE UPDATE ON "public"."crm_email_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_crm_pipeline_stages_updated_at" BEFORE UPDATE ON "public"."crm_pipeline_stages" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_crm_webhooks_updated_at" BEFORE UPDATE ON "public"."crm_webhooks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_employee_certifications_updated_at" BEFORE UPDATE ON "public"."employee_certifications" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_employee_skills_updated_at" BEFORE UPDATE ON "public"."employee_skills" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_employee_tasks_updated_at" BEFORE UPDATE ON "public"."employee_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_evaluation_cycles_updated_at" BEFORE UPDATE ON "public"."evaluation_cycles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_leave_balances_updated_at" BEFORE UPDATE ON "public"."leave_balances" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_message_threads_updated_at" BEFORE UPDATE ON "public"."message_threads" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_payslips_updated_at" BEFORE UPDATE ON "public"."payslips" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_service_requests_updated_at" BEFORE UPDATE ON "public"."service_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_shift_requests_updated_at" BEFORE UPDATE ON "public"."shift_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_shift_schedules_updated_at" BEFORE UPDATE ON "public"."shift_schedules" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_tasks_updated_at" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at_application_steps" BEFORE UPDATE ON "public"."application_steps" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_workflow_templates" BEFORE UPDATE ON "public"."workflow_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_wiki_pages_updated_at" BEFORE UPDATE ON "public"."wiki_pages" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_workflow_requests_updated_at" BEFORE UPDATE ON "public"."workflow_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_workflow_rules_updated_at" BEFORE UPDATE ON "public"."workflow_rules" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_applications_updated_at" BEFORE UPDATE ON "public"."applications" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_interviews_updated_at" BEFORE UPDATE ON "public"."interviews" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_jobs_updated_at" BEFORE UPDATE ON "public"."jobs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_organizations_updated_at" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_seed_permission_groups" AFTER INSERT ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."seed_default_permission_groups"();



CREATE OR REPLACE TRIGGER "trg_sst_updated_at" BEFORE UPDATE ON "public"."selection_step_templates" FOR EACH ROW EXECUTE FUNCTION "public"."touch_selection_step_templates_updated_at"();



CREATE OR REPLACE TRIGGER "trg_update_thread_updated_at" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_thread_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_send_push_on_notification" AFTER INSERT ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."send_push_on_notification_insert"();



CREATE OR REPLACE TRIGGER "update_bc_leads_updated_at" BEFORE UPDATE ON "public"."bc_leads" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_crm_field_definitions_updated_at" BEFORE UPDATE ON "public"."crm_field_definitions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_crm_field_values_updated_at" BEFORE UPDATE ON "public"."crm_field_values" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_crm_pipelines_updated_at" BEFORE UPDATE ON "public"."crm_pipelines" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_crm_saved_views_updated_at" BEFORE UPDATE ON "public"."crm_saved_views" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."applicant_todos"
    ADD CONSTRAINT "applicant_todos_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."application_steps"
    ADD CONSTRAINT "application_steps_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance_approvers"
    ADD CONSTRAINT "attendance_approvers_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance_approvers"
    ADD CONSTRAINT "attendance_approvers_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance_approvers"
    ADD CONSTRAINT "attendance_approvers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance_approvers"
    ADD CONSTRAINT "attendance_approvers_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance_approvers"
    ADD CONSTRAINT "attendance_approvers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance_corrections"
    ADD CONSTRAINT "attendance_corrections_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance_corrections"
    ADD CONSTRAINT "attendance_corrections_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "public"."attendance_records"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance_corrections"
    ADD CONSTRAINT "attendance_corrections_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."attendance_corrections"
    ADD CONSTRAINT "attendance_corrections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance_punches"
    ADD CONSTRAINT "attendance_punches_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance_punches"
    ADD CONSTRAINT "attendance_punches_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "public"."attendance_records"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance_punches"
    ADD CONSTRAINT "attendance_punches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance_records"
    ADD CONSTRAINT "attendance_records_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance_records"
    ADD CONSTRAINT "attendance_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance_settings"
    ADD CONSTRAINT "attendance_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."bc_activities"
    ADD CONSTRAINT "bc_activities_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."bc_companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bc_activities"
    ADD CONSTRAINT "bc_activities_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."bc_contacts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bc_activities"
    ADD CONSTRAINT "bc_activities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bc_activities"
    ADD CONSTRAINT "bc_activities_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "public"."bc_deals"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bc_activities"
    ADD CONSTRAINT "bc_activities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."bc_leads"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bc_cards"
    ADD CONSTRAINT "bc_cards_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."bc_contacts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bc_contacts"
    ADD CONSTRAINT "bc_contacts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."bc_companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bc_deal_contacts"
    ADD CONSTRAINT "bc_deal_contacts_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."bc_contacts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bc_deal_contacts"
    ADD CONSTRAINT "bc_deal_contacts_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "public"."bc_deals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bc_deal_contacts"
    ADD CONSTRAINT "bc_deal_contacts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bc_deals"
    ADD CONSTRAINT "bc_deals_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bc_deals"
    ADD CONSTRAINT "bc_deals_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."bc_companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bc_deals"
    ADD CONSTRAINT "bc_deals_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."bc_contacts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bc_deals"
    ADD CONSTRAINT "bc_deals_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "public"."crm_pipelines"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bc_deals"
    ADD CONSTRAINT "bc_deals_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "public"."crm_pipeline_stages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bc_leads"
    ADD CONSTRAINT "bc_leads_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bc_leads"
    ADD CONSTRAINT "bc_leads_converted_company_id_fkey" FOREIGN KEY ("converted_company_id") REFERENCES "public"."bc_companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bc_leads"
    ADD CONSTRAINT "bc_leads_converted_contact_id_fkey" FOREIGN KEY ("converted_contact_id") REFERENCES "public"."bc_contacts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bc_leads"
    ADD CONSTRAINT "bc_leads_converted_deal_id_fkey" FOREIGN KEY ("converted_deal_id") REFERENCES "public"."bc_deals"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bc_leads"
    ADD CONSTRAINT "bc_leads_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bc_leads"
    ADD CONSTRAINT "bc_leads_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bc_quote_items"
    ADD CONSTRAINT "bc_quote_items_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."bc_quotes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bc_quotes"
    ADD CONSTRAINT "bc_quotes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."bc_companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bc_quotes"
    ADD CONSTRAINT "bc_quotes_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."bc_contacts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bc_quotes"
    ADD CONSTRAINT "bc_quotes_created_by_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bc_quotes"
    ADD CONSTRAINT "bc_quotes_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "public"."bc_deals"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bc_quotes"
    ADD CONSTRAINT "bc_quotes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bc_todos"
    ADD CONSTRAINT "bc_todos_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."bc_companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bc_todos"
    ADD CONSTRAINT "bc_todos_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."bc_contacts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bc_todos"
    ADD CONSTRAINT "bc_todos_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "public"."bc_deals"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bc_todos"
    ADD CONSTRAINT "bc_todos_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."bc_leads"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."certification_masters"
    ADD CONSTRAINT "certification_masters_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."channel_members"
    ADD CONSTRAINT "channel_members_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."message_threads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."compliance_alerts"
    ADD CONSTRAINT "compliance_alerts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."contract_changes"
    ADD CONSTRAINT "contract_changes_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."contract_changes"
    ADD CONSTRAINT "contract_changes_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id");



ALTER TABLE ONLY "public"."crm_automation_logs"
    ADD CONSTRAINT "crm_automation_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_automation_logs"
    ADD CONSTRAINT "crm_automation_logs_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "public"."crm_automation_rules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_automation_rules"
    ADD CONSTRAINT "crm_automation_rules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_email_templates"
    ADD CONSTRAINT "crm_email_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."crm_email_templates"
    ADD CONSTRAINT "crm_email_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_field_definitions"
    ADD CONSTRAINT "crm_field_definitions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_field_values"
    ADD CONSTRAINT "crm_field_values_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "public"."crm_field_definitions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_field_values"
    ADD CONSTRAINT "crm_field_values_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_pipeline_stages"
    ADD CONSTRAINT "crm_pipeline_stages_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "public"."crm_pipelines"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_pipelines"
    ADD CONSTRAINT "crm_pipelines_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_saved_views"
    ADD CONSTRAINT "crm_saved_views_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_saved_views"
    ADD CONSTRAINT "crm_saved_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_webhook_logs"
    ADD CONSTRAINT "crm_webhook_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_webhook_logs"
    ADD CONSTRAINT "crm_webhook_logs_webhook_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "public"."crm_webhooks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_webhooks"
    ADD CONSTRAINT "crm_webhooks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."custom_forms"
    ADD CONSTRAINT "custom_forms_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."custom_forms"
    ADD CONSTRAINT "custom_forms_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."dashboard_widget_preferences"
    ADD CONSTRAINT "dashboard_widget_preferences_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dashboard_widget_preferences"
    ADD CONSTRAINT "dashboard_widget_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."departments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."employee_certifications"
    ADD CONSTRAINT "employee_certifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_departments"
    ADD CONSTRAINT "employee_departments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_departments"
    ADD CONSTRAINT "employee_departments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_skills"
    ADD CONSTRAINT "employee_skills_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_task_steps"
    ADD CONSTRAINT "employee_task_steps_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."employee_tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_tasks"
    ADD CONSTRAINT "employee_tasks_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."bc_companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."employee_tasks"
    ADD CONSTRAINT "employee_tasks_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."bc_contacts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."employee_tasks"
    ADD CONSTRAINT "employee_tasks_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "public"."bc_deals"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."employee_tasks"
    ADD CONSTRAINT "employee_tasks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."evaluation_anchors"
    ADD CONSTRAINT "evaluation_anchors_criterion_id_fkey" FOREIGN KEY ("criterion_id") REFERENCES "public"."evaluation_criteria"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."evaluation_assignments"
    ADD CONSTRAINT "evaluation_assignments_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."evaluation_cycles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."evaluation_assignments"
    ADD CONSTRAINT "evaluation_assignments_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "public"."evaluations"("id");



ALTER TABLE ONLY "public"."evaluation_assignments"
    ADD CONSTRAINT "evaluation_assignments_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."evaluation_assignments"
    ADD CONSTRAINT "evaluation_assignments_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."evaluation_criteria"
    ADD CONSTRAINT "evaluation_criteria_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."evaluation_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."evaluation_cycles"
    ADD CONSTRAINT "evaluation_cycles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."evaluation_cycles"
    ADD CONSTRAINT "evaluation_cycles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."evaluation_cycles"
    ADD CONSTRAINT "evaluation_cycles_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."evaluation_templates"("id");



ALTER TABLE ONLY "public"."evaluation_scores"
    ADD CONSTRAINT "evaluation_scores_criterion_id_fkey" FOREIGN KEY ("criterion_id") REFERENCES "public"."evaluation_criteria"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."evaluation_scores"
    ADD CONSTRAINT "evaluation_scores_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "public"."evaluations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."evaluation_templates"
    ADD CONSTRAINT "evaluation_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."evaluations"
    ADD CONSTRAINT "evaluations_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id");



ALTER TABLE ONLY "public"."evaluations"
    ADD CONSTRAINT "evaluations_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "public"."evaluation_assignments"("id");



ALTER TABLE ONLY "public"."evaluations"
    ADD CONSTRAINT "evaluations_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."evaluation_cycles"("id");



ALTER TABLE ONLY "public"."evaluations"
    ADD CONSTRAINT "evaluations_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."evaluations"
    ADD CONSTRAINT "evaluations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."evaluations"
    ADD CONSTRAINT "evaluations_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."evaluations"
    ADD CONSTRAINT "evaluations_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."evaluation_templates"("id");



ALTER TABLE ONLY "public"."faqs"
    ADD CONSTRAINT "faqs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."form_fields"
    ADD CONSTRAINT "form_fields_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "public"."custom_forms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."form_responses"
    ADD CONSTRAINT "form_responses_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "public"."form_fields"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."form_responses"
    ADD CONSTRAINT "form_responses_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "public"."custom_forms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."interview_slots"
    ADD CONSTRAINT "interview_slots_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id");



ALTER TABLE ONLY "public"."interview_slots"
    ADD CONSTRAINT "interview_slots_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."interviews"
    ADD CONSTRAINT "interviews_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."interviews"
    ADD CONSTRAINT "interviews_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."job_sections"
    ADD CONSTRAINT "job_sections_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_steps"
    ADD CONSTRAINT "job_steps_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leave_balances"
    ADD CONSTRAINT "leave_balances_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."member_permission_groups"
    ADD CONSTRAINT "member_permission_groups_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."permission_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."member_permission_groups"
    ADD CONSTRAINT "member_permission_groups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_threads"
    ADD CONSTRAINT "message_threads_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."message_threads"
    ADD CONSTRAINT "message_threads_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."message_threads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."page_sections"
    ADD CONSTRAINT "page_sections_tab_id_fkey" FOREIGN KEY ("tab_id") REFERENCES "public"."page_tabs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."page_tabs"
    ADD CONSTRAINT "page_tabs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payslips"
    ADD CONSTRAINT "payslips_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."permission_group_permissions"
    ADD CONSTRAINT "permission_group_permissions_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."permission_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."permission_groups"
    ADD CONSTRAINT "permission_groups_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."positions"
    ADD CONSTRAINT "positions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."project_team_members"
    ADD CONSTRAINT "project_team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."project_teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_team_members"
    ADD CONSTRAINT "project_team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_teams"
    ADD CONSTRAINT "project_teams_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pulse_survey_answers"
    ADD CONSTRAINT "pulse_survey_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."pulse_survey_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pulse_survey_answers"
    ADD CONSTRAINT "pulse_survey_answers_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "public"."pulse_survey_responses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pulse_survey_questions"
    ADD CONSTRAINT "pulse_survey_questions_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "public"."pulse_surveys"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pulse_survey_responses"
    ADD CONSTRAINT "pulse_survey_responses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pulse_survey_responses"
    ADD CONSTRAINT "pulse_survey_responses_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "public"."pulse_surveys"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pulse_surveys"
    ADD CONSTRAINT "pulse_surveys_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_notification_logs"
    ADD CONSTRAINT "push_notification_logs_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."recruiting_targets"
    ADD CONSTRAINT "recruiting_targets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."selection_step_templates"
    ADD CONSTRAINT "selection_step_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shift_requests"
    ADD CONSTRAINT "shift_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shift_schedules"
    ADD CONSTRAINT "shift_schedules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."skill_masters"
    ADD CONSTRAINT "skill_masters_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_assignees"
    ADD CONSTRAINT "task_assignees_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_assignees"
    ADD CONSTRAINT "task_assignees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."project_teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_organizations"
    ADD CONSTRAINT "user_organizations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_organizations"
    ADD CONSTRAINT "user_organizations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."wiki_pages"
    ADD CONSTRAINT "wiki_pages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."wiki_pages"
    ADD CONSTRAINT "wiki_pages_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."wiki_pages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workflow_requests"
    ADD CONSTRAINT "workflow_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_rules"
    ADD CONSTRAINT "workflow_rules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_templates"
    ADD CONSTRAINT "workflow_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



CREATE POLICY "Applicants can create own threads" ON "public"."message_threads" FOR INSERT WITH CHECK ((("participant_id" = ("auth"."uid"())::"text") AND ("participant_type" = 'applicant'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."user_organizations"
  WHERE (("user_organizations"."user_id" = ("auth"."uid"())::"text") AND ("user_organizations"."organization_id" = "message_threads"."organization_id"))))));



CREATE POLICY "Org members can create threads" ON "public"."message_threads" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("uo"."organization_id" = "message_threads"."organization_id") AND ("p"."role" = ANY (ARRAY['admin'::"text", 'employee'::"text"]))))));



CREATE POLICY "Users can create own calendar events" ON "public"."calendar_events" FOR INSERT WITH CHECK (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "Users can create own employee tasks" ON "public"."employee_tasks" FOR INSERT WITH CHECK (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "Users can create steps for own employee tasks" ON "public"."employee_task_steps" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."employee_tasks"
  WHERE (("employee_tasks"."id" = "employee_task_steps"."task_id") AND ("employee_tasks"."user_id" = ("auth"."uid"())::"text")))));



CREATE POLICY "Users can delete own calendar events" ON "public"."calendar_events" FOR DELETE USING (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "Users can delete own employee tasks" ON "public"."employee_tasks" FOR DELETE USING (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "Users can delete own messages" ON "public"."messages" FOR DELETE USING (("sender_id" = ("auth"."uid"())::"text"));



CREATE POLICY "Users can delete steps of own employee tasks" ON "public"."employee_task_steps" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."employee_tasks"
  WHERE (("employee_tasks"."id" = "employee_task_steps"."task_id") AND ("employee_tasks"."user_id" = ("auth"."uid"())::"text")))));



CREATE POLICY "Users can send messages to accessible threads" ON "public"."messages" FOR INSERT WITH CHECK ((("sender_id" = ("auth"."uid"())::"text") AND (EXISTS ( SELECT 1
   FROM "public"."message_threads" "mt"
  WHERE (("mt"."id" = "messages"."thread_id") AND ((EXISTS ( SELECT 1
           FROM ("public"."user_organizations" "uo"
             JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
          WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("uo"."organization_id" = "mt"."organization_id") AND ("p"."role" = 'admin'::"text")))) OR ("mt"."participant_id" = ("auth"."uid"())::"text")))))));



CREATE POLICY "Users can update own calendar events" ON "public"."calendar_events" FOR UPDATE USING (("user_id" = ("auth"."uid"())::"text")) WITH CHECK (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "Users can update own employee tasks" ON "public"."employee_tasks" FOR UPDATE USING (("user_id" = ("auth"."uid"())::"text")) WITH CHECK (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "Users can update steps of own employee tasks" ON "public"."employee_task_steps" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."employee_tasks"
  WHERE (("employee_tasks"."id" = "employee_task_steps"."task_id") AND ("employee_tasks"."user_id" = ("auth"."uid"())::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."employee_tasks"
  WHERE (("employee_tasks"."id" = "employee_task_steps"."task_id") AND ("employee_tasks"."user_id" = ("auth"."uid"())::"text")))));



CREATE POLICY "Users can view own calendar events" ON "public"."calendar_events" FOR SELECT USING (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "Users can view own employee tasks" ON "public"."employee_tasks" FOR SELECT USING (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "Users can view steps of own employee tasks" ON "public"."employee_task_steps" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."employee_tasks"
  WHERE (("employee_tasks"."id" = "employee_task_steps"."task_id") AND ("employee_tasks"."user_id" = ("auth"."uid"())::"text")))));



ALTER TABLE "public"."activity_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "activity_logs_insert_org" ON "public"."activity_logs" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE ("user_organizations"."user_id" = ( SELECT ("auth"."uid"())::"text" AS "uid")))));



CREATE POLICY "activity_logs_select_org" ON "public"."activity_logs" FOR SELECT USING (("organization_id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE ("user_organizations"."user_id" = ( SELECT ("auth"."uid"())::"text" AS "uid")))));



ALTER TABLE "public"."announcements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "announcements_all_admin" ON "public"."announcements" USING ((("public"."get_my_role"() = 'admin'::"text") AND ("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids")))) WITH CHECK ((("public"."get_my_role"() = 'admin'::"text") AND ("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids"))));



CREATE POLICY "announcements_select_org" ON "public"."announcements" FOR SELECT USING ((("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids")) AND ("published_at" IS NOT NULL)));



CREATE POLICY "app_steps_all_admin" ON "public"."application_steps" USING (("application_id" IN ( SELECT "a"."id"
   FROM "public"."applications" "a"
  WHERE ("a"."organization_id" IN ( SELECT "uo"."organization_id"
           FROM ("public"."user_organizations" "uo"
             JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
          WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text"))))))) WITH CHECK (("application_id" IN ( SELECT "a"."id"
   FROM "public"."applications" "a"
  WHERE ("a"."organization_id" IN ( SELECT "uo"."organization_id"
           FROM ("public"."user_organizations" "uo"
             JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
          WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text")))))));



CREATE POLICY "app_steps_insert_own" ON "public"."application_steps" FOR INSERT WITH CHECK (("application_id" IN ( SELECT "a"."id"
   FROM "public"."applications" "a"
  WHERE ("a"."applicant_id" = ("auth"."uid"())::"text"))));



CREATE POLICY "app_steps_select_own" ON "public"."application_steps" FOR SELECT USING (("application_id" IN ( SELECT "a"."id"
   FROM "public"."applications" "a"
  WHERE ("a"."applicant_id" = ("auth"."uid"())::"text"))));



CREATE POLICY "app_steps_update_own_restricted" ON "public"."application_steps" FOR UPDATE USING (("application_id" IN ( SELECT "a"."id"
   FROM "public"."applications" "a"
  WHERE ("a"."applicant_id" = ("auth"."uid"())::"text")))) WITH CHECK (("application_id" IN ( SELECT "a"."id"
   FROM "public"."applications" "a"
  WHERE ("a"."applicant_id" = ("auth"."uid"())::"text"))));



CREATE POLICY "applicant_read_own_applications" ON "public"."applications" FOR SELECT TO "anon" USING (("applicant_id" = ("auth"."uid"())::"text"));



ALTER TABLE "public"."applicant_todos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "applicant_todos_delete_manual_only" ON "public"."applicant_todos" FOR DELETE USING ((("user_id" = ("auth"."uid"())::"text") AND ("source" = 'manual'::"text")));



CREATE POLICY "applicants_can_insert_own_user_organizations" ON "public"."user_organizations" FOR INSERT WITH CHECK (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "applicants_can_read_all_organizations" ON "public"."organizations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ("auth"."uid"())::"text") AND ("profiles"."role" = 'applicant'::"text")))));



ALTER TABLE "public"."application_steps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."applications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "applications_all_admin" ON "public"."applications" USING ((("public"."get_my_role"() = 'admin'::"text") AND ("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids")))) WITH CHECK ((("public"."get_my_role"() = 'admin'::"text") AND ("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids"))));



CREATE POLICY "applications_insert_own" ON "public"."applications" FOR INSERT WITH CHECK (("applicant_id" = ("auth"."uid"())::"text"));



CREATE POLICY "applications_select_own" ON "public"."applications" FOR SELECT USING (("applicant_id" = ("auth"."uid"())::"text"));



CREATE POLICY "applications_update_own" ON "public"."applications" FOR UPDATE USING (("applicant_id" = ("auth"."uid"())::"text")) WITH CHECK (("applicant_id" = ("auth"."uid"())::"text"));



CREATE POLICY "approvers_admin_all" ON "public"."attendance_approvers" USING ((EXISTS ( SELECT 1
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."organization_id" = "attendance_approvers"."organization_id") AND ("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "approvers_employee_read" ON "public"."attendance_approvers" FOR SELECT USING ((("user_id" = ("auth"."uid"())::"text") OR (EXISTS ( SELECT 1
   FROM "public"."employee_departments" "ed"
  WHERE (("ed"."user_id" = ("auth"."uid"())::"text") AND ("ed"."department_id" = "attendance_approvers"."department_id")))) OR ("approver_id" = ("auth"."uid"())::"text")));



CREATE POLICY "archive_deny_delete" ON "public"."audit_logs_archive" FOR DELETE USING (false);



CREATE POLICY "archive_deny_insert" ON "public"."audit_logs_archive" FOR INSERT WITH CHECK (false);



CREATE POLICY "archive_deny_update" ON "public"."audit_logs_archive" FOR UPDATE USING (false);



CREATE POLICY "archive_select_admin" ON "public"."audit_logs_archive" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("uo"."organization_id" = "audit_logs_archive"."organization_id") AND ("p"."role" = 'admin'::"text")))));



ALTER TABLE "public"."attendance_approvers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "attendance_approvers_all_admin" ON "public"."attendance_approvers" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text"))))) WITH CHECK (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "attendance_approvers_select_org" ON "public"."attendance_approvers" FOR SELECT USING (("organization_id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE ("user_organizations"."user_id" = ("auth"."uid"())::"text"))));



ALTER TABLE "public"."attendance_corrections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "attendance_corrections_all_admin" ON "public"."attendance_corrections" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text"))))) WITH CHECK (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "attendance_corrections_insert_own" ON "public"."attendance_corrections" FOR INSERT WITH CHECK (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "attendance_corrections_select_own" ON "public"."attendance_corrections" FOR SELECT USING (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "attendance_corrections_update_own" ON "public"."attendance_corrections" FOR UPDATE USING ((("user_id" = ("auth"."uid"())::"text") AND ("status" = 'pending'::"text")));



ALTER TABLE "public"."attendance_punches" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "attendance_punches_all_admin" ON "public"."attendance_punches" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text"))))) WITH CHECK (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "attendance_punches_insert_own" ON "public"."attendance_punches" FOR INSERT WITH CHECK (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "attendance_punches_org_read" ON "public"."attendance_punches" FOR SELECT USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "attendance_punches_own" ON "public"."attendance_punches" USING (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "attendance_punches_select_own" ON "public"."attendance_punches" FOR SELECT USING (("user_id" = ("auth"."uid"())::"text"));



ALTER TABLE "public"."attendance_records" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "attendance_records_all_admin" ON "public"."attendance_records" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text"))))) WITH CHECK (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "attendance_records_insert_own" ON "public"."attendance_records" FOR INSERT WITH CHECK (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "attendance_records_org_read" ON "public"."attendance_records" FOR SELECT USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "attendance_records_own" ON "public"."attendance_records" USING (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "attendance_records_select_own" ON "public"."attendance_records" FOR SELECT USING (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "attendance_records_update_own" ON "public"."attendance_records" FOR UPDATE USING (("user_id" = ("auth"."uid"())::"text"));



ALTER TABLE "public"."attendance_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "attendance_settings_all_admin" ON "public"."attendance_settings" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text"))))) WITH CHECK (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "attendance_settings_manage" ON "public"."attendance_settings" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "attendance_settings_select" ON "public"."attendance_settings" FOR SELECT USING (("organization_id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE ("user_organizations"."user_id" = ("auth"."uid"())::"text"))));



CREATE POLICY "attendance_settings_select_org" ON "public"."attendance_settings" FOR SELECT USING (("organization_id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE ("user_organizations"."user_id" = ("auth"."uid"())::"text"))));



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs_archive" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_logs_deny_delete" ON "public"."audit_logs" FOR DELETE USING (false);



CREATE POLICY "audit_logs_deny_update" ON "public"."audit_logs" FOR UPDATE USING (false);



ALTER TABLE "public"."audit_logs_errors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_logs_insert" ON "public"."audit_logs" FOR INSERT WITH CHECK ((("public"."get_my_role"() = 'admin'::"text") AND ("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids"))));



CREATE POLICY "authenticated_all_job_steps" ON "public"."job_steps" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_delete_applications" ON "public"."applications" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")));



CREATE POLICY "authenticated_delete_custom_forms" ON "public"."custom_forms" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")));



CREATE POLICY "authenticated_delete_departments" ON "public"."departments" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")));



CREATE POLICY "authenticated_delete_employee_departments" ON "public"."employee_departments" FOR DELETE TO "authenticated" USING (("department_id" IN ( SELECT "departments"."id"
   FROM "public"."departments"
  WHERE ("departments"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")))));



CREATE POLICY "authenticated_delete_evaluation_criteria" ON "public"."evaluation_criteria" FOR DELETE TO "authenticated" USING (("template_id" IN ( SELECT "evaluation_templates"."id"
   FROM "public"."evaluation_templates"
  WHERE ("evaluation_templates"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")))));



CREATE POLICY "authenticated_delete_evaluation_scores" ON "public"."evaluation_scores" FOR DELETE TO "authenticated" USING (("evaluation_id" IN ( SELECT "evaluations"."id"
   FROM "public"."evaluations"
  WHERE ("evaluations"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")))));



CREATE POLICY "authenticated_delete_evaluation_templates" ON "public"."evaluation_templates" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")));



CREATE POLICY "authenticated_delete_evaluations" ON "public"."evaluations" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")));



CREATE POLICY "authenticated_delete_form_fields" ON "public"."form_fields" FOR DELETE TO "authenticated" USING (("form_id" IN ( SELECT "custom_forms"."id"
   FROM "public"."custom_forms"
  WHERE ("custom_forms"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")))));



CREATE POLICY "authenticated_delete_interview_slots" ON "public"."interview_slots" FOR DELETE TO "authenticated" USING (("interview_id" IN ( SELECT "interviews"."id"
   FROM "public"."interviews"
  WHERE ("interviews"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")))));



CREATE POLICY "authenticated_delete_interviews" ON "public"."interviews" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")));



CREATE POLICY "authenticated_delete_job_sections" ON "public"."job_sections" FOR DELETE TO "authenticated" USING (("job_id" IN ( SELECT "jobs"."id"
   FROM "public"."jobs"
  WHERE ("jobs"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")))));



CREATE POLICY "authenticated_delete_pulse_survey_questions" ON "public"."pulse_survey_questions" FOR DELETE USING (("survey_id" IN ( SELECT "pulse_surveys"."id"
   FROM "public"."pulse_surveys"
  WHERE ("pulse_surveys"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")))));



CREATE POLICY "authenticated_delete_pulse_surveys" ON "public"."pulse_surveys" FOR DELETE USING (("organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")));



CREATE POLICY "authenticated_insert_applications" ON "public"."applications" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")));



CREATE POLICY "authenticated_insert_evaluation_templates" ON "public"."evaluation_templates" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")));



CREATE POLICY "authenticated_insert_evaluations" ON "public"."evaluations" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")));



CREATE POLICY "authenticated_insert_own" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("id" = ("auth"."uid"())::"text"));



CREATE POLICY "authenticated_read_anchors" ON "public"."evaluation_anchors" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_read_application_steps" ON "public"."application_steps" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_read_applications" ON "public"."applications" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")));



CREATE POLICY "authenticated_read_custom_forms" ON "public"."custom_forms" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")));



CREATE POLICY "authenticated_read_departments" ON "public"."departments" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")));



CREATE POLICY "authenticated_read_employee_departments" ON "public"."employee_departments" FOR SELECT TO "authenticated" USING (("department_id" IN ( SELECT "departments"."id"
   FROM "public"."departments"
  WHERE ("departments"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")))));



CREATE POLICY "authenticated_read_evaluation_criteria" ON "public"."evaluation_criteria" FOR SELECT TO "authenticated" USING (("template_id" IN ( SELECT "evaluation_templates"."id"
   FROM "public"."evaluation_templates"
  WHERE ("evaluation_templates"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")))));



CREATE POLICY "authenticated_read_evaluation_scores" ON "public"."evaluation_scores" FOR SELECT TO "authenticated" USING (("evaluation_id" IN ( SELECT "evaluations"."id"
   FROM "public"."evaluations"
  WHERE ("evaluations"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")))));



CREATE POLICY "authenticated_read_evaluation_templates" ON "public"."evaluation_templates" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")));



CREATE POLICY "authenticated_read_evaluations" ON "public"."evaluations" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")));



CREATE POLICY "authenticated_read_form_fields" ON "public"."form_fields" FOR SELECT TO "authenticated" USING (("form_id" IN ( SELECT "custom_forms"."id"
   FROM "public"."custom_forms"
  WHERE ("custom_forms"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")))));



CREATE POLICY "authenticated_read_form_responses" ON "public"."form_responses" FOR SELECT TO "authenticated" USING (("form_id" IN ( SELECT "custom_forms"."id"
   FROM "public"."custom_forms"
  WHERE ("custom_forms"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")))));



CREATE POLICY "authenticated_read_interview_slots" ON "public"."interview_slots" FOR SELECT TO "authenticated" USING (("interview_id" IN ( SELECT "interviews"."id"
   FROM "public"."interviews"
  WHERE ("interviews"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")))));



CREATE POLICY "authenticated_read_interviews" ON "public"."interviews" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")));



CREATE POLICY "authenticated_read_job_sections" ON "public"."job_sections" FOR SELECT TO "authenticated" USING (("job_id" IN ( SELECT "jobs"."id"
   FROM "public"."jobs"
  WHERE ("jobs"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")))));



CREATE POLICY "authenticated_read_jobs" ON "public"."jobs" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")));



CREATE POLICY "authenticated_read_organizations" ON "public"."organizations" FOR SELECT TO "authenticated" USING (("id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")));



CREATE POLICY "authenticated_read_profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_read_pulse_survey_answers" ON "public"."pulse_survey_answers" FOR SELECT USING (("response_id" IN ( SELECT "pulse_survey_responses"."id"
   FROM "public"."pulse_survey_responses"
  WHERE (("pulse_survey_responses"."user_id" = ("auth"."uid"())::"text") OR ("pulse_survey_responses"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids"))))));



CREATE POLICY "authenticated_read_pulse_survey_questions" ON "public"."pulse_survey_questions" FOR SELECT USING (("survey_id" IN ( SELECT "pulse_surveys"."id"
   FROM "public"."pulse_surveys"
  WHERE ("pulse_surveys"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")))));



CREATE POLICY "authenticated_read_pulse_survey_responses" ON "public"."pulse_survey_responses" FOR SELECT USING ((("user_id" = ("auth"."uid"())::"text") OR ("organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids"))));



CREATE POLICY "authenticated_read_pulse_surveys" ON "public"."pulse_surveys" FOR SELECT USING (("organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")));



CREATE POLICY "authenticated_update_applications" ON "public"."applications" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids"))) WITH CHECK (("organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")));



CREATE POLICY "authenticated_update_custom_forms" ON "public"."custom_forms" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids"))) WITH CHECK (("organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")));



CREATE POLICY "authenticated_update_departments" ON "public"."departments" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids"))) WITH CHECK (("organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")));



CREATE POLICY "authenticated_update_employee_departments" ON "public"."employee_departments" FOR UPDATE TO "authenticated" USING (("department_id" IN ( SELECT "departments"."id"
   FROM "public"."departments"
  WHERE ("departments"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids"))))) WITH CHECK (("department_id" IN ( SELECT "departments"."id"
   FROM "public"."departments"
  WHERE ("departments"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")))));



CREATE POLICY "authenticated_update_evaluation_criteria" ON "public"."evaluation_criteria" FOR UPDATE TO "authenticated" USING (("template_id" IN ( SELECT "evaluation_templates"."id"
   FROM "public"."evaluation_templates"
  WHERE ("evaluation_templates"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids"))))) WITH CHECK (("template_id" IN ( SELECT "evaluation_templates"."id"
   FROM "public"."evaluation_templates"
  WHERE ("evaluation_templates"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")))));



CREATE POLICY "authenticated_update_evaluation_scores" ON "public"."evaluation_scores" FOR UPDATE TO "authenticated" USING (("evaluation_id" IN ( SELECT "evaluations"."id"
   FROM "public"."evaluations"
  WHERE ("evaluations"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids"))))) WITH CHECK (("evaluation_id" IN ( SELECT "evaluations"."id"
   FROM "public"."evaluations"
  WHERE ("evaluations"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")))));



CREATE POLICY "authenticated_update_evaluation_templates" ON "public"."evaluation_templates" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids"))) WITH CHECK (("organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")));



CREATE POLICY "authenticated_update_evaluations" ON "public"."evaluations" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids"))) WITH CHECK (("organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")));



CREATE POLICY "authenticated_update_form_fields" ON "public"."form_fields" FOR UPDATE TO "authenticated" USING (("form_id" IN ( SELECT "custom_forms"."id"
   FROM "public"."custom_forms"
  WHERE ("custom_forms"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids"))))) WITH CHECK (("form_id" IN ( SELECT "custom_forms"."id"
   FROM "public"."custom_forms"
  WHERE ("custom_forms"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")))));



CREATE POLICY "authenticated_update_form_responses" ON "public"."form_responses" FOR UPDATE TO "authenticated" USING (("form_id" IN ( SELECT "custom_forms"."id"
   FROM "public"."custom_forms"
  WHERE ("custom_forms"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids"))))) WITH CHECK (("form_id" IN ( SELECT "custom_forms"."id"
   FROM "public"."custom_forms"
  WHERE ("custom_forms"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")))));



CREATE POLICY "authenticated_update_interview_slots" ON "public"."interview_slots" FOR UPDATE TO "authenticated" USING (("interview_id" IN ( SELECT "interviews"."id"
   FROM "public"."interviews"
  WHERE ("interviews"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids"))))) WITH CHECK (("interview_id" IN ( SELECT "interviews"."id"
   FROM "public"."interviews"
  WHERE ("interviews"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")))));



CREATE POLICY "authenticated_update_interviews" ON "public"."interviews" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids"))) WITH CHECK (("organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")));



CREATE POLICY "authenticated_update_job_sections" ON "public"."job_sections" FOR UPDATE TO "authenticated" USING (("job_id" IN ( SELECT "jobs"."id"
   FROM "public"."jobs"
  WHERE ("jobs"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids"))))) WITH CHECK (("job_id" IN ( SELECT "jobs"."id"
   FROM "public"."jobs"
  WHERE ("jobs"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")))));



CREATE POLICY "authenticated_update_own" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = ("auth"."uid"())::"text")) WITH CHECK (("id" = ("auth"."uid"())::"text"));



CREATE POLICY "authenticated_update_pulse_survey_answers" ON "public"."pulse_survey_answers" FOR UPDATE USING (("response_id" IN ( SELECT "pulse_survey_responses"."id"
   FROM "public"."pulse_survey_responses"
  WHERE ("pulse_survey_responses"."user_id" = ("auth"."uid"())::"text"))));



CREATE POLICY "authenticated_update_pulse_survey_questions" ON "public"."pulse_survey_questions" FOR UPDATE USING (("survey_id" IN ( SELECT "pulse_surveys"."id"
   FROM "public"."pulse_surveys"
  WHERE ("pulse_surveys"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids"))))) WITH CHECK (("survey_id" IN ( SELECT "pulse_surveys"."id"
   FROM "public"."pulse_surveys"
  WHERE ("pulse_surveys"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")))));



CREATE POLICY "authenticated_update_pulse_survey_responses" ON "public"."pulse_survey_responses" FOR UPDATE USING (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "authenticated_update_pulse_surveys" ON "public"."pulse_surveys" FOR UPDATE USING (("organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids"))) WITH CHECK (("organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")));



CREATE POLICY "authenticated_write_application_steps" ON "public"."application_steps" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_write_custom_forms" ON "public"."custom_forms" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")));



CREATE POLICY "authenticated_write_departments" ON "public"."departments" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")));



CREATE POLICY "authenticated_write_employee_departments" ON "public"."employee_departments" FOR INSERT TO "authenticated" WITH CHECK (("department_id" IN ( SELECT "departments"."id"
   FROM "public"."departments"
  WHERE ("departments"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")))));



CREATE POLICY "authenticated_write_evaluation_criteria" ON "public"."evaluation_criteria" FOR INSERT TO "authenticated" WITH CHECK (("template_id" IN ( SELECT "evaluation_templates"."id"
   FROM "public"."evaluation_templates"
  WHERE ("evaluation_templates"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")))));



CREATE POLICY "authenticated_write_evaluation_scores" ON "public"."evaluation_scores" FOR INSERT TO "authenticated" WITH CHECK (("evaluation_id" IN ( SELECT "evaluations"."id"
   FROM "public"."evaluations"
  WHERE ("evaluations"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")))));



CREATE POLICY "authenticated_write_form_fields" ON "public"."form_fields" FOR INSERT TO "authenticated" WITH CHECK (("form_id" IN ( SELECT "custom_forms"."id"
   FROM "public"."custom_forms"
  WHERE ("custom_forms"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")))));



CREATE POLICY "authenticated_write_form_responses" ON "public"."form_responses" FOR INSERT TO "authenticated" WITH CHECK (("form_id" IN ( SELECT "custom_forms"."id"
   FROM "public"."custom_forms"
  WHERE ("custom_forms"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")))));



CREATE POLICY "authenticated_write_interview_slots" ON "public"."interview_slots" FOR INSERT TO "authenticated" WITH CHECK (("interview_id" IN ( SELECT "interviews"."id"
   FROM "public"."interviews"
  WHERE ("interviews"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")))));



CREATE POLICY "authenticated_write_interviews" ON "public"."interviews" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")));



CREATE POLICY "authenticated_write_job_sections" ON "public"."job_sections" FOR INSERT TO "authenticated" WITH CHECK (("job_id" IN ( SELECT "jobs"."id"
   FROM "public"."jobs"
  WHERE ("jobs"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")))));



CREATE POLICY "authenticated_write_jobs" ON "public"."jobs" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_write_pulse_survey_answers" ON "public"."pulse_survey_answers" FOR INSERT WITH CHECK (("response_id" IN ( SELECT "pulse_survey_responses"."id"
   FROM "public"."pulse_survey_responses"
  WHERE ("pulse_survey_responses"."user_id" = ("auth"."uid"())::"text"))));



CREATE POLICY "authenticated_write_pulse_survey_questions" ON "public"."pulse_survey_questions" FOR INSERT WITH CHECK (("survey_id" IN ( SELECT "pulse_surveys"."id"
   FROM "public"."pulse_surveys"
  WHERE ("pulse_surveys"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")))));



CREATE POLICY "authenticated_write_pulse_survey_responses" ON "public"."pulse_survey_responses" FOR INSERT WITH CHECK (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "authenticated_write_pulse_surveys" ON "public"."pulse_surveys" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")));



ALTER TABLE "public"."bc_activities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bc_activities_delete" ON "public"."bc_activities" FOR DELETE TO "authenticated" USING (("organization_id" = "public"."get_my_organization_id"()));



CREATE POLICY "bc_activities_insert" ON "public"."bc_activities" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" = "public"."get_my_organization_id"()));



CREATE POLICY "bc_activities_select" ON "public"."bc_activities" FOR SELECT TO "authenticated" USING (("organization_id" = "public"."get_my_organization_id"()));



CREATE POLICY "bc_activities_update" ON "public"."bc_activities" FOR UPDATE TO "authenticated" USING (("organization_id" = "public"."get_my_organization_id"()));



ALTER TABLE "public"."bc_cards" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bc_cards_delete" ON "public"."bc_cards" FOR DELETE TO "authenticated" USING (("organization_id" = "public"."get_my_organization_id"()));



CREATE POLICY "bc_cards_insert" ON "public"."bc_cards" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" = "public"."get_my_organization_id"()));



CREATE POLICY "bc_cards_select" ON "public"."bc_cards" FOR SELECT TO "authenticated" USING (("organization_id" = "public"."get_my_organization_id"()));



ALTER TABLE "public"."bc_companies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bc_companies_delete" ON "public"."bc_companies" FOR DELETE TO "authenticated" USING (("organization_id" = "public"."get_my_organization_id"()));



CREATE POLICY "bc_companies_insert" ON "public"."bc_companies" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" = "public"."get_my_organization_id"()));



CREATE POLICY "bc_companies_select" ON "public"."bc_companies" FOR SELECT TO "authenticated" USING (("organization_id" = "public"."get_my_organization_id"()));



CREATE POLICY "bc_companies_update" ON "public"."bc_companies" FOR UPDATE TO "authenticated" USING (("organization_id" = "public"."get_my_organization_id"()));



ALTER TABLE "public"."bc_contacts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bc_contacts_delete" ON "public"."bc_contacts" FOR DELETE TO "authenticated" USING (("organization_id" = "public"."get_my_organization_id"()));



CREATE POLICY "bc_contacts_insert" ON "public"."bc_contacts" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" = "public"."get_my_organization_id"()));



CREATE POLICY "bc_contacts_select" ON "public"."bc_contacts" FOR SELECT TO "authenticated" USING (("organization_id" = "public"."get_my_organization_id"()));



CREATE POLICY "bc_contacts_update" ON "public"."bc_contacts" FOR UPDATE TO "authenticated" USING (("organization_id" = "public"."get_my_organization_id"()));



ALTER TABLE "public"."bc_deal_contacts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bc_deal_contacts_delete" ON "public"."bc_deal_contacts" FOR DELETE USING (("organization_id" = "public"."get_my_organization_id"()));



CREATE POLICY "bc_deal_contacts_insert" ON "public"."bc_deal_contacts" FOR INSERT WITH CHECK (("organization_id" = "public"."get_my_organization_id"()));



CREATE POLICY "bc_deal_contacts_select" ON "public"."bc_deal_contacts" FOR SELECT USING (("organization_id" = "public"."get_my_organization_id"()));



CREATE POLICY "bc_deal_contacts_update" ON "public"."bc_deal_contacts" FOR UPDATE USING (("organization_id" = "public"."get_my_organization_id"()));



ALTER TABLE "public"."bc_deals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bc_deals_delete" ON "public"."bc_deals" FOR DELETE TO "authenticated" USING (("organization_id" = "public"."get_my_organization_id"()));



CREATE POLICY "bc_deals_insert" ON "public"."bc_deals" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" = "public"."get_my_organization_id"()));



CREATE POLICY "bc_deals_select" ON "public"."bc_deals" FOR SELECT TO "authenticated" USING (("organization_id" = "public"."get_my_organization_id"()));



CREATE POLICY "bc_deals_update" ON "public"."bc_deals" FOR UPDATE TO "authenticated" USING (("organization_id" = "public"."get_my_organization_id"()));



ALTER TABLE "public"."bc_leads" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bc_leads_delete" ON "public"."bc_leads" FOR DELETE USING (("organization_id" = "public"."get_my_organization_id"()));



CREATE POLICY "bc_leads_insert" ON "public"."bc_leads" FOR INSERT WITH CHECK (("organization_id" = "public"."get_my_organization_id"()));



CREATE POLICY "bc_leads_select" ON "public"."bc_leads" FOR SELECT USING (("organization_id" = "public"."get_my_organization_id"()));



CREATE POLICY "bc_leads_update" ON "public"."bc_leads" FOR UPDATE USING (("organization_id" = "public"."get_my_organization_id"()));



ALTER TABLE "public"."bc_quote_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bc_quote_items_delete" ON "public"."bc_quote_items" FOR DELETE USING (("quote_id" IN ( SELECT "bc_quotes"."id"
   FROM "public"."bc_quotes"
  WHERE ("bc_quotes"."organization_id" = "public"."get_my_organization_id"()))));



CREATE POLICY "bc_quote_items_insert" ON "public"."bc_quote_items" FOR INSERT WITH CHECK (("quote_id" IN ( SELECT "bc_quotes"."id"
   FROM "public"."bc_quotes"
  WHERE ("bc_quotes"."organization_id" = "public"."get_my_organization_id"()))));



CREATE POLICY "bc_quote_items_select" ON "public"."bc_quote_items" FOR SELECT USING (("quote_id" IN ( SELECT "bc_quotes"."id"
   FROM "public"."bc_quotes"
  WHERE ("bc_quotes"."organization_id" = "public"."get_my_organization_id"()))));



CREATE POLICY "bc_quote_items_update" ON "public"."bc_quote_items" FOR UPDATE USING (("quote_id" IN ( SELECT "bc_quotes"."id"
   FROM "public"."bc_quotes"
  WHERE ("bc_quotes"."organization_id" = "public"."get_my_organization_id"()))));



ALTER TABLE "public"."bc_quotes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bc_quotes_delete" ON "public"."bc_quotes" FOR DELETE USING (("organization_id" = "public"."get_my_organization_id"()));



CREATE POLICY "bc_quotes_insert" ON "public"."bc_quotes" FOR INSERT WITH CHECK (("organization_id" = "public"."get_my_organization_id"()));



CREATE POLICY "bc_quotes_select" ON "public"."bc_quotes" FOR SELECT USING (("organization_id" = "public"."get_my_organization_id"()));



CREATE POLICY "bc_quotes_update" ON "public"."bc_quotes" FOR UPDATE USING (("organization_id" = "public"."get_my_organization_id"()));



ALTER TABLE "public"."bc_todos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bc_todos_delete" ON "public"."bc_todos" FOR DELETE TO "authenticated" USING (("organization_id" = "public"."get_my_organization_id"()));



CREATE POLICY "bc_todos_insert" ON "public"."bc_todos" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" = "public"."get_my_organization_id"()));



CREATE POLICY "bc_todos_select" ON "public"."bc_todos" FOR SELECT TO "authenticated" USING (("organization_id" = "public"."get_my_organization_id"()));



CREATE POLICY "bc_todos_update" ON "public"."bc_todos" FOR UPDATE TO "authenticated" USING (("organization_id" = "public"."get_my_organization_id"()));



ALTER TABLE "public"."calendar_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."certification_masters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."channel_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "channel_members_all_admin" ON "public"."channel_members" USING (("public"."get_my_role"() = 'admin'::"text")) WITH CHECK (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "channel_members_select_member" ON "public"."channel_members" FOR SELECT USING ((("user_id" = ("auth"."uid"())::"text") OR ("thread_id" IN ( SELECT "cm"."thread_id"
   FROM "public"."channel_members" "cm"
  WHERE ("cm"."user_id" = ("auth"."uid"())::"text")))));



ALTER TABLE "public"."compliance_alerts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "compliance_alerts_all_admin" ON "public"."compliance_alerts" USING ((("public"."get_my_role"() = 'admin'::"text") AND ("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids")))) WITH CHECK ((("public"."get_my_role"() = 'admin'::"text") AND ("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids"))));



CREATE POLICY "compliance_alerts_select_admin" ON "public"."compliance_alerts" FOR SELECT USING ((("public"."get_my_role"() = 'admin'::"text") AND ("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids"))));



CREATE POLICY "compliance_alerts_select_own" ON "public"."compliance_alerts" FOR SELECT USING (("user_id" = ("auth"."uid"())::"text"));



ALTER TABLE "public"."contract_changes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contract_changes_all_hr1_admin" ON "public"."contract_changes" USING (("public"."get_my_role"() = 'hr1_admin'::"text")) WITH CHECK (("public"."get_my_role"() = 'hr1_admin'::"text"));



ALTER TABLE "public"."contracts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contracts_all_hr1_admin" ON "public"."contracts" USING (("public"."get_my_role"() = 'hr1_admin'::"text")) WITH CHECK (("public"."get_my_role"() = 'hr1_admin'::"text"));



CREATE POLICY "corrections_admin_all" ON "public"."attendance_corrections" USING ((EXISTS ( SELECT 1
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."organization_id" = "attendance_corrections"."organization_id") AND ("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "corrections_approver_read" ON "public"."attendance_corrections" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."attendance_approvers" "aa"
  WHERE (("aa"."approver_id" = ("auth"."uid"())::"text") AND ("aa"."organization_id" = "attendance_corrections"."organization_id") AND (("aa"."user_id" = "attendance_corrections"."user_id") OR (EXISTS ( SELECT 1
           FROM "public"."employee_departments" "ed"
          WHERE (("ed"."user_id" = "attendance_corrections"."user_id") AND ("ed"."department_id" = "aa"."department_id")))))))));



CREATE POLICY "corrections_approver_update" ON "public"."attendance_corrections" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."attendance_approvers" "aa"
  WHERE (("aa"."approver_id" = ("auth"."uid"())::"text") AND ("aa"."organization_id" = "attendance_corrections"."organization_id") AND (("aa"."user_id" = "attendance_corrections"."user_id") OR (EXISTS ( SELECT 1
           FROM "public"."employee_departments" "ed"
          WHERE (("ed"."user_id" = "attendance_corrections"."user_id") AND ("ed"."department_id" = "aa"."department_id")))))))));



CREATE POLICY "corrections_own_all" ON "public"."attendance_corrections" USING (("user_id" = ("auth"."uid"())::"text"));



ALTER TABLE "public"."crm_automation_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crm_automation_logs_org_isolation" ON "public"."crm_automation_logs" USING (("organization_id" = "public"."get_my_organization_id"()));



ALTER TABLE "public"."crm_automation_rules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crm_automation_rules_org_isolation" ON "public"."crm_automation_rules" USING (("organization_id" = "public"."get_my_organization_id"()));



ALTER TABLE "public"."crm_email_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crm_email_templates_org_isolation" ON "public"."crm_email_templates" USING (("organization_id" = "public"."get_my_organization_id"()));



ALTER TABLE "public"."crm_field_definitions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crm_field_definitions_delete" ON "public"."crm_field_definitions" FOR DELETE USING (("organization_id" = "public"."get_my_organization_id"()));



CREATE POLICY "crm_field_definitions_insert" ON "public"."crm_field_definitions" FOR INSERT WITH CHECK (("organization_id" = "public"."get_my_organization_id"()));



CREATE POLICY "crm_field_definitions_org_isolation" ON "public"."crm_field_definitions" USING (("organization_id" = "public"."get_my_organization_id"()));



CREATE POLICY "crm_field_definitions_update" ON "public"."crm_field_definitions" FOR UPDATE USING (("organization_id" = "public"."get_my_organization_id"()));



ALTER TABLE "public"."crm_field_values" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crm_field_values_delete" ON "public"."crm_field_values" FOR DELETE USING (("organization_id" = "public"."get_my_organization_id"()));



CREATE POLICY "crm_field_values_insert" ON "public"."crm_field_values" FOR INSERT WITH CHECK (("organization_id" = "public"."get_my_organization_id"()));



CREATE POLICY "crm_field_values_org_isolation" ON "public"."crm_field_values" USING (("organization_id" = "public"."get_my_organization_id"()));



CREATE POLICY "crm_field_values_update" ON "public"."crm_field_values" FOR UPDATE USING (("organization_id" = "public"."get_my_organization_id"()));



ALTER TABLE "public"."crm_pipeline_stages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crm_pipeline_stages_delete" ON "public"."crm_pipeline_stages" FOR DELETE USING (("pipeline_id" IN ( SELECT "crm_pipelines"."id"
   FROM "public"."crm_pipelines"
  WHERE ("crm_pipelines"."organization_id" = "public"."get_my_organization_id"()))));



CREATE POLICY "crm_pipeline_stages_insert" ON "public"."crm_pipeline_stages" FOR INSERT WITH CHECK (("pipeline_id" IN ( SELECT "crm_pipelines"."id"
   FROM "public"."crm_pipelines"
  WHERE ("crm_pipelines"."organization_id" = "public"."get_my_organization_id"()))));



CREATE POLICY "crm_pipeline_stages_org_isolation" ON "public"."crm_pipeline_stages" USING (("pipeline_id" IN ( SELECT "crm_pipelines"."id"
   FROM "public"."crm_pipelines"
  WHERE ("crm_pipelines"."organization_id" = "public"."get_my_organization_id"()))));



CREATE POLICY "crm_pipeline_stages_update" ON "public"."crm_pipeline_stages" FOR UPDATE USING (("pipeline_id" IN ( SELECT "crm_pipelines"."id"
   FROM "public"."crm_pipelines"
  WHERE ("crm_pipelines"."organization_id" = "public"."get_my_organization_id"()))));



ALTER TABLE "public"."crm_pipelines" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crm_pipelines_delete" ON "public"."crm_pipelines" FOR DELETE USING (("organization_id" = "public"."get_my_organization_id"()));



CREATE POLICY "crm_pipelines_insert" ON "public"."crm_pipelines" FOR INSERT WITH CHECK (("organization_id" = "public"."get_my_organization_id"()));



CREATE POLICY "crm_pipelines_org_isolation" ON "public"."crm_pipelines" USING (("organization_id" = "public"."get_my_organization_id"()));



CREATE POLICY "crm_pipelines_update" ON "public"."crm_pipelines" FOR UPDATE USING (("organization_id" = "public"."get_my_organization_id"()));



ALTER TABLE "public"."crm_saved_views" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crm_saved_views_delete" ON "public"."crm_saved_views" FOR DELETE USING ((("user_id" = ("auth"."uid"())::"text") AND ("organization_id" = "public"."get_my_organization_id"())));



CREATE POLICY "crm_saved_views_insert" ON "public"."crm_saved_views" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_my_organization_id"()) AND ("user_id" = ("auth"."uid"())::"text")));



CREATE POLICY "crm_saved_views_select" ON "public"."crm_saved_views" FOR SELECT USING ((("organization_id" = "public"."get_my_organization_id"()) AND (("user_id" = ("auth"."uid"())::"text") OR ("is_shared" = true))));



CREATE POLICY "crm_saved_views_update" ON "public"."crm_saved_views" FOR UPDATE USING ((("user_id" = ("auth"."uid"())::"text") AND ("organization_id" = "public"."get_my_organization_id"())));



ALTER TABLE "public"."crm_webhook_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crm_webhook_logs_org_isolation" ON "public"."crm_webhook_logs" USING (("organization_id" = "public"."get_my_organization_id"()));



ALTER TABLE "public"."crm_webhooks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crm_webhooks_org_isolation" ON "public"."crm_webhooks" USING (("organization_id" = "public"."get_my_organization_id"()));



ALTER TABLE "public"."custom_forms" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dashboard_widget_pref_own" ON "public"."dashboard_widget_preferences" USING (("user_id" = ("auth"."uid"())::"text")) WITH CHECK (("user_id" = ("auth"."uid"())::"text"));



ALTER TABLE "public"."dashboard_widget_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."departments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "departments_all_admin" ON "public"."departments" USING ((("public"."get_my_role"() = 'admin'::"text") AND ("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids")))) WITH CHECK ((("public"."get_my_role"() = 'admin'::"text") AND ("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids"))));



CREATE POLICY "departments_select_org" ON "public"."departments" FOR SELECT USING (("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids")));



CREATE POLICY "emp_dept_all_admin" ON "public"."employee_departments" USING (("department_id" IN ( SELECT "d"."id"
   FROM "public"."departments" "d"
  WHERE ("d"."organization_id" IN ( SELECT "uo"."organization_id"
           FROM ("public"."user_organizations" "uo"
             JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
          WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text"))))))) WITH CHECK (("department_id" IN ( SELECT "d"."id"
   FROM "public"."departments" "d"
  WHERE ("d"."organization_id" IN ( SELECT "uo"."organization_id"
           FROM ("public"."user_organizations" "uo"
             JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
          WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text")))))));



CREATE POLICY "emp_dept_select_org" ON "public"."employee_departments" FOR SELECT USING (("department_id" IN ( SELECT "d"."id"
   FROM "public"."departments" "d"
  WHERE ("d"."organization_id" IN ( SELECT "user_organizations"."organization_id"
           FROM "public"."user_organizations"
          WHERE ("user_organizations"."user_id" = ("auth"."uid"())::"text"))))));



ALTER TABLE "public"."employee_certifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employee_departments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employee_skills" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employee_task_steps" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "employee_task_steps_delete" ON "public"."employee_task_steps" FOR DELETE USING (("task_id" IN ( SELECT "employee_tasks"."id"
   FROM "public"."employee_tasks"
  WHERE ("employee_tasks"."user_id" = ("auth"."uid"())::"text"))));



CREATE POLICY "employee_task_steps_insert" ON "public"."employee_task_steps" FOR INSERT WITH CHECK (("task_id" IN ( SELECT "employee_tasks"."id"
   FROM "public"."employee_tasks"
  WHERE ("employee_tasks"."user_id" = ("auth"."uid"())::"text"))));



CREATE POLICY "employee_task_steps_select" ON "public"."employee_task_steps" FOR SELECT USING (("task_id" IN ( SELECT "employee_tasks"."id"
   FROM "public"."employee_tasks"
  WHERE ("employee_tasks"."user_id" = ("auth"."uid"())::"text"))));



CREATE POLICY "employee_task_steps_update" ON "public"."employee_task_steps" FOR UPDATE USING (("task_id" IN ( SELECT "employee_tasks"."id"
   FROM "public"."employee_tasks"
  WHERE ("employee_tasks"."user_id" = ("auth"."uid"())::"text"))));



ALTER TABLE "public"."employee_tasks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "employee_tasks_delete_own" ON "public"."employee_tasks" FOR DELETE USING (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "employee_tasks_insert_own" ON "public"."employee_tasks" FOR INSERT WITH CHECK (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "employee_tasks_select_own" ON "public"."employee_tasks" FOR SELECT USING (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "employee_tasks_update_own" ON "public"."employee_tasks" FOR UPDATE USING (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "eval_anchors_all_admin" ON "public"."evaluation_anchors" USING (("criterion_id" IN ( SELECT "ec"."id"
   FROM ("public"."evaluation_criteria" "ec"
     JOIN "public"."evaluation_templates" "et" ON (("et"."id" = "ec"."template_id")))
  WHERE ("et"."organization_id" IN ( SELECT "uo"."organization_id"
           FROM ("public"."user_organizations" "uo"
             JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
          WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text"))))))) WITH CHECK (("criterion_id" IN ( SELECT "ec"."id"
   FROM ("public"."evaluation_criteria" "ec"
     JOIN "public"."evaluation_templates" "et" ON (("et"."id" = "ec"."template_id")))
  WHERE ("et"."organization_id" IN ( SELECT "uo"."organization_id"
           FROM ("public"."user_organizations" "uo"
             JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
          WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text")))))));



CREATE POLICY "eval_anchors_select_org" ON "public"."evaluation_anchors" FOR SELECT USING (("criterion_id" IN ( SELECT "ec"."id"
   FROM ("public"."evaluation_criteria" "ec"
     JOIN "public"."evaluation_templates" "et" ON (("et"."id" = "ec"."template_id")))
  WHERE ("et"."organization_id" IN ( SELECT "user_organizations"."organization_id"
           FROM "public"."user_organizations"
          WHERE ("user_organizations"."user_id" = ("auth"."uid"())::"text"))))));



CREATE POLICY "eval_assignments_all_admin" ON "public"."evaluation_assignments" USING (("cycle_id" IN ( SELECT "ec"."id"
   FROM "public"."evaluation_cycles" "ec"
  WHERE ("ec"."organization_id" IN ( SELECT "uo"."organization_id"
           FROM ("public"."user_organizations" "uo"
             JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
          WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text"))))))) WITH CHECK (("cycle_id" IN ( SELECT "ec"."id"
   FROM "public"."evaluation_cycles" "ec"
  WHERE ("ec"."organization_id" IN ( SELECT "uo"."organization_id"
           FROM ("public"."user_organizations" "uo"
             JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
          WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text")))))));



CREATE POLICY "eval_assignments_select_related" ON "public"."evaluation_assignments" FOR SELECT USING ((("target_user_id" = ("auth"."uid"())::"text") OR ("evaluator_id" = ("auth"."uid"())::"text") OR ("cycle_id" IN ( SELECT "ec"."id"
   FROM "public"."evaluation_cycles" "ec"
  WHERE ("ec"."organization_id" IN ( SELECT "uo"."organization_id"
           FROM ("public"."user_organizations" "uo"
             JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
          WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text"))))))));



CREATE POLICY "eval_assignments_update_evaluator" ON "public"."evaluation_assignments" FOR UPDATE USING (("evaluator_id" = ("auth"."uid"())::"text")) WITH CHECK (("evaluator_id" = ("auth"."uid"())::"text"));



CREATE POLICY "eval_criteria_all_admin" ON "public"."evaluation_criteria" USING (("template_id" IN ( SELECT "et"."id"
   FROM "public"."evaluation_templates" "et"
  WHERE ("et"."organization_id" IN ( SELECT "uo"."organization_id"
           FROM ("public"."user_organizations" "uo"
             JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
          WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text"))))))) WITH CHECK (("template_id" IN ( SELECT "et"."id"
   FROM "public"."evaluation_templates" "et"
  WHERE ("et"."organization_id" IN ( SELECT "uo"."organization_id"
           FROM ("public"."user_organizations" "uo"
             JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
          WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text")))))));



CREATE POLICY "eval_criteria_select_org" ON "public"."evaluation_criteria" FOR SELECT USING (("template_id" IN ( SELECT "et"."id"
   FROM "public"."evaluation_templates" "et"
  WHERE ("et"."organization_id" IN ( SELECT "user_organizations"."organization_id"
           FROM "public"."user_organizations"
          WHERE ("user_organizations"."user_id" = ("auth"."uid"())::"text"))))));



CREATE POLICY "eval_cycles_all_admin" ON "public"."evaluation_cycles" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text"))))) WITH CHECK (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "eval_cycles_select_org" ON "public"."evaluation_cycles" FOR SELECT USING (("organization_id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE ("user_organizations"."user_id" = ("auth"."uid"())::"text"))));



CREATE POLICY "eval_scores_insert_evaluator" ON "public"."evaluation_scores" FOR INSERT WITH CHECK (("evaluation_id" IN ( SELECT "evaluations"."id"
   FROM "public"."evaluations"
  WHERE ("evaluations"."evaluator_id" = ("auth"."uid"())::"text"))));



CREATE POLICY "eval_scores_select_evaluator" ON "public"."evaluation_scores" FOR SELECT USING (("evaluation_id" IN ( SELECT "evaluations"."id"
   FROM "public"."evaluations"
  WHERE ("evaluations"."evaluator_id" = ("auth"."uid"())::"text"))));



CREATE POLICY "eval_scores_update_evaluator" ON "public"."evaluation_scores" FOR UPDATE USING (("evaluation_id" IN ( SELECT "evaluations"."id"
   FROM "public"."evaluations"
  WHERE ("evaluations"."evaluator_id" = ("auth"."uid"())::"text"))));



CREATE POLICY "eval_templates_all_admin" ON "public"."evaluation_templates" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text"))))) WITH CHECK (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "eval_templates_select_org" ON "public"."evaluation_templates" FOR SELECT USING (("organization_id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE ("user_organizations"."user_id" = ("auth"."uid"())::"text"))));



ALTER TABLE "public"."evaluation_anchors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."evaluation_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."evaluation_criteria" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."evaluation_cycles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."evaluation_scores" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "evaluation_scores_insert" ON "public"."evaluation_scores" FOR INSERT WITH CHECK (("evaluation_id" IN ( SELECT "e"."id"
   FROM "public"."evaluations" "e"
  WHERE ("e"."evaluator_id" = ("auth"."uid"())::"text"))));



CREATE POLICY "evaluation_scores_select" ON "public"."evaluation_scores" FOR SELECT USING ((("evaluation_id" IN ( SELECT "e"."id"
   FROM "public"."evaluations" "e"
  WHERE (("e"."evaluator_id" = ("auth"."uid"())::"text") OR ("e"."target_user_id" = ("auth"."uid"())::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text"))))));



CREATE POLICY "evaluation_scores_update" ON "public"."evaluation_scores" FOR UPDATE USING (("evaluation_id" IN ( SELECT "e"."id"
   FROM "public"."evaluations" "e"
  WHERE ("e"."evaluator_id" = ("auth"."uid"())::"text"))));



ALTER TABLE "public"."evaluation_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."evaluations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "evaluations_insert_evaluator" ON "public"."evaluations" FOR INSERT WITH CHECK ((("evaluator_id" = ("auth"."uid"())::"text") OR ("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text"))))));



CREATE POLICY "evaluations_select_related" ON "public"."evaluations" FOR SELECT USING ((("evaluator_id" = ("auth"."uid"())::"text") OR ("target_user_id" = ("auth"."uid"())::"text") OR ("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text"))))));



CREATE POLICY "evaluations_update_evaluator" ON "public"."evaluations" FOR UPDATE USING ((("evaluator_id" = ("auth"."uid"())::"text") OR ("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text"))))));



ALTER TABLE "public"."faqs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "faqs_delete_admin" ON "public"."faqs" FOR DELETE USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = ANY (ARRAY['admin'::"text", 'hr_manager'::"text"]))))));



CREATE POLICY "faqs_insert_admin" ON "public"."faqs" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = ANY (ARRAY['admin'::"text", 'hr_manager'::"text"]))))));



CREATE POLICY "faqs_select_org" ON "public"."faqs" FOR SELECT USING (("organization_id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE ("user_organizations"."user_id" = ("auth"."uid"())::"text"))));



CREATE POLICY "faqs_update_admin" ON "public"."faqs" FOR UPDATE USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = ANY (ARRAY['admin'::"text", 'hr_manager'::"text"]))))));



ALTER TABLE "public"."form_fields" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."form_responses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."interview_slots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "interview_slots_all_admin" ON "public"."interview_slots" USING (("interview_id" IN ( SELECT "i"."id"
   FROM "public"."interviews" "i"
  WHERE ("i"."organization_id" IN ( SELECT "uo"."organization_id"
           FROM ("public"."user_organizations" "uo"
             JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
          WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text"))))))) WITH CHECK (("interview_id" IN ( SELECT "i"."id"
   FROM "public"."interviews" "i"
  WHERE ("i"."organization_id" IN ( SELECT "uo"."organization_id"
           FROM ("public"."user_organizations" "uo"
             JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
          WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text")))))));



CREATE POLICY "interview_slots_select_org" ON "public"."interview_slots" FOR SELECT USING (("interview_id" IN ( SELECT "i"."id"
   FROM "public"."interviews" "i"
  WHERE ("i"."organization_id" IN ( SELECT "user_organizations"."organization_id"
           FROM "public"."user_organizations"
          WHERE ("user_organizations"."user_id" = ("auth"."uid"())::"text"))))));



ALTER TABLE "public"."interviews" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "interviews_all_admin" ON "public"."interviews" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text"))))) WITH CHECK (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "interviews_select_org" ON "public"."interviews" FOR SELECT USING (("organization_id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE ("user_organizations"."user_id" = ("auth"."uid"())::"text"))));



ALTER TABLE "public"."job_sections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_steps" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "job_steps_all_admin" ON "public"."job_steps" USING (("job_id" IN ( SELECT "j"."id"
   FROM "public"."jobs" "j"
  WHERE ("j"."organization_id" IN ( SELECT "uo"."organization_id"
           FROM ("public"."user_organizations" "uo"
             JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
          WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text"))))))) WITH CHECK (("job_id" IN ( SELECT "j"."id"
   FROM "public"."jobs" "j"
  WHERE ("j"."organization_id" IN ( SELECT "uo"."organization_id"
           FROM ("public"."user_organizations" "uo"
             JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
          WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text")))))));



CREATE POLICY "job_steps_select_org" ON "public"."job_steps" FOR SELECT USING (("job_id" IN ( SELECT "j"."id"
   FROM "public"."jobs" "j"
  WHERE ("j"."organization_id" IN ( SELECT "user_organizations"."organization_id"
           FROM "public"."user_organizations"
          WHERE ("user_organizations"."user_id" = ("auth"."uid"())::"text"))))));



ALTER TABLE "public"."jobs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "jobs_all_admin" ON "public"."jobs" USING ((("public"."get_my_role"() = 'admin'::"text") AND ("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids")))) WITH CHECK ((("public"."get_my_role"() = 'admin'::"text") AND ("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids"))));



CREATE POLICY "jobs_select_org" ON "public"."jobs" FOR SELECT USING (("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids")));



ALTER TABLE "public"."leave_balances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."member_permission_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_threads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "messages_insert_authenticated" ON "public"."messages" FOR INSERT WITH CHECK ((("sender_id" = ("auth"."uid"())::"text") AND ("thread_id" IN ( SELECT "public"."get_my_accessible_thread_ids"() AS "get_my_accessible_thread_ids"))));



CREATE POLICY "messages_select_thread_member" ON "public"."messages" FOR SELECT USING (("thread_id" IN ( SELECT "public"."get_my_accessible_thread_ids"() AS "get_my_accessible_thread_ids")));



CREATE POLICY "messages_update_own" ON "public"."messages" FOR UPDATE USING (("sender_id" = ("auth"."uid"())::"text"));



CREATE POLICY "mpg_all_admin" ON "public"."member_permission_groups" USING (("group_id" IN ( SELECT "permission_groups"."id"
   FROM "public"."permission_groups"
  WHERE (("public"."get_my_role"() = 'admin'::"text") AND ("permission_groups"."organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids")))))) WITH CHECK (("group_id" IN ( SELECT "permission_groups"."id"
   FROM "public"."permission_groups"
  WHERE (("public"."get_my_role"() = 'admin'::"text") AND ("permission_groups"."organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids"))))));



CREATE POLICY "mpg_select_own" ON "public"."member_permission_groups" FOR SELECT USING (("user_id" = ("auth"."uid"())::"text"));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_delete" ON "public"."notifications" FOR DELETE USING ((("user_id" = ("auth"."uid"())::"text") OR ("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = ANY (ARRAY['admin'::"text", 'hr_manager'::"text"])))))));



CREATE POLICY "notifications_insert_admin" ON "public"."notifications" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = ANY (ARRAY['admin'::"text", 'hr_manager'::"text"]))))));



CREATE POLICY "notifications_select_own" ON "public"."notifications" FOR SELECT USING (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "notifications_update_own" ON "public"."notifications" FOR UPDATE USING (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "org_all_admin" ON "public"."organizations" USING (("id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text"))))) WITH CHECK (("id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "org_manage_anchors" ON "public"."evaluation_anchors" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."evaluation_criteria" "ec"
     JOIN "public"."evaluation_templates" "et" ON (("et"."id" = "ec"."template_id")))
  WHERE (("ec"."id" = "evaluation_anchors"."criterion_id") AND ("et"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids"))))));



CREATE POLICY "org_manage_assignments" ON "public"."evaluation_assignments" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."evaluation_cycles" "ec"
  WHERE (("ec"."id" = "evaluation_assignments"."cycle_id") AND ("ec"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids"))))));



CREATE POLICY "org_manage_cycles" ON "public"."evaluation_cycles" TO "authenticated" USING (("organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")));



CREATE POLICY "org_read_assignments" ON "public"."evaluation_assignments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."evaluation_cycles" "ec"
  WHERE (("ec"."id" = "evaluation_assignments"."cycle_id") AND ("ec"."organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids"))))));



CREATE POLICY "org_read_cycles" ON "public"."evaluation_cycles" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")));



CREATE POLICY "org_select_member" ON "public"."organizations" FOR SELECT USING (("id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE ("user_organizations"."user_id" = ("auth"."uid"())::"text"))));



ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organizations_select_hr1_admin" ON "public"."organizations" FOR SELECT USING (("public"."get_my_role"() = 'hr1_admin'::"text"));



ALTER TABLE "public"."page_sections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "page_sections_delete_admin" ON "public"."page_sections" FOR DELETE USING (("tab_id" IN ( SELECT "pt"."id"
   FROM "public"."page_tabs" "pt"
  WHERE ("pt"."organization_id" IN ( SELECT "uo"."organization_id"
           FROM ("public"."user_organizations" "uo"
             JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
          WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = ANY (ARRAY['admin'::"text", 'hr_manager'::"text"]))))))));



CREATE POLICY "page_sections_insert_admin" ON "public"."page_sections" FOR INSERT WITH CHECK (("tab_id" IN ( SELECT "pt"."id"
   FROM "public"."page_tabs" "pt"
  WHERE ("pt"."organization_id" IN ( SELECT "uo"."organization_id"
           FROM ("public"."user_organizations" "uo"
             JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
          WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = ANY (ARRAY['admin'::"text", 'hr_manager'::"text"]))))))));



CREATE POLICY "page_sections_select" ON "public"."page_sections" FOR SELECT USING (("tab_id" IN ( SELECT "pt"."id"
   FROM "public"."page_tabs" "pt"
  WHERE ("pt"."organization_id" IN ( SELECT "user_organizations"."organization_id"
           FROM "public"."user_organizations"
          WHERE ("user_organizations"."user_id" = ("auth"."uid"())::"text"))))));



CREATE POLICY "page_sections_update_admin" ON "public"."page_sections" FOR UPDATE USING (("tab_id" IN ( SELECT "pt"."id"
   FROM "public"."page_tabs" "pt"
  WHERE ("pt"."organization_id" IN ( SELECT "uo"."organization_id"
           FROM ("public"."user_organizations" "uo"
             JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
          WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = ANY (ARRAY['admin'::"text", 'hr_manager'::"text"]))))))));



ALTER TABLE "public"."page_tabs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "page_tabs_delete_admin" ON "public"."page_tabs" FOR DELETE USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = ANY (ARRAY['admin'::"text", 'hr_manager'::"text"]))))));



CREATE POLICY "page_tabs_insert_admin" ON "public"."page_tabs" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = ANY (ARRAY['admin'::"text", 'hr_manager'::"text"]))))));



CREATE POLICY "page_tabs_select" ON "public"."page_tabs" FOR SELECT USING (("organization_id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE ("user_organizations"."user_id" = ("auth"."uid"())::"text"))));



CREATE POLICY "page_tabs_update_admin" ON "public"."page_tabs" FOR UPDATE USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = ANY (ARRAY['admin'::"text", 'hr_manager'::"text"]))))));



ALTER TABLE "public"."payslips" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."permission_group_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."permission_groups" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pg_all_admin" ON "public"."permission_groups" USING ((("public"."get_my_role"() = 'admin'::"text") AND ("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids")))) WITH CHECK ((("public"."get_my_role"() = 'admin'::"text") AND ("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids"))));



CREATE POLICY "pg_select_org" ON "public"."permission_groups" FOR SELECT USING (("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids")));



CREATE POLICY "pgp_all_admin" ON "public"."permission_group_permissions" USING (("group_id" IN ( SELECT "permission_groups"."id"
   FROM "public"."permission_groups"
  WHERE (("public"."get_my_role"() = 'admin'::"text") AND ("permission_groups"."organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids")))))) WITH CHECK (("group_id" IN ( SELECT "permission_groups"."id"
   FROM "public"."permission_groups"
  WHERE (("public"."get_my_role"() = 'admin'::"text") AND ("permission_groups"."organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids"))))));



CREATE POLICY "pgp_select_org" ON "public"."permission_group_permissions" FOR SELECT USING (("group_id" IN ( SELECT "permission_groups"."id"
   FROM "public"."permission_groups"
  WHERE ("permission_groups"."organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids")))));



ALTER TABLE "public"."plans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "plans_all_hr1_admin" ON "public"."plans" USING (("public"."get_my_role"() = 'hr1_admin'::"text")) WITH CHECK (("public"."get_my_role"() = 'hr1_admin'::"text"));



ALTER TABLE "public"."positions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "positions_all_admin" ON "public"."positions" USING ((("public"."get_my_role"() = 'admin'::"text") AND ("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids")))) WITH CHECK ((("public"."get_my_role"() = 'admin'::"text") AND ("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids"))));



CREATE POLICY "positions_select_org" ON "public"."positions" FOR SELECT USING (("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids")));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_all_admin" ON "public"."profiles" USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "profiles_select_hr1_admin" ON "public"."profiles" FOR SELECT USING (("public"."get_my_role"() = 'hr1_admin'::"text"));



CREATE POLICY "profiles_select_org_member" ON "public"."profiles" FOR SELECT USING (("id" IN ( SELECT "uo"."user_id"
   FROM "public"."user_organizations" "uo"
  WHERE ("uo"."organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids")))));



CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT USING (("id" = ("auth"."uid"())::"text"));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE USING (("id" = ("auth"."uid"())::"text"));



ALTER TABLE "public"."project_team_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "project_team_members_all_admin" ON "public"."project_team_members" USING (("team_id" IN ( SELECT "pt"."id"
   FROM ("public"."project_teams" "pt"
     JOIN "public"."projects" "pr" ON (("pr"."id" = "pt"."project_id")))
  WHERE ("pr"."organization_id" IN ( SELECT "uo"."organization_id"
           FROM ("public"."user_organizations" "uo"
             JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
          WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text"))))))) WITH CHECK (("team_id" IN ( SELECT "pt"."id"
   FROM ("public"."project_teams" "pt"
     JOIN "public"."projects" "pr" ON (("pr"."id" = "pt"."project_id")))
  WHERE ("pr"."organization_id" IN ( SELECT "uo"."organization_id"
           FROM ("public"."user_organizations" "uo"
             JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
          WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text")))))));



CREATE POLICY "project_team_members_delete" ON "public"."project_team_members" FOR DELETE USING (true);



CREATE POLICY "project_team_members_insert" ON "public"."project_team_members" FOR INSERT WITH CHECK (true);



CREATE POLICY "project_team_members_select" ON "public"."project_team_members" FOR SELECT USING (true);



CREATE POLICY "project_team_members_select_org" ON "public"."project_team_members" FOR SELECT USING (("team_id" IN ( SELECT "pt"."id"
   FROM ("public"."project_teams" "pt"
     JOIN "public"."projects" "pr" ON (("pr"."id" = "pt"."project_id")))
  WHERE ("pr"."organization_id" IN ( SELECT "user_organizations"."organization_id"
           FROM "public"."user_organizations"
          WHERE ("user_organizations"."user_id" = ("auth"."uid"())::"text"))))));



CREATE POLICY "project_team_members_update" ON "public"."project_team_members" FOR UPDATE USING (true);



ALTER TABLE "public"."project_teams" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "project_teams_all_admin" ON "public"."project_teams" USING (("project_id" IN ( SELECT "pr"."id"
   FROM "public"."projects" "pr"
  WHERE ("pr"."organization_id" IN ( SELECT "uo"."organization_id"
           FROM ("public"."user_organizations" "uo"
             JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
          WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text"))))))) WITH CHECK (("project_id" IN ( SELECT "pr"."id"
   FROM "public"."projects" "pr"
  WHERE ("pr"."organization_id" IN ( SELECT "uo"."organization_id"
           FROM ("public"."user_organizations" "uo"
             JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
          WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text")))))));



CREATE POLICY "project_teams_delete" ON "public"."project_teams" FOR DELETE USING (true);



CREATE POLICY "project_teams_insert" ON "public"."project_teams" FOR INSERT WITH CHECK (true);



CREATE POLICY "project_teams_select" ON "public"."project_teams" FOR SELECT USING (true);



CREATE POLICY "project_teams_select_org" ON "public"."project_teams" FOR SELECT USING (("project_id" IN ( SELECT "pr"."id"
   FROM "public"."projects" "pr"
  WHERE ("pr"."organization_id" IN ( SELECT "user_organizations"."organization_id"
           FROM "public"."user_organizations"
          WHERE ("user_organizations"."user_id" = ("auth"."uid"())::"text"))))));



CREATE POLICY "project_teams_update" ON "public"."project_teams" FOR UPDATE USING (true);



ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "projects_all_admin" ON "public"."projects" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text"))))) WITH CHECK (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "projects_delete" ON "public"."projects" FOR DELETE USING (true);



CREATE POLICY "projects_insert" ON "public"."projects" FOR INSERT WITH CHECK (true);



CREATE POLICY "projects_select" ON "public"."projects" FOR SELECT USING (true);



CREATE POLICY "projects_select_org" ON "public"."projects" FOR SELECT USING (("organization_id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE ("user_organizations"."user_id" = ("auth"."uid"())::"text"))));



CREATE POLICY "projects_update" ON "public"."projects" FOR UPDATE USING (true);



CREATE POLICY "public_read_open_job_sections" ON "public"."job_sections" FOR SELECT TO "anon" USING (("job_id" IN ( SELECT "jobs"."id"
   FROM "public"."jobs"
  WHERE ("jobs"."status" = 'open'::"text"))));



CREATE POLICY "public_read_open_jobs" ON "public"."jobs" FOR SELECT TO "anon" USING (("status" = 'open'::"text"));



ALTER TABLE "public"."pulse_survey_answers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pulse_survey_questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pulse_survey_responses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pulse_surveys" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_notification_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "push_notification_logs_select_admin" ON "public"."push_notification_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text")))));



ALTER TABLE "public"."push_tokens" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "push_tokens_delete_own" ON "public"."push_tokens" FOR DELETE USING (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "push_tokens_insert_own" ON "public"."push_tokens" FOR INSERT WITH CHECK (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "push_tokens_select_own" ON "public"."push_tokens" FOR SELECT USING (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "push_tokens_update_own" ON "public"."push_tokens" FOR UPDATE USING (("user_id" = ("auth"."uid"())::"text"));



ALTER TABLE "public"."recruiting_targets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "recruiting_targets_all_admin" ON "public"."recruiting_targets" USING ((("public"."get_my_role"() = 'admin'::"text") AND ("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids")))) WITH CHECK ((("public"."get_my_role"() = 'admin'::"text") AND ("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids"))));



CREATE POLICY "recruiting_targets_select_org" ON "public"."recruiting_targets" FOR SELECT USING (("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids")));



ALTER TABLE "public"."selection_step_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shift_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shift_schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."skill_masters" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sst_delete_admin" ON "public"."selection_step_templates" FOR DELETE USING ((("public"."get_my_role"() = 'admin'::"text") AND ("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids"))));



CREATE POLICY "sst_insert_admin" ON "public"."selection_step_templates" FOR INSERT WITH CHECK ((("public"."get_my_role"() = 'admin'::"text") AND ("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids"))));



CREATE POLICY "sst_select_org" ON "public"."selection_step_templates" FOR SELECT USING (("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids")));



CREATE POLICY "sst_update_admin" ON "public"."selection_step_templates" FOR UPDATE USING ((("public"."get_my_role"() = 'admin'::"text") AND ("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids")))) WITH CHECK ((("public"."get_my_role"() = 'admin'::"text") AND ("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids"))));



ALTER TABLE "public"."task_assignees" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "task_assignees_access" ON "public"."task_assignees" USING (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."organization_id" IN ( SELECT "user_organizations"."organization_id"
           FROM "public"."user_organizations"
          WHERE ("user_organizations"."user_id" = ("auth"."uid"())::"text"))))));



CREATE POLICY "task_assignees_all_admin" ON "public"."task_assignees" USING (("task_id" IN ( SELECT "t"."id"
   FROM "public"."tasks" "t"
  WHERE ("t"."organization_id" IN ( SELECT "uo"."organization_id"
           FROM ("public"."user_organizations" "uo"
             JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
          WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text"))))))) WITH CHECK (("task_id" IN ( SELECT "t"."id"
   FROM "public"."tasks" "t"
  WHERE ("t"."organization_id" IN ( SELECT "uo"."organization_id"
           FROM ("public"."user_organizations" "uo"
             JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
          WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text")))))));



CREATE POLICY "task_assignees_select_org" ON "public"."task_assignees" FOR SELECT USING (("task_id" IN ( SELECT "t"."id"
   FROM "public"."tasks" "t"
  WHERE ("t"."organization_id" IN ( SELECT "user_organizations"."organization_id"
           FROM "public"."user_organizations"
          WHERE ("user_organizations"."user_id" = ("auth"."uid"())::"text"))))));



CREATE POLICY "task_assignees_select_own" ON "public"."task_assignees" FOR SELECT USING (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "task_assignees_update_own" ON "public"."task_assignees" FOR UPDATE USING (("user_id" = ("auth"."uid"())::"text"));



ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tasks_all_admin" ON "public"."tasks" USING ((("public"."get_my_role"() = 'admin'::"text") AND ("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids")))) WITH CHECK ((("public"."get_my_role"() = 'admin'::"text") AND ("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids"))));



CREATE POLICY "tasks_org_access" ON "public"."tasks" USING (("organization_id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE ("user_organizations"."user_id" = ("auth"."uid"())::"text"))));



CREATE POLICY "tasks_select_org" ON "public"."tasks" FOR SELECT USING (("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids")));



CREATE POLICY "threads_all_admin" ON "public"."message_threads" USING ((("public"."get_my_role"() = 'admin'::"text") AND ("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids")))) WITH CHECK ((("public"."get_my_role"() = 'admin'::"text") AND ("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids"))));



CREATE POLICY "threads_select" ON "public"."message_threads" FOR SELECT USING (("id" IN ( SELECT "public"."get_my_accessible_thread_ids"() AS "get_my_accessible_thread_ids")));



CREATE POLICY "user_org_all_admin" ON "public"."user_organizations" USING (("public"."get_my_role"() = 'admin'::"text")) WITH CHECK (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "user_org_select_own" ON "public"."user_organizations" FOR SELECT USING (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "user_org_select_same_org" ON "public"."user_organizations" FOR SELECT USING (("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids")));



ALTER TABLE "public"."user_organizations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_organizations_select_hr1_admin" ON "public"."user_organizations" FOR SELECT USING (("public"."get_my_role"() = 'hr1_admin'::"text"));



ALTER TABLE "public"."wiki_pages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "wiki_pages_all_admin" ON "public"."wiki_pages" USING ((("public"."get_my_role"() = 'admin'::"text") AND ("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids")))) WITH CHECK ((("public"."get_my_role"() = 'admin'::"text") AND ("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids"))));



CREATE POLICY "wiki_pages_select_org" ON "public"."wiki_pages" FOR SELECT USING ((("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids")) AND ("is_published" = true)));



ALTER TABLE "public"."workflow_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workflow_requests_select_manager" ON "public"."workflow_requests" FOR SELECT USING ((("public"."get_my_role"() = ANY (ARRAY['manager'::"text", 'approver'::"text"])) AND ("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids"))));



CREATE POLICY "workflow_requests_update_manager" ON "public"."workflow_requests" FOR UPDATE USING ((("public"."get_my_role"() = ANY (ARRAY['manager'::"text", 'approver'::"text"])) AND ("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids"))));



ALTER TABLE "public"."workflow_rules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workflow_rules_all_admin" ON "public"."workflow_rules" USING ((("public"."get_my_role"() = 'admin'::"text") AND ("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids")))) WITH CHECK ((("public"."get_my_role"() = 'admin'::"text") AND ("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids"))));



CREATE POLICY "workflow_rules_select_org" ON "public"."workflow_rules" FOR SELECT USING (("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids")));



ALTER TABLE "public"."workflow_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workflow_templates_admin" ON "public"."workflow_templates" USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "workflow_templates_select" ON "public"."workflow_templates" FOR SELECT USING (("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids")));



CREATE POLICY "スキルマスタを閲覧" ON "public"."skill_masters" FOR SELECT USING ((("organization_id" IS NULL) OR ("organization_id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE ("user_organizations"."user_id" = ("auth"."uid"())::"text")))));



CREATE POLICY "フォームフィールドを閲覧" ON "public"."form_fields" FOR SELECT USING (("form_id" IN ( SELECT "cf"."id"
   FROM ("public"."custom_forms" "cf"
     JOIN "public"."user_organizations" "uo" ON (("uo"."organization_id" = "cf"."organization_id")))
  WHERE ("uo"."user_id" = ("auth"."uid"())::"text"))));



CREATE POLICY "同一組織メンバーがフォームを閲覧" ON "public"."custom_forms" FOR SELECT USING (("organization_id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE ("user_organizations"."user_id" = ("auth"."uid"())::"text"))));



CREATE POLICY "同一組織内のシフト希望を閲覧" ON "public"."shift_requests" FOR SELECT USING (("organization_id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE ("user_organizations"."user_id" = ("auth"."uid"())::"text"))));



CREATE POLICY "同一組織内のスキルを閲覧" ON "public"."employee_skills" FOR SELECT USING (("organization_id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE ("user_organizations"."user_id" = ("auth"."uid"())::"text"))));



CREATE POLICY "同一組織内の確定シフトを閲覧" ON "public"."shift_schedules" FOR SELECT USING (("organization_id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE ("user_organizations"."user_id" = ("auth"."uid"())::"text"))));



CREATE POLICY "同一組織内の資格を閲覧" ON "public"."employee_certifications" FOR SELECT USING (("organization_id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE ("user_organizations"."user_id" = ("auth"."uid"())::"text"))));



CREATE POLICY "管理者がフィールドを管理" ON "public"."form_fields" USING (("form_id" IN ( SELECT "cf"."id"
   FROM (("public"."custom_forms" "cf"
     JOIN "public"."user_organizations" "uo" ON (("uo"."organization_id" = "cf"."organization_id")))
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text"))))) WITH CHECK (("form_id" IN ( SELECT "cf"."id"
   FROM (("public"."custom_forms" "cf"
     JOIN "public"."user_organizations" "uo" ON (("uo"."organization_id" = "cf"."organization_id")))
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "管理者がフォームを管理" ON "public"."custom_forms" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text"))))) WITH CHECK (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "管理者がリクエストを更新" ON "public"."service_requests" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "管理者が全リクエストを閲覧" ON "public"."service_requests" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "管理者が回答を閲覧" ON "public"."form_responses" FOR SELECT USING (("form_id" IN ( SELECT "cf"."id"
   FROM (("public"."custom_forms" "cf"
     JOIN "public"."user_organizations" "uo" ON (("uo"."organization_id" = "cf"."organization_id")))
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "管理者が監査ログを閲覧" ON "public"."audit_logs" FOR SELECT USING ((("public"."get_my_role"() = 'admin'::"text") AND ("organization_id" IN ( SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids"))));



CREATE POLICY "管理者が確定シフトを管理" ON "public"."shift_schedules" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text"))))) WITH CHECK (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "管理者は組織内の残日数を管理" ON "public"."leave_balances" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text"))))) WITH CHECK (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "管理者は組織内の申請を更新" ON "public"."workflow_requests" FOR UPDATE USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text"))))) WITH CHECK (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "管理者は組織内の申請を閲覧" ON "public"."workflow_requests" FOR SELECT USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "管理者は組織内の給与明細を管理" ON "public"."payslips" USING (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text"))))) WITH CHECK (("organization_id" IN ( SELECT "uo"."organization_id"
   FROM ("public"."user_organizations" "uo"
     JOIN "public"."profiles" "p" ON (("p"."id" = "uo"."user_id")))
  WHERE (("uo"."user_id" = ("auth"."uid"())::"text") AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "自分のTODOを管理" ON "public"."applicant_todos" USING (("user_id" = ("auth"."uid"())::"text")) WITH CHECK (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "自分のTODOを閲覧" ON "public"."applicant_todos" FOR SELECT USING (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "自分のシフト希望を管理" ON "public"."shift_requests" USING (("user_id" = ("auth"."uid"())::"text")) WITH CHECK (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "自分のスキルを管理" ON "public"."employee_skills" USING (("user_id" = ("auth"."uid"())::"text")) WITH CHECK (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "自分のリクエストを作成" ON "public"."service_requests" FOR INSERT WITH CHECK (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "自分のリクエストを閲覧" ON "public"."service_requests" FOR SELECT USING (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "自分の回答を送信" ON "public"."form_responses" FOR INSERT WITH CHECK (("applicant_id" = ("auth"."uid"())::"text"));



CREATE POLICY "自分の回答を閲覧" ON "public"."form_responses" FOR SELECT USING (("applicant_id" = ("auth"."uid"())::"text"));



CREATE POLICY "自分の未承認申請を取消" ON "public"."workflow_requests" FOR UPDATE USING ((("user_id" = ("auth"."uid"())::"text") AND ("status" = 'pending'::"text"))) WITH CHECK (("status" = 'cancelled'::"text"));



CREATE POLICY "自分の残日数を閲覧" ON "public"."leave_balances" FOR SELECT USING (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "自分の申請を作成" ON "public"."workflow_requests" FOR INSERT WITH CHECK (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "自分の申請を閲覧" ON "public"."workflow_requests" FOR SELECT USING (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "自分の給与明細を閲覧" ON "public"."payslips" FOR SELECT USING (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "自分の資格を管理" ON "public"."employee_certifications" USING (("user_id" = ("auth"."uid"())::"text")) WITH CHECK (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "自組織のスキルマスタを削除" ON "public"."skill_masters" FOR DELETE USING ((("organization_id" IS NOT NULL) AND ("organization_id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE ("user_organizations"."user_id" = ("auth"."uid"())::"text")))));



CREATE POLICY "自組織のスキルマスタを更新" ON "public"."skill_masters" FOR UPDATE USING ((("organization_id" IS NOT NULL) AND ("organization_id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE ("user_organizations"."user_id" = ("auth"."uid"())::"text")))));



CREATE POLICY "自組織のスキルマスタを追加" ON "public"."skill_masters" FOR INSERT WITH CHECK ((("organization_id" IS NOT NULL) AND ("organization_id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE ("user_organizations"."user_id" = ("auth"."uid"())::"text")))));



CREATE POLICY "自組織の資格マスタを削除" ON "public"."certification_masters" FOR DELETE USING ((("organization_id" IS NOT NULL) AND ("organization_id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE ("user_organizations"."user_id" = ("auth"."uid"())::"text")))));



CREATE POLICY "自組織の資格マスタを更新" ON "public"."certification_masters" FOR UPDATE USING ((("organization_id" IS NOT NULL) AND ("organization_id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE ("user_organizations"."user_id" = ("auth"."uid"())::"text")))));



CREATE POLICY "自組織の資格マスタを管理" ON "public"."certification_masters" FOR INSERT WITH CHECK ((("organization_id" IS NOT NULL) AND ("organization_id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE ("user_organizations"."user_id" = ("auth"."uid"())::"text")))));



CREATE POLICY "資格マスタを閲覧" ON "public"."certification_masters" FOR SELECT USING ((("organization_id" IS NULL) OR ("organization_id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE ("user_organizations"."user_id" = ("auth"."uid"())::"text")))));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."applicant_complete_step"("p_step_id" "uuid", "p_application_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."applicant_complete_step"("p_step_id" "uuid", "p_application_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."applicant_complete_step"("p_step_id" "uuid", "p_application_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."applicant_confirm_interview_slot"("p_slot_id" "uuid", "p_application_id" "uuid", "p_step_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."applicant_confirm_interview_slot"("p_slot_id" "uuid", "p_application_id" "uuid", "p_step_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."applicant_confirm_interview_slot"("p_slot_id" "uuid", "p_application_id" "uuid", "p_step_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."approve_leave_request"("p_request_id" "uuid", "p_reviewer_id" "text", "p_comment" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_leave_request"("p_request_id" "uuid", "p_reviewer_id" "text", "p_comment" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_leave_request"("p_request_id" "uuid", "p_reviewer_id" "text", "p_comment" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."archive_old_audit_logs"("retention_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."archive_old_audit_logs"("retention_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_old_audit_logs"("retention_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_approve_workflow"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_approve_workflow"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_approve_workflow"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_grant_leave_with_carry_over"("p_organization_id" "text", "p_fiscal_year" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."auto_grant_leave_with_carry_over"("p_organization_id" "text", "p_fiscal_year" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_grant_leave_with_carry_over"("p_organization_id" "text", "p_fiscal_year" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_leave_carry_over"("p_organization_id" "text", "p_fiscal_year" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_leave_carry_over"("p_organization_id" "text", "p_fiscal_year" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_leave_carry_over"("p_organization_id" "text", "p_fiscal_year" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."check_compliance_alerts"("p_organization_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_compliance_alerts"("p_organization_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_compliance_alerts"("p_organization_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."complete_todo_on_survey_response"() TO "anon";
GRANT ALL ON FUNCTION "public"."complete_todo_on_survey_response"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_todo_on_survey_response"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_department_channels"("p_organization_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_department_channels"("p_organization_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_department_channels"("p_organization_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_evaluation_template"("p_organization_id" "text", "p_title" "text", "p_description" "text", "p_target" "text", "p_evaluation_type" "text", "p_anonymity_mode" "text", "p_criteria" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_evaluation_template"("p_organization_id" "text", "p_title" "text", "p_description" "text", "p_target" "text", "p_evaluation_type" "text", "p_anonymity_mode" "text", "p_criteria" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_evaluation_template"("p_organization_id" "text", "p_title" "text", "p_description" "text", "p_target" "text", "p_evaluation_type" "text", "p_anonymity_mode" "text", "p_criteria" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_survey_todos_and_notifications"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_survey_todos_and_notifications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_survey_todos_and_notifications"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_with_org"("p_user_id" "text", "p_email" "text", "p_display_name" "text", "p_role" "text", "p_organization_id" "text", "p_position" "text", "p_hiring_type" "text", "p_graduation_year" integer, "p_department_ids" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_with_org"("p_user_id" "text", "p_email" "text", "p_display_name" "text", "p_role" "text", "p_organization_id" "text", "p_position" "text", "p_hiring_type" "text", "p_graduation_year" integer, "p_department_ids" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_with_org"("p_user_id" "text", "p_email" "text", "p_display_name" "text", "p_role" "text", "p_organization_id" "text", "p_position" "text", "p_hiring_type" "text", "p_graduation_year" integer, "p_department_ids" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_with_org"("p_user_id" "text", "p_email" "text", "p_display_name" "text", "p_role" "text", "p_organization_id" "text", "p_position" "text", "p_department_ids" "uuid"[], "p_name_kana" "text", "p_phone" "text", "p_hire_date" "date", "p_birth_date" "date", "p_gender" "text", "p_current_postal_code" "text", "p_current_prefecture" "text", "p_current_city" "text", "p_current_street_address" "text", "p_current_building" "text", "p_registered_postal_code" "text", "p_registered_prefecture" "text", "p_registered_city" "text", "p_registered_street_address" "text", "p_registered_building" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_with_org"("p_user_id" "text", "p_email" "text", "p_display_name" "text", "p_role" "text", "p_organization_id" "text", "p_position" "text", "p_department_ids" "uuid"[], "p_name_kana" "text", "p_phone" "text", "p_hire_date" "date", "p_birth_date" "date", "p_gender" "text", "p_current_postal_code" "text", "p_current_prefecture" "text", "p_current_city" "text", "p_current_street_address" "text", "p_current_building" "text", "p_registered_postal_code" "text", "p_registered_prefecture" "text", "p_registered_city" "text", "p_registered_street_address" "text", "p_registered_building" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_with_org"("p_user_id" "text", "p_email" "text", "p_display_name" "text", "p_role" "text", "p_organization_id" "text", "p_position" "text", "p_department_ids" "uuid"[], "p_name_kana" "text", "p_phone" "text", "p_hire_date" "date", "p_birth_date" "date", "p_gender" "text", "p_current_postal_code" "text", "p_current_prefecture" "text", "p_current_city" "text", "p_current_street_address" "text", "p_current_building" "text", "p_registered_postal_code" "text", "p_registered_prefecture" "text", "p_registered_city" "text", "p_registered_street_address" "text", "p_registered_building" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_with_org"("p_user_id" "text", "p_email" "text", "p_display_name" "text", "p_role" "text", "p_organization_id" "text", "p_position" "text", "p_department_ids" "uuid"[], "p_name_kana" "text", "p_phone" "text", "p_hire_date" "date", "p_birth_date" "date", "p_gender" "text", "p_current_postal_code" "text", "p_current_prefecture" "text", "p_current_city" "text", "p_current_street_address" "text", "p_current_building" "text", "p_registered_postal_code" "text", "p_registered_prefecture" "text", "p_registered_city" "text", "p_registered_street_address" "text", "p_registered_building" "text", "p_hiring_type" "text", "p_graduation_year" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_with_org"("p_user_id" "text", "p_email" "text", "p_display_name" "text", "p_role" "text", "p_organization_id" "text", "p_position" "text", "p_department_ids" "uuid"[], "p_name_kana" "text", "p_phone" "text", "p_hire_date" "date", "p_birth_date" "date", "p_gender" "text", "p_current_postal_code" "text", "p_current_prefecture" "text", "p_current_city" "text", "p_current_street_address" "text", "p_current_building" "text", "p_registered_postal_code" "text", "p_registered_prefecture" "text", "p_registered_city" "text", "p_registered_street_address" "text", "p_registered_building" "text", "p_hiring_type" "text", "p_graduation_year" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_with_org"("p_user_id" "text", "p_email" "text", "p_display_name" "text", "p_role" "text", "p_organization_id" "text", "p_position" "text", "p_department_ids" "uuid"[], "p_name_kana" "text", "p_phone" "text", "p_hire_date" "date", "p_birth_date" "date", "p_gender" "text", "p_current_postal_code" "text", "p_current_prefecture" "text", "p_current_city" "text", "p_current_street_address" "text", "p_current_building" "text", "p_registered_postal_code" "text", "p_registered_prefecture" "text", "p_registered_city" "text", "p_registered_street_address" "text", "p_registered_building" "text", "p_hiring_type" "text", "p_graduation_year" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_channel_members"("p_thread_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_channel_members"("p_thread_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_channel_members"("p_thread_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_channels_with_details"("p_org_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_channels_with_details"("p_org_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_channels_with_details"("p_org_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_monthly_attendance_summary"("p_organization_id" "text", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_monthly_attendance_summary"("p_organization_id" "text", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_monthly_attendance_summary"("p_organization_id" "text", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_accessible_thread_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_accessible_thread_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_accessible_thread_ids"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_organization_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_organization_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_organization_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_organization_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_organization_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_organization_ids"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_permissions"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_permissions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_permissions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_server_now"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_server_now"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_server_now"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_threads_with_details"("p_org_id" "text", "p_user_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_threads_with_details"("p_org_id" "text", "p_user_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_threads_with_details"("p_org_id" "text", "p_user_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_permission"("p_resource" "text", "p_action" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_permission"("p_resource" "text", "p_action" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_permission"("p_resource" "text", "p_action" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_audit_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_audit_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_audit_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"() TO "anon";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_notifications_read"("p_notification_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."mark_notifications_read"("p_notification_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_notifications_read"("p_notification_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_admins_on_workflow_request"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_admins_on_workflow_request"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_admins_on_workflow_request"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_application_status_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_application_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_application_status_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_application_step_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_application_step_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_application_step_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reorder_job_steps"("p_job_id" "uuid", "p_step_ids" "uuid"[], "p_step_orders" integer[]) TO "anon";
GRANT ALL ON FUNCTION "public"."reorder_job_steps"("p_job_id" "uuid", "p_step_ids" "uuid"[], "p_step_orders" integer[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."reorder_job_steps"("p_job_id" "uuid", "p_step_ids" "uuid"[], "p_step_orders" integer[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."seed_default_permission_groups"() TO "anon";
GRANT ALL ON FUNCTION "public"."seed_default_permission_groups"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_default_permission_groups"() TO "service_role";



GRANT ALL ON FUNCTION "public"."send_push_on_notification_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."send_push_on_notification_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_push_on_notification_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."signup_setup"("p_email" "text", "p_display_name" "text", "p_phone" "text", "p_company_name" "text", "p_industry" "text", "p_employee_count" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."signup_setup"("p_email" "text", "p_display_name" "text", "p_phone" "text", "p_company_name" "text", "p_industry" "text", "p_employee_count" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."signup_setup"("p_email" "text", "p_display_name" "text", "p_phone" "text", "p_company_name" "text", "p_industry" "text", "p_employee_count" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."signup_setup"("p_email" "text", "p_display_name" "text", "p_phone" "text", "p_company_name" "text", "p_industry" "text", "p_employee_count" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."submit_ad_hoc_evaluation"("p_evaluation_id" "uuid", "p_organization_id" "text", "p_template_id" "uuid", "p_target_user_id" "text", "p_application_id" "uuid", "p_status" "text", "p_overall_comment" "text", "p_scores" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_ad_hoc_evaluation"("p_evaluation_id" "uuid", "p_organization_id" "text", "p_template_id" "uuid", "p_target_user_id" "text", "p_application_id" "uuid", "p_status" "text", "p_overall_comment" "text", "p_scores" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_ad_hoc_evaluation"("p_evaluation_id" "uuid", "p_organization_id" "text", "p_template_id" "uuid", "p_target_user_id" "text", "p_application_id" "uuid", "p_status" "text", "p_overall_comment" "text", "p_scores" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."submit_survey_response"("p_survey_id" "text", "p_answers" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_survey_response"("p_survey_id" "text", "p_answers" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_survey_response"("p_survey_id" "text", "p_answers" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_selection_step_templates_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_selection_step_templates_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_selection_step_templates_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_pulse_survey_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_pulse_survey_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_pulse_survey_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_thread_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_thread_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_thread_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_push_token"("p_token" "text", "p_platform" "text", "p_app_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_push_token"("p_token" "text", "p_platform" "text", "p_app_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_push_token"("p_token" "text", "p_platform" "text", "p_app_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_org_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."user_org_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_org_ids"() TO "service_role";



GRANT ALL ON TABLE "public"."activity_logs" TO "anon";
GRANT ALL ON TABLE "public"."activity_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_logs" TO "service_role";



GRANT ALL ON TABLE "public"."announcements" TO "anon";
GRANT ALL ON TABLE "public"."announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."announcements" TO "service_role";



GRANT ALL ON TABLE "public"."applicant_todos" TO "anon";
GRANT ALL ON TABLE "public"."applicant_todos" TO "authenticated";
GRANT ALL ON TABLE "public"."applicant_todos" TO "service_role";



GRANT ALL ON TABLE "public"."application_steps" TO "anon";
GRANT ALL ON TABLE "public"."application_steps" TO "authenticated";
GRANT ALL ON TABLE "public"."application_steps" TO "service_role";



GRANT ALL ON TABLE "public"."applications" TO "anon";
GRANT ALL ON TABLE "public"."applications" TO "authenticated";
GRANT ALL ON TABLE "public"."applications" TO "service_role";



GRANT ALL ON TABLE "public"."attendance_approvers" TO "anon";
GRANT ALL ON TABLE "public"."attendance_approvers" TO "authenticated";
GRANT ALL ON TABLE "public"."attendance_approvers" TO "service_role";



GRANT ALL ON TABLE "public"."attendance_corrections" TO "anon";
GRANT ALL ON TABLE "public"."attendance_corrections" TO "authenticated";
GRANT ALL ON TABLE "public"."attendance_corrections" TO "service_role";



GRANT ALL ON TABLE "public"."attendance_punches" TO "anon";
GRANT ALL ON TABLE "public"."attendance_punches" TO "authenticated";
GRANT ALL ON TABLE "public"."attendance_punches" TO "service_role";



GRANT ALL ON TABLE "public"."attendance_records" TO "anon";
GRANT ALL ON TABLE "public"."attendance_records" TO "authenticated";
GRANT ALL ON TABLE "public"."attendance_records" TO "service_role";



GRANT ALL ON TABLE "public"."attendance_settings" TO "anon";
GRANT ALL ON TABLE "public"."attendance_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."attendance_settings" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs_archive" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs_archive" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs_archive" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs_errors" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs_errors" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs_errors" TO "service_role";



GRANT ALL ON SEQUENCE "public"."audit_logs_sequence_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."audit_logs_sequence_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."audit_logs_sequence_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."bc_activities" TO "anon";
GRANT ALL ON TABLE "public"."bc_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."bc_activities" TO "service_role";



GRANT ALL ON TABLE "public"."bc_cards" TO "anon";
GRANT ALL ON TABLE "public"."bc_cards" TO "authenticated";
GRANT ALL ON TABLE "public"."bc_cards" TO "service_role";



GRANT ALL ON TABLE "public"."bc_companies" TO "anon";
GRANT ALL ON TABLE "public"."bc_companies" TO "authenticated";
GRANT ALL ON TABLE "public"."bc_companies" TO "service_role";



GRANT ALL ON TABLE "public"."bc_contacts" TO "anon";
GRANT ALL ON TABLE "public"."bc_contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."bc_contacts" TO "service_role";



GRANT ALL ON TABLE "public"."bc_deal_contacts" TO "anon";
GRANT ALL ON TABLE "public"."bc_deal_contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."bc_deal_contacts" TO "service_role";



GRANT ALL ON TABLE "public"."bc_deals" TO "anon";
GRANT ALL ON TABLE "public"."bc_deals" TO "authenticated";
GRANT ALL ON TABLE "public"."bc_deals" TO "service_role";



GRANT ALL ON TABLE "public"."bc_leads" TO "anon";
GRANT ALL ON TABLE "public"."bc_leads" TO "authenticated";
GRANT ALL ON TABLE "public"."bc_leads" TO "service_role";



GRANT ALL ON TABLE "public"."bc_quote_items" TO "anon";
GRANT ALL ON TABLE "public"."bc_quote_items" TO "authenticated";
GRANT ALL ON TABLE "public"."bc_quote_items" TO "service_role";



GRANT ALL ON TABLE "public"."bc_quotes" TO "anon";
GRANT ALL ON TABLE "public"."bc_quotes" TO "authenticated";
GRANT ALL ON TABLE "public"."bc_quotes" TO "service_role";



GRANT ALL ON TABLE "public"."bc_todos" TO "anon";
GRANT ALL ON TABLE "public"."bc_todos" TO "authenticated";
GRANT ALL ON TABLE "public"."bc_todos" TO "service_role";



GRANT ALL ON TABLE "public"."calendar_events" TO "anon";
GRANT ALL ON TABLE "public"."calendar_events" TO "authenticated";
GRANT ALL ON TABLE "public"."calendar_events" TO "service_role";



GRANT ALL ON TABLE "public"."certification_masters" TO "anon";
GRANT ALL ON TABLE "public"."certification_masters" TO "authenticated";
GRANT ALL ON TABLE "public"."certification_masters" TO "service_role";



GRANT ALL ON TABLE "public"."channel_members" TO "anon";
GRANT ALL ON TABLE "public"."channel_members" TO "authenticated";
GRANT ALL ON TABLE "public"."channel_members" TO "service_role";



GRANT ALL ON TABLE "public"."compliance_alerts" TO "anon";
GRANT ALL ON TABLE "public"."compliance_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."compliance_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."contract_changes" TO "anon";
GRANT ALL ON TABLE "public"."contract_changes" TO "authenticated";
GRANT ALL ON TABLE "public"."contract_changes" TO "service_role";



GRANT ALL ON TABLE "public"."contracts" TO "anon";
GRANT ALL ON TABLE "public"."contracts" TO "authenticated";
GRANT ALL ON TABLE "public"."contracts" TO "service_role";



GRANT ALL ON TABLE "public"."crm_automation_logs" TO "anon";
GRANT ALL ON TABLE "public"."crm_automation_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_automation_logs" TO "service_role";



GRANT ALL ON TABLE "public"."crm_automation_rules" TO "anon";
GRANT ALL ON TABLE "public"."crm_automation_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_automation_rules" TO "service_role";



GRANT ALL ON TABLE "public"."crm_email_templates" TO "anon";
GRANT ALL ON TABLE "public"."crm_email_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_email_templates" TO "service_role";



GRANT ALL ON TABLE "public"."crm_field_definitions" TO "anon";
GRANT ALL ON TABLE "public"."crm_field_definitions" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_field_definitions" TO "service_role";



GRANT ALL ON TABLE "public"."crm_field_values" TO "anon";
GRANT ALL ON TABLE "public"."crm_field_values" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_field_values" TO "service_role";



GRANT ALL ON TABLE "public"."crm_pipeline_stages" TO "anon";
GRANT ALL ON TABLE "public"."crm_pipeline_stages" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_pipeline_stages" TO "service_role";



GRANT ALL ON TABLE "public"."crm_pipelines" TO "anon";
GRANT ALL ON TABLE "public"."crm_pipelines" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_pipelines" TO "service_role";



GRANT ALL ON TABLE "public"."crm_saved_views" TO "anon";
GRANT ALL ON TABLE "public"."crm_saved_views" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_saved_views" TO "service_role";



GRANT ALL ON TABLE "public"."crm_webhook_logs" TO "anon";
GRANT ALL ON TABLE "public"."crm_webhook_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_webhook_logs" TO "service_role";



GRANT ALL ON TABLE "public"."crm_webhooks" TO "anon";
GRANT ALL ON TABLE "public"."crm_webhooks" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_webhooks" TO "service_role";



GRANT ALL ON TABLE "public"."custom_forms" TO "anon";
GRANT ALL ON TABLE "public"."custom_forms" TO "authenticated";
GRANT ALL ON TABLE "public"."custom_forms" TO "service_role";



GRANT ALL ON TABLE "public"."dashboard_widget_preferences" TO "anon";
GRANT ALL ON TABLE "public"."dashboard_widget_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."dashboard_widget_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."departments" TO "anon";
GRANT ALL ON TABLE "public"."departments" TO "authenticated";
GRANT ALL ON TABLE "public"."departments" TO "service_role";



GRANT ALL ON TABLE "public"."employee_certifications" TO "anon";
GRANT ALL ON TABLE "public"."employee_certifications" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_certifications" TO "service_role";



GRANT ALL ON TABLE "public"."employee_departments" TO "anon";
GRANT ALL ON TABLE "public"."employee_departments" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_departments" TO "service_role";



GRANT ALL ON TABLE "public"."employee_skills" TO "anon";
GRANT ALL ON TABLE "public"."employee_skills" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_skills" TO "service_role";



GRANT ALL ON TABLE "public"."employee_task_steps" TO "anon";
GRANT ALL ON TABLE "public"."employee_task_steps" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_task_steps" TO "service_role";



GRANT ALL ON TABLE "public"."employee_tasks" TO "anon";
GRANT ALL ON TABLE "public"."employee_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."evaluation_anchors" TO "anon";
GRANT ALL ON TABLE "public"."evaluation_anchors" TO "authenticated";
GRANT ALL ON TABLE "public"."evaluation_anchors" TO "service_role";



GRANT ALL ON TABLE "public"."evaluation_assignments" TO "anon";
GRANT ALL ON TABLE "public"."evaluation_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."evaluation_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."evaluation_criteria" TO "anon";
GRANT ALL ON TABLE "public"."evaluation_criteria" TO "authenticated";
GRANT ALL ON TABLE "public"."evaluation_criteria" TO "service_role";



GRANT ALL ON TABLE "public"."evaluation_cycles" TO "anon";
GRANT ALL ON TABLE "public"."evaluation_cycles" TO "authenticated";
GRANT ALL ON TABLE "public"."evaluation_cycles" TO "service_role";



GRANT ALL ON TABLE "public"."evaluation_scores" TO "anon";
GRANT ALL ON TABLE "public"."evaluation_scores" TO "authenticated";
GRANT ALL ON TABLE "public"."evaluation_scores" TO "service_role";



GRANT ALL ON TABLE "public"."evaluation_templates" TO "anon";
GRANT ALL ON TABLE "public"."evaluation_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."evaluation_templates" TO "service_role";



GRANT ALL ON TABLE "public"."evaluations" TO "anon";
GRANT ALL ON TABLE "public"."evaluations" TO "authenticated";
GRANT ALL ON TABLE "public"."evaluations" TO "service_role";



GRANT ALL ON TABLE "public"."faqs" TO "anon";
GRANT ALL ON TABLE "public"."faqs" TO "authenticated";
GRANT ALL ON TABLE "public"."faqs" TO "service_role";



GRANT ALL ON TABLE "public"."form_fields" TO "anon";
GRANT ALL ON TABLE "public"."form_fields" TO "authenticated";
GRANT ALL ON TABLE "public"."form_fields" TO "service_role";



GRANT ALL ON TABLE "public"."form_responses" TO "anon";
GRANT ALL ON TABLE "public"."form_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."form_responses" TO "service_role";



GRANT ALL ON TABLE "public"."interview_slots" TO "anon";
GRANT ALL ON TABLE "public"."interview_slots" TO "authenticated";
GRANT ALL ON TABLE "public"."interview_slots" TO "service_role";



GRANT ALL ON TABLE "public"."interviews" TO "anon";
GRANT ALL ON TABLE "public"."interviews" TO "authenticated";
GRANT ALL ON TABLE "public"."interviews" TO "service_role";



GRANT ALL ON TABLE "public"."job_sections" TO "anon";
GRANT ALL ON TABLE "public"."job_sections" TO "authenticated";
GRANT ALL ON TABLE "public"."job_sections" TO "service_role";



GRANT ALL ON TABLE "public"."job_steps" TO "anon";
GRANT ALL ON TABLE "public"."job_steps" TO "authenticated";
GRANT ALL ON TABLE "public"."job_steps" TO "service_role";



GRANT ALL ON TABLE "public"."jobs" TO "anon";
GRANT ALL ON TABLE "public"."jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."jobs" TO "service_role";



GRANT ALL ON TABLE "public"."leave_balances" TO "anon";
GRANT ALL ON TABLE "public"."leave_balances" TO "authenticated";
GRANT ALL ON TABLE "public"."leave_balances" TO "service_role";



GRANT ALL ON TABLE "public"."member_permission_groups" TO "anon";
GRANT ALL ON TABLE "public"."member_permission_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."member_permission_groups" TO "service_role";



GRANT ALL ON TABLE "public"."message_threads" TO "anon";
GRANT ALL ON TABLE "public"."message_threads" TO "authenticated";
GRANT ALL ON TABLE "public"."message_threads" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."page_sections" TO "anon";
GRANT ALL ON TABLE "public"."page_sections" TO "authenticated";
GRANT ALL ON TABLE "public"."page_sections" TO "service_role";



GRANT ALL ON TABLE "public"."page_tabs" TO "anon";
GRANT ALL ON TABLE "public"."page_tabs" TO "authenticated";
GRANT ALL ON TABLE "public"."page_tabs" TO "service_role";



GRANT ALL ON TABLE "public"."payslips" TO "anon";
GRANT ALL ON TABLE "public"."payslips" TO "authenticated";
GRANT ALL ON TABLE "public"."payslips" TO "service_role";



GRANT ALL ON TABLE "public"."permission_group_permissions" TO "anon";
GRANT ALL ON TABLE "public"."permission_group_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."permission_group_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."permission_groups" TO "anon";
GRANT ALL ON TABLE "public"."permission_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."permission_groups" TO "service_role";



GRANT ALL ON TABLE "public"."plans" TO "anon";
GRANT ALL ON TABLE "public"."plans" TO "authenticated";
GRANT ALL ON TABLE "public"."plans" TO "service_role";



GRANT ALL ON TABLE "public"."positions" TO "anon";
GRANT ALL ON TABLE "public"."positions" TO "authenticated";
GRANT ALL ON TABLE "public"."positions" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."project_team_members" TO "anon";
GRANT ALL ON TABLE "public"."project_team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."project_team_members" TO "service_role";



GRANT ALL ON TABLE "public"."project_teams" TO "anon";
GRANT ALL ON TABLE "public"."project_teams" TO "authenticated";
GRANT ALL ON TABLE "public"."project_teams" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."pulse_survey_answers" TO "anon";
GRANT ALL ON TABLE "public"."pulse_survey_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."pulse_survey_answers" TO "service_role";



GRANT ALL ON TABLE "public"."pulse_survey_questions" TO "anon";
GRANT ALL ON TABLE "public"."pulse_survey_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."pulse_survey_questions" TO "service_role";



GRANT ALL ON TABLE "public"."pulse_survey_responses" TO "anon";
GRANT ALL ON TABLE "public"."pulse_survey_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."pulse_survey_responses" TO "service_role";



GRANT ALL ON TABLE "public"."pulse_surveys" TO "anon";
GRANT ALL ON TABLE "public"."pulse_surveys" TO "authenticated";
GRANT ALL ON TABLE "public"."pulse_surveys" TO "service_role";



GRANT ALL ON TABLE "public"."push_notification_logs" TO "anon";
GRANT ALL ON TABLE "public"."push_notification_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."push_notification_logs" TO "service_role";



GRANT ALL ON TABLE "public"."push_tokens" TO "anon";
GRANT ALL ON TABLE "public"."push_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."push_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."recruiting_targets" TO "anon";
GRANT ALL ON TABLE "public"."recruiting_targets" TO "authenticated";
GRANT ALL ON TABLE "public"."recruiting_targets" TO "service_role";



GRANT ALL ON TABLE "public"."selection_step_templates" TO "anon";
GRANT ALL ON TABLE "public"."selection_step_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."selection_step_templates" TO "service_role";



GRANT ALL ON TABLE "public"."service_requests" TO "anon";
GRANT ALL ON TABLE "public"."service_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."service_requests" TO "service_role";



GRANT ALL ON TABLE "public"."shift_requests" TO "anon";
GRANT ALL ON TABLE "public"."shift_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."shift_requests" TO "service_role";



GRANT ALL ON TABLE "public"."shift_schedules" TO "anon";
GRANT ALL ON TABLE "public"."shift_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."shift_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."skill_masters" TO "anon";
GRANT ALL ON TABLE "public"."skill_masters" TO "authenticated";
GRANT ALL ON TABLE "public"."skill_masters" TO "service_role";



GRANT ALL ON TABLE "public"."task_assignees" TO "anon";
GRANT ALL ON TABLE "public"."task_assignees" TO "authenticated";
GRANT ALL ON TABLE "public"."task_assignees" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."user_organizations" TO "anon";
GRANT ALL ON TABLE "public"."user_organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."user_organizations" TO "service_role";



GRANT ALL ON TABLE "public"."wiki_pages" TO "anon";
GRANT ALL ON TABLE "public"."wiki_pages" TO "authenticated";
GRANT ALL ON TABLE "public"."wiki_pages" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_requests" TO "anon";
GRANT ALL ON TABLE "public"."workflow_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_requests" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_rules" TO "anon";
GRANT ALL ON TABLE "public"."workflow_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_rules" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_templates" TO "anon";
GRANT ALL ON TABLE "public"."workflow_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_templates" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







