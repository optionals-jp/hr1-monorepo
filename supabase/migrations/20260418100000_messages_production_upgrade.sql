-- =============================================================================
-- HR-27 メッセージ機能 製品レベル化
--
-- 既存の message_threads / messages を非破壊的に拡張する。
--   - 添付ファイル (message_attachments + Storage バケット)
--   - リアクション (message_reactions)
--   - メンション (message_mentions)
--   - スレッド返信 (messages.parent_message_id)
--   - 全文検索 (messages.search_tsv + GIN インデックス)
--   - per-user 既読状態 (thread_read_states)
--   - Push 通知トリガ (notifications 経由で既存の send_push が発火)
--   - スレッド denorm 列 (last_message_at / last_message_id) でリスト表示を高速化
--   - 送信 RPC (send_message_v2) でメッセージ+添付+メンションを原子的に作成
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. get_my_accessible_thread_ids をチャンネルメンバー限定版に更新
--    baseline は admin/employee に対して組織内の全チャンネルを可視化していたが、
--    本番要件では自分が channel_members に登録されたチャンネルのみ見せる。
--    DM は従来どおり「参加者本人」または「同組織の admin/employee」がアクセス可能。
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_my_accessible_thread_ids()
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- 自分が参加者の DM
  SELECT id FROM message_threads
  WHERE is_channel = false
    AND participant_id = auth.uid()::text
  UNION
  -- 同一組織内の DM (admin/employee のみ)
  SELECT id FROM message_threads
  WHERE is_channel = false
    AND organization_id IN (SELECT public.get_my_organization_ids())
    AND public.get_my_role() IN ('admin', 'employee')
  UNION
  -- 自分がメンバーのチャンネルのみ
  SELECT thread_id FROM channel_members
  WHERE user_id = auth.uid()::text;
$$;

ALTER FUNCTION public.get_my_accessible_thread_ids() OWNER TO postgres;

-- ---------------------------------------------------------------------------
-- 1. messages カラム追加
-- ---------------------------------------------------------------------------

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS parent_message_id text
    REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS search_tsv tsvector
    GENERATED ALWAYS AS (to_tsvector('simple', coalesce(content, ''))) STORED;

COMMENT ON COLUMN public.messages.parent_message_id IS '返信元メッセージID（NULLはトップレベル）';
COMMENT ON COLUMN public.messages.deleted_at IS 'ソフトデリート用。NULL=生存、非NULL=削除済み';
COMMENT ON COLUMN public.messages.search_tsv IS '全文検索用 tsvector（contentから自動生成）';

CREATE INDEX IF NOT EXISTS idx_messages_parent ON public.messages (parent_message_id)
  WHERE parent_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_search_tsv ON public.messages USING GIN (search_tsv);
CREATE INDEX IF NOT EXISTS idx_messages_not_deleted ON public.messages (thread_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- 2. message_threads denorm 列
-- ---------------------------------------------------------------------------

ALTER TABLE public.message_threads
  ADD COLUMN IF NOT EXISTS last_message_id text,
  ADD COLUMN IF NOT EXISTS last_message_at timestamptz;

COMMENT ON COLUMN public.message_threads.last_message_id IS '最新メッセージID（denorm）';
COMMENT ON COLUMN public.message_threads.last_message_at IS '最新メッセージ時刻（denorm）。ソート/並び替え用';

CREATE INDEX IF NOT EXISTS idx_message_threads_last_message_at
  ON public.message_threads (organization_id, last_message_at DESC NULLS LAST);

-- 既存データの埋め戻し
UPDATE public.message_threads mt
SET
  last_message_id = sub.id,
  last_message_at = sub.created_at
FROM (
  SELECT DISTINCT ON (thread_id) thread_id, id, created_at
  FROM public.messages
  ORDER BY thread_id, created_at DESC
) sub
WHERE mt.id = sub.thread_id
  AND (mt.last_message_id IS DISTINCT FROM sub.id OR mt.last_message_at IS DISTINCT FROM sub.created_at);

-- ---------------------------------------------------------------------------
-- 3. message_attachments
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  byte_size bigint NOT NULL,
  width integer,
  height integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT message_attachments_byte_size_positive CHECK (byte_size >= 0),
  CONSTRAINT message_attachments_byte_size_limit CHECK (byte_size <= 26214400),
  CONSTRAINT message_attachments_file_name_not_empty CHECK (length(trim(file_name)) > 0)
);

