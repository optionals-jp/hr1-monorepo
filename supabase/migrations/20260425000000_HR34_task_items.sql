-- HR-34: 新タスク管理 (TaskItem) 系の Supabase スキーマ。
--
-- 構造:
--   task_items                : 業務 / 開発タスクの本体（kind/type/priority/status/source 等）
--   task_item_checklist_items : チェックリスト
--   task_item_attachments     : 添付ファイルメタ（Storage 連携は別チケット）
--   task_item_comments        : コメント
--   task_item_relations       : タスク間関連（双方向はトリガで同期）
--   task_item_reads           : per-user の最終既読時刻（unread 判定用）
--   profiles.avatar_color     : 既存テーブルへのカラム追加（タスクアバター色）
--
-- ドメイン enum 値（必ず Dart 側 `task_item.dart` の enum と同期）:
--   TaskKind     : biz, dev
--   TaskPriority : urgent, high, mid, low
--   TaskStatus   : backlog, todo, inprogress, review, qa, done
--   TaskSource   : crm, project, workflow, mention, dev, self
--   DevTaskType  : epic, story, task, bug, subtask
--   RelationKind : blocks, blockedBy, relatesTo, duplicates, duplicatedBy

-- =============================================================================
-- 0. profiles.avatar_color 追加
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_color text
    CHECK (avatar_color IS NULL OR avatar_color ~ '^#[0-9A-Fa-f]{6}$');

-- =============================================================================
-- 1. task_items (本体)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.task_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('biz','dev')),
  type text NOT NULL CHECK (type IN ('epic','story','task','bug','subtask')),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  priority text NOT NULL CHECK (priority IN ('urgent','high','mid','low')),
  status text NOT NULL CHECK (status IN ('backlog','todo','inprogress','review','qa','done')),
  source text NOT NULL CHECK (source IN ('crm','project','workflow','mention','dev','self')),
  -- 退職者がアサインしたタスクは残すが「不明」になる。Dart 側は assigner を null
  -- 許容に変えるか別途 fallback 表示する。NOT NULL にしないことで履歴が消えない。
  assigner_id text REFERENCES public.profiles(id) ON DELETE SET NULL,
  assignee_id text REFERENCES public.profiles(id) ON DELETE SET NULL,
  reporter_id text REFERENCES public.profiles(id) ON DELETE SET NULL,
  due date,
  related_name text,
  parent_id uuid REFERENCES public.task_items(id) ON DELETE SET NULL,
  sprint_id text,
  sp integer,
  labels text[] NOT NULL DEFAULT '{}',
  branch text,
  pr_num integer,
  env text,
  repro text[] NOT NULL DEFAULT '{}',
  comment_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT task_items_no_self_parent CHECK (parent_id IS NULL OR parent_id <> id)
);

-- 親 task_items を辿って循環がないことを検証。
CREATE OR REPLACE FUNCTION public.task_items_check_no_cycle()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  cur uuid := NEW.parent_id;
  hops integer := 0;
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;
  WHILE cur IS NOT NULL LOOP
    IF cur = NEW.id THEN
      RAISE EXCEPTION 'task_items: parent chain creates a cycle (id=%)', NEW.id;
    END IF;
    hops := hops + 1;
    IF hops > 32 THEN
      RAISE EXCEPTION 'task_items: parent chain too deep (id=%)', NEW.id;
    END IF;
    SELECT parent_id INTO cur FROM public.task_items WHERE id = cur;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS task_items_check_no_cycle_biud ON public.task_items;
CREATE TRIGGER task_items_check_no_cycle_biud
  BEFORE INSERT OR UPDATE OF parent_id ON public.task_items
  FOR EACH ROW EXECUTE FUNCTION public.task_items_check_no_cycle();

DROP TRIGGER IF EXISTS set_task_items_updated_at ON public.task_items;
CREATE TRIGGER set_task_items_updated_at
  BEFORE UPDATE ON public.task_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_task_items_org_status_due
  ON public.task_items (organization_id, status, due);
CREATE INDEX IF NOT EXISTS idx_task_items_org_assignee
  ON public.task_items (organization_id, assignee_id);
CREATE INDEX IF NOT EXISTS idx_task_items_parent
  ON public.task_items (parent_id) WHERE parent_id IS NOT NULL;

