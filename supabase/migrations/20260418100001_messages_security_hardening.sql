-- =============================================================================
-- HR-27 Messages security hardening
--
-- このマイグレーションは 20260418100000_messages_production_upgrade.sql に
-- 対するセキュリティ強化差分です。本番に既適用済みの同マイグレーションを直接
-- 編集せず、冪等な CREATE OR REPLACE / DROP-CREATE POLICY で上書きします。
--
-- 対象:
--   Vuln 1: message_attachments_storage_delete ポリシーが全認証ユーザー開放
--   Vuln 2: send_message_v2 がメンション先ユーザーをスレッドに対して検証しない
--   Vuln 3: send_message_v2 が attachment.storage_path のパス規約を検証しない
--   Vuln 4: message_attachments_insert_sender が storage_path のパス規約を検証
--           しない（RLS 経由の直接 INSERT が Vuln 3 の迂回路になる）
--
-- 設計前提:
--   - profiles.role はグローバル属性（1 ユーザー 1 role）。user_organizations の
--     複数所属とは独立に管理されている（baseline.sql: get_my_role 参照）。
--   - マルチ組織前提のため、user_organizations は複数行を IN 句で吸収する。
--   - Storage パス規約: {organization_id}/{thread_id}/{message_id}/{file_name}
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ヘルパー: get_user_role(p_user_id)
--    get_my_role() の p_user_id パラメタライズ版。profiles 直参照を
--    1 箇所に閉じ込めるためのラッパー。
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role FROM profiles WHERE id = p_user_id;
$$;