COMMENT ON TABLE public.message_attachments IS 'メッセージ添付ファイル。Storage バケット message-attachments のパスを保持';

CREATE INDEX IF NOT EXISTS idx_message_attachments_message ON public.message_attachments (message_id);

ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

-- SELECT: メッセージにアクセス可能なユーザー
DROP POLICY IF EXISTS message_attachments_select_accessible ON public.message_attachments;
CREATE POLICY message_attachments_select_accessible ON public.message_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_attachments.message_id
        AND m.thread_id IN (SELECT public.get_my_accessible_thread_ids())
    )
  );

-- INSERT: 自分が送信者のメッセージへの添付のみ
DROP POLICY IF EXISTS message_attachments_insert_sender ON public.message_attachments;
CREATE POLICY message_attachments_insert_sender ON public.message_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_attachments.message_id
        AND m.sender_id = auth.uid()::text
    )
  );

-- DELETE: 送信者のみ
DROP POLICY IF EXISTS message_attachments_delete_sender ON public.message_attachments;
CREATE POLICY message_attachments_delete_sender ON public.message_attachments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_attachments.message_id
        AND m.sender_id = auth.uid()::text
    )
  );

-- ---------------------------------------------------------------------------
-- 4. message_reactions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT message_reactions_emoji_length CHECK (length(emoji) BETWEEN 1 AND 32),
  CONSTRAINT message_reactions_unique UNIQUE (message_id, user_id, emoji)
);

COMMENT ON TABLE public.message_reactions IS 'メッセージに対する絵文字リアクション';

CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON public.message_reactions (message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user ON public.message_reactions (user_id);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS message_reactions_select_accessible ON public.message_reactions;
CREATE POLICY message_reactions_select_accessible ON public.message_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_reactions.message_id
        AND m.thread_id IN (SELECT public.get_my_accessible_thread_ids())
    )
  );

DROP POLICY IF EXISTS message_reactions_insert_self ON public.message_reactions;
CREATE POLICY message_reactions_insert_self ON public.message_reactions
  FOR INSERT WITH CHECK (
    user_id = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_reactions.message_id
        AND m.thread_id IN (SELECT public.get_my_accessible_thread_ids())
    )
  );

DROP POLICY IF EXISTS message_reactions_delete_self ON public.message_reactions;
CREATE POLICY message_reactions_delete_self ON public.message_reactions
  FOR DELETE USING (user_id = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- 5. message_mentions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.message_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  mentioned_user_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT message_mentions_unique UNIQUE (message_id, mentioned_user_id)
);

COMMENT ON TABLE public.message_mentions IS 'メッセージ内で @メンションされたユーザー';

CREATE INDEX IF NOT EXISTS idx_message_mentions_message ON public.message_mentions (message_id);
CREATE INDEX IF NOT EXISTS idx_message_mentions_user ON public.message_mentions (mentioned_user_id);

ALTER TABLE public.message_mentions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS message_mentions_select_accessible ON public.message_mentions;
CREATE POLICY message_mentions_select_accessible ON public.message_mentions
  FOR SELECT USING (
    mentioned_user_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_mentions.message_id
        AND m.thread_id IN (SELECT public.get_my_accessible_thread_ids())
    )
  );

-- INSERT は送信 RPC (send_message_v2) 経由 SECURITY DEFINER のみ想定。
-- 直接 INSERT させる必要はないがバックフィル用に送信者経由は許可。
DROP POLICY IF EXISTS message_mentions_insert_sender ON public.message_mentions;
CREATE POLICY message_mentions_insert_sender ON public.message_mentions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_mentions.message_id
        AND m.sender_id = auth.uid()::text
    )
  );

-- ---------------------------------------------------------------------------
-- 6. thread_read_states（per-user 既読状態）
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.thread_read_states (
  thread_id text NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);

COMMENT ON TABLE public.thread_read_states IS 'スレッドごとのユーザー別既読状態。DM・チャンネルの未読件数算出に使用';

CREATE INDEX IF NOT EXISTS idx_thread_read_states_user ON public.thread_read_states (user_id);

