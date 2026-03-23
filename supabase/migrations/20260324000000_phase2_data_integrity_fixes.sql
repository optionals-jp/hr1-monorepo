-- ========================================================================
-- Phase 2: データ整合性バグの修正
-- 2-1: create-user の RPC 関数化（トランザクション保証）
-- 2-2: employee_tasks テーブル定義の明示化
-- 2-3: send_push_notification 失敗時のエラーログ記録
-- 2-4: leave_balances 繰越日数の自動計算
-- ========================================================================

-- ========================================================================
-- 2-2: employee_tasks / employee_task_steps テーブル定義
--      Supabase Studio で作成されていたがマイグレーション管理外だった
--      user_id を TEXT に統一（他テーブルと合わせる）
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.employee_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  note text,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  is_important boolean NOT NULL DEFAULT false,
  is_my_day boolean NOT NULL DEFAULT false,
  my_day_date date,
  due_date date,
  reminder_at timestamptz,
  list_name text NOT NULL DEFAULT 'タスク',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_tasks_user ON public.employee_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_tasks_org ON public.employee_tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_employee_tasks_user_completed ON public.employee_tasks(user_id, is_completed)
  WHERE is_completed = false;
CREATE INDEX IF NOT EXISTS idx_employee_tasks_user_my_day ON public.employee_tasks(user_id, is_my_day, my_day_date)
  WHERE is_my_day = true;

ALTER TABLE public.employee_tasks ENABLE ROW LEVEL SECURITY;

-- RLS: 自分のタスクのみ
CREATE POLICY "employee_tasks_select_own" ON public.employee_tasks FOR SELECT
  USING (user_id = auth.uid()::text);
CREATE POLICY "employee_tasks_insert_own" ON public.employee_tasks FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "employee_tasks_update_own" ON public.employee_tasks FOR UPDATE
  USING (user_id = auth.uid()::text);
CREATE POLICY "employee_tasks_delete_own" ON public.employee_tasks FOR DELETE
  USING (user_id = auth.uid()::text);

CREATE TRIGGER set_employee_tasks_updated_at
  BEFORE UPDATE ON public.employee_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- サブステップ
CREATE TABLE IF NOT EXISTS public.employee_task_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.employee_tasks(id) ON DELETE CASCADE,
  title text NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_task_steps_task ON public.employee_task_steps(task_id, sort_order);

ALTER TABLE public.employee_task_steps ENABLE ROW LEVEL SECURITY;

-- RLS: 親タスクの所有者のみ
CREATE POLICY "employee_task_steps_select" ON public.employee_task_steps FOR SELECT
  USING (task_id IN (SELECT id FROM public.employee_tasks WHERE user_id = auth.uid()::text));
CREATE POLICY "employee_task_steps_insert" ON public.employee_task_steps FOR INSERT
  WITH CHECK (task_id IN (SELECT id FROM public.employee_tasks WHERE user_id = auth.uid()::text));
CREATE POLICY "employee_task_steps_update" ON public.employee_task_steps FOR UPDATE
  USING (task_id IN (SELECT id FROM public.employee_tasks WHERE user_id = auth.uid()::text));
CREATE POLICY "employee_task_steps_delete" ON public.employee_task_steps FOR DELETE
  USING (task_id IN (SELECT id FROM public.employee_tasks WHERE user_id = auth.uid()::text));

-- ========================================================================
-- employee_tasks.user_id が UUID型で作成されていた場合のマイグレーション
-- 既存テーブルが UUID型なら TEXT型に変換、TEXT型ならスキップ
-- ========================================================================
DO $$
BEGIN
  -- employee_tasks.user_id が uuid型の場合のみ変換
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'employee_tasks'
      AND column_name = 'user_id'
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.employee_tasks
      ALTER COLUMN user_id TYPE text USING user_id::text;
  END IF;
END $$;

-- ========================================================================
-- トリガー関数の修正: employee_tasks.user_id が TEXT になったのでキャスト不要
-- ========================================================================
CREATE OR REPLACE FUNCTION complete_todo_on_survey_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_survey_id text;
BEGIN
  IF NEW.completed_at IS NULL THEN
    RETURN NEW;
  END IF;

  v_survey_id := NEW.survey_id::text;

  -- 応募者TODOを完了
  UPDATE applicant_todos
  SET is_completed = true, completed_at = now()
  WHERE source = 'survey'
    AND source_id = v_survey_id
    AND user_id = NEW.user_id
    AND is_completed = false;

  -- 社員タスクを完了（user_id は TEXT 統一のためキャスト不要）
  UPDATE employee_tasks
  SET is_completed = true, completed_at = now()
  WHERE user_id = NEW.user_id
    AND title LIKE 'サーベイに回答: %'
    AND is_completed = false
    AND organization_id = NEW.organization_id;

  RETURN NEW;
