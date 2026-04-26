-- HR1 勤怠打刻の整合性強化
--
-- 動機:
--   1. 出勤打刻 (clock_in) を upsert で実装していたため、誤押下で 9:00 出勤が
--      現在時刻に上書きされる重大バグ
--   2. 退勤・休憩開始/終了の状態チェックが無く、不整合 (退勤後の break, 休憩
--      中の二重退勤, 同一 break_start を 2 回集計, etc.) が発生し得る
--   3. break_minutes の read-modify-write race による打刻ロスト
--   4. attendance_records と attendance_punches の INSERT が atomic でない
--
-- 対策:
--   A. 4 つの SECURITY DEFINER RPC (punch_clock_in/out/break_start/break_end) に
--      集約。各 RPC は SELECT ... FOR UPDATE で行ロックし、状態整合性を SQL で
--      検証してから INSERT/UPDATE を 1 transaction で実行。
--   B. attendance_punches に partial UNIQUE INDEX を追加し、record_id 単位で
--      clock_in / clock_out の二重 INSERT を物理的に阻止。
--   C. overtime / late_night の計算をクライアントから DB の IMMUTABLE 関数に
--      移管 (端末 TZ 依存・夏時間・閏秒の影響を排除)。
--
-- TODO: 組織別 TZ サポート時に attendance_settings.timezone を追加し、
--       'Asia/Tokyo' ハードコードを引数化する。

BEGIN;

-- ============================================================================
-- 1. 整合性事前チェック (既存重複があれば中断)
-- ============================================================================
DO $$
DECLARE
  v_dup_in int;
  v_dup_out int;
BEGIN
  SELECT count(*) INTO v_dup_in FROM (
    SELECT record_id FROM public.attendance_punches
    WHERE record_id IS NOT NULL AND punch_type = 'clock_in'
    GROUP BY record_id HAVING count(*) > 1
  ) x;
  SELECT count(*) INTO v_dup_out FROM (
    SELECT record_id FROM public.attendance_punches
    WHERE record_id IS NOT NULL AND punch_type = 'clock_out'
    GROUP BY record_id HAVING count(*) > 1
  ) x;
  IF v_dup_in > 0 OR v_dup_out > 0 THEN
    RAISE EXCEPTION 'attendance_punches has duplicate clock_in/out per record (in=%, out=%); resolve before applying',
      v_dup_in, v_dup_out;
  END IF;
END;
$$;

-- ============================================================================
-- 2. record_id 単位の clock_in / clock_out 重複防止 (partial UNIQUE INDEX)
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS attendance_punches_one_clock_in_per_record
  ON public.attendance_punches (record_id)
  WHERE punch_type = 'clock_in';

CREATE UNIQUE INDEX IF NOT EXISTS attendance_punches_one_clock_out_per_record
  ON public.attendance_punches (record_id)
  WHERE punch_type = 'clock_out';

-- ============================================================================
-- 3. 残業・深夜時間計算 UDF (IMMUTABLE / SQL)
-- ============================================================================
-- 残業 = max(0, (clock_out - clock_in - break_minutes) - (work_end - work_start))
CREATE OR REPLACE FUNCTION public.calc_attendance_overtime_minutes(
  p_clock_in timestamptz,
  p_clock_out timestamptz,
  p_break_minutes int,
  p_work_start_time time,
  p_work_end_time time,
  p_timezone text DEFAULT 'Asia/Tokyo'
) RETURNS int
LANGUAGE sql IMMUTABLE
SET search_path = public, pg_temp
AS $$
  WITH base AS (
    SELECT (p_clock_in AT TIME ZONE p_timezone)::date AS local_date
  ),
  scheduled AS (
    SELECT EXTRACT(EPOCH FROM (
      ((b.local_date::timestamp + p_work_end_time) AT TIME ZONE p_timezone) -
      ((b.local_date::timestamp + p_work_start_time) AT TIME ZONE p_timezone)
    )) / 60.0 AS minutes
    FROM base b
  ),
  actual AS (
    SELECT GREATEST(
      0,
      EXTRACT(EPOCH FROM (p_clock_out - p_clock_in)) / 60.0 - COALESCE(p_break_minutes, 0)
    ) AS minutes
  )
  SELECT GREATEST(
    0,
    FLOOR((SELECT minutes FROM actual) - (SELECT minutes FROM scheduled))
  )::int;
$$;

-- 深夜 = (work_range ∩ 22:00-翌5:00) + (出勤<5:00 なら work_range ∩ 0:00-5:00)
CREATE OR REPLACE FUNCTION public.calc_attendance_late_night_minutes(
  p_clock_in timestamptz,
  p_clock_out timestamptz,
  p_timezone text DEFAULT 'Asia/Tokyo'
) RETURNS int
LANGUAGE sql IMMUTABLE
SET search_path = public, pg_temp
AS $$
  WITH base AS (
    SELECT (p_clock_in AT TIME ZONE p_timezone)::date AS local_date
  ),
  ranges AS (
    SELECT
      tstzrange(p_clock_in, p_clock_out, '[)') AS work_range,
      tstzrange(
        ((b.local_date::timestamp + time '22:00') AT TIME ZONE p_timezone),
        (((b.local_date + 1)::timestamp + time '05:00') AT TIME ZONE p_timezone),
        '[)'
      ) AS night1,
      tstzrange(
        ((b.local_date::timestamp + time '00:00') AT TIME ZONE p_timezone),
        ((b.local_date::timestamp + time '05:00') AT TIME ZONE p_timezone),
        '[)'
      ) AS night2,
      (p_clock_in AT TIME ZONE p_timezone)::time AS clock_in_local_time
    FROM base b
  )
  SELECT (
    CASE WHEN NOT isempty(work_range * night1)
      THEN EXTRACT(EPOCH FROM (upper(work_range * night1) - lower(work_range * night1))) / 60.0
      ELSE 0
    END
    + CASE WHEN clock_in_local_time < time '05:00' AND NOT isempty(work_range * night2)
      THEN EXTRACT(EPOCH FROM (upper(work_range * night2) - lower(work_range * night2))) / 60.0
      ELSE 0
    END
  )::int
  FROM ranges;
