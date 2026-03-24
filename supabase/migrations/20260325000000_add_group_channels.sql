-- ========================================================================
-- グループチャンネル対応: message_threads 拡張 + channel_members テーブル
-- ========================================================================

-- message_threads にチャンネル用カラムを追加
ALTER TABLE public.message_threads
  ADD COLUMN IF NOT EXISTS is_channel boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS channel_name text,
  ADD COLUMN IF NOT EXISTS channel_type text CHECK (channel_type IN ('department', 'project', 'custom')),
  ADD COLUMN IF NOT EXISTS channel_source_id text;

-- participant_id の NOT NULL 制約を外す（チャンネルでは使用しない）
ALTER TABLE public.message_threads ALTER COLUMN participant_id DROP NOT NULL;
ALTER TABLE public.message_threads ALTER COLUMN participant_type DROP NOT NULL;

-- チャンネルメンバーテーブル
CREATE TABLE IF NOT EXISTS public.channel_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id text NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(thread_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_members_thread ON public.channel_members(thread_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_user ON public.channel_members(user_id);

ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;

-- channel_members RLS: 同じチャンネルのメンバーが閲覧可能
DO $$ BEGIN
  CREATE POLICY "channel_members_select_member" ON public.channel_members FOR SELECT
    USING (
      user_id = auth.uid()::text
      OR thread_id IN (SELECT cm.thread_id FROM public.channel_members cm WHERE cm.user_id = auth.uid()::text)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- channel_members RLS: 管理者のみ全操作可
DO $$ BEGIN
  CREATE POLICY "channel_members_all_admin" ON public.channel_members FOR ALL
    USING (public.get_my_role() = 'admin')
    WITH CHECK (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- message_threads RLS を更新: チャンネルメンバーも閲覧可能にする
DROP POLICY IF EXISTS "threads_select" ON public.message_threads;
CREATE POLICY "threads_select" ON public.message_threads FOR SELECT
  USING (
    participant_id = auth.uid()::text
    OR (organization_id IN (SELECT public.get_my_organization_ids())
        AND public.get_my_role() IN ('admin', 'employee'))
    OR (is_channel = true AND id IN (
      SELECT cm.thread_id FROM public.channel_members cm WHERE cm.user_id = auth.uid()::text
    ))
  );

-- messages RLS を更新: チャンネルメンバーもメッセージ閲覧可能
DROP POLICY IF EXISTS "messages_select_thread_member" ON public.messages;
CREATE POLICY "messages_select_thread_member" ON public.messages FOR SELECT
  USING (thread_id IN (
    SELECT mt.id FROM public.message_threads mt
    WHERE mt.organization_id IN (SELECT public.get_my_organization_ids()) OR mt.participant_id = auth.uid()::text
    UNION
    SELECT cm.thread_id FROM public.channel_members cm WHERE cm.user_id = auth.uid()::text
  ));

-- messages INSERT: チャンネルメンバーも送信可能
DROP POLICY IF EXISTS "messages_insert_authenticated" ON public.messages;
CREATE POLICY "messages_insert_authenticated" ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()::text
    AND (
      thread_id IN (
        SELECT mt.id FROM public.message_threads mt
        WHERE mt.organization_id IN (SELECT public.get_my_organization_ids())
          OR mt.participant_id = auth.uid()::text
      )
      OR thread_id IN (
        SELECT cm.thread_id FROM public.channel_members cm WHERE cm.user_id = auth.uid()::text
      )
    )
  );

-- 部署チャンネル自動作成関数
CREATE OR REPLACE FUNCTION public.create_department_channels(p_organization_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_dept record;
  v_thread_id text;
  v_member record;
BEGIN
  -- 管理者のみ実行可能
  IF public.get_my_role() <> 'admin' THEN
    RAISE EXCEPTION 'permission denied: admin role required';
  END IF;

  -- 呼び出し元が所属する組織のみ操作可能
  IF p_organization_id NOT IN (SELECT public.get_my_organization_ids()) THEN
    RAISE EXCEPTION 'permission denied: not a member of this organization';
  END IF;

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

-- チャンネル一覧取得 RPC（コンソール用）
CREATE OR REPLACE FUNCTION public.get_channels_with_details(p_org_id text)
RETURNS TABLE (
  id text,
  organization_id text,
  channel_name text,
  channel_type text,
  channel_source_id text,
  title text,
  created_at timestamptz,
  updated_at timestamptz,
  member_count bigint,
  latest_message_id text,
  latest_message_content text,
  latest_message_sender_name text,
  latest_message_created_at timestamptz
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- 呼び出し元が所属する組織のみ取得可能
  IF p_org_id NOT IN (SELECT public.get_my_organization_ids()) THEN
    RETURN;
  END IF;

  RETURN QUERY
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
END;
$$;

-- チャンネルメンバー一覧取得 RPC
CREATE OR REPLACE FUNCTION public.get_channel_members(p_thread_id text)
RETURNS TABLE (
  id uuid,
  user_id text,
  display_name text,
  email text,
  avatar_url text,
  joined_at timestamptz
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- スレッドが呼び出し元の所属組織に属するか確認
  IF NOT EXISTS (
    SELECT 1 FROM message_threads mt
    WHERE mt.id = p_thread_id
      AND mt.organization_id IN (SELECT public.get_my_organization_ids())
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
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
END;
$$;
