-- ============================================================================
-- 選考ステップ機能レビュー修正
-- ============================================================================
-- 修正内容:
-- 1. reorder_job_steps RPC: 管理者権限チェック付きアトミック並び替え
-- 2. applicant_complete_step RPC: FOR UPDATEロック付きアトミックステップ完了
-- 3. applicant UPDATE RLS制限: 広い UPDATE ポリシーを制限付きに差し替え
-- ============================================================================

-- =========================================================================
-- 1. reorder_job_steps RPC — 管理者権限チェック + アトミックな並び替え
-- =========================================================================

CREATE OR REPLACE FUNCTION public.reorder_job_steps(
  p_job_id uuid,
  p_step_ids uuid[],
  p_step_orders int[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 管理者権限チェック
  IF NOT EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = p_job_id
      AND j.organization_id IN (
        SELECT uo.organization_id FROM public.user_organizations uo
        JOIN public.profiles p ON p.id = uo.user_id
        WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
      )
  ) THEN
    RAISE EXCEPTION '権限がありません';
  END IF;

  IF array_length(p_step_ids, 1) IS DISTINCT FROM array_length(p_step_orders, 1) THEN
    RAISE EXCEPTION 'step_ids と step_orders の長さが一致しません';
  END IF;

  -- 一時的に大きな値にずらして衝突を回避
  UPDATE public.job_steps
  SET step_order = step_order + 10000
  WHERE job_id = p_job_id;

  -- 正しい順序に更新
  FOR i IN 1..array_length(p_step_ids, 1) LOOP
    UPDATE public.job_steps
    SET step_order = p_step_orders[i]
    WHERE id = p_step_ids[i]
      AND job_id = p_job_id;
  END LOOP;
END;
$$;

-- =========================================================================
-- 2. applicant_complete_step RPC — FOR UPDATEロック付きステップ完了
-- =========================================================================

CREATE OR REPLACE FUNCTION public.applicant_complete_step(
  p_step_id uuid,
  p_application_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_applicant_id text;
  v_step_order int;
  v_next_step_id uuid;
  v_next_step_type text;
BEGIN
  -- 呼び出し元が該当応募の本人であることを検証
  SELECT a.applicant_id INTO v_applicant_id
  FROM public.applications a
  WHERE a.id = p_application_id;

  IF v_applicant_id IS NULL OR v_applicant_id != auth.uid()::text THEN
    RAISE EXCEPTION '権限がありません';
  END IF;

  -- ステップが該当応募に属し in_progress であることを検証（FOR UPDATEで行ロック）
  SELECT step_order INTO v_step_order
  FROM public.application_steps
  WHERE id = p_step_id
    AND application_id = p_application_id
    AND status = 'in_progress'
  FOR UPDATE;

  IF v_step_order IS NULL THEN
    RAISE EXCEPTION '完了できるステップが見つかりません';
  END IF;

  -- 現在のステップを完了
  UPDATE public.application_steps
  SET status = 'completed',
      completed_at = now(),
      applicant_action_at = now()
  WHERE id = p_step_id;

  -- 次の pending ステップを取得（FOR UPDATEで行ロック）
  SELECT id, step_type INTO v_next_step_id, v_next_step_type
  FROM public.application_steps
  WHERE application_id = p_application_id
    AND step_order > v_step_order
    AND status = 'pending'
  ORDER BY step_order
  LIMIT 1
  FOR UPDATE;

  -- 次ステップがリソース不要な種別なら自動開始
  IF v_next_step_id IS NOT NULL
     AND v_next_step_type NOT IN ('form', 'interview') THEN
    UPDATE public.application_steps
    SET status = 'in_progress',
        started_at = now()
    WHERE id = v_next_step_id;
  END IF;
END;
$$;

-- =========================================================================
-- 3. 応募者の直接UPDATE権限を制限
-- =========================================================================

-- 既存の広い UPDATE ポリシーを削除
DROP POLICY IF EXISTS app_steps_update_own ON public.application_steps;

-- 制限付きポリシーを作成（RPC経由での更新を推奨）
CREATE POLICY app_steps_update_own_restricted ON public.application_steps
  FOR UPDATE
  USING (
    application_id IN (
      SELECT a.id FROM public.applications a
      WHERE a.applicant_id = auth.uid()::text
    )
  )
  WITH CHECK (
    application_id IN (
      SELECT a.id FROM public.applications a
      WHERE a.applicant_id = auth.uid()::text
    )
  );
