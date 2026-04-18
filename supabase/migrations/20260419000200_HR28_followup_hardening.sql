-- ============================================================================
-- HR-28: 評価テンプレート機能の書込経路ハードニング (Block A)
-- ============================================================================
--
-- レビュー v1/v2 で指摘された Critical/High を恒久解決するための migration。
--
--   C1: templates/criteria/anchors の書込経路が RPC と直接 DML の 2 系統並存。
--       `eval_*_all_admin` (FOR ALL) の RLS が authenticated admin に直接
--       INSERT/UPDATE/DELETE を許しており、RPC の lifecycle 保護を回避できる。
--   C2: evaluation_scores.criterion_id FK が ON DELETE CASCADE。criteria
--       hard delete 時に既存評価スコアが無言で消失する。
--
--   H1/H2/H3: deleted_at / archived フィルタ欠落、audit trigger 未設置。
--
-- 対応方針:
--   1. FK を RESTRICT に変更し、scores 付き criteria の hard delete を DB で阻止。
--   2. templates/criteria/anchors の RLS から authenticated の書込を撤去し
--      SELECT のみ許可。以降の書込は全て SECURITY DEFINER RPC 経由に強制。
--   3. log_audit_change に criteria/anchors の org 解決フォールバックを追加
--      (関数全文を CREATE OR REPLACE で置き換え、唯一の真とする)。
--   4. evaluation_cycles の archived template 紐付けを BEFORE トリガーで拒否。
--   5. updated_at カラム + 更新トリガーを 3 テーブルに付与 (監査に必要)。
--
-- 互換性:
--   本 migration 適用後、旧 hr1-console の直接 CRUD 経路は 42501 を返す。
--   必ず hr1-console の Block C (RPC 移行) 版を本番にデプロイ**してから**
--   本 migration を本番 Supabase に流すこと (staging では同時可)。
-- ============================================================================


-- ---------------------------------------------------------------------------
-- A1. evaluation_scores.criterion_id FK: CASCADE → RESTRICT
-- ---------------------------------------------------------------------------
-- 既存 scores の行は変更されない (同一 transaction 内 DROP + ADD)。
-- criteria の hard delete は RPC `delete_evaluation_criterion` 内で scores
-- 不在時のみ行う設計。DB 側でも多層防御として RESTRICT を強制する。
ALTER TABLE public.evaluation_scores
    DROP CONSTRAINT IF EXISTS evaluation_scores_criterion_id_fkey;

ALTER TABLE public.evaluation_scores
    ADD CONSTRAINT evaluation_scores_criterion_id_fkey
        FOREIGN KEY (criterion_id) REFERENCES public.evaluation_criteria(id)
        ON DELETE RESTRICT;


-- ---------------------------------------------------------------------------
-- A2. evaluation_cycles.template_id FK: 明示的に RESTRICT
-- ---------------------------------------------------------------------------
-- baseline では ON DELETE 指定なし (NO ACTION 相当) だが明示する。
ALTER TABLE public.evaluation_cycles
    DROP CONSTRAINT IF EXISTS evaluation_cycles_template_id_fkey;

ALTER TABLE public.evaluation_cycles
    ADD CONSTRAINT evaluation_cycles_template_id_fkey
        FOREIGN KEY (template_id) REFERENCES public.evaluation_templates(id)
        ON DELETE RESTRICT;


-- ---------------------------------------------------------------------------
-- A3. updated_at カラム追加 + 更新トリガー
-- ---------------------------------------------------------------------------
ALTER TABLE public.evaluation_templates
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.evaluation_criteria
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.evaluation_anchors
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS set_evaluation_templates_updated_at ON public.evaluation_templates;
CREATE TRIGGER set_evaluation_templates_updated_at
    BEFORE UPDATE ON public.evaluation_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_evaluation_criteria_updated_at ON public.evaluation_criteria;
CREATE TRIGGER set_evaluation_criteria_updated_at
    BEFORE UPDATE ON public.evaluation_criteria
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_evaluation_anchors_updated_at ON public.evaluation_anchors;
CREATE TRIGGER set_evaluation_anchors_updated_at
    BEFORE UPDATE ON public.evaluation_anchors
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ---------------------------------------------------------------------------
-- A4. log_audit_change: criteria / anchors の org 解決フォールバックを追加
-- ---------------------------------------------------------------------------
-- NOTE: 本 migration 適用後、log_audit_change は唯一の真として
-- 20260413000000_baseline.sql L1061 の既存ロジック (action/table_name/
-- record_id/user_id/changes 抽出、profiles フォールバック) を全て保持しつつ
-- evaluation_criteria / evaluation_anchors のフォールバックを追加した実装となる。
--
-- 既存 audit 対象テーブル (announcements, applications, interviews, jobs,
-- profiles, user_organizations, evaluation_templates, evaluation_cycles 他)
-- の挙動は不変。
--
-- DELETE 時は v_new=NULL / v_old のみセットされるため COALESCE(v_new, v_old)
-- を使い全 TG_OP (INSERT/UPDATE/DELETE) で criteria/anchors の org が正しく
-- 解決されることを保証する。
CREATE OR REPLACE FUNCTION public.log_audit_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_action text;
  v_record_id text;
  v_org_id text;
  v_user_id text;
  v_changes jsonb;
  v_old jsonb;
  v_new jsonb;
  v_old_hstore hstore;
  v_new_hstore hstore;
  v_diff hstore;
  v_key text;
  v_excluded_keys text[] := ARRAY['id', 'created_at', 'updated_at'];
  v_row jsonb;
