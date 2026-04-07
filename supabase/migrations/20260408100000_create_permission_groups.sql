-- ========================================================================
-- 権限グループシステム
-- 組織ごとに権限グループを作成し、リソース×アクションで細かく設定可能
-- メンバーに複数グループを付与可能（OR結合）
-- ========================================================================

-- 1. permission_groups: 権限グループ定義
CREATE TABLE public.permission_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE INDEX idx_permission_groups_org ON public.permission_groups(organization_id);
ALTER TABLE public.permission_groups ENABLE ROW LEVEL SECURITY;

-- 2. permission_group_permissions: グループごとの権限設定
CREATE TABLE public.permission_group_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.permission_groups(id) ON DELETE CASCADE,
  resource text NOT NULL,
  actions text[] NOT NULL DEFAULT '{}',
  UNIQUE (group_id, resource)
);

CREATE INDEX idx_pgp_group ON public.permission_group_permissions(group_id);
ALTER TABLE public.permission_group_permissions ENABLE ROW LEVEL SECURITY;

-- 3. member_permission_groups: メンバーへのグループ割り当て
CREATE TABLE public.member_permission_groups (
  user_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.permission_groups(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, group_id)
);

CREATE INDEX idx_mpg_user ON public.member_permission_groups(user_id);
CREATE INDEX idx_mpg_group ON public.member_permission_groups(group_id);
ALTER TABLE public.member_permission_groups ENABLE ROW LEVEL SECURITY;

-- ========================================================================
-- RLS ポリシー
-- ========================================================================

-- permission_groups
CREATE POLICY "pg_all_admin" ON public.permission_groups FOR ALL
  USING (public.get_my_role() = 'admin' AND organization_id IN (SELECT public.get_my_organization_ids()))
  WITH CHECK (public.get_my_role() = 'admin' AND organization_id IN (SELECT public.get_my_organization_ids()));

CREATE POLICY "pg_select_org" ON public.permission_groups FOR SELECT
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

-- permission_group_permissions
CREATE POLICY "pgp_all_admin" ON public.permission_group_permissions FOR ALL
  USING (group_id IN (
    SELECT id FROM public.permission_groups
    WHERE public.get_my_role() = 'admin' AND organization_id IN (SELECT public.get_my_organization_ids())
  ))
  WITH CHECK (group_id IN (
    SELECT id FROM public.permission_groups
    WHERE public.get_my_role() = 'admin' AND organization_id IN (SELECT public.get_my_organization_ids())
  ));

CREATE POLICY "pgp_select_org" ON public.permission_group_permissions FOR SELECT
  USING (group_id IN (
    SELECT id FROM public.permission_groups WHERE organization_id IN (SELECT public.get_my_organization_ids())
  ));

-- member_permission_groups
CREATE POLICY "mpg_all_admin" ON public.member_permission_groups FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "mpg_select_own" ON public.member_permission_groups FOR SELECT
  USING (user_id = auth.uid()::text);

-- ========================================================================
-- SECURITY DEFINER 関数
-- ========================================================================

-- 単一リソース×アクションの権限チェック（RLS Phase 2 用）
CREATE OR REPLACE FUNCTION public.has_permission(p_resource text, p_action text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- フロントエンド用: 自分の全権限を一括取得
CREATE OR REPLACE FUNCTION public.get_my_permissions()
RETURNS TABLE(resource text, actions text[])
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pgp.resource, array_agg(DISTINCT act) AS actions
  FROM member_permission_groups mpg
  JOIN permission_group_permissions pgp ON pgp.group_id = mpg.group_id,
  LATERAL unnest(pgp.actions) AS act
  WHERE mpg.user_id = auth.uid()::text
  GROUP BY pgp.resource;
$$;

-- ========================================================================
-- デフォルトグループをシード（既存の全組織に対して）
-- ========================================================================

DO $$
DECLARE
  org_record RECORD;
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
  FOR org_record IN SELECT id FROM public.organizations LOOP
    -- 管理者グループ
    INSERT INTO public.permission_groups (organization_id, name, description, is_system)
    VALUES (org_record.id, '管理者', '全機能へのフルアクセス', true)
    RETURNING id INTO grp_admin_id;

    FOREACH r IN ARRAY all_resources LOOP
      INSERT INTO public.permission_group_permissions (group_id, resource, actions)
      VALUES (grp_admin_id, r, all_actions);
    END LOOP;

    -- 人事担当グループ
    INSERT INTO public.permission_groups (organization_id, name, description, is_system)
    VALUES (org_record.id, '人事担当', '採用・人事管理の担当者', true)
    RETURNING id INTO grp_hr_id;

    FOREACH r IN ARRAY hr_resources LOOP
      INSERT INTO public.permission_group_permissions (group_id, resource, actions)
      VALUES (grp_hr_id, r, all_actions);
    END LOOP;

    -- 一般社員グループ
    INSERT INTO public.permission_groups (organization_id, name, description, is_system)
    VALUES (org_record.id, '一般社員', '基本的な閲覧権限', true)
    RETURNING id INTO grp_employee_id;

    FOREACH r IN ARRAY employee_resources LOOP
      INSERT INTO public.permission_group_permissions (group_id, resource, actions)
      VALUES (grp_employee_id, r, employee_actions);
    END LOOP;

    -- 既存 employee を一般社員グループに自動割り当て
    INSERT INTO public.member_permission_groups (user_id, group_id)
    SELECT p.id, grp_employee_id
    FROM profiles p
    JOIN user_organizations uo ON uo.user_id = p.id
    WHERE uo.organization_id = org_record.id
      AND p.role = 'employee'
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;