ALTER FUNCTION public.get_user_role(text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.get_user_role(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. ヘルパー: can_user_access_thread(p_user_id, p_thread_id)
--    get_my_accessible_thread_ids() の「別ユーザー視点」版。
--    3 ブランチの UNION ALL は get_my_accessible_thread_ids() (line 30-43) と
--    1:1 で対応する。
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_user_access_thread(
  p_user_id text,
  p_thread_id text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_user_id IS NULL OR p_thread_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    -- (1) DM: 参加者本人（get_my_accessible_thread_ids: "自分が参加者の DM"）
    SELECT 1 FROM message_threads
    WHERE id = p_thread_id
      AND is_channel = false
      AND participant_id = p_user_id
    UNION ALL
    -- (2) DM: 対象ユーザーが同組織 admin/employee
    --     (get_my_accessible_thread_ids: "同一組織内の DM (admin/employee のみ)")
    SELECT 1 FROM message_threads mt
    WHERE mt.id = p_thread_id
      AND mt.is_channel = false
      AND mt.organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = p_user_id
      )
      AND public.get_user_role(p_user_id) IN ('admin', 'employee')
    UNION ALL
    -- (3) Channel: メンバーに登録
    --     (get_my_accessible_thread_ids: "自分がメンバーのチャンネルのみ")
    SELECT 1 FROM channel_members
    WHERE thread_id = p_thread_id
      AND user_id = p_user_id
  );
END;
$$;

ALTER FUNCTION public.can_user_access_thread(text, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.can_user_access_thread(text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Vuln 1: Storage DELETE ポリシーを送信者 + スレッドスコープに絞る
--    旧: bucket_id = 'message-attachments' AND auth.uid() IS NOT NULL
--        → 全認証ユーザーが任意の添付を削除可能だった
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS message_attachments_storage_delete ON storage.objects;
CREATE POLICY message_attachments_storage_delete ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'message-attachments'
    AND (storage.foldername(name))[2] IN (SELECT public.get_my_accessible_thread_ids())
    AND (storage.foldername(name))[3] IN (
      SELECT id FROM public.messages WHERE sender_id = auth.uid()::text
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Vuln 2 (RLS 防御): message_mentions_insert_sender に
--    can_user_access_thread ガードを追加。SECURITY DEFINER RPC バイパス経路
--    （クライアント直 INSERT）を塞ぐ。
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS message_mentions_insert_sender ON public.message_mentions;
CREATE POLICY message_mentions_insert_sender ON public.message_mentions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_mentions.message_id
        AND m.sender_id = auth.uid()::text
        AND public.can_user_access_thread(
          message_mentions.mentioned_user_id,
          m.thread_id
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 5. Vuln 4 (RLS 防御): message_attachments_insert_sender に storage_path の
--    パス規約検証を追加。
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS message_attachments_insert_sender ON public.message_attachments;
CREATE POLICY message_attachments_insert_sender ON public.message_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_attachments.message_id
        AND m.sender_id = auth.uid()::text
        AND split_part(message_attachments.storage_path, '/', 2) = m.thread_id
        AND split_part(message_attachments.storage_path, '/', 3) = m.id
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Vuln 2 + Vuln 3: send_message_v2 を置換
--    - メンション対象が当該スレッドにアクセス可能か検証（silent skip）
--    - 添付 storage_path のパス規約検証（EXCEPTION）
--    - p_parent_message_id のスレッド整合性検証（EXCEPTION）
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.send_message_v2(
  p_thread_id text,
  p_content text,
  p_parent_message_id text DEFAULT NULL,
  p_mentioned_user_ids text[] DEFAULT NULL,
  p_attachments jsonb DEFAULT NULL
)
RETURNS TABLE (
  id text,
  thread_id text,
  sender_id text,
  content text,
  parent_message_id text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid text := auth.uid()::text;
  v_thread public.message_threads%ROWTYPE;
  v_msg public.messages%ROWTYPE;
  v_mention_id text;
  v_attachment jsonb;
  v_storage_path text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF p_thread_id NOT IN (SELECT public.get_my_accessible_thread_ids()) THEN
    RAISE EXCEPTION 'thread not accessible';
  END IF;

  SELECT * INTO v_thread FROM public.message_threads WHERE id = p_thread_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'thread not found';
  END IF;

  IF length(trim(p_content)) = 0 AND (p_attachments IS NULL OR jsonb_array_length(p_attachments) = 0) THEN
    RAISE EXCEPTION 'empty message';
  END IF;

  -- parent_message_id のスレッド整合性検証
  IF p_parent_message_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.messages
      WHERE id = p_parent_message_id AND thread_id = p_thread_id
    ) THEN
      RAISE EXCEPTION 'parent message not in thread';
    END IF;
  END IF;

  INSERT INTO public.messages (thread_id, sender_id, content, parent_message_id)
  VALUES (
    p_thread_id,
    v_uid,
    COALESCE(p_content, ''),
    p_parent_message_id
  )
  RETURNING * INTO v_msg;

  -- メンション: 対象ユーザーがスレッドにアクセス可能な場合のみ挿入
  -- NULL 要素およびアクセス不可ユーザーは silent skip（UX 保持のためエラーにしない）
  IF p_mentioned_user_ids IS NOT NULL THEN
    FOREACH v_mention_id IN ARRAY p_mentioned_user_ids
    LOOP
      IF v_mention_id IS NULL THEN
        CONTINUE;
      END IF;
      IF NOT public.can_user_access_thread(v_mention_id, p_thread_id) THEN
        CONTINUE;
      END IF;
      INSERT INTO public.message_mentions (message_id, mentioned_user_id)
      VALUES (v_msg.id, v_mention_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  -- 添付: storage_path が {organization_id}/{thread_id}/{message_id}/... の
  -- パス規約を満たすことを厳格に検証。規約違反は EXCEPTION で全ロールバック。
  IF p_attachments IS NOT NULL THEN
    FOR v_attachment IN SELECT * FROM jsonb_array_elements(p_attachments)
    LOOP
      v_storage_path := v_attachment->>'storage_path';
      IF v_storage_path IS NULL
         OR split_part(v_storage_path, '/', 1) <> v_thread.organization_id
         OR split_part(v_storage_path, '/', 2) <> p_thread_id
         OR split_part(v_storage_path, '/', 3) <> v_msg.id THEN
        RAISE EXCEPTION 'attachment storage_path violates path convention: %', v_storage_path;
      END IF;

      INSERT INTO public.message_attachments (
        message_id, storage_path, file_name, mime_type, byte_size, width, height
      ) VALUES (
        v_msg.id,
        v_storage_path,
        v_attachment->>'file_name',
        v_attachment->>'mime_type',
        (v_attachment->>'byte_size')::bigint,
        NULLIF(v_attachment->>'width', '')::int,
        NULLIF(v_attachment->>'height', '')::int
      );
    END LOOP;
  END IF;

  RETURN QUERY SELECT v_msg.id, v_msg.thread_id, v_msg.sender_id, v_msg.content, v_msg.parent_message_id, v_msg.created_at;
END;
$$;

ALTER FUNCTION public.send_message_v2(text, text, text, text[], jsonb) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.send_message_v2(text, text, text, text[], jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. Defense-in-depth: notify_on_message_mention トリガに
--    can_user_access_thread ガードを追加。RPC/RLS 双方を仮に迂回しても
--    通知レコードの作成だけは防ぐ。
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_on_message_mention()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_message public.messages%ROWTYPE;
  v_thread public.message_threads%ROWTYPE;
  v_sender_name text;
  v_preview text;
BEGIN
  SELECT * INTO v_message FROM public.messages WHERE id = NEW.message_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  -- 自分自身へのメンションはスキップ
  IF v_message.sender_id = NEW.mentioned_user_id THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_thread FROM public.message_threads WHERE id = v_message.thread_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Defense-in-depth: 対象ユーザーがスレッドにアクセス可能でない場合、
  -- mention 行は残るが notification は作らない（クロステナント通知の封じ込め）
  IF NOT public.can_user_access_thread(NEW.mentioned_user_id, v_thread.id) THEN
    RETURN NEW;
  END IF;

  SELECT display_name INTO v_sender_name FROM public.profiles WHERE id = v_message.sender_id;
  v_sender_name := COALESCE(v_sender_name, '匿名ユーザー');
  v_preview := LEFT(regexp_replace(COALESCE(v_message.content, ''), E'[\n\r]+', ' ', 'g'), 120);

  INSERT INTO public.notifications (
    organization_id, user_id, type, title, body, action_url, metadata
  ) VALUES (
    v_thread.organization_id,
    NEW.mentioned_user_id,
    'message_received',
    v_sender_name || ' さんがあなたをメンションしました',
    v_preview,
    '/messages?thread=' || v_thread.id,
    jsonb_build_object(
      'thread_id', v_thread.id,
      'message_id', v_message.id,
      'sender_id', v_message.sender_id,
      'mention', true
    )
  );

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.notify_on_message_mention() OWNER TO postgres;
