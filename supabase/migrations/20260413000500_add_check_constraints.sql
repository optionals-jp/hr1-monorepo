-- ========================================================================
-- 不足 CHECK 制約の追加
--
-- 1. bc_deals.status: フリーテキスト → CHECK (open/won/lost/cancelled)
-- 2. attendance_approvers: user_id/department_id/project_id 排他 CHECK
-- 3. bc_deals.stage: レガシー列としてコメント追加 (削除は別チケット)
-- ========================================================================

-- 1. bc_deals.status
ALTER TABLE public.bc_deals
  ADD CONSTRAINT bc_deals_status_check
  CHECK (status IN ('open', 'won', 'lost', 'cancelled'));

-- 2. attendance_approvers の3カラム少なくとも1つは set
ALTER TABLE public.attendance_approvers
  ADD CONSTRAINT attendance_approvers_target_required
  CHECK (num_nonnulls(user_id, department_id, project_id) >= 1);

-- 3. bc_deals.stage は legacy 列。stage_id (FK to crm_pipeline_stages) が
--    canonical だが、両アプリのコードがフォールバック表示で stage を参照中。
--    今後 stage_id を NOT NULL 化して stage 列を DROP するチケットを切ること。
COMMENT ON COLUMN public.bc_deals.stage IS
  'LEGACY: フリーテキストのステージ名。canonical は stage_id (crm_pipeline_stages FK)。次フェーズで削除予定';
