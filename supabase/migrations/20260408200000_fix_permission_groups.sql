-- ========================================================================
-- 権限グループ修正
-- 1. mpg_all_admin RLS に組織スコープ追加
-- 2. 新規組織作成時にデフォルトグループをシードするトリガー
-- 3. admin ユーザーにも管理者グループを割り当て
-- ========================================================================

-- #1: mpg_all_admin に組織スコープ追加
DROP POLICY IF EXISTS "mpg_all_admin" ON public.member_permission_groups;
CREATE POLICY "mpg_all_admin" ON public.member_permission_groups FOR ALL
  USING (group_id IN (
    SELECT id FROM public.permission_groups
    WHERE public.get_my_role() = 'admin' AND organization_id IN (SELECT public.get_my_organization_ids())
  ))
  WITH CHECK (group_id IN (
    SELECT id FROM public.permission_groups
    WHERE public.get_my_role() = 'admin' AND organization_id IN (SELECT public.get_my_organization_ids())
  ));

-- #3: 新規組織作成時にデフォルトグループをシードする関数
CREATE OR REPLACE FUNCTION public.seed_default_permission_groups()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

DROP TRIGGER IF EXISTS trg_seed_permission_groups ON public.organizations;
CREATE TRIGGER trg_seed_permission_groups
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_default_permission_groups();

-- #11: 既存 admin ユーザーに管理者グループを割り当て
INSERT INTO member_permission_groups (user_id, group_id)
SELECT p.id, pg.id
FROM profiles p
JOIN user_organizations uo ON uo.user_id = p.id
JOIN permission_groups pg ON pg.organization_id = uo.organization_id AND pg.name = '管理者'
WHERE p.role = 'admin'
ON CONFLICT DO NOTHING;
