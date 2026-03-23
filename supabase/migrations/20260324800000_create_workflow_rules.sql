-- ワークフロー自動化ルールテーブル
CREATE TABLE IF NOT EXISTS public.workflow_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  request_type text NOT NULL,
  rule_type text NOT NULL CHECK (rule_type IN ('auto_approve', 'notify', 'validate')),
  conditions jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_rules_org ON workflow_rules(organization_id, request_type);
ALTER TABLE public.workflow_rules ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_workflow_rules_updated_at ON public.workflow_rules;
CREATE TRIGGER set_workflow_rules_updated_at
  BEFORE UPDATE ON public.workflow_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: 組織メンバーは閲覧可能
DO $$ BEGIN
  CREATE POLICY "workflow_rules_select_org" ON public.workflow_rules FOR SELECT
    USING (organization_id IN (SELECT public.get_my_organization_ids()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS: 管理者のみ全操作
DO $$ BEGIN
  CREATE POLICY "workflow_rules_all_admin" ON public.workflow_rules FOR ALL
    USING (public.get_my_role() = 'admin' AND organization_id IN (SELECT public.get_my_organization_ids()))
    WITH CHECK (public.get_my_role() = 'admin' AND organization_id IN (SELECT public.get_my_organization_ids()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 自動承認トリガー関数
CREATE OR REPLACE FUNCTION public.auto_approve_workflow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

DROP TRIGGER IF EXISTS auto_approve_workflow_trigger ON public.workflow_requests;
CREATE TRIGGER auto_approve_workflow_trigger
  BEFORE INSERT ON public.workflow_requests
  FOR EACH ROW EXECUTE FUNCTION public.auto_approve_workflow();

-- 管理者通知トリガー関数
CREATE OR REPLACE FUNCTION public.notify_admins_on_workflow_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

DROP TRIGGER IF EXISTS notify_admins_workflow_trigger ON public.workflow_requests;
CREATE TRIGGER notify_admins_workflow_trigger
  AFTER INSERT ON public.workflow_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_workflow_request();

-- 有給休暇承認RPC（残日数チェックと承認をアトミックに実行）
CREATE OR REPLACE FUNCTION public.approve_leave_request(
  p_request_id uuid,
  p_reviewer_id text,
  p_comment text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
