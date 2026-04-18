-- ============================================================================
-- HR-28: 評価テンプレートの版管理（status）+ 評価項目の論理削除（deleted_at）
-- ============================================================================
--
-- 背景:
--   評価テンプレート詳細画面（hr1-employee-web）で項目の追加・編集・削除が
--   できないため、あとから項目を増やせないという欠陥があった。
--   単に UI に編集機能を付けるだけでは、evaluation_cycles で既に運用中の
--   テンプレートに対する破壊的変更（項目削除や score_type 変更）で、
--   提出済みの evaluation_scores が参照切れになり集計が破綻する。
--
-- 対応:
--   1. evaluation_templates に status を追加し、
--      draft / published / archived のライフサイクルで管理する。
--   2. evaluation_criteria に deleted_at を追加し、
--      運用中テンプレートからの項目削除を論理削除に置き換える。
--   3. 既存データのバックフィル:
--      evaluation_cycles から参照されているテンプレートは published、
--      それ以外は draft。
--
-- 関連:
--   - 20260419000100_HR28_evaluation_template_rpcs.sql
--     実際の編集ロジックは RPC 群で実装する。
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. evaluation_templates.status 追加
-- ---------------------------------------------------------------------------
ALTER TABLE public.evaluation_templates
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft'
        CONSTRAINT evaluation_templates_status_check
            CHECK (status IN ('draft', 'published', 'archived'));

COMMENT ON COLUMN public.evaluation_templates.status IS
  'draft: 未公開（自由に編集可）, published: 公開済み（評価サイクルで利用可、破壊的変更は不可）, archived: アーカイブ済み（新規利用不可）';

CREATE INDEX IF NOT EXISTS idx_evaluation_templates_org_status
    ON public.evaluation_templates (organization_id, status);

-- ---------------------------------------------------------------------------
-- 2. evaluation_criteria.deleted_at 追加（論理削除）
-- ---------------------------------------------------------------------------
ALTER TABLE public.evaluation_criteria
    ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

COMMENT ON COLUMN public.evaluation_criteria.deleted_at IS
  '論理削除日時。NULL ならアクティブ。published テンプレ上の criterion 削除はこれで表現し、過去の evaluation_scores を保護する。';

-- アクティブ項目のみを対象とした部分インデックス（一覧・順序取得の高速化）
CREATE INDEX IF NOT EXISTS idx_evaluation_criteria_template_active
    ON public.evaluation_criteria (template_id, sort_order)
    WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- 3. バックフィル: 既存テンプレートに status をセット
--    evaluation_cycles から参照されているものは published。
-- ---------------------------------------------------------------------------
UPDATE public.evaluation_templates t
   SET status = 'published'
  WHERE status = 'draft'
    AND EXISTS (
        SELECT 1 FROM public.evaluation_cycles c WHERE c.template_id = t.id
    );
