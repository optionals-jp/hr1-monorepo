-- HR1 勤怠打刻 RPC v2 (レビュー指摘対応)
--
-- 1. punch_clock_in を「既退勤後の clock_in」も明示的に拒否するよう強化
--    + EXCEPTION 節の組織またぎ UPDATE を禁止 (silent migration 防止)
-- 2. record_id IS NULL のオーファン punch を削除し、NOT NULL 制約を追加
--    (partial UNIQUE INDEX が NULL に対しては効かないため、record_id を物理
--    必須化することで「punch は必ず record に属する」不変条件を担保)
-- 3. unauthenticated の errcode を `42501` → `28000`
--    (insufficient_privilege ではなく invalid_authorization_specification)
-- 4. get_server_today_jst() を新設し、クライアント repo の `_serverToday`
--    二重実装を一掃 (端末 TZ / get_server_now の応答フォーマット差異の影響を排除)

BEGIN;

-- ============================================================================
-- 1. オーファン punch (record_id IS NULL) を削除し NOT NULL 化
-- ============================================================================
-- 事前に「マッチする record が無いオーファンのみ」であることを再確認
DO $$
DECLARE
  v_attached int;
BEGIN
  SELECT count(*) INTO v_attached
  FROM public.attendance_punches p
  WHERE p.record_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.attendance_records r
      WHERE r.user_id = p.user_id
        AND r.date = (p.punched_at AT TIME ZONE 'Asia/Tokyo')::date
    );
  IF v_attached > 0 THEN
    RAISE EXCEPTION 'attendance_punches has % orphan rows with matching records; relink before deletion', v_attached;
  END IF;
END;
$$;

DELETE FROM public.attendance_punches WHERE record_id IS NULL;

ALTER TABLE public.attendance_punches
  ALTER COLUMN record_id SET NOT NULL;

-- ============================================================================
-- 2. サーバ側で JST 今日を返す RPC (クライアントの二重 TZ 計算を排除)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_server_today_jst()
RETURNS date
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
  SELECT (now() AT TIME ZONE 'Asia/Tokyo')::date;
$$;

ALTER FUNCTION public.get_server_today_jst() OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.get_server_today_jst() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_server_today_jst() TO authenticated;

-- ============================================================================
-- 3. punch_clock_in を再定義 (既退勤チェック追加 + 組織またぎ禁止 + errcode)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.punch_clock_in(p_organization_id text)
RETURNS public.attendance_records
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id text := auth.uid()::text;
  v_today date := (now() AT TIME ZONE 'Asia/Tokyo')::date;
  v_now timestamptz := now();
  v_record public.attendance_records;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING errcode = '28000', detail = 'unauthenticated';
  END IF;
  IF p_organization_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.get_my_organization_ids() AS org_id WHERE org_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'forbidden_organization' USING errcode = '42501', detail = 'forbidden_organization';
  END IF;

  BEGIN
    INSERT INTO public.attendance_records (user_id, organization_id, date, clock_in, status)
    VALUES (v_user_id, p_organization_id, v_today, v_now, 'present')
    RETURNING * INTO v_record;
  EXCEPTION WHEN unique_violation THEN
    SELECT * INTO v_record
    FROM public.attendance_records
    WHERE user_id = v_user_id AND date = v_today
    FOR UPDATE;

    -- 既退勤を最優先で弾く (clock_in IS NOT NULL より意味的に正確)
    IF v_record.clock_out IS NOT NULL THEN
      RAISE EXCEPTION 'already_clocked_out'
        USING errcode = 'P0001', detail = 'already_clocked_out';
    END IF;
    IF v_record.clock_in IS NOT NULL THEN
      RAISE EXCEPTION 'already_clocked_in'
        USING errcode = 'P0001', detail = 'already_clocked_in';
    END IF;
    -- 組織またぎを禁止 (silent migration を防ぐ)
    IF v_record.organization_id <> p_organization_id THEN
      RAISE EXCEPTION 'forbidden_organization'
        USING errcode = '42501', detail = 'forbidden_organization';
    END IF;

    UPDATE public.attendance_records
    SET clock_in = v_now,
        status = 'present'
    WHERE id = v_record.id
    RETURNING * INTO v_record;
  END;

  INSERT INTO public.attendance_punches
    (user_id, organization_id, record_id, punch_type, punched_at)
  VALUES
    (v_user_id, p_organization_id, v_record.id, 'clock_in', v_now);

  RETURN v_record;
