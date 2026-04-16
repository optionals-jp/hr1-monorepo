CREATE OR REPLACE FUNCTION public.applicant_complete_step(p_step_id text, p_application_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_applicant_id text;
  v_step_order int;
  v_requires_review boolean;
  v_applicant_action_at timestamptz;
  v_next_step_id text;
  v_next_step_type text;
BEGIN
  SELECT a.applicant_id INTO v_applicant_id
  FROM public.applications a
  WHERE a.id = p_application_id;

  IF v_applicant_id IS NULL OR v_applicant_id != auth.uid()::text THEN
    RAISE EXCEPTION '権限がありません';
  END IF;

  SELECT step_order, requires_review, applicant_action_at
    INTO v_step_order, v_requires_review, v_applicant_action_at
  FROM public.application_steps
  WHERE id = p_step_id
    AND application_id = p_application_id
    AND status = 'in_progress'
  FOR UPDATE;

  IF v_step_order IS NULL THEN
    RAISE EXCEPTION '完了できるステップが見つかりません';
  END IF;

  -- 担当者確認が必要な場合
  IF v_requires_review THEN
    -- 既に提出済みなら何もしない（冪等性）
    IF v_applicant_action_at IS NOT NULL THEN
      RETURN;
    END IF;
    UPDATE public.application_steps
    SET applicant_action_at = now()
    WHERE id = p_step_id;
    RETURN;
  END IF;

  -- 確認不要の場合: ステップを完了にする（従来動作）
  UPDATE public.application_steps
  SET status = 'completed',
      completed_at = now(),
      applicant_action_at = now()
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
END;
$function$;
