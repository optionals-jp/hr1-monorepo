-- 打刻単位の修正データをJSONBで保存
-- 形式: [{"punch_id": "...", "punch_type": "clock_in", "original_punched_at": "...", "requested_punched_at": "..."}, ...]
ALTER TABLE attendance_corrections
  ADD COLUMN punch_corrections jsonb;

-- 不要になった休憩時間カラムを削除
ALTER TABLE attendance_corrections
  DROP COLUMN IF EXISTS original_break_minutes,
  DROP COLUMN IF EXISTS requested_break_minutes;
