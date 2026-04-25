-- HR-34 follow-up: task_items に per-organization 連番キー (seq) を追加。
--
-- 目的:
--   Linear / Jira / GitHub Issues の `#42` のような企業ごとに #1 から始まる
--   人間可読な ID をユーザに見せる。Supabase の uuid `id` は内部キーのまま
--   保持し、UI には `seq` を表示する。
--
-- 設計（プランレビュー反映済み）:
--   - 1 組織につき 1 行の counter テーブル `task_item_seq_counters` を作る。
--   - 採番は `INSERT ... ON CONFLICT DO UPDATE ... RETURNING last_value` の
--     行ロックでアトミック保証（READ COMMITTED でも安全）。
--   - クライアント直接アクセス禁止: RLS ON + ポリシー無し + REVOKE。
--     SECURITY DEFINER 関数経由でのみ counter を操作する。
--   - 並行 INSERT は同一 org の counter 行で row lock → 直列化。
--   - 不正系: task_items の RLS WITH CHECK で他社 org への INSERT は段階で
--     reject。BEFORE トリガが counter を一時 increment しても外側 ROLLBACK
--     で戻るため counter 漏洩なし（同一 TX 内のため）。
--   - 欠番: 外側 INSERT が ROLLBACK されると increment が消えて欠番になる。
--     Linear/Jira 同様の業界標準仕様として許容する。
--   - backfill 中の race 防止に冒頭で `LOCK TABLE ... IN EXCLUSIVE MODE` を
--     取得し、新規 INSERT を migration 完了まで待たせる。
--
-- ロールバック手順（緊急時）:
--   DROP TRIGGER task_items_assign_seq_biud ON public.task_items;
--   DROP FUNCTION public.task_items_assign_seq();
--   ALTER TABLE public.task_items DROP CONSTRAINT task_items_org_seq_unique;
--   ALTER TABLE public.task_items DROP COLUMN seq;
--   DROP TABLE public.task_item_seq_counters;
--   ※ アプリケーション側のリリースを必ず先に戻す（DB → App の逆順）。
--
-- デプロイ順序:
--   1) 本マイグレーションを DB に適用（既存タスクは backfill される）
--   2) アプリ（Flutter）リリースで `seq` を読む / `#${task.seq}` を表示

BEGIN;

-- =============================================================================
-- 0. backfill 中の race を完全防止するため、トランザクション冒頭で
--    task_items テーブルを排他ロック。新規 INSERT/UPDATE/DELETE は
--    migration 完了まで待機する。マイグレーションは数秒で終わる想定。
-- =============================================================================

LOCK TABLE public.task_items IN EXCLUSIVE MODE;

-- =============================================================================
-- 1. counter テーブル
-- =============================================================================
-- - 1 行 / 組織。
-- - クライアント直接アクセス完全禁止: RLS ON + ポリシー無し + REVOKE。
-- - SECURITY DEFINER 関数 `task_items_assign_seq()` 経由でのみ書込可。
-- - service_role は RLS バイパスなのでマイグレーション/管理ジョブから操作可。

CREATE TABLE IF NOT EXISTS public.task_item_seq_counters (
  organization_id text PRIMARY KEY
    REFERENCES public.organizations(id) ON DELETE CASCADE,
  last_value bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_item_seq_counters ENABLE ROW LEVEL SECURITY;

-- 既存ポリシーがあれば全削除（idempotent 化のため）。
-- このテーブルは「ポリシー無し = どのロールも RLS 経由ではアクセス不可」
-- という意図的な密封状態を維持する。
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'public.task_item_seq_counters'::regclass
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.task_item_seq_counters', r.polname
    );
  END LOOP;
END $$;

REVOKE ALL ON public.task_item_seq_counters FROM authenticated, anon, PUBLIC;

DROP TRIGGER IF EXISTS set_task_item_seq_counters_updated_at
  ON public.task_item_seq_counters;
CREATE TRIGGER set_task_item_seq_counters_updated_at
  BEFORE UPDATE ON public.task_item_seq_counters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- 2. task_items.seq 列
-- =============================================================================

