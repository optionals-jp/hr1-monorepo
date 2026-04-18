-- Phase 3: 選考ステップに「期限」を導入する
--
-- 目的:
--   各応募者の選考ステップ (application_steps) に期限日時 (deadline_at) を設定できるようにし、
--   期限超過・期限間近の可視化・リマインダー等に利用する。
--
-- 設計方針:
--   - selection_step_templates.default_duration_days: 組織テンプレートのデフォルト所要日数 (N日)
--   - job_steps.default_duration_days: 求人作成時にテンプレからコピーされ、求人単位で編集可
--   - application_steps.default_duration_days: 応募時に job_steps からコピーされるスナップショット
--   - application_steps.deadline_at: 実際の期限日時 (timestamptz)
--       * ステップが in_progress に遷移したとき、deadline_at が NULL かつ
--         default_duration_days が NOT NULL なら自動的に JST 23:59:59 を期限として設定する
--       * 手動設定済み (deadline_at が非 NULL) の場合は上書きしない
--       * default_duration_days が NULL のステップは期限なし (既存の挙動と互換)
--
-- RLS について:
--   既存の app_steps_update_admin / app_steps_update_own_restricted 等のポリシーは
--   カラム単位ではないため、新カラム deadline_at / default_duration_days の更新も
--   自動的に許可される。よって本マイグレーションで RLS ポリシーの追加/変更は行わない。

-- ============================================================
-- 1. カラム追加
-- ============================================================
ALTER TABLE public.selection_step_templates
  ADD COLUMN IF NOT EXISTS default_duration_days integer;

ALTER TABLE public.job_steps
  ADD COLUMN IF NOT EXISTS default_duration_days integer;

ALTER TABLE public.application_steps
  ADD COLUMN IF NOT EXISTS default_duration_days integer,
  ADD COLUMN IF NOT EXISTS deadline_at timestamptz;

-- ============================================================
-- 2. CHECK 制約 (正の整数のみ許可, NULL は期限なしを意味する)
--    DROP→ADD は冪等実行のためガード付き
-- ============================================================
DO $$ BEGIN
  ALTER TABLE public.selection_step_templates
    ADD CONSTRAINT selection_step_templates_duration_positive
    CHECK (default_duration_days IS NULL OR default_duration_days > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.job_steps
    ADD CONSTRAINT job_steps_duration_positive
    CHECK (default_duration_days IS NULL OR default_duration_days > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.application_steps
    ADD CONSTRAINT application_steps_duration_positive
    CHECK (default_duration_days IS NULL OR default_duration_days > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 3. インデックス (期限切れクエリ用; 進行中かつ期限ありのみ)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_application_steps_deadline_at
  ON public.application_steps (deadline_at)
  WHERE deadline_at IS NOT NULL AND status = 'in_progress';

-- ============================================================
-- 4. ステップ開始時に deadline_at を自動計算するトリガ関数
--
--    JST の「N日後の 23:59:59」を期限として保存する。
--    - now() AT TIME ZONE 'Asia/Tokyo' で現在の JST 時刻を取得
--    - date_trunc('day', ...) で JST 当日の 00:00:00 を得る
--    - N日分加算し、23:59:59 を加える
--    - 最後に AT TIME ZONE 'Asia/Tokyo' で timestamptz (UTC 保存) に変換
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_application_step_deadline_on_start()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- status が in_progress に遷移 (INSERT でいきなり in_progress の場合も含む)
  -- かつ deadline_at が未設定 かつ default_duration_days が設定済み
  IF NEW.status = 'in_progress'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.deadline_at IS NULL
     AND NEW.default_duration_days IS NOT NULL THEN
    NEW.deadline_at := (
      date_trunc('day', (now() AT TIME ZONE 'Asia/Tokyo'))
      + make_interval(days => NEW.default_duration_days)
      + interval '23 hours 59 minutes 59 seconds'
    ) AT TIME ZONE 'Asia/Tokyo';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_application_step_deadline_on_start ON public.application_steps;
CREATE TRIGGER trg_application_step_deadline_on_start
  BEFORE INSERT OR UPDATE OF status ON public.application_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.set_application_step_deadline_on_start();