BEGIN
  v_user_id := coalesce(auth.uid()::text, 'system');

  IF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_old := to_jsonb(OLD);
    v_record_id := v_old ->> 'id';
    v_org_id := v_old ->> 'organization_id';
    v_changes := v_old;
  ELSIF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_new := to_jsonb(NEW);
    v_record_id := v_new ->> 'id';
    v_org_id := v_new ->> 'organization_id';
    v_changes := v_new;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_record_id := v_new ->> 'id';
    v_org_id := v_new ->> 'organization_id';

    v_old_hstore := hstore(OLD);
    v_new_hstore := hstore(NEW);
    v_diff := v_new_hstore - v_old_hstore;

    v_changes := '{}'::jsonb;
    FOR v_key IN SELECT skeys(v_diff)
    LOOP
      IF v_key != ALL(v_excluded_keys) THEN
        v_changes := v_changes || jsonb_build_object(
          v_key, jsonb_build_object('old', v_old -> v_key, 'new', v_new -> v_key)
        );
      END IF;
    END LOOP;

    IF v_changes = '{}'::jsonb THEN
      RETURN NEW;
    END IF;
  END IF;

  -- organization_id がないテーブルはテーブル別のフォールバックで解決
  IF v_org_id IS NULL THEN
    -- profiles: user_organizations から取得
    IF TG_TABLE_NAME = 'profiles' THEN
      SELECT uo.organization_id INTO v_org_id
      FROM public.user_organizations uo
      WHERE uo.user_id = v_record_id
      LIMIT 1;
    END IF;

    -- evaluation_criteria / evaluation_anchors: template 経由で解決
    -- DELETE 時は v_new=NULL なので COALESCE(v_new, v_old) で両対応
    IF v_org_id IS NULL
       AND TG_TABLE_NAME IN ('evaluation_criteria', 'evaluation_anchors') THEN
      v_row := COALESCE(v_new, v_old);
      v_org_id := (
        SELECT t.organization_id
          FROM public.evaluation_templates t
         WHERE t.id = COALESCE(
           CASE WHEN TG_TABLE_NAME = 'evaluation_criteria'
             THEN v_row ->> 'template_id' END,
           (SELECT c.template_id FROM public.evaluation_criteria c
             WHERE c.id = v_row ->> 'criterion_id')
         )
      );
    END IF;

    IF v_org_id IS NULL THEN
      RAISE WARNING 'audit_log: organization_id is NULL for table=%, record_id=%, op=%',
        TG_TABLE_NAME, v_record_id, TG_OP;

      BEGIN
        INSERT INTO public.audit_logs_errors (error_message, table_name, record_id, operation, raw_data)
        VALUES (
          'organization_id is NULL',
          TG_TABLE_NAME,
          v_record_id,
          TG_OP,
          v_changes
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'audit_log: failed to log error: %', SQLERRM;
      END;

      IF TG_OP = 'DELETE' THEN
        RETURN OLD;
      ELSE
        RETURN NEW;
      END IF;
    END IF;
  END IF;

  BEGIN
    INSERT INTO public.audit_logs (organization_id, user_id, action, table_name, record_id, changes)
    VALUES (v_org_id, v_user_id, v_action, TG_TABLE_NAME, v_record_id, v_changes);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.audit_logs_errors (error_message, table_name, record_id, operation, raw_data)
    VALUES (SQLERRM, TG_TABLE_NAME, v_record_id, TG_OP, v_changes);
    RAISE WARNING 'audit_log: INSERT failed for table=%, record_id=%: %', TG_TABLE_NAME, v_record_id, SQLERRM;
  END;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- criteria / anchors に audit trigger を付与
DROP TRIGGER IF EXISTS audit_trigger_evaluation_criteria ON public.evaluation_criteria;
CREATE TRIGGER audit_trigger_evaluation_criteria
    AFTER INSERT OR UPDATE OR DELETE ON public.evaluation_criteria
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

DROP TRIGGER IF EXISTS audit_trigger_evaluation_anchors ON public.evaluation_anchors;
CREATE TRIGGER audit_trigger_evaluation_anchors
    AFTER INSERT OR UPDATE OR DELETE ON public.evaluation_anchors
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();


-- ---------------------------------------------------------------------------
-- A5. evaluation_cycles の archived テンプレ紐付けを BEFORE トリガーで拒否
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._hr28_block_archived_cycle_binding()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT t.status INTO v_status
    FROM public.evaluation_templates t
   WHERE t.id = NEW.template_id;

  IF v_status = 'archived' THEN
    RAISE EXCEPTION 'アーカイブ済みテンプレートから評価サイクルを作成できません'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public._hr28_block_archived_cycle_binding() OWNER TO postgres;

DROP TRIGGER IF EXISTS hr28_block_archived_cycle_binding ON public.evaluation_cycles;
CREATE TRIGGER hr28_block_archived_cycle_binding
    BEFORE INSERT OR UPDATE OF template_id ON public.evaluation_cycles
    FOR EACH ROW EXECUTE FUNCTION public._hr28_block_archived_cycle_binding();


-- ---------------------------------------------------------------------------
-- A6. RLS クリーンアップ: templates / criteria / anchors の書込ポリシー撤去
-- ---------------------------------------------------------------------------
-- 以降、これら 3 テーブルの INSERT/UPDATE/DELETE は authenticated からは
-- 実行不能となり、SECURITY DEFINER の RPC (service_role 権限) のみが
-- 書き込める。クライアントの RPC 経由書込に一本化される。
--
-- evaluation_scores / evaluations / evaluation_cycles / evaluation_assignments
-- の書込ポリシーは本 PR のスコープ外のため一切変更しない (HR-28-followup-eval-cycles で対応)。

-- 旧 authenticated_* 系 (baseline 残留、user_org_ids() 使用の廃止ヘルパー)
DROP POLICY IF EXISTS "authenticated_delete_evaluation_criteria"  ON public.evaluation_criteria;
DROP POLICY IF EXISTS "authenticated_delete_evaluation_templates" ON public.evaluation_templates;
DROP POLICY IF EXISTS "authenticated_insert_evaluation_templates" ON public.evaluation_templates;
DROP POLICY IF EXISTS "authenticated_read_anchors"                ON public.evaluation_anchors;
DROP POLICY IF EXISTS "authenticated_read_evaluation_criteria"    ON public.evaluation_criteria;
DROP POLICY IF EXISTS "authenticated_read_evaluation_templates"   ON public.evaluation_templates;
DROP POLICY IF EXISTS "authenticated_update_evaluation_criteria"  ON public.evaluation_criteria;
DROP POLICY IF EXISTS "authenticated_update_evaluation_templates" ON public.evaluation_templates;
DROP POLICY IF EXISTS "authenticated_write_evaluation_criteria"   ON public.evaluation_criteria;

-- eval_*_all_admin (FOR ALL) — authenticated admin に INSERT/UPDATE/DELETE 許可していた
DROP POLICY IF EXISTS "eval_anchors_all_admin"   ON public.evaluation_anchors;
DROP POLICY IF EXISTS "eval_criteria_all_admin"  ON public.evaluation_criteria;
DROP POLICY IF EXISTS "eval_templates_all_admin" ON public.evaluation_templates;

-- org_manage_anchors (FOR ALL, 廃止ヘルパー使用)
DROP POLICY IF EXISTS "org_manage_anchors" ON public.evaluation_anchors;

-- 旧 eval_*_select_org (baseline の単数形 helper 使用) — 新ポリシーで再作成
DROP POLICY IF EXISTS "eval_templates_select_org" ON public.evaluation_templates;
DROP POLICY IF EXISTS "eval_criteria_select_org"  ON public.evaluation_criteria;
DROP POLICY IF EXISTS "eval_anchors_select_org"   ON public.evaluation_anchors;

-- SELECT のみ authenticated に許可 (新ポリシー、get_my_organization_ids() 使用)
CREATE POLICY "eval_templates_select_org" ON public.evaluation_templates
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

CREATE POLICY "eval_criteria_select_org" ON public.evaluation_criteria
  FOR SELECT TO authenticated
  USING (template_id IN (
    SELECT id FROM public.evaluation_templates
     WHERE organization_id IN (SELECT public.get_my_organization_ids())
  ));

CREATE POLICY "eval_anchors_select_org" ON public.evaluation_anchors
  FOR SELECT TO authenticated
  USING (criterion_id IN (
    SELECT c.id FROM public.evaluation_criteria c
    JOIN public.evaluation_templates t ON t.id = c.template_id
    WHERE t.organization_id IN (SELECT public.get_my_organization_ids())
  ));


-- ---------------------------------------------------------------------------
-- A7. TODO: follow-up チケット
-- ---------------------------------------------------------------------------
-- - HR-28-followup-eval-cycles: evaluation_scores / evaluations /
--   evaluation_cycles / evaluation_assignments の write RLS を service_role
--   専用化し、insertEvaluation / insertScores 等を RPC 化する。
-- - packages/shared-eval-repository: evaluation-repository の重複を解消。
-- - anchors 3 段ネスト RLS の性能劣化時はヘルパー関数
--   public._hr28_my_org_criterion_ids() への置換を検討。