ALTER TABLE public.task_items ADD COLUMN IF NOT EXISTS seq bigint;

-- =============================================================================
-- 3. 既存タスクのバックフィル
-- =============================================================================
-- created_at, id を順序キーにして per-org の ROW_NUMBER で 1..N を採番。
-- created_at 同点は uuid id で決定的に並び替え。
-- LOCK TABLE 済みなので新規 INSERT は混入しない。

WITH ordered AS (
  SELECT id, organization_id,
    ROW_NUMBER() OVER (
      PARTITION BY organization_id
      ORDER BY created_at, id
    ) AS rn
  FROM public.task_items
  WHERE seq IS NULL
)
UPDATE public.task_items t
SET seq = ordered.rn
FROM ordered
WHERE t.id = ordered.id;

-- counter を MAX(seq) で初期化（org に既存タスクが無ければ 0）。
INSERT INTO public.task_item_seq_counters (organization_id, last_value)
SELECT organization_id, COALESCE(MAX(seq), 0)
FROM public.task_items
GROUP BY organization_id
ON CONFLICT (organization_id) DO UPDATE
  SET last_value = GREATEST(
    public.task_item_seq_counters.last_value,
    EXCLUDED.last_value
  );

-- =============================================================================
-- 4. NOT NULL + UNIQUE
-- =============================================================================

ALTER TABLE public.task_items ALTER COLUMN seq SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'task_items_org_seq_unique'
      AND conrelid = 'public.task_items'::regclass
  ) THEN
    ALTER TABLE public.task_items DROP CONSTRAINT task_items_org_seq_unique;
  END IF;
END $$;

ALTER TABLE public.task_items
  ADD CONSTRAINT task_items_org_seq_unique UNIQUE (organization_id, seq);

-- =============================================================================
-- 5. 採番トリガ
-- =============================================================================
-- BEFORE INSERT で counter を増分し NEW.seq に格納。
-- SECURITY DEFINER により counter テーブルの ROW LEVEL SECURITY を bypass。
-- 関数 owner は明示的に postgres にする（owner が authenticated 等になると
-- セキュリティモデルが崩壊するため、deploy 時に owner を確実に固定）。

CREATE OR REPLACE FUNCTION public.task_items_assign_seq()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_next bigint;
BEGIN
  IF NEW.seq IS NOT NULL THEN
    -- 明示指定パス。通常運用では使われず、以下のケースのみで通る:
    --   1. データ移行 / バックフィル（`INSERT ... seq = N` で過去値を保持したい場合）
    --   2. 別環境からのレプリケーション（service_role が直接 seq を指定）
    -- アプリケーション層から `seq` を渡すパスは存在しない（必ず DB 採番）。
    -- counter を GREATEST で前進させ、将来採番との衝突を防ぐ。
    INSERT INTO public.task_item_seq_counters (organization_id, last_value)
    VALUES (NEW.organization_id, NEW.seq)
    ON CONFLICT (organization_id) DO UPDATE
      SET last_value = GREATEST(
            public.task_item_seq_counters.last_value,
            EXCLUDED.last_value
          ),
          updated_at = now();
    RETURN NEW;
  END IF;

  -- 通常パス: 行ロック + アトミック増分。
  -- ON CONFLICT...RETURNING は行ロックを保証（PostgreSQL 公式仕様）。
  INSERT INTO public.task_item_seq_counters (organization_id, last_value)
  VALUES (NEW.organization_id, 1)
  ON CONFLICT (organization_id) DO UPDATE
    SET last_value = public.task_item_seq_counters.last_value + 1,
        updated_at = now()
  RETURNING last_value INTO v_next;

  NEW.seq := v_next;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.task_items_assign_seq() OWNER TO postgres;

REVOKE EXECUTE ON FUNCTION public.task_items_assign_seq() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.task_items_assign_seq() TO authenticated;

DROP TRIGGER IF EXISTS task_items_assign_seq_biud ON public.task_items;
CREATE TRIGGER task_items_assign_seq_biud
  BEFORE INSERT ON public.task_items
  FOR EACH ROW EXECUTE FUNCTION public.task_items_assign_seq();

COMMIT;
