-- ========================================================================
-- 月次勤怠集計をサーバーサイドで実行するRPC関数
-- クライアントの max_rows 制限（1000件）を回避し、データ転送量を削減
-- ========================================================================

CREATE OR REPLACE FUNCTION public.get_monthly_attendance_summary(
  p_organization_id text,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE(
  user_id text,
  display_name text,
  email text,
  present_days bigint,
  late_days bigint,
  absent_days bigint,
  leave_days bigint,
  total_work_minutes bigint,
  total_overtime_minutes bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_organizations uo
    JOIN profiles p ON p.id = uo.user_id
    WHERE uo.user_id = auth.uid()::text
      AND uo.organization_id = p_organization_id
      AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    ar.user_id,
    p.display_name,
    p.email,
    COUNT(*) FILTER (WHERE ar.status IN ('present', 'late', 'early_leave')) AS present_days,
    COUNT(*) FILTER (WHERE ar.status = 'late') AS late_days,
    COUNT(*) FILTER (WHERE ar.status = 'absent') AS absent_days,
    COUNT(*) FILTER (WHERE ar.status IN ('paid_leave', 'half_day_am', 'half_day_pm', 'sick_leave', 'special_leave')) AS leave_days,
    COALESCE(SUM(
      CASE WHEN ar.clock_in IS NOT NULL AND ar.clock_out IS NOT NULL
        THEN GREATEST(
          EXTRACT(EPOCH FROM (ar.clock_out - ar.clock_in))::bigint / 60 - ar.break_minutes,
          0
        )
        ELSE 0
      END
    ), 0) AS total_work_minutes,
    COALESCE(SUM(ar.overtime_minutes), 0) AS total_overtime_minutes
  FROM public.attendance_records ar
  JOIN public.profiles p ON p.id = ar.user_id
  WHERE ar.organization_id = p_organization_id
    AND ar.date >= p_start_date
    AND ar.date <= p_end_date
  GROUP BY ar.user_id, p.display_name, p.email
  ORDER BY p.display_name NULLS LAST, p.email;
END;
$$;
