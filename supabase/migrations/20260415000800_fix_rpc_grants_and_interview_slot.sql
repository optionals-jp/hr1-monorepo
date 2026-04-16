-- 1. applicant_complete_step の GRANT 追加（DROP で旧版の GRANT も消えたため）
GRANT EXECUTE ON FUNCTION public.applicant_complete_step(text, text) TO anon, authenticated, service_role;

-- 2. applicant_confirm_interview_slot の uuid → text 修正
DROP FUNCTION IF EXISTS public.applicant_confirm_interview_slot(uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION public.applicant_confirm_interview_slot(
  p_slot_id text,
  p_application_id text,
  p_step_id text
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_applicant_id text;
  v_current_app_id text;
  v_interview_id text;
  v_step_order int;
  v_next_step_id text;
  v_next_step_type text;
BEGIN
  -- 応募者本人か確認
  SELECT a.applicant_id INTO v_applicant_id
  FROM public.applications a
  WHERE a.id = p_application_id;

  IF v_applicant_id IS NULL OR v_applicant_id != auth.uid()::text THEN
    RAISE EXCEPTION '権限がありません';
  END IF;

  -- スロットが未予約か確認
  SELECT application_id, interview_id INTO v_current_app_id, v_interview_id
  FROM public.interview_slots
  WHERE id = p_slot_id
  FOR UPDATE;

  IF v_current_app_id IS NOT NULL THEN
    RAISE EXCEPTION 'この枠はすでに予約されています';
  END IF;

  -- スロットを予約
  UPDATE public.interview_slots
  SET application_id = p_application_id
  WHERE id = p_slot_id;

  -- 同じ面接の他スロット予約を解放（1応募者1枠）
  UPDATE public.interview_slots
  SET application_id = NULL
  WHERE interview_id = v_interview_id
    AND application_id = p_application_id
    AND id != p_slot_id;

  -- ステップの applicant_action_at を記録
  UPDATE public.application_steps
  SET applicant_action_at = now(),
      interview_id = v_interview_id
  WHERE id = p_step_id
    AND application_id = p_application_id;

  -- ステップ完了 & 次ステップ開始
  SELECT step_order INTO v_step_order
  FROM public.application_steps
  WHERE id = p_step_id
    AND application_id = p_application_id
    AND status = 'in_progress'
  FOR UPDATE;

  IF v_step_order IS NOT NULL THEN
    UPDATE public.application_steps
    SET status = 'completed',
        completed_at = now()
    WHERE id = p_step_id;

    SELECT id, step_type INTO v_next_step_id, v_next_step_type
    FROM public.application_steps
    WHERE application_id = p_application_id
      AND step_order > v_step_order
      AND status = 'pending'
    ORDER BY step_order
    LIMIT 1
    FOR UPDATE;

    IF v_next_step_id IS NOT NULL
       AND v_next_step_type NOT IN ('form', 'interview') THEN
      UPDATE public.application_steps
      SET status = 'in_progress',
          started_at = now()
      WHERE id = v_next_step_id;
    END IF;
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.applicant_confirm_interview_slot(text, text, text) TO anon, authenticated, service_role;
