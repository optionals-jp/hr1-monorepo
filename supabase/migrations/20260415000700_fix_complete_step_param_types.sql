-- 旧 uuid 版を削除（CREATE OR REPLACE は引数型が異なるとオーバーロードになるため明示的に DROP）
DROP FUNCTION IF EXISTS public.applicant_complete_step(uuid, uuid);

-- applicant_complete_step の引数型を uuid → text に修正
-- application_steps.id / application_id は text 型のため uuid では型不一致エラーになる
CREATE OR REPLACE FUNCTION public.applicant_complete_step(p_step_id text, p_application_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_applicant_id text;
  v_step_order int;
  v_next_step_id text;
  v_next_step_type text;
BEGIN
  SELECT a.applicant_id INTO v_applicant_id
  FROM public.applications a
  WHERE a.id = p_application_id;

  IF v_applicant_id IS NULL OR v_applicant_id != auth.uid()::text THEN
    RAISE EXCEPTION '権限がありません';
  END IF;

  SELECT step_order INTO v_step_order
  FROM public.application_steps
  WHERE id = p_step_id
    AND application_id = p_application_id
    AND status = 'in_progress'
  FOR UPDATE;

  IF v_step_order IS NULL THEN
    RAISE EXCEPTION '完了できるステップが見つかりません';
  END IF;

  UPDATE public.application_steps
  SET status = 'completed',
      completed_at = now(),
      applicant_action_at = now()
  WHERE id = p_step_id;

  -- 次のステップを自動開始（form/interview以外）
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
