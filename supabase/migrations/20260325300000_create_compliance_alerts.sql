-- コンプライアンスアラートテーブル
CREATE TABLE IF NOT EXISTS public.compliance_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id),
  user_id text,
  alert_type text NOT NULL CHECK (alert_type IN (
    'leave_usage_warning',
    'leave_expiry_warning',
    'overtime_monthly_warning',
    'overtime_yearly_warning',
    'leave_balance_low',
    'attendance_anomaly'
  )),
  severity text NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  title text NOT NULL,
  description text NOT NULL,
  metadata jsonb,
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  resolved_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compliance_alerts_org ON compliance_alerts(organization_id, is_resolved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_user ON compliance_alerts(user_id, is_resolved);

ALTER TABLE public.compliance_alerts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "compliance_alerts_select_admin" ON compliance_alerts FOR SELECT
    USING (public.get_my_role() = 'admin' AND organization_id IN (SELECT public.get_my_organization_ids()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "compliance_alerts_select_own" ON compliance_alerts FOR SELECT
    USING (user_id = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "compliance_alerts_all_admin" ON compliance_alerts FOR ALL
    USING (public.get_my_role() = 'admin' AND organization_id IN (SELECT public.get_my_organization_ids()))
    WITH CHECK (public.get_my_role() = 'admin' AND organization_id IN (SELECT public.get_my_organization_ids()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- コンプライアンスチェック関数
CREATE OR REPLACE FUNCTION public.check_compliance_alerts(p_organization_id text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