$$;

-- ============================================================================
-- 4. 共通: 認証 + 組織所属の検証ヘルパー (内部使用のみ)
-- ============================================================================
-- ※ get_my_organization_ids() は SECURITY DEFINER STABLE のため SECURITY DEFINER
--    RPC 内から安全に呼び出せる。
--    ここではヘルパー関数化せずインラインで検証 (関数増殖を避ける)。

-- ============================================================================
-- 5. 出勤打刻 RPC
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
    RAISE EXCEPTION 'unauthenticated' USING errcode = '42501', detail = 'unauthenticated';
  END IF;
  IF p_organization_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.get_my_organization_ids() AS org_id WHERE org_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'forbidden_organization' USING errcode = '42501', detail = 'forbidden_organization';
  END IF;

  -- INSERT を試行。同日重複は UNIQUE (user_id, date) で弾かれる。
  -- 並行 2 端末同時押下時、片方が unique_violation を受けて
  -- EXCEPTION 節に入り、SELECT FOR UPDATE で先勝ちの行を読み取る。
  BEGIN
    INSERT INTO public.attendance_records (user_id, organization_id, date, clock_in, status)
    VALUES (v_user_id, p_organization_id, v_today, v_now, 'present')
    RETURNING * INTO v_record;
  EXCEPTION WHEN unique_violation THEN
    SELECT * INTO v_record
    FROM public.attendance_records
    WHERE user_id = v_user_id AND date = v_today
    FOR UPDATE;

    IF v_record.clock_in IS NOT NULL THEN
      RAISE EXCEPTION 'already_clocked_in'
        USING errcode = 'P0001', detail = 'already_clocked_in';
    END IF;

    -- 同日に clock_in 未済みの行が事前に存在するケース
    -- (e.g. 管理者が空 record を作成済み)。clock_in を埋める。
    UPDATE public.attendance_records
    SET clock_in = v_now,
        status = 'present',
        organization_id = p_organization_id
    WHERE id = v_record.id
    RETURNING * INTO v_record;
  END;

  -- 打刻履歴。partial UNIQUE INDEX (record_id, clock_in) で重複は弾かれる。
  INSERT INTO public.attendance_punches
    (user_id, organization_id, record_id, punch_type, punched_at)
  VALUES
    (v_user_id, p_organization_id, v_record.id, 'clock_in', v_now);

  RETURN v_record;
END;
$$;

-- ============================================================================
-- 6. 退勤打刻 RPC
-- ============================================================================
-- 休憩中は拒否 ('on_break_cannot_clock_out')。ユーザーに「先に休憩終了」を
-- 強制することで、退勤時刻と break 時刻の境界を明確に保つ。
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
    RAISE EXCEPTION 'unauthenticated' USING errcode = '42501', detail = 'unauthenticated';
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

  -- 対応する break_end が無い break_start = 休憩中。あれば拒否。
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

  -- 設定 (見つからなければデフォルト 9:00-18:00 で計算)
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

-- ============================================================================
-- 7. 休憩開始 RPC
-- ============================================================================
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
    RAISE EXCEPTION 'unauthenticated' USING errcode = '42501', detail = 'unauthenticated';
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

  -- すでに休憩中なら拒否
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

-- ============================================================================
-- 8. 休憩終了 RPC
-- ============================================================================
-- read-modify-write race を回避するため、break_minutes は
-- `break_minutes = break_minutes + X` の単一 UPDATE で原子的に加算。
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
    RAISE EXCEPTION 'unauthenticated' USING errcode = '42501', detail = 'unauthenticated';
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

  -- 対応する break_end が無い最新の break_start
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

-- ============================================================================
-- 9. オーナーシップ + 実行権限
-- ============================================================================
ALTER FUNCTION public.calc_attendance_overtime_minutes(timestamptz, timestamptz, int, time, time, text) OWNER TO postgres;
ALTER FUNCTION public.calc_attendance_late_night_minutes(timestamptz, timestamptz, text) OWNER TO postgres;
ALTER FUNCTION public.punch_clock_in(text) OWNER TO postgres;
ALTER FUNCTION public.punch_clock_out(text) OWNER TO postgres;
ALTER FUNCTION public.punch_break_start(text) OWNER TO postgres;
ALTER FUNCTION public.punch_break_end(text) OWNER TO postgres;

REVOKE EXECUTE ON FUNCTION public.calc_attendance_overtime_minutes(timestamptz, timestamptz, int, time, time, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.calc_attendance_late_night_minutes(timestamptz, timestamptz, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.punch_clock_in(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.punch_clock_out(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.punch_break_start(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.punch_break_end(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.calc_attendance_overtime_minutes(timestamptz, timestamptz, int, time, time, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calc_attendance_late_night_minutes(timestamptz, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.punch_clock_in(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.punch_clock_out(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.punch_break_start(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.punch_break_end(text) TO authenticated;

COMMIT;