END;
$$;

-- サーベイTODO作成のトリガー関数も修正（user_id TEXT統一）
CREATE OR REPLACE FUNCTION create_survey_todos_and_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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

  -- 応募者向け
  IF NEW.target IN ('applicant', 'both') THEN
    FOR v_user IN
      SELECT uo.user_id
      FROM user_organizations uo
      JOIN profiles p ON p.id = uo.user_id
      WHERE uo.organization_id = NEW.organization_id
        AND p.role = 'applicant'
    LOOP
      INSERT INTO applicant_todos (
        organization_id, user_id, title, due_date, source, source_id, action_url
      ) VALUES (
        NEW.organization_id, v_user.user_id, v_todo_title,
        NEW.deadline::date, 'survey', NEW.id::text, v_action_url
      )
      ON CONFLICT DO NOTHING;

      INSERT INTO notifications (
        organization_id, user_id, type, title, body, action_url, metadata
      ) VALUES (
        NEW.organization_id, v_user.user_id, 'survey_request',
        'サーベイの依頼', v_notification_body, v_action_url,
        jsonb_build_object('survey_id', NEW.id::text)
      );
    END LOOP;
  END IF;

  -- 社員向け
  IF NEW.target IN ('employee', 'both') THEN
    FOR v_user IN
      SELECT uo.user_id
      FROM user_organizations uo
      JOIN profiles p ON p.id = uo.user_id
      WHERE uo.organization_id = NEW.organization_id
        AND p.role = 'employee'
    LOOP
      INSERT INTO employee_tasks (
        organization_id, user_id, title, due_date, list_name
      ) VALUES (
        NEW.organization_id, v_user.user_id, v_todo_title,
        NEW.deadline::date, 'タスク'
      );

      INSERT INTO notifications (
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

-- ========================================================================
-- 2-1: create_user RPC 関数（トランザクション保証）
--      Edge Function の create-user はこの RPC を呼び出す形に変更
-- ========================================================================
CREATE OR REPLACE FUNCTION public.create_user_with_org(
  p_user_id text,
  p_email text,
  p_display_name text DEFAULT NULL,
  p_role text DEFAULT 'employee',
  p_organization_id text DEFAULT NULL,
  p_position text DEFAULT NULL,
  p_hiring_type text DEFAULT NULL,
  p_graduation_year integer DEFAULT NULL,
  p_department_ids text[] DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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

-- ========================================================================
-- 2-3: プッシュ通知失敗ログテーブル + トリガー改善
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.push_notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid REFERENCES public.notifications(id) ON DELETE SET NULL,
  user_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_notification_logs_user ON public.push_notification_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_notification_logs_status ON public.push_notification_logs(status)
  WHERE status = 'failed';

ALTER TABLE public.push_notification_logs ENABLE ROW LEVEL SECURITY;

-- 管理者のみ閲覧可能
CREATE POLICY "push_notification_logs_select_admin" ON public.push_notification_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()::text
        AND p.role = 'admin'
    )
  );

-- トリガー関数を改善: エラーログ記録 + 設定未構成時の警告ログ
CREATE OR REPLACE FUNCTION public.send_push_on_notification_insert()
RETURNS trigger AS $$
DECLARE
  _supabase_url text;
  _service_role_key text;
  _request_id bigint;
BEGIN
  _supabase_url := current_setting('app.settings.supabase_url', true);
  _service_role_key := current_setting('app.settings.service_role_key', true);

  IF _supabase_url IS NULL OR _service_role_key IS NULL THEN
    -- 設定が未構成の場合、ログに記録してスキップ
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
    -- 送信失敗をログに記録（トリガー自体は失敗させない）
    INSERT INTO public.push_notification_logs (notification_id, user_id, status, error_message)
    VALUES (NEW.id, NEW.user_id, 'failed', SQLERRM);
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================================
-- 2-4: leave_balances 繰越日数の自動計算
--      前年度の残日数を自動計算する関数
-- ========================================================================
CREATE OR REPLACE FUNCTION public.calculate_leave_carry_over(
  p_organization_id text DEFAULT NULL,
  p_fiscal_year integer DEFAULT NULL
)
RETURNS TABLE(user_id text, carried_over_days numeric, prev_remaining numeric)
LANGUAGE plpgsql
SECURITY DEFINER
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

-- 有給自動付与時に繰越日数も自動設定する関数
CREATE OR REPLACE FUNCTION public.auto_grant_leave_with_carry_over(
  p_organization_id text,
  p_fiscal_year integer
)
RETURNS TABLE(user_id text, granted_days numeric, carried_over_days numeric)
LANGUAGE plpgsql
SECURITY DEFINER
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
