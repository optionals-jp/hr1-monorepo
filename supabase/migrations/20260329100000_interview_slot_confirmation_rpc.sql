-- ============================================================================
-- 面接スロット確定 RPC
-- ============================================================================
-- 修正内容:
-- 1. applicant_confirm_interview_slot RPC: アトミックなスロット確定
--    - 応募者本人検証
--    - FOR UPDATE ロック（レースコンディション防止）
--    - 空きスロットチェック
--    - slot更新 + applicant_action_at更新を単一トランザクションで実行
-- ============================================================================

CREATE OR REPLACE FUNCTION public.applicant_confirm_interview_slot(
  p_slot_id uuid,
  p_application_id uuid,
  p_step_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_applicant_id text;
  v_current_app_id uuid;
  v_max_applicants int;
  v_booked_count int;
  v_interview_id uuid;
BEGIN
  -- 1. 呼び出し元が該当応募の本人であることを検証
  SELECT a.applicant_id INTO v_applicant_id
  FROM public.applications a
  WHERE a.id = p_application_id;

  IF v_applicant_id IS NULL OR v_applicant_id != auth.uid()::text THEN
    RAISE EXCEPTION '権限がありません';
  END IF;

  -- 2. スロットをロックして現在の状態を取得
  SELECT application_id, max_applicants, interview_id
  INTO v_current_app_id, v_max_applicants, v_interview_id
  FROM public.interview_slots
  WHERE id = p_slot_id
  FOR UPDATE;

  IF v_interview_id IS NULL THEN
    RAISE EXCEPTION 'スロットが見つかりません';
  END IF;

  -- 3. 既に予約済みかチェック
  IF v_current_app_id IS NOT NULL THEN
    RAISE EXCEPTION 'このスロットは既に予約されています';
  END IF;

  -- 4. スロットを予約
  UPDATE public.interview_slots
  SET is_selected = true,
      application_id = p_application_id
  WHERE id = p_slot_id;

  -- 5. 応募者アクション完了を記録
  IF p_step_id IS NOT NULL THEN
    UPDATE public.application_steps
    SET applicant_action_at = now()
    WHERE id = p_step_id
      AND application_id = p_application_id;
  END IF;
END;
$$;