END;
$$;

-- ============================================================================
-- 4. 他 RPC の unauthenticated errcode も統一 (28000)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.punch_clock_out(p_organization_id text)
RETURNS public.attendance_records
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id text := auth.uid()::text;
  v_today date := (now() AT TIME ZONE 'Asia/Tokyo')::date;
  v_now timestamptz := now();
  v_record public.attendance_records;
  v_settings public.attendance_settings;
  v_work_start time := time '09:00';
  v_work_end time := time '18:00';
  v_overtime int;
  v_late_night int;
  v_active_break_start timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING errcode = '28000', detail = 'unauthenticated';
  END IF;
  IF p_organization_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.get_my_organization_ids() AS org_id WHERE org_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'forbidden_organization' USING errcode = '42501', detail = 'forbidden_organization';
  END IF;

  SELECT * INTO v_record
  FROM public.attendance_records
  WHERE user_id = v_user_id AND date = v_today
  FOR UPDATE;
  IF NOT FOUND OR v_record.clock_in IS NULL THEN
    RAISE EXCEPTION 'not_clocked_in' USING errcode = 'P0001', detail = 'not_clocked_in';
  END IF;
  IF v_record.clock_out IS NOT NULL THEN
    RAISE EXCEPTION 'already_clocked_out' USING errcode = 'P0001', detail = 'already_clocked_out';
  END IF;
  IF v_record.organization_id <> p_organization_id THEN
    RAISE EXCEPTION 'forbidden_organization' USING errcode = '42501', detail = 'forbidden_organization';
  END IF;

  SELECT p1.punched_at INTO v_active_break_start
  FROM public.attendance_punches p1
  WHERE p1.record_id = v_record.id
    AND p1.punch_type = 'break_start'
    AND NOT EXISTS (
      SELECT 1 FROM public.attendance_punches p2
      WHERE p2.record_id = v_record.id
        AND p2.punch_type = 'break_end'
        AND p2.punched_at >= p1.punched_at
    )
  ORDER BY p1.punched_at DESC LIMIT 1;
  IF v_active_break_start IS NOT NULL THEN
    RAISE EXCEPTION 'on_break_cannot_clock_out'
      USING errcode = 'P0001', detail = 'on_break_cannot_clock_out';
  END IF;

  SELECT * INTO v_settings FROM public.attendance_settings WHERE organization_id = p_organization_id;
  IF FOUND THEN
    v_work_start := v_settings.work_start_time;
    v_work_end := v_settings.work_end_time;
  END IF;

  v_overtime := public.calc_attendance_overtime_minutes(
    v_record.clock_in, v_now, v_record.break_minutes, v_work_start, v_work_end);
  v_late_night := public.calc_attendance_late_night_minutes(v_record.clock_in, v_now);

  UPDATE public.attendance_records
  SET clock_out = v_now,
      overtime_minutes = v_overtime,
      late_night_minutes = v_late_night
  WHERE id = v_record.id
  RETURNING * INTO v_record;

  INSERT INTO public.attendance_punches
    (user_id, organization_id, record_id, punch_type, punched_at)
  VALUES
    (v_user_id, p_organization_id, v_record.id, 'clock_out', v_now);

  RETURN v_record;
END;
$$;

