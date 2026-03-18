-- 通知テーブル
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  type text NOT NULL CHECK (type IN (
    'survey_request',
    'task_assigned',
    'recruitment_update',
    'attendance_reminder',
    'message_received',
    'announcement',
    'general'
  )),
  title text NOT NULL,
  body text,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  action_url text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_org ON notifications(organization_id);

-- updated_at 自動更新
CREATE TRIGGER notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================================================
-- RLS
-- ========================================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- SELECT: 自分の通知のみ
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT USING (
  user_id = auth.uid()::text
);

-- INSERT: 管理者が自組織のユーザーに対して作成可能
CREATE POLICY "notifications_insert_admin" ON notifications FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT uo.organization_id FROM user_organizations uo
    JOIN profiles p ON p.id = uo.user_id
    WHERE uo.user_id = auth.uid()::text AND p.role IN ('admin', 'hr_manager')
  )
);

-- UPDATE: 自分の通知のみ（既読マーク用）
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE USING (
  user_id = auth.uid()::text
);

-- DELETE: 自分の通知 または 管理者が自組織の通知を削除
CREATE POLICY "notifications_delete" ON notifications FOR DELETE USING (
  user_id = auth.uid()::text
  OR organization_id IN (
    SELECT uo.organization_id FROM user_organizations uo
    JOIN profiles p ON p.id = uo.user_id
    WHERE uo.user_id = auth.uid()::text AND p.role IN ('admin', 'hr_manager')
  )
);

-- ========================================================================
-- RPC: 全通知を既読にする
-- ========================================================================
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = now()
  WHERE user_id = auth.uid()::text
    AND is_read = false;
END;
$$;