ALTER TABLE public.task_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS task_items_select_org ON public.task_items;
CREATE POLICY task_items_select_org ON public.task_items
  FOR SELECT
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS task_items_insert_org ON public.task_items;
CREATE POLICY task_items_insert_org ON public.task_items
  FOR INSERT
  WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS task_items_update_org ON public.task_items;
CREATE POLICY task_items_update_org ON public.task_items
  FOR UPDATE
  USING (organization_id IN (SELECT public.get_my_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS task_items_delete_org ON public.task_items;
CREATE POLICY task_items_delete_org ON public.task_items
  FOR DELETE
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_items TO authenticated;

-- =============================================================================
-- 2. task_item_checklist_items
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.task_item_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.task_items(id) ON DELETE CASCADE,
  -- RLS 高速化のため organization_id を非正規化保持。INSERT 時にトリガで親から伝搬。
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  label text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_task_item_checklist_items_updated_at ON public.task_item_checklist_items;
CREATE TRIGGER set_task_item_checklist_items_updated_at
  BEFORE UPDATE ON public.task_item_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_task_item_checklist_task_sort
  ON public.task_item_checklist_items (task_id, sort_order);

ALTER TABLE public.task_item_checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS task_item_checklist_items_select_org ON public.task_item_checklist_items;
CREATE POLICY task_item_checklist_items_select_org ON public.task_item_checklist_items
  FOR SELECT
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS task_item_checklist_items_insert_org ON public.task_item_checklist_items;
CREATE POLICY task_item_checklist_items_insert_org ON public.task_item_checklist_items
  FOR INSERT
  WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS task_item_checklist_items_update_org ON public.task_item_checklist_items;
CREATE POLICY task_item_checklist_items_update_org ON public.task_item_checklist_items
  FOR UPDATE
  USING (organization_id IN (SELECT public.get_my_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS task_item_checklist_items_delete_org ON public.task_item_checklist_items;
CREATE POLICY task_item_checklist_items_delete_org ON public.task_item_checklist_items
  FOR DELETE
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_item_checklist_items TO authenticated;

-- =============================================================================
-- 3. task_item_attachments
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.task_item_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.task_items(id) ON DELETE CASCADE,
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  storage_path text,
  mime_type text,
  size_bytes bigint NOT NULL DEFAULT 0,
  uploaded_by text REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_task_item_attachments_updated_at ON public.task_item_attachments;
CREATE TRIGGER set_task_item_attachments_updated_at
  BEFORE UPDATE ON public.task_item_attachments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_task_item_attachments_task
  ON public.task_item_attachments (task_id);

ALTER TABLE public.task_item_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS task_item_attachments_select_org ON public.task_item_attachments;
CREATE POLICY task_item_attachments_select_org ON public.task_item_attachments
  FOR SELECT
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS task_item_attachments_insert_org ON public.task_item_attachments;
CREATE POLICY task_item_attachments_insert_org ON public.task_item_attachments
  FOR INSERT
  WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS task_item_attachments_update_org ON public.task_item_attachments;
CREATE POLICY task_item_attachments_update_org ON public.task_item_attachments
  FOR UPDATE
  USING (organization_id IN (SELECT public.get_my_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS task_item_attachments_delete_org ON public.task_item_attachments;
CREATE POLICY task_item_attachments_delete_org ON public.task_item_attachments
  FOR DELETE
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_item_attachments TO authenticated;

-- =============================================================================
-- 4. task_item_comments
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.task_item_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.task_items(id) ON DELETE CASCADE,
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- 投稿者退職時もコメント本文は残す。
  author_id text REFERENCES public.profiles(id) ON DELETE SET NULL,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_task_item_comments_updated_at ON public.task_item_comments;
CREATE TRIGGER set_task_item_comments_updated_at
  BEFORE UPDATE ON public.task_item_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_task_item_comments_task_created
  ON public.task_item_comments (task_id, created_at);

ALTER TABLE public.task_item_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS task_item_comments_select_org ON public.task_item_comments;
CREATE POLICY task_item_comments_select_org ON public.task_item_comments
  FOR SELECT
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS task_item_comments_insert_org ON public.task_item_comments;
CREATE POLICY task_item_comments_insert_org ON public.task_item_comments
  FOR INSERT
  WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS task_item_comments_update_org ON public.task_item_comments;
CREATE POLICY task_item_comments_update_org ON public.task_item_comments
  FOR UPDATE
  USING (organization_id IN (SELECT public.get_my_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS task_item_comments_delete_org ON public.task_item_comments;
CREATE POLICY task_item_comments_delete_org ON public.task_item_comments
  FOR DELETE
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_item_comments TO authenticated;

-- comment_count の同期トリガ。
CREATE OR REPLACE FUNCTION public.task_item_comments_count_aiud()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.task_items
       SET comment_count = comment_count + 1
     WHERE id = NEW.task_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.task_items
       SET comment_count = GREATEST(comment_count - 1, 0)
     WHERE id = OLD.task_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS task_item_comments_count_ai ON public.task_item_comments;
CREATE TRIGGER task_item_comments_count_ai
  AFTER INSERT ON public.task_item_comments
  FOR EACH ROW EXECUTE FUNCTION public.task_item_comments_count_aiud();

DROP TRIGGER IF EXISTS task_item_comments_count_ad ON public.task_item_comments;
CREATE TRIGGER task_item_comments_count_ad
  AFTER DELETE ON public.task_item_comments
  FOR EACH ROW EXECUTE FUNCTION public.task_item_comments_count_aiud();

-- =============================================================================
-- 5. task_item_relations
-- =============================================================================
--
-- ・1 ペア (task_id, related_task_id) に対し UNIQUE。kind は属性で UPSERT される。
-- ・related_task_id 側の FK は CASCADE せず、ミラートリガと衝突しない様
--   親削除時は本体 task_items の DELETE CASCADE で task_id 経由のみで消える。
-- ・双方向はトリガで反対側を同期。pg_trigger_depth() ガードで再帰防止。

CREATE TABLE IF NOT EXISTS public.task_item_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.task_items(id) ON DELETE CASCADE,
  related_task_id uuid NOT NULL REFERENCES public.task_items(id),
  kind text NOT NULL CHECK (kind IN ('blocks','blockedBy','relatesTo','duplicates','duplicatedBy')),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT task_item_relations_no_self CHECK (task_id <> related_task_id),
  CONSTRAINT task_item_relations_pair_unique UNIQUE (task_id, related_task_id)
);

CREATE INDEX IF NOT EXISTS idx_task_item_relations_task
  ON public.task_item_relations (task_id, kind);
CREATE INDEX IF NOT EXISTS idx_task_item_relations_related
  ON public.task_item_relations (related_task_id);

ALTER TABLE public.task_item_relations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS task_item_relations_select_org ON public.task_item_relations;
CREATE POLICY task_item_relations_select_org ON public.task_item_relations
  FOR SELECT
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS task_item_relations_insert_org ON public.task_item_relations;
CREATE POLICY task_item_relations_insert_org ON public.task_item_relations
  FOR INSERT
  WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS task_item_relations_update_org ON public.task_item_relations;
CREATE POLICY task_item_relations_update_org ON public.task_item_relations
  FOR UPDATE
  USING (organization_id IN (SELECT public.get_my_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS task_item_relations_delete_org ON public.task_item_relations;
CREATE POLICY task_item_relations_delete_org ON public.task_item_relations
  FOR DELETE
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_item_relations TO authenticated;

-- 双方向同期トリガ。`pg_trigger_depth()` ガードで再帰停止。
CREATE OR REPLACE FUNCTION public.task_item_relations_mirror_aiud()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  inverse text;
BEGIN
  -- 自身（再帰呼び出し）は何もしない。
  IF pg_trigger_depth() > 1 THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    inverse := CASE NEW.kind
      WHEN 'blocks'        THEN 'blockedBy'
      WHEN 'blockedBy'     THEN 'blocks'
      WHEN 'duplicates'    THEN 'duplicatedBy'
      WHEN 'duplicatedBy'  THEN 'duplicates'
      WHEN 'relatesTo'     THEN 'relatesTo'
      ELSE NULL
    END;
    IF inverse IS NULL THEN
      RETURN NEW;
    END IF;
    INSERT INTO public.task_item_relations (
      task_id, related_task_id, kind, organization_id
    ) VALUES (
      NEW.related_task_id, NEW.task_id, inverse, NEW.organization_id
    )
    ON CONFLICT (task_id, related_task_id) DO UPDATE
      SET kind = EXCLUDED.kind;
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- kind が変わったら反対側も追従。
    IF NEW.kind = OLD.kind AND NEW.task_id = OLD.task_id
       AND NEW.related_task_id = OLD.related_task_id THEN
      RETURN NEW;
    END IF;
    inverse := CASE NEW.kind
      WHEN 'blocks'        THEN 'blockedBy'
      WHEN 'blockedBy'     THEN 'blocks'
      WHEN 'duplicates'    THEN 'duplicatedBy'
      WHEN 'duplicatedBy'  THEN 'duplicates'
      WHEN 'relatesTo'     THEN 'relatesTo'
      ELSE NULL
    END;
    IF inverse IS NULL THEN
      RETURN NEW;
    END IF;
    UPDATE public.task_item_relations
       SET kind = inverse
     WHERE task_id = NEW.related_task_id
       AND related_task_id = NEW.task_id;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.task_item_relations
     WHERE task_id = OLD.related_task_id
       AND related_task_id = OLD.task_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS task_item_relations_mirror_ai ON public.task_item_relations;
CREATE TRIGGER task_item_relations_mirror_ai
  AFTER INSERT ON public.task_item_relations
  FOR EACH ROW EXECUTE FUNCTION public.task_item_relations_mirror_aiud();

DROP TRIGGER IF EXISTS task_item_relations_mirror_au ON public.task_item_relations;
CREATE TRIGGER task_item_relations_mirror_au
  AFTER UPDATE ON public.task_item_relations
  FOR EACH ROW EXECUTE FUNCTION public.task_item_relations_mirror_aiud();

DROP TRIGGER IF EXISTS task_item_relations_mirror_ad ON public.task_item_relations;
CREATE TRIGGER task_item_relations_mirror_ad
  AFTER DELETE ON public.task_item_relations
  FOR EACH ROW EXECUTE FUNCTION public.task_item_relations_mirror_aiud();

-- 親 task_items が削除された時、related_task_id 側の relation も一緒に消す。
-- related_task_id の FK が ON DELETE NO ACTION のため明示削除が必要。
CREATE OR REPLACE FUNCTION public.task_items_cleanup_relations_bd()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.task_item_relations WHERE related_task_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS task_items_cleanup_relations_bd ON public.task_items;
CREATE TRIGGER task_items_cleanup_relations_bd
  BEFORE DELETE ON public.task_items
  FOR EACH ROW EXECUTE FUNCTION public.task_items_cleanup_relations_bd();

-- =============================================================================
-- 6. task_item_reads (per-user 既読時刻)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.task_item_reads (
  task_id uuid NOT NULL REFERENCES public.task_items(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, user_id)
);

DROP TRIGGER IF EXISTS set_task_item_reads_updated_at ON public.task_item_reads;
CREATE TRIGGER set_task_item_reads_updated_at
  BEFORE UPDATE ON public.task_item_reads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_task_item_reads_user
  ON public.task_item_reads (user_id, task_id);

ALTER TABLE public.task_item_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS task_item_reads_select_self ON public.task_item_reads;
CREATE POLICY task_item_reads_select_self ON public.task_item_reads
  FOR SELECT
  USING (
    user_id = auth.uid()::text
    AND organization_id IN (SELECT public.get_my_organization_ids())
  );

DROP POLICY IF EXISTS task_item_reads_insert_self ON public.task_item_reads;
CREATE POLICY task_item_reads_insert_self ON public.task_item_reads
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()::text
    AND organization_id IN (SELECT public.get_my_organization_ids())
  );

DROP POLICY IF EXISTS task_item_reads_update_self ON public.task_item_reads;
CREATE POLICY task_item_reads_update_self ON public.task_item_reads
  FOR UPDATE
  USING (
    user_id = auth.uid()::text
    AND organization_id IN (SELECT public.get_my_organization_ids())
  )
  WITH CHECK (
    user_id = auth.uid()::text
    AND organization_id IN (SELECT public.get_my_organization_ids())
  );

DROP POLICY IF EXISTS task_item_reads_delete_self ON public.task_item_reads;
CREATE POLICY task_item_reads_delete_self ON public.task_item_reads
  FOR DELETE
  USING (
    user_id = auth.uid()::text
    AND organization_id IN (SELECT public.get_my_organization_ids())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_item_reads TO authenticated;