CREATE OR REPLACE FUNCTION public.punch_break_start(p_organization_id text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id text := auth.uid()::text;
  v_today date := (now() AT TIME ZONE 'Asia/Tokyo')::date;
  v_now timestamptz := now();
  v_record public.attendance_records;
  v_active_break_start timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING errcode = '28000', detail = 'unauthenticated';
  END IF;
  IF p_organization_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.get_my_organization_ids() AS org_id WHERE org_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'forbidden_organization' USING errcode = '42501', detail = 'forbidden_organization';
  END IF;

  SELECT * INTO v_record
  FROM public.attendance_records
  WHERE user_id = v_user_id AND date = v_today
  FOR UPDATE;
  IF NOT FOUND OR v_record.clock_in IS NULL THEN
    RAISE EXCEPTION 'not_clocked_in' USING errcode = 'P0001', detail = 'not_clocked_in';
  END IF;
  IF v_record.clock_out IS NOT NULL THEN
    RAISE EXCEPTION 'already_clocked_out' USING errcode = 'P0001', detail = 'already_clocked_out';
  END IF;
  IF v_record.organization_id <> p_organization_id THEN
    RAISE EXCEPTION 'forbidden_organization' USING errcode = '42501', detail = 'forbidden_organization';
  END IF;

  SELECT p1.punched_at INTO v_active_break_start
  FROM public.attendance_punches p1
  WHERE p1.record_id = v_record.id
    AND p1.punch_type = 'break_start'
    AND NOT EXISTS (
      SELECT 1 FROM public.attendance_punches p2
      WHERE p2.record_id = v_record.id
        AND p2.punch_type = 'break_end'
        AND p2.punched_at >= p1.punched_at
    )
  LIMIT 1;
  IF v_active_break_start IS NOT NULL THEN
    RAISE EXCEPTION 'already_on_break' USING errcode = 'P0001', detail = 'already_on_break';
  END IF;

  INSERT INTO public.attendance_punches
    (user_id, organization_id, record_id, punch_type, punched_at)
  VALUES
    (v_user_id, p_organization_id, v_record.id, 'break_start', v_now);
END;
$$;

CREATE OR REPLACE FUNCTION public.punch_break_end(p_organization_id text)
RETURNS public.attendance_records
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id text := auth.uid()::text;
  v_today date := (now() AT TIME ZONE 'Asia/Tokyo')::date;
  v_now timestamptz := now();
  v_record public.attendance_records;
  v_break_start timestamptz;
  v_added_minutes int;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING errcode = '28000', detail = 'unauthenticated';
  END IF;
  IF p_organization_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.get_my_organization_ids() AS org_id WHERE org_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'forbidden_organization' USING errcode = '42501', detail = 'forbidden_organization';
  END IF;

  SELECT * INTO v_record
  FROM public.attendance_records
  WHERE user_id = v_user_id AND date = v_today
  FOR UPDATE;
  IF NOT FOUND OR v_record.clock_in IS NULL THEN
    RAISE EXCEPTION 'not_clocked_in' USING errcode = 'P0001', detail = 'not_clocked_in';
  END IF;
  IF v_record.clock_out IS NOT NULL THEN
    RAISE EXCEPTION 'already_clocked_out' USING errcode = 'P0001', detail = 'already_clocked_out';
  END IF;
  IF v_record.organization_id <> p_organization_id THEN
    RAISE EXCEPTION 'forbidden_organization' USING errcode = '42501', detail = 'forbidden_organization';
  END IF;

  SELECT p1.punched_at INTO v_break_start
  FROM public.attendance_punches p1
  WHERE p1.record_id = v_record.id
    AND p1.punch_type = 'break_start'
    AND NOT EXISTS (
      SELECT 1 FROM public.attendance_punches p2
      WHERE p2.record_id = v_record.id
        AND p2.punch_type = 'break_end'
        AND p2.punched_at >= p1.punched_at
    )
  ORDER BY p1.punched_at DESC LIMIT 1;
  IF v_break_start IS NULL THEN
    RAISE EXCEPTION 'not_on_break' USING errcode = 'P0001', detail = 'not_on_break';
  END IF;

  v_added_minutes := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (v_now - v_break_start)) / 60.0)::int);

  UPDATE public.attendance_records
  SET break_minutes = break_minutes + v_added_minutes
  WHERE id = v_record.id
  RETURNING * INTO v_record;

  INSERT INTO public.attendance_punches
    (user_id, organization_id, record_id, punch_type, punched_at)
  VALUES
    (v_user_id, p_organization_id, v_record.id, 'break_end', v_now);

  RETURN v_record;
END;
$$;

COMMIT;