DROP TRIGGER IF EXISTS set_thread_read_states_updated_at ON public.thread_read_states;
CREATE TRIGGER set_thread_read_states_updated_at
  BEFORE UPDATE ON public.thread_read_states
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.thread_read_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS thread_read_states_select_self ON public.thread_read_states;
CREATE POLICY thread_read_states_select_self ON public.thread_read_states
  FOR SELECT USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS thread_read_states_upsert_self ON public.thread_read_states;
CREATE POLICY thread_read_states_upsert_self ON public.thread_read_states
  FOR INSERT WITH CHECK (
    user_id = auth.uid()::text
    AND thread_id IN (SELECT public.get_my_accessible_thread_ids())
  );

DROP POLICY IF EXISTS thread_read_states_update_self ON public.thread_read_states;
CREATE POLICY thread_read_states_update_self ON public.thread_read_states
  FOR UPDATE USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- 7. Storage バケット: message-attachments
-- ---------------------------------------------------------------------------

-- サイズ上限 25 MiB、MIME は画像/動画/ドキュメント/テキストのホワイトリスト。
-- クライアント側のチェックと二重防御でサーバ側でも拒否する。
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-attachments',
  'message-attachments',
  false,
  26214400,
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif',
    'video/mp4', 'video/quicktime',
    'application/pdf', 'application/zip',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- パス規約: {organization_id}/{thread_id}/{message_id}/{file_name}
-- 最上位フォルダが organization_id、2番目が thread_id

-- INSERT: スレッドにアクセスできるユーザーのみ、自分のorgパス内に限る
DROP POLICY IF EXISTS message_attachments_storage_insert ON storage.objects;
CREATE POLICY message_attachments_storage_insert ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'message-attachments'
    AND (storage.foldername(name))[2] IN (SELECT public.get_my_accessible_thread_ids())
  );

-- SELECT: スレッドにアクセスできるユーザーのみ
DROP POLICY IF EXISTS message_attachments_storage_select ON storage.objects;
CREATE POLICY message_attachments_storage_select ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'message-attachments'
    AND (storage.foldername(name))[2] IN (SELECT public.get_my_accessible_thread_ids())
  );

-- DELETE: パス規約 {organization_id}/{thread_id}/{message_id}/{file_name} を前提に、
--   (1) 該当 thread にアクセス可能、かつ
--   (2) 該当 message の sender_id が自分
-- の場合のみ削除可。
-- message_id を messages.sender_id と突き合わせるため、messages.id が物理削除される前に
-- Storage 側も先行削除する運用を想定（CASCADE による行消失で EXISTS が false になる
-- 順序問題を避ける）。
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
-- 8. スレッド denorm 更新トリガ
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_thread_last_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.message_threads
  SET
    last_message_id = NEW.id,
    last_message_at = NEW.created_at,
    updated_at = NEW.created_at
  WHERE id = NEW.thread_id
    AND (last_message_at IS NULL OR last_message_at <= NEW.created_at);
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.update_thread_last_message() OWNER TO postgres;

-- 既存の trg_update_thread_updated_at は updated_at のみ更新していたので置換
DROP TRIGGER IF EXISTS trg_update_thread_updated_at ON public.messages;
DROP TRIGGER IF EXISTS trg_update_thread_last_message ON public.messages;
CREATE TRIGGER trg_update_thread_last_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_thread_last_message();

-- ---------------------------------------------------------------------------
-- 9. 通知挿入トリガ (notifications 経由で Push が自動配信される)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_on_message_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_thread public.message_threads%ROWTYPE;
  v_sender_name text;
  v_preview text;
  v_target_user text;
  v_action_url text;
