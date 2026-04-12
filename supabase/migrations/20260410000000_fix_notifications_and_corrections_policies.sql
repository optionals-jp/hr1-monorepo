-- Phase 1-2 の実装に伴う notifications テーブルの整合性修正
-- 1. resource_type / resource_id カラムを追加（notification-repository.ts で参照）
-- 2. type CHECK 制約に 'workflow' を追加
-- 3. INSERT RLS ポリシーに manager / approver ロールを追加（ワークフロー承認時の通知送信に必要）

-- 1. カラム追加
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS resource_type text,
  ADD COLUMN IF NOT EXISTS resource_id text;

-- 2. type CHECK 制約の更新
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'survey_request',
    'task_assigned',
    'recruitment_update',
    'attendance_reminder',
    'message_received',
    'announcement',
    'general',
    'workflow'
  ));

-- 3. INSERT ポリシーの更新: manager / approver も通知作成可能に
DROP POLICY IF EXISTS "notifications_insert_admin" ON public.notifications;
CREATE POLICY "notifications_insert_authorized" ON public.notifications FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT uo.organization_id FROM public.user_organizations uo
    JOIN public.profiles p ON p.id = uo.user_id
    WHERE uo.user_id = auth.uid()::text
      AND p.role IN ('admin', 'hr_manager', 'manager', 'approver')
  )
);

-- 4. DELETE ポリシーにも manager / approver を追加（整合性のため）
DROP POLICY IF EXISTS "notifications_delete" ON public.notifications;
CREATE POLICY "notifications_delete" ON public.notifications FOR DELETE USING (
  user_id = auth.uid()::text
  OR organization_id IN (
    SELECT uo.organization_id FROM public.user_organizations uo
    JOIN public.profiles p ON p.id = uo.user_id
    WHERE uo.user_id = auth.uid()::text
      AND p.role IN ('admin', 'hr_manager', 'manager', 'approver')
  )
);

-- 5. attendance_corrections の RLS ポリシーに manager / approver を追加
-- 既存の admin 限定ポリシーに加え、manager/approver も閲覧・承認可能に
CREATE POLICY "attendance_corrections_select_manager"
  ON public.attendance_corrections FOR SELECT
  USING (
    public.get_my_role() IN ('manager', 'approver')
    AND organization_id IN (SELECT public.get_my_organization_ids())
  );

CREATE POLICY "attendance_corrections_update_manager"
  ON public.attendance_corrections FOR UPDATE
  USING (
    public.get_my_role() IN ('manager', 'approver')
    AND organization_id IN (SELECT public.get_my_organization_ids())
  );
