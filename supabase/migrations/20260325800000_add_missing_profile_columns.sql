-- profiles テーブルに不足していたカラムを追加
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS name_kana text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS hire_date date,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS gender text;