BEGIN
  SELECT * INTO v_thread FROM public.message_threads WHERE id = NEW.thread_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  SELECT display_name INTO v_sender_name FROM public.profiles WHERE id = NEW.sender_id;
  v_sender_name := COALESCE(v_sender_name, '匿名ユーザー');

  v_preview := LEFT(regexp_replace(COALESCE(NEW.content, ''), E'[\n\r]+', ' ', 'g'), 120);
  v_action_url := '/messages?thread=' || NEW.thread_id;

  -- A) DM: 参加者（送信者以外）に通知
  IF v_thread.is_channel IS NOT TRUE AND v_thread.participant_id IS NOT NULL THEN
    IF v_thread.participant_id <> NEW.sender_id THEN
      INSERT INTO public.notifications (
        organization_id, user_id, type, title, body, action_url, metadata
      ) VALUES (
        v_thread.organization_id,
        v_thread.participant_id,
        'message_received',
        v_sender_name || ' さんからのメッセージ',
        v_preview,
        v_action_url,
        jsonb_build_object('thread_id', NEW.thread_id, 'message_id', NEW.id, 'sender_id', NEW.sender_id)
      );
    END IF;

    -- 送信者が applicant の場合、管理者にも通知
    IF v_thread.participant_type = 'applicant' AND NEW.sender_id = v_thread.participant_id THEN
      FOR v_target_user IN
        SELECT uo.user_id
        FROM public.user_organizations uo
        JOIN public.profiles p ON p.id = uo.user_id
        WHERE uo.organization_id = v_thread.organization_id
          AND p.role = 'admin'
          AND uo.user_id <> NEW.sender_id
      LOOP
        INSERT INTO public.notifications (
          organization_id, user_id, type, title, body, action_url, metadata
        ) VALUES (
          v_thread.organization_id,
          v_target_user,
          'message_received',
          v_sender_name || ' さん（応募者）からメッセージ',
          v_preview,
          v_action_url,
          jsonb_build_object('thread_id', NEW.thread_id, 'message_id', NEW.id, 'sender_id', NEW.sender_id)
        );
      END LOOP;
    END IF;
  END IF;

  -- B) チャンネル: メンバー（送信者以外）に通知
  IF v_thread.is_channel IS TRUE THEN
    FOR v_target_user IN
      SELECT cm.user_id
      FROM public.channel_members cm
      WHERE cm.thread_id = NEW.thread_id
        AND cm.user_id <> NEW.sender_id
    LOOP
      INSERT INTO public.notifications (
        organization_id, user_id, type, title, body, action_url, metadata
      ) VALUES (
        v_thread.organization_id,
        v_target_user,
        'message_received',
        '#' || COALESCE(v_thread.channel_name, 'チャンネル') || ' ' || v_sender_name,
        v_preview,
        v_action_url,
        jsonb_build_object('thread_id', NEW.thread_id, 'message_id', NEW.id, 'sender_id', NEW.sender_id, 'is_channel', true)
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.notify_on_message_insert() OWNER TO postgres;

DROP TRIGGER IF EXISTS trg_notify_on_message_insert ON public.messages;
CREATE TRIGGER trg_notify_on_message_insert
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_message_insert();

-- メンション通知はメンション挿入後に発火（send_message_v2 で messages→mentions の順でinsert）
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

DROP TRIGGER IF EXISTS trg_notify_on_message_mention ON public.message_mentions;
CREATE TRIGGER trg_notify_on_message_mention
  AFTER INSERT ON public.message_mentions
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_message_mention();

-- ---------------------------------------------------------------------------
-- 10. RPC: mark_thread_read（per-user 既読更新）
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.mark_thread_read(p_thread_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF p_thread_id NOT IN (SELECT public.get_my_accessible_thread_ids()) THEN
    RAISE EXCEPTION 'thread not accessible';
  END IF;

  INSERT INTO public.thread_read_states (thread_id, user_id, last_read_at, updated_at)
  VALUES (p_thread_id, auth.uid()::text, now(), now())
  ON CONFLICT (thread_id, user_id) DO UPDATE
    SET last_read_at = EXCLUDED.last_read_at,
        updated_at = EXCLUDED.updated_at;

  -- 後方互換: messages.read_at も更新（既存クライアントの互換性保持）
  UPDATE public.messages
  SET read_at = now()
  WHERE thread_id = p_thread_id
    AND sender_id <> auth.uid()::text
    AND read_at IS NULL;
END;
$$;

ALTER FUNCTION public.mark_thread_read(text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.mark_thread_read(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 11. RPC: toggle_reaction
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.toggle_message_reaction(p_message_id text, p_emoji text)
RETURNS TABLE (action text, emoji text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid text := auth.uid()::text;
  v_thread_id text;
  v_existing uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  SELECT thread_id INTO v_thread_id FROM public.messages WHERE id = p_message_id;
  IF v_thread_id IS NULL THEN
    RAISE EXCEPTION 'message not found';
  END IF;

  IF v_thread_id NOT IN (SELECT public.get_my_accessible_thread_ids()) THEN
    RAISE EXCEPTION 'message not accessible';
  END IF;

  SELECT id INTO v_existing
  FROM public.message_reactions
  WHERE message_id = p_message_id AND user_id = v_uid AND message_reactions.emoji = p_emoji;

  -- リアクション変更後は messages.updated_at を now() に bump して
  -- Realtime (postgres_changes UPDATE) で全クライアントに伝播させる。
  IF v_existing IS NOT NULL THEN
    DELETE FROM public.message_reactions WHERE id = v_existing;
    UPDATE public.messages SET updated_at = now() WHERE id = p_message_id;
    RETURN QUERY SELECT 'removed'::text, p_emoji;
  ELSE
    INSERT INTO public.message_reactions (message_id, user_id, emoji)
    VALUES (p_message_id, v_uid, p_emoji);
    UPDATE public.messages SET updated_at = now() WHERE id = p_message_id;
    RETURN QUERY SELECT 'added'::text, p_emoji;
  END IF;
END;
$$;

ALTER FUNCTION public.toggle_message_reaction(text, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.toggle_message_reaction(text, text) TO authenticated;

-- 添付追加・削除時にも messages.updated_at を bump して Realtime 伝播させる。
CREATE OR REPLACE FUNCTION public.touch_message_on_attachment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.messages
  SET updated_at = now()
  WHERE id = COALESCE(NEW.message_id, OLD.message_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

ALTER FUNCTION public.touch_message_on_attachment_change() OWNER TO postgres;

DROP TRIGGER IF EXISTS trg_touch_message_on_attachment ON public.message_attachments;
CREATE TRIGGER trg_touch_message_on_attachment
  AFTER INSERT OR DELETE ON public.message_attachments
  FOR EACH ROW EXECUTE FUNCTION public.touch_message_on_attachment_change();

-- ---------------------------------------------------------------------------
-- 12. RPC: send_message_v2（メッセージ + 添付 + メンション 原子挿入）
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
  v_msg public.messages%ROWTYPE;
  v_mention_id text;
  v_attachment jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF p_thread_id NOT IN (SELECT public.get_my_accessible_thread_ids()) THEN
    RAISE EXCEPTION 'thread not accessible';
  END IF;

  IF length(trim(p_content)) = 0 AND (p_attachments IS NULL OR jsonb_array_length(p_attachments) = 0) THEN
    RAISE EXCEPTION 'empty message';
  END IF;

  INSERT INTO public.messages (thread_id, sender_id, content, parent_message_id)
  VALUES (
    p_thread_id,
    v_uid,
    COALESCE(p_content, ''),
    p_parent_message_id
  )
  RETURNING * INTO v_msg;

  -- メンション
  IF p_mentioned_user_ids IS NOT NULL THEN
    FOREACH v_mention_id IN ARRAY p_mentioned_user_ids
    LOOP
      INSERT INTO public.message_mentions (message_id, mentioned_user_id)
      VALUES (v_msg.id, v_mention_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  -- 添付
  IF p_attachments IS NOT NULL THEN
    FOR v_attachment IN SELECT * FROM jsonb_array_elements(p_attachments)
    LOOP
      INSERT INTO public.message_attachments (
        message_id, storage_path, file_name, mime_type, byte_size, width, height
      ) VALUES (
        v_msg.id,
        v_attachment->>'storage_path',
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
-- 13. RPC: search_messages（全文検索）
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.search_messages(
  p_query text,
  p_thread_id text DEFAULT NULL,
  p_limit int DEFAULT 50
)
RETURNS TABLE (
  id text,
  thread_id text,
  sender_id text,
  content text,
  created_at timestamptz,
  rank real,
  sender_display_name text,
  thread_title text,
  channel_name text,
  is_channel boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    m.id,
    m.thread_id,
    m.sender_id,
    m.content,
    m.created_at,
    ts_rank(m.search_tsv, plainto_tsquery('simple', p_query)) AS rank,
    p.display_name AS sender_display_name,
    mt.title AS thread_title,
    mt.channel_name,
    COALESCE(mt.is_channel, false) AS is_channel
  FROM public.messages m
  JOIN public.message_threads mt ON mt.id = m.thread_id
  LEFT JOIN public.profiles p ON p.id = m.sender_id
  WHERE m.deleted_at IS NULL
    AND m.thread_id IN (SELECT public.get_my_accessible_thread_ids())
    AND (p_thread_id IS NULL OR m.thread_id = p_thread_id)
    AND (
      length(trim(p_query)) = 0
      OR m.search_tsv @@ plainto_tsquery('simple', p_query)
      OR m.content ILIKE '%' || p_query || '%'  -- 日本語など分かち書きされない言語の fallback
    )
  ORDER BY rank DESC NULLS LAST, m.created_at DESC
  LIMIT p_limit;
$$;

ALTER FUNCTION public.search_messages(text, text, int) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.search_messages(text, text, int) TO authenticated;

-- ---------------------------------------------------------------------------
-- 14. RPC: get_thread_messages（添付・リアクション・返信数含む）
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_thread_messages(
  p_thread_id text,
  p_before timestamptz DEFAULT NULL,
  p_limit int DEFAULT 30
)
RETURNS TABLE (
  id text,
  thread_id text,
  sender_id text,
  content text,
  read_at timestamptz,
  created_at timestamptz,
  edited_at timestamptz,
  deleted_at timestamptz,
  parent_message_id text,
  sender_display_name text,
  sender_avatar_url text,
  sender_role text,
  attachments jsonb,
  reactions jsonb,
  mentions jsonb,
  reply_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH msgs AS (
    SELECT m.*
    FROM public.messages m
    WHERE m.thread_id = p_thread_id
      AND m.thread_id IN (SELECT public.get_my_accessible_thread_ids())
      AND (p_before IS NULL OR m.created_at < p_before)
    ORDER BY m.created_at DESC
    LIMIT p_limit
  )
  SELECT
    m.id,
    m.thread_id,
    m.sender_id,
    m.content,
    m.read_at,
    m.created_at,
    m.edited_at,
    m.deleted_at,
    m.parent_message_id,
    p.display_name,
    p.avatar_url,
    p.role,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'id', a.id,
        'storage_path', a.storage_path,
        'file_name', a.file_name,
        'mime_type', a.mime_type,
        'byte_size', a.byte_size,
        'width', a.width,
        'height', a.height
      ) ORDER BY a.created_at)
      FROM public.message_attachments a WHERE a.message_id = m.id),
      '[]'::jsonb
    ) AS attachments,
    COALESCE(
      (SELECT jsonb_agg(r) FROM (
        SELECT emoji, array_agg(user_id ORDER BY created_at) AS user_ids, count(*) AS count
        FROM public.message_reactions
        WHERE message_id = m.id
        GROUP BY emoji
      ) r),
      '[]'::jsonb
    ) AS reactions,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('user_id', mm.mentioned_user_id))
       FROM public.message_mentions mm WHERE mm.message_id = m.id),
      '[]'::jsonb
    ) AS mentions,
    (SELECT count(*) FROM public.messages c WHERE c.parent_message_id = m.id)::bigint AS reply_count
  FROM msgs m
  LEFT JOIN public.profiles p ON p.id = m.sender_id
  ORDER BY m.created_at ASC;
$$;

ALTER FUNCTION public.get_thread_messages(text, timestamptz, int) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.get_thread_messages(text, timestamptz, int) TO authenticated;

-- ---------------------------------------------------------------------------
-- 15. 既存 get_threads_with_details を thread_read_states ベースに更新
-- ---------------------------------------------------------------------------

-- 戻り値の型が変わるので一度 DROP
DROP FUNCTION IF EXISTS public.get_threads_with_details(text, text);

CREATE OR REPLACE FUNCTION public.get_threads_with_details(p_org_id text, p_user_id text)
RETURNS TABLE (
  id text,
  organization_id text,
  participant_id text,
  participant_type text,
  title text,
  created_at timestamptz,
  updated_at timestamptz,
  last_message_at timestamptz,
  participant_display_name text,
  participant_email text,
  participant_avatar_url text,
  participant_department text,
  participant_position text,
  job_titles text,
  application_count bigint,
  latest_message_id text,
  latest_message_content text,
  latest_message_sender_id text,
  latest_message_sender_name text,
  latest_message_created_at timestamptz,
  unread_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    mt.id,
    mt.organization_id,
    mt.participant_id,
    mt.participant_type,
    mt.title,
    mt.created_at,
    mt.updated_at,
    mt.last_message_at,
    p.display_name,
    p.email,
    p.avatar_url,
    p.department,
    p.position,
    aj.job_titles,
    COALESCE(aj.app_count, 0),
    lm.id,
    lm.content,
    lm.sender_id,
    sp.display_name,
    lm.created_at,
    COALESCE(uc.cnt, 0)
  FROM public.message_threads mt
  LEFT JOIN public.profiles p ON p.id = mt.participant_id
  LEFT JOIN LATERAL (
    SELECT
      string_agg(j.title, ', ' ORDER BY a.applied_at DESC) AS job_titles,
      count(*) AS app_count
    FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE a.applicant_id = mt.participant_id
      AND a.organization_id = mt.organization_id
  ) aj ON mt.participant_type = 'applicant'
  LEFT JOIN public.messages lm ON lm.id = mt.last_message_id
  LEFT JOIN public.profiles sp ON sp.id = lm.sender_id
  LEFT JOIN LATERAL (
    SELECT count(*) AS cnt
    FROM public.messages m2
    LEFT JOIN public.thread_read_states trs
      ON trs.thread_id = m2.thread_id AND trs.user_id = p_user_id
    WHERE m2.thread_id = mt.id
      AND m2.sender_id <> p_user_id
      AND m2.deleted_at IS NULL
      AND (trs.last_read_at IS NULL OR m2.created_at > trs.last_read_at)
  ) uc ON true
  WHERE mt.organization_id = p_org_id
    AND (mt.is_channel IS NOT TRUE)
  ORDER BY mt.last_message_at DESC NULLS LAST, mt.updated_at DESC;
$$;

ALTER FUNCTION public.get_threads_with_details(text, text) OWNER TO postgres;

-- ---------------------------------------------------------------------------
-- 16. 既存 get_channels_with_details に unread_count を追加
-- ---------------------------------------------------------------------------

-- 戻り値の型が変わるので一度 DROP
DROP FUNCTION IF EXISTS public.get_channels_with_details(text);

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
  last_message_at timestamptz,
  member_count bigint,
  unread_count bigint,
  latest_message_id text,
  latest_message_content text,
  latest_message_sender_name text,
  latest_message_created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
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
    mt.last_message_at,
    (SELECT count(*) FROM public.channel_members cm WHERE cm.thread_id = mt.id)::bigint AS member_count,
    COALESCE((
      SELECT count(*)
      FROM public.messages m
      LEFT JOIN public.thread_read_states trs
        ON trs.thread_id = m.thread_id AND trs.user_id = auth.uid()::text
      WHERE m.thread_id = mt.id
        AND m.sender_id <> auth.uid()::text
        AND m.deleted_at IS NULL
        AND (trs.last_read_at IS NULL OR m.created_at > trs.last_read_at)
    ), 0)::bigint AS unread_count,
    lm.id,
    lm.content,
    (SELECT pp.display_name FROM public.profiles pp WHERE pp.id = lm.sender_id),
    lm.created_at
  FROM public.message_threads mt
  LEFT JOIN public.messages lm ON lm.id = mt.last_message_id
  WHERE mt.organization_id = p_org_id
    AND mt.is_channel = true
    AND mt.id IN (SELECT public.get_my_accessible_thread_ids())
  ORDER BY mt.last_message_at DESC NULLS LAST, mt.updated_at DESC;
$$;

ALTER FUNCTION public.get_channels_with_details(text) OWNER TO postgres;

-- ---------------------------------------------------------------------------
-- 17. RPC: get_unread_mention_count（未読メンション数）
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_unread_mention_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(count(*), 0)::bigint
  FROM public.message_mentions mm
  JOIN public.messages m ON m.id = mm.message_id
  LEFT JOIN public.thread_read_states trs
    ON trs.thread_id = m.thread_id AND trs.user_id = auth.uid()::text
  WHERE mm.mentioned_user_id = auth.uid()::text
    AND m.deleted_at IS NULL
    AND (trs.last_read_at IS NULL OR m.created_at > trs.last_read_at);
$$;

ALTER FUNCTION public.get_unread_mention_count() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.get_unread_mention_count() TO authenticated;
